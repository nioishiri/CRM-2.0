import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireUser();
    const body = await request.json();
    const existing = await prisma.template.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }
    if (existing.scope === 'PERSONAL' && existing.createdById !== session.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    if (existing.scope === 'GLOBAL' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.body !== undefined) data.body = body.body;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const template = await prisma.template.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}