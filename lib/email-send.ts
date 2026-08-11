import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

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

    const transporter = nodemailer.createTransport({
      host: mailbox.smtpHost,
      port: mailbox.smtpPort,
      secure: mailbox.smtpSecure,
      auth: {
        user: mailbox.username,
        pass: password,
      },
    });

    const fromAddress = params.fromEmail || mailbox.fromEmail;
    const fromFullName = params.fromName || mailbox.fromName || '';
    const from = fromFullName ? `"${fromFullName}" <${fromAddress}>` : fromAddress;

    const mailResult = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText,
      inReplyTo: params.inReplyTo,
      references: params.references,
    });

    const messageId = mailResult.messageId;

    // Сохраняем исходящее сообщение в БД
    await prisma.emailMessage.create({
      data: {
        conversationId: params.conversationId,
        mailboxId: params.mailboxId,
        direction: 'OUTBOUND',
        messageId: messageId || null,
        fromEmail: fromAddress,
        fromName: fromFullName || null,
        toEmail: params.to,
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        isFromManager: true,
      },
    });

    // Обновляем переписку: статус и lastMessageAt
    // firstResponseAt устанавливаем только если его ещё нет
    const conv = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
    });

    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        lastMessageAt: new Date(),
        status: 'WAITING_CUSTOMER',
        ...(conv && !conv.firstResponseAt
          ? { firstResponseAt: new Date() }
          : {}),
      },
    });

    return { success: true, messageId };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}