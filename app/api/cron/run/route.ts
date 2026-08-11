import { NextRequest, NextResponse } from 'next/server';
import { syncAllMailboxes } from '@/lib/email-sync';
import { checkSla } from '@/lib/sla';

export async function GET(request: NextRequest) {
  // Проверка CRON_SECRET
  const secret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Синхронизация почты
  const syncResult = await syncAllMailboxes();

  // Проверка SLA
  const slaResult = await checkSla();

  return NextResponse.json({
    ok: true,
    sync: {
      processed: syncResult.processed,
      newConversations: syncResult.newConversations,
      errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
    },
    sla: {
      overdue: slaResult.overdue,
      notified: slaResult.notified,
      errors: slaResult.errors.length > 0 ? slaResult.errors : undefined,
    },
  });
}