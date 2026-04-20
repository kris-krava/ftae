import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/app', '/onboarding', '/admin'];
const ADMIN_PREFIX = '/admin';
const DEV_PREFIX = '/dev';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  // /dev/* is gated behind NODE_ENV=development + FTAE_ENABLE_DEV_TOOLS=1.
  // Any other environment configuration causes a 404 here, before the rest
  // of middleware even runs. This is the architectural gate; the other four
  // layers (module-load throw, runtime assert, host check, notFound() in the
  // page) still apply on top.
  if (path === DEV_PREFIX || path.startsWith(`${DEV_PREFIX}/`)) {
    if (
      process.env.NODE_ENV !== 'development' ||
      process.env.FTAE_ENABLE_DEV_TOOLS !== '1'
    ) {
      return new NextResponse(null, { status: 404 });
    }
    return supabaseResponse;
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAdminPath = path === ADMIN_PREFIX || path.startsWith(`${ADMIN_PREFIX}/`);

  if (!isProtected) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Verify the user is active and (for /admin) has the right role.
  const { data: profile } = await supabase
    .from('users')
    .select('is_active, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.is_active === false) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    const response = NextResponse.redirect(url);
    // Clear the session so a deactivated user can't keep retrying.
    supabaseResponse.cookies.getAll().forEach(({ name }) => response.cookies.delete(name));
    return response;
  }

  if (isAdminPath && profile.role !== 'admin' && profile.role !== 'super_admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dev/:path*', '/app/:path*', '/onboarding/:path*', '/admin/:path*'],
};
