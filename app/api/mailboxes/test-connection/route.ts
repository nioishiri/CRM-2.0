import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, username, password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Пароль обязателен для проверки' }, { status: 400 });
    }

    const results: { imap: { ok: boolean; error?: string }; smtp: { ok: boolean; error?: string } } = {
      imap: { ok: false },
      smtp: { ok: false },
    };

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

    // Проверка SMTP
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpSecure !== false,
        auth: { user: username, pass: password },
      });
      await transporter.verify();
      results.smtp = { ok: true };
    } catch (e) {
      results.smtp = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}