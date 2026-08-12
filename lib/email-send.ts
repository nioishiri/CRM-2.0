import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

/**
 * Логгер для nodemailer — пишет в stdout/stderr.
 * В Docker попадает в `docker compose logs app` — это главный диагностический артефакт.
 * Соответствует интерфейсу nodemailer Logger (нужны level/trace/fatal).
 */
const smtpLogger = {
  level: () => {},
  trace: (...args: any[]) => console.log('[SMTP trace]', ...args),
  debug: (...args: any[]) => console.log('[SMTP]', ...args),
  info: (...args: any[]) => console.log('[SMTP]', ...args),
  warn: (...args: any[]) => console.warn('[SMTP warn]', ...args),
  error: (...args: any[]) => console.error('[SMTP error]', ...args),
  fatal: (...args: any[]) => console.error('[SMTP fatal]', ...args),
};

interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

/**
 * Конфигурация SMTP-транспорта с корректной обработкой:
 *  - implicit-TLS на порту 465 (secure=true)
 *  - STARTTLS на портах 587/25 (secure=false + requireTLS=true)
 *
 * Раньше флаг secure брали напрямую из БД и не передавали requireTLS —
 * для 587 это приводило к тихим сбоям доставки.
 */
export function buildSmtpConfig(opts: SmtpTransportOptions) {
  const isStarttlsPort = opts.port === 587 || opts.port === 25;
  return {
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    // Для STARTTLS-портов форсируем шифрование, даже если secure=false
    requireTLS: isStarttlsPort && !opts.secure,
    auth: { user: opts.username, pass: opts.password },
    debug: true,
    logger: smtpLogger,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
  };
}

/**
 * Поиск папки «Отправленные» на сервере.
 * Сначала по системному флагу \Sent (надёжно), затем по имени.
 * Яндекс локализует имена папок (IMAP UTF-7), поэтому добавлены запасные варианты.
 */
async function findSentFolder(client: ImapFlow): Promise<string | null> {
  try {
    const folders = await client.list();
    const byFlag = folders.find((f) => f.flags?.has('\\Sent'));
    if (byFlag) return byFlag.path;

    const sentNames = ['Sent', 'INBOX.Sent', 'Отправленные', 'INBOX.Отправленные'];
    const byName = folders.find((f) =>
      sentNames.some((n) => f.path === n || f.path.toLowerCase().includes(n.toLowerCase()))
    );
    if (byName) return byName.path;

    // Яндекс кодирует «Отправленные» в IMAP UTF-7: &BB4EQgQ,BEAEMAQyBDsENQQ9BD0ESwQ1
    const byUtf7 = folders.find((f) => f.path.includes('&BB4EQgQ,BEAEMAQyBDsENQQ9BD0ESwQ1'));
    if (byUtf7) return byUtf7.path;

    return null;
  } catch (e) {
    console.warn('[SMTP] Не удалось получить список папок для Sent:', e);
    return null;
  }
}

/**
 * Сохранение копии отправленного письма в папку «Отправленные» через IMAP APPEND.
 * Ошибки append НЕ роняют отправку (письмо уже ушло через SMTP).
 */
