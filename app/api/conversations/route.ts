import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');

    const where: Record<string, unknown> = {};

    // Менеджер видит только назначенные на него или новые
    if (session.role === 'MANAGER') {
      where.OR = [
        { assignedToId: session.userId },
        { assignedToId: null, status: 'NEW' },
      ];
    }

    if (status) {
      where.status = status;
    }
    if (assignedToId && session.role === 'ADMIN') {
      where.assignedToId = assignedToId;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { contact: { email: { contains: search, mode: 'insensitive' } } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: { select: { id: true, email: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}