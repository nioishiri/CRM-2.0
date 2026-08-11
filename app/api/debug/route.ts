import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('crm-session');
  const allCookies = cookieStore.getAll();

  return NextResponse.json({
    hasCookie: !!sessionCookie,
    cookieName: sessionCookie?.name || null,
    cookieValuePreview: sessionCookie?.value
      ? sessionCookie.value.substring(0, 25) + '...'
      : null,
    allCookieNames: allCookies.map(c => c.name),
    allCookieCount: allCookies.length,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      APP_URL: process.env.APP_URL,
      HOSTNAME: process.env.HOSTNAME,
      PORT: process.env.PORT,
      AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
      AUTH_SECRET_LEN: process.env.AUTH_SECRET?.length || 0,
    },
  });
}