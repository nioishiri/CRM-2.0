import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email-send';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Авторизация отдельно: её сбой = 401, а не маскировка реальной ошибки под «нет доступа»
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        mailbox: { select: { id: true, fromEmail: true, fromName: true } },
      },
    });

    if (!conv) {
      return NextResponse.json({ error: 'Переписка не найдена' }, { status: 404 });
    }

    const lastMessage = await prisma.emailMessage.findFirst({
      where: { conversationId: conv.id, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    });

    const result = await sendEmail({
      mailboxId: conv.mailboxId,
      conversationId: conv.id,
      to: conv.contact.email,
      subject: `Re: ${conv.subject}`,
      bodyHtml: body.bodyHtml || body.bodyText,
      bodyText: body.bodyText,
      inReplyTo: lastMessage?.messageId || undefined,
      references: lastMessage?.messageId ? [lastMessage.messageId] : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[reply] Ошибка отправки ответа:', msg);
    return NextResponse.json({ error: 'Ошибка отправки: ' + msg }, { status: 500 });
  }
}