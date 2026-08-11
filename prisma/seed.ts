import { PrismaClient, Role, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Создаём админа
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: 'Администратор',
      role: 'ADMIN' as Role,
      isActive: true,
    },
  });
  console.log(`Admin: ${admin.email} (${admin.id})`);

  // Создаём демо-менеджера
  if (process.env.SEED_DEMO_MANAGER === 'true') {
    const mgrEmail = process.env.DEMO_MANAGER_EMAIL || 'manager@example.com';
    const mgrPassword = process.env.DEMO_MANAGER_PASSWORD || 'Manager123!';
    const mgrHash = await bcrypt.hash(mgrPassword, 10);

    const manager = await prisma.user.upsert({
      where: { email: mgrEmail },
      update: {},
      create: {
        email: mgrEmail,
        passwordHash: mgrHash,
        name: 'Менеджер',
        role: 'MANAGER' as Role,
        isActive: true,
      },
    });
    console.log(`Manager: ${manager.email} (${manager.id})`);
  }

  // Настройки по умолчанию
  const settings: Array<{ key: string; value: Prisma.InputJsonValue }> = [
    { key: 'sla_response_minutes', value: 60 },
    { key: 'notify_admin_on_sla_overdue', value: true },
    { key: 'sync_interval_minutes', value: 5 },
    { key: 'app_name', value: 'CRM для менеджеров' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`Settings: ${settings.length} created/updated`);

  console.log('✅ Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
