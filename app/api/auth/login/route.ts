import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Неверный формат данных', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    console.log('[LOGIN-ROUTE] attempting login', { email });

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      console.log('[LOGIN-ROUTE] user not found or inactive');
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log('[LOGIN-ROUTE] invalid password');
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    console.log('[LOGIN-ROUTE] auth OK, creating session');
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    console.log('[LOGIN-ROUTE] session created, returning response');
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}