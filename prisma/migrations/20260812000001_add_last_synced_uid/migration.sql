-- Добавлено поле для инкрементальной синхронизации по UID.
-- Заменяет зависимость от флага \Seen (раньше CRM тянула только непрочитанные).
ALTER TABLE "Mailbox" ADD COLUMN "lastSyncedUid" INTEGER;
