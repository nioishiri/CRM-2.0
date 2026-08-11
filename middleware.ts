import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'crm-session';

const ADMIN_PATHS = ['/admin'];
const AUTH_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[MIDDLEWARE]', pathname, {
    hasCookie: !!request.cookies.get(COOKIE_NAME),
  });

  // Разрешаем доступ к API и статическим файлам
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  console.log('[MIDDLEWARE] token check', {
    pathname,
    hasToken: !!token,
  });

  // Нет токена — редирект на login
  if (!token) {
    if (pathname === '/login') return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Есть токен — проверяем
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const role = payload.role as string;

    // Если на странице логина — редиректим на главную
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Проверка админских путей
    if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    // Токен невалидный
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};