import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminUserFromRequest } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const adminUser = await getAdminUserFromRequest(request);
  if (adminUser) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/v2/:path*'],
};
