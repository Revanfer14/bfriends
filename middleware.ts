import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const AUTH_ROUTES = ['/login', '/signup'];
const ONBOARDING_ROUTE = '/onboarding';
const PUBLIC_ROUTES = ['/']; // Assuming '/' is a public route for now
const API_AUTH_PREFIX = '/api/auth'; // Supabase internal auth routes like /api/auth/callback

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete({ name, ...options });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow Supabase's own auth API routes and UploadThing API routes to pass through
  if (pathname.startsWith(API_AUTH_PREFIX) || pathname.startsWith('/api/uploadthing')) {
    return response;
  }

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isOnboardingRoute = pathname === ONBOARDING_ROUTE;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (authError || !user) { // User is not logged in or error validating user
    if (authError) {
      console.error('Middleware auth error:', authError.message);
    }
    if (isAuthRoute || isPublicRoute) {
      return response; // Allow access to login, signup, and defined public routes
    }
    // For any other route, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // User is logged in (user object exists)
  let profileComplete = false;
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('User') // VERIFY: Actual DB table name and ensure types/supabase.ts is up-to-date.
      .select('profileComplete')
      .eq('id', user.id) // Use user.id from getUser()
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: row not found
      console.error('Middleware: Error fetching user profile:', profileError.message);
      // If a critical error (like permission denied) occurs, redirect to login to break loop
      // This also handles cases where the user record might not yet exist in your public.User table
      return NextResponse.redirect(new URL('/login', request.url)); 
    }
    profileComplete = userProfile?.profileComplete || false;
  } catch (e: any) {
    console.error('Middleware: Exception fetching user profile:', e.message);
    return NextResponse.redirect(new URL('/login', request.url)); // Redirect to login on unexpected error
  }

  if (!profileComplete) {
    if (isOnboardingRoute) {
      return response; // Allow access to the onboarding page itself
    }
    // For any other route, if profile is not complete, redirect to onboarding
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
  }

  // User is logged in and profile is complete
  if (isAuthRoute || isOnboardingRoute) {
    // If trying to access login, signup, or onboarding page when already auth'd and onboarded, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response; // Allow access to the requested route, returning the (potentially updated by Supabase) response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Other static assets or specific public API endpoints can be added here.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
