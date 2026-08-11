import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { getSlaMinutes } from '@/lib/settings';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import crypto from 'crypto';

interface SyncResult {
  processed: number;
  newConversations: number;
  errors: string[];
}

export async function syncAllMailboxes(): Promise<SyncResult> {
  const total: SyncResult = { processed: 0, newConversations: 0, errors: [] };
  const activeMailboxes = await prisma.mailbox.findMany({
    where: { isActive: true },
  });
  for (const mailbox of activeMailboxes) {
    const result = await syncMailbox(mailbox);
    total.processed += result.processed;
    total.newConversations += result.newConversations;
    total.errors.push(...result.errors);
  }
  return total;
}

export async function syncMailbox(mailbox: {
  id: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  username: string;
  encryptedPassword: string;
}): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, newConversations: 0, errors: [] };
  let client: ImapFlow | null = null;

  try {
    const password = decrypt(mailbox.encryptedPassword);
    client = new ImapFlow({
      host: mailbox.imapHost,
      port: mailbox.imapPort,
      secure: mailbox.imapSecure,
      auth: { user: mailbox.username, pass: password },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const unseenMessages: Array<{
        uid: number;
        source: Buffer;
      }> = [];
      for await (const msg of client.fetch(
        { seen: false },
        { uid: true, source: true }
      )) {
        unseenMessages.push(msg as { uid: number; source: Buffer });
      }

      for (const msg of unseenMessages) {
        try {
          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId || null;
          const fromAddr = Array.isArray(parsed.from) ? parsed.from[0]?.value : parsed.from?.value;
          const fromEmail = fromAddr?.[0]?.address || 'unknown@unknown.com';
          const fromName = fromAddr?.[0]?.name || null;
          const toAddr = Array.isArray(parsed.to) ? parsed.to[0]?.value : parsed.to?.value;
          const toEmail = toAddr?.[0]?.address || null;
          const subject = parsed.subject || '(без темы)';
          const bodyText = parsed.text || '(пустое письмо)';
          const bodyHtml = parsed.html || null;
          const date = parsed.date || new Date();
          const inReplyTo = parsed.inReplyTo || null;
          const references = (parsed.references || []) as string[];

          const dedupId =
            messageId ||
            generateHash(fromEmail, subject, date, bodyText);

          const existing = await prisma.emailMessage.findFirst({
            where: { mailboxId: mailbox.id, messageId: dedupId },
          });
          if (existing) continue;

          let contact = await prisma.contact.findUnique({
            where: { email: fromEmail },
          });
          if (!contact) {
            contact = await prisma.contact.create({
              data: { email: fromEmail, name: fromName },
            });
          } else if (fromName && !contact.name) {
            contact = await prisma.contact.update({
              where: { id: contact.id },
              data: { name: fromName },
            });
          }

          let conv = await findConversation(
            mailbox.id,
            contact.id,
            subject,
            inReplyTo,
            references
          );

          const isNew = !conv;
          const slaMinutes = await getSlaMinutes();

          if (!conv) {
            conv = await prisma.conversation.create({
              data: {
                contactId: contact.id,
                mailboxId: mailbox.id,
                subject,
                status: 'NEW',
                lastMessageAt: date,
                slaDueAt: new Date(Date.now() + slaMinutes * 60 * 1000),
              },
            });
            result.newConversations++;
          } else {
            const updateData: Record<string, unknown> = {
              lastMessageAt: date,
            };
            if (
              conv.status === 'WAITING_CUSTOMER' ||
              conv.status === 'RESOLVED' ||
              conv.status === 'ARCHIVED'
            ) {
              updateData.status = 'NEW';
            }
            if (!conv.slaNotifiedAt) {
              updateData.slaDueAt = new Date(
                Date.now() + slaMinutes * 60 * 1000
              );
            }
            await prisma.conversation.update({
              where: { id: conv.id },
              data: updateData,
            });
          }

          await prisma.emailMessage.create({
            data: {
              conversationId: conv.id,
              mailboxId: mailbox.id,
              direction: 'INBOUND',
              messageId: dedupId,
              fromEmail,
              fromName,
              toEmail,
              subject,
              bodyText,
              bodyHtml,
              isFromManager: false,
              createdAt: date,
            },
          });

          result.processed++;
        } catch (parseError) {
          result.errors.push(
            `Ошибка письма: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }
      }

      if (unseenMessages.length > 0) {
        const uids = unseenMessages.map((m) => m.uid);
        await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }

    await client.logout();

    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Sync error: ${errMsg}`);
    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: { lastError: errMsg },
    });
    if (client) {
      try { await client.logout(); } catch { /* ok */ }
    }
  }

  return result;
}

function generateHash(
  fromEmail: string,
  subject: string,
  date: Date,
  body: string
): string {
  const snippet = body.substring(0, 200);
  const source = `${fromEmail}|${subject}|${date.toISOString()}|${snippet}`;
  return crypto.createHash('sha256').update(source).digest('hex');
}

async function findConversation(
  mailboxId: string,
  contactId: string,
  subject: string,
  inReplyTo: string | null,
  references: string[]
) {
  if (inReplyTo || references.length > 0) {
    const refs = [...(inReplyTo ? [inReplyTo] : []), ...references];
    const found = await prisma.emailMessage.findFirst({
      where: { mailboxId, messageId: { in: refs } },
      include: { conversation: true },
    });
    if (found?.conversation) return found.conversation;
  }

  const normalized = subject.replace(
    /^(Re|Fwd|FW|Ответ|Переслано):\\s*/i,
    ''
  ).trim();
  const recent = await prisma.conversation.findFirst({
    where: {
      mailboxId,
      contactId,
      subject: { contains: normalized, mode: 'insensitive' },
    },
    orderBy: { lastMessageAt: 'desc' },
  });
  return recent;
}
