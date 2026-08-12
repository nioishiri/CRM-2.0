import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { buildSmtpConfig } from '@/lib/email-send';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const {
      imapHost,
      imapPort,
      imapSecure,
      smtpHost,
      smtpPort,
      smtpSecure,
      username,
      password,
      fromEmail,
    } = body;

    if (!password) {
      return NextResponse.json({ error: 'Пароль обязателен для проверки' }, { status: 400 });
    }

    const results: {
      imap: { ok: boolean; error?: string };
      smtp: { ok: boolean; error?: string };
      smtpSend?: {
        ok: boolean;
        response?: string;
        messageId?: string;
        accepted?: unknown[];
        rejected?: unknown[];
        error?: string;
      };
      warning?: string;
    } = {
      imap: { ok: false },
      smtp: { ok: false },
    };

    // Предупреждение: fromEmail должен совпадать с username (Yandex и др. это требуют)
    if (fromEmail && username && fromEmail.toLowerCase() !== String(username).toLowerCase()) {
      results.warning = `fromEmail ("${fromEmail}") не совпадает с username ("${username}"). Многие провайдеры отклоняют такие письма.`;
    }

    // Проверка IMAP
    try {
      const client = new ImapFlow({
        host: imapHost,
        port: imapPort || 993,
        secure: imapSecure !== false,
        auth: { user: username, pass: password },
        logger: false,
      });
      await client.connect();
      await client.logout();
      results.imap = { ok: true };
    } catch (e) {
      results.imap = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Проверка SMTP: connect + auth (verify), затем реальная отправка себе
    try {
      const transporter = nodemailer.createTransport(
        buildSmtpConfig({
          host: smtpHost,
          port: smtpPort || 587,
          secure: smtpSecure !== false,
          username,
          password,
        })
      );
      await transporter.verify();
      results.smtp = { ok: true };

      // Реальная тестовая отправка письма себе — проверяет доставку, а не только connect
      try {
        const testResult = await transporter.sendMail({
          from: username,
          to: username,
          subject: `[CRM] Тест SMTP ${new Date().toISOString()}`,
          text: 'Тестовое письмо проверки SMTP-отправки из CRM. Можно удалить.',
        });
        results.smtpSend = {
          ok: true,
          response: testResult.response,
          messageId: testResult.messageId,
          accepted: testResult.accepted,
          rejected: testResult.rejected,
        };
      } catch (e) {
        results.smtpSend = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    } catch (e) {
      results.smtp = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}