import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { markAsRead, markAllAsRead } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(request.url);
    const unread = searchParams.get('unread');

    const where: Record<string, unknown> = { userId: session.userId };
    if (unread === 'true') where.readAt = null;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        conversation: { select: { id: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, readAt: null },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = await request.json();

    if (body.markAllRead) {
      await markAllAsRead(session.userId);
      return NextResponse.json({ ok: true });
    }

    if (body.notificationId) {
      await markAsRead(body.notificationId, session.userId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Не указано действие' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}