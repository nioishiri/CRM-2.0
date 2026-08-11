import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { Role } from '@prisma/client';

const COOKIE_NAME = 'crm-session';

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET не установлен');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24,
  };

  console.log('[AUTH] createSession cookie set', {
    name: COOKIE_NAME,
    tokenPreview: token.substring(0, 15) + '...',
    options: { ...cookieOptions, token: '[hidden]' },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      APP_URL: process.env.APP_URL,
      AUTH_SECRET_LEN: process.env.AUTH_SECRET?.length || 0,
    },
  });

  cookieStore.set(COOKIE_NAME, token, cookieOptions);

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  console.log('[AUTH] getSession called', {
    hasCookie: !!token,
    cookieName: token ? COOKIE_NAME : null,
    allCookies: cookieStore.getAll().map(c => c.name),
  });

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    console.log('[AUTH] getSession valid', {
      userId: (payload as any).userId,
      role: (payload as any).role,
    });
    return payload as unknown as SessionPayload;
  } catch (err) {
    console.log('[AUTH] getSession invalid token', (err as Error).message);
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return session;
}