async function appendToSent(
  mailbox: {
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    username: string;
  },
  password: string,
  raw: Buffer
): Promise<void> {
  const client = new ImapFlow({
    host: mailbox.imapHost,
    port: mailbox.imapPort,
    secure: mailbox.imapSecure,
    auth: { user: mailbox.username, pass: password },
    logger: false,
  });
  try {
    await client.connect();
    const sentFolder = await findSentFolder(client);
    if (!sentFolder) {
      console.warn('[SMTP] Папка «Отправленные» не найдена — копия не сохранена');
      return;
    }
    await client.append(sentFolder, raw, ['\\Seen']);
    console.log(`[SMTP] Копия письма сохранена в «Отправленные»: ${sentFolder}`);
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

interface SendEmailParams {
  mailboxId: string;
  conversationId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string[];
  fromEmail?: string;
  fromName?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  try {
    const mailbox = await prisma.mailbox.findUnique({
      where: { id: params.mailboxId },
    });

    if (!mailbox || !mailbox.isActive) {
      return { success: false, error: 'Почтовый ящик не найден или неактивен' };
    }

    const password = decrypt(mailbox.encryptedPassword);

    const fromAddress = params.fromEmail || mailbox.fromEmail;
    const fromFullName = params.fromName || mailbox.fromName || '';
    const from = fromFullName ? `"${fromFullName}" <${fromAddress}>` : fromAddress;

    // Диагностика: fromEmail должен совпадать с username авторизации.
    // Яндекс (и многие другие) тихо отбрасывают письма, где From ≠ аккаунту.
    if (fromAddress.toLowerCase() !== mailbox.username.toLowerCase()) {
      console.warn(
        `[SMTP] ВНИМАНИЕ: fromEmail ("${fromAddress}") не совпадает с username ` +
          `авторизации ("${mailbox.username}"). Многие провайдеры (в т.ч. Yandex) ` +
          'тихо отклоняют такие письма даже при ответе 250 OK.'
      );
    }

    // 1) Формируем сырой MIME через stream-транспорт (buffer).
    //    Один и тот же raw пойдёт и в SMTP, и в APPEND для «Отправленных» —
    //    Message-ID будет совпадать везде.
    const composer = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const composed = await composer.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText,
      inReplyTo: params.inReplyTo,
      references: params.references,
    });
    const raw = (composed.message as unknown as Buffer) ?? Buffer.from('');
    const generatedMessageId = composed.messageId || undefined;

    // 2) Отправляем готовый MIME через реальный SMTP-сервер.
    const transporter = nodemailer.createTransport(
      buildSmtpConfig({
        host: mailbox.smtpHost,
        port: mailbox.smtpPort,
        secure: mailbox.smtpSecure,
        username: mailbox.username,
        password,
      })
    );

    const mailResult = await transporter.sendMail({
      envelope: { from: fromAddress, to: params.to },
      raw: raw.toString('utf8'),
    });

    // Полный ответ SMTP — ключевой диагностический артефакт.
    console.log('[SMTP] Письмо принято сервером:', {
      messageId: mailResult.messageId,
      generatedMessageId,
      response: mailResult.response,
      accepted: mailResult.accepted,
      rejected: mailResult.rejected,
      envelope: mailResult.envelope,
    });

    const messageId = mailResult.messageId || generatedMessageId || null;

    // 3) Сохраняем копию в «Отправленные» (best-effort, не роняет отправку).
    try {
      await appendToSent(mailbox, password, raw);
    } catch (e) {
      console.warn('[SMTP] appendToSent не удался (письмо уже отправлено):', e);
    }

    // 4) Записываем исходящее сообщение в БД.
    await prisma.emailMessage.create({
      data: {
        conversationId: params.conversationId,
        mailboxId: params.mailboxId,
        direction: 'OUTBOUND',
        messageId,
        fromEmail: fromAddress,
        fromName: fromFullName || null,
        toEmail: params.to,
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        isFromManager: true,
      },
    });

    // 5) Обновляем переписку: статус и lastMessageAt.
    //    firstResponseAt ставим только если его ещё нет.
    const conv = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
    });
    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        lastMessageAt: new Date(),
        status: 'WAITING_CUSTOMER',
        ...(conv && !conv.firstResponseAt ? { firstResponseAt: new Date() } : {}),
      },
    });

    // 6) Сбрасываем ошибку ящика — отправка прошла успешно.
    await prisma.mailbox.update({
      where: { id: params.mailboxId },
      data: { lastError: null },
    });

    // 7) Если сервер отклонил получателя — возвращаем предупреждение.
    if (mailResult.rejected && mailResult.rejected.length > 0) {
      return {
        success: true,
        messageId: messageId || undefined,
        error: `Получатели отклонены сервером: ${mailResult.rejected.join(', ')}`,
      };
    }

    return { success: true, messageId: messageId || undefined };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[SMTP] Ошибка отправки письма:', errMsg);

    // Сохраняем ошибку на ящик, чтобы она была видна в админке.
    try {
      await prisma.mailbox.updateMany({
        where: { id: params.mailboxId },
        data: { lastError: errMsg.slice(0, 1000) },
      });
    } catch {
      /* ignore */
    }

    return { success: false, error: errMsg };
  }
}