import { prisma } from '@/lib/prisma';

export type SettingKey =
  | 'sla_response_minutes'
  | 'notify_admin_on_sla_overdue'
  | 'sync_interval_minutes'
  | 'app_name';

export async function getSetting<T = string>(key: SettingKey): Promise<T | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return null;
  return setting.value as T;
}

export async function getSlaMinutes(): Promise<number> {
  const val = await getSetting<number>('sla_response_minutes');
  return val ?? 60;
}