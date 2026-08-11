import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    const where: Record<string, unknown> = { isActive: true };

    if (session.role === 'ADMIN') {
      if (scope === 'GLOBAL') where.scope = 'GLOBAL';
      if (scope === 'PERSONAL') {
        where.scope = 'PERSONAL';
        where.createdById = session.userId;
      }
    } else {
      where.OR = [
        { scope: 'GLOBAL' },
        { scope: 'PERSONAL', createdById: session.userId },
      ];
    }

    const templates = await prisma.template.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = await request.json();

    if (!body.title || !body.body) {
      return NextResponse.json({ error: 'Название и текст обязательны' }, { status: 400 });
    }

    const scope = session.role === 'ADMIN' && body.scope === 'GLOBAL' ? 'GLOBAL' : 'PERSONAL';
    
    const template = await prisma.template.create({
      data: {
        title: body.title,
        subject: body.subject || null,
        body: body.body,
        scope,
        createdById: session.userId,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }
}