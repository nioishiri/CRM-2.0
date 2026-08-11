import { prisma } from '@/lib/prisma';
import { getSlaMinutes } from '@/lib/settings';

export async function checkSla(): Promise<{
  overdue: number;
  notified: number;
  errors: string[];
}> {
  const result = { overdue: 0, notified: 0, errors: [] as string[] };

  try {
    // Получаем настройки
    const slaMinutes = await getSlaMinutes();
    const notifyAdmin = await getSetting<boolean>('notify_admin_on_sla_overdue');

    // Находим просроченные переписки
    const overdueConversations = await prisma.conversation.findMany({
      where: {
        slaDueAt: { lt: new Date() },
        firstResponseAt: null,
        slaNotifiedAt: null,
        status: { notIn: ['RESOLVED', 'ARCHIVED'] },
      },
      include: {
        contact: true,
        mailbox: true,
      },
    });

    result.overdue = overdueConversations.length;

    // Находим всех активных админов
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
    });

    for (const conv of overdueConversations) {
      try {
        // Создаем уведомления для всех админов
        for (const admin of admins) {
          const minutesOverdue = Math.round(
            (Date.now() - conv.slaDueAt!.getTime()) / 60000
          );
          const contactName = conv.contact.name || conv.contact.email;

          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'SLA_OVERDUE',
              title: 'Просроченный ответ',
              body: `Обращение от "${contactName}" на тему "${conv.subject}" ожидает ответа более ${minutesOverdue} мин.`,
              conversationId: conv.id,
            },
          });
        }

        // Обновляем slaNotifiedAt
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { slaNotifiedAt: new Date() },
        });

        result.notified++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Ошибка уведомления для переписки ${conv.id}: ${errMsg}`);
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errMsg);
  }

  return result;
}

async function getSetting<T = string>(key: string): Promise<T | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return null;
  return setting.value as T;
}