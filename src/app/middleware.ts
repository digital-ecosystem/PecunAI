import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

// Define which routes are protected
const protectedRoutes = ['/customer/dashboard', '/customer/phase', '/admin/dashboard', '/advisor/dashboard', '/customer/stepper'];
const adminSignInRoute = '/admin/signin';
const customerSignInRoute = '/customer/signin';

export default async function middleware(req: NextRequest) {
  // Normalize path (remove trailing slash)
  const rawPath = req.nextUrl.pathname;
  const path = rawPath.replace(/\/+$/, '') || '/';

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  // Try to read legacy `session` cookie and decrypt if present (keeps compatibility)
  const sessionCookie = req.cookies.get('session')?.value;
  let session = null;
  if (sessionCookie) {
    try {
      session = await decrypt(sessionCookie);
    } catch {
      session = null;
    }
  }

  // Also check presence of auth cookies used elsewhere in the app
  const hasAuthToken = !!req.cookies.get('auth-token')?.value;
  const hasSessionId = !!req.cookies.get('session-id')?.value;

  // Redirect logged-in admin away from admin sign-in page (only when we can detect role)
  if (path === adminSignInRoute && session?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.nextUrl));
  }

  // Redirect to home if not authenticated and trying to access a protected route
  // We consider the user authenticated when we have either a decrypted session with userId or auth cookies
  const isAuthenticated = !!session?.userId || hasAuthToken || hasSessionId;
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // Redirect authenticated users away from customer sign-in page
  if (path === customerSignInRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/customer/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}

// Apply middleware to all routes except static files and API
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(png|jpg|jpeg|gif|webp|avif|svg|ico|pdf|css|js|map|txt|xml|webmanifest|woff2?|ttf|eot)$).*)',
  ],
};