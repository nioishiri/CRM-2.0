import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        contact: { select: { id: true, email: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        mailbox: { select: { id: true, name: true, fromEmail: true, fromName: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conv) {
      return NextResponse.json({ error: 'Переписка не найдена' }, { status: 404 });
    }

    // Менеджер может видеть только назначенные на него или новые
    if (session.role === 'MANAGER' && conv.assignedToId !== session.userId && conv.status !== 'NEW') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    return NextResponse.json({ conversation: conv });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId;

    // Менеджер может только взять в работу
    if (session.role === 'MANAGER') {
      if (data.assignedToId && data.assignedToId !== session.userId) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
      }
    }

    const conv = await prisma.conversation.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ conversation: conv });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}