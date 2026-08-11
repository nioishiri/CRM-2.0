import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      newCount,
      inProgressCount,
      resolvedToday,
      overdueConversations,
      totalConversations,
      managers,
      latestNotifications,
    ] = await Promise.all([
      prisma.conversation.count({ where: { status: 'NEW' } }),
      prisma.conversation.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.conversation.count({
        where: { firstResponseAt: { gte: todayStart } },
      }),
      prisma.conversation.findMany({
        where: {
          slaDueAt: { lt: now },
          firstResponseAt: null,
          status: { notIn: ['RESOLVED', 'ARCHIVED'] },
        },
        include: {
          contact: { select: { name: true, email: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { slaDueAt: 'asc' },
        take: 20,
      }),
      prisma.conversation.count(),
      prisma.user.findMany({
        where: { role: 'MANAGER', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { assignedConversations: true } },
        },
      }),
      prisma.notification.findMany({
        where: { readAt: null },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Нагрузка по менеджерам
    const managerStats = await Promise.all(
      managers.map(async (m) => {
        const overdue = await prisma.conversation.count({
          where: {
            assignedToId: m.id,
            slaDueAt: { lt: now },
            firstResponseAt: null,
            status: { notIn: ['RESOLVED', 'ARCHIVED'] },
          },
        });
        const answeredToday = await prisma.conversation.count({
          where: {
            assignedToId: m.id,
            firstResponseAt: { gte: todayStart },
          },
        });
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          totalAssigned: m._count.assignedConversations,
          overdue,
          answeredToday,
        };
      })
    );

    return NextResponse.json({
      stats: {
        new: newCount,
        inProgress: inProgressCount,
        resolvedToday,
        overdue: overdueConversations.length,
        total: totalConversations,
      },
      overdueConversations,
      managerStats,
      latestNotifications,
    });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}