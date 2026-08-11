import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';
import { z } from 'zod';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

const mailboxSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  imapHost: z.string().min(1, 'IMAP хост обязателен'),
  imapPort: z.number().int().positive(),
  imapSecure: z.boolean(),
  smtpHost: z.string().min(1, 'SMTP хост обязателен'),
  smtpPort: z.number().int().positive(),
  smtpSecure: z.boolean(),
  username: z.string().min(1, 'Имя пользователя обязательно'),
  password: z.string().optional(),
  fromEmail: z.string().email('Некорректный email отправителя'),
  fromName: z.string().optional(),
  isActive: z.boolean(),
});

export async function GET() {
  try {
    await requireAdmin();
    const mailboxes = await prisma.mailbox.findMany({
      select: {
        id: true,
        name: true,
        imapHost: true,
        imapPort: true,
        imapSecure: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        username: true,
        fromEmail: true,
        fromName: true,
        isActive: true,
        lastSyncAt: true,
        lastError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Добавляем признак "пароль установлен"
    const result = mailboxes.map((m) => ({
      ...m,
      hasPassword: true,
    }));
    return NextResponse.json({ mailboxes: result });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = mailboxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { password, ...data } = parsed.data;

    if (!password) {
      return NextResponse.json({ error: 'Пароль обязателен' }, { status: 400 });
    }

    const encryptedPassword = encrypt(password);

    const mailbox = await prisma.mailbox.create({
      data: { ...data, encryptedPassword },
      select: {
        id: true,
        name: true,
        imapHost: true,
        imapPort: true,
        imapSecure: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        username: true,
        fromEmail: true,
        fromName: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ mailbox }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}