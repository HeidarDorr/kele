import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (process.env.ADMIN_SESSION_PROVIDER !== 'postgres_otp') return NextResponse.next();

  const authenticated = request.cookies.has('kele_admin_session');
  const login = request.nextUrl.pathname === '/login';
  if (!authenticated && !login) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg|favicon.ico|media/).*)'],
};
