import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id } = params;

    const data: Record<string, unknown> = {};
    const allowed = [
      'name', 'imapHost', 'imapPort', 'imapSecure',
      'smtpHost', 'smtpPort', 'smtpSecure', 'username',
      'fromEmail', 'fromName', 'isActive',
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.password) {
      data.encryptedPassword = encrypt(body.password);
    }

    const mailbox = await prisma.mailbox.update({
      where: { id },
      data,
      select: {
        id: true, name: true, imapHost: true, imapPort: true,
        imapSecure: true, smtpHost: true, smtpPort: true,
        smtpSecure: true, username: true, fromEmail: true,
        fromName: true, isActive: true, lastSyncAt: true,
        lastError: true, createdAt: true,
      },
    });

    return NextResponse.json({ mailbox });
  } catch {
    return NextResponse.json({ error: 'Нет доступа или ящик не найден' }, { status: 403 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await prisma.mailbox.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Нет доступа или ящик не найден' }, { status: 403 });
  }
}