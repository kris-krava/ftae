import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_TTL_COOKIE,
  SESSION_TTL_30D_SECONDS,
} from '@/lib/session-persistence';

const ADMIN_PREFIX = '/admin';
const DEV_PREFIX = '/dev';

// Auth-bypassed routes for unauthenticated visitors. Everything else triggers
// a sign-in redirect with the original path preserved as ?next=.
const PUBLIC_ROUTES = new Set<string>([
  '/',
  '/sign-in',
  '/check-email',
  '/terms',
  '/privacy',
]);

const PUBLIC_PREFIXES = ['/auth/', '/r/', '/api/'];

// Anonymous-only routes — authenticated users hitting these are sent into the
// app (or to ?next= if present).
const ANON_ONLY_ROUTES = new Set<string>(['/', '/sign-in', '/check-email']);

const APP_HOME = '/app/home';

function isPublicPath(path: string): boolean {
  if (PUBLIC_ROUTES.has(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

// Validate ?next= to prevent open-redirects: must be a same-origin path,
// must start with `/`, must not be `//` (protocol-relative), must not be `/api`
// or any of the auth-internal routes that would loop.
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/auth/')) return null;
  if (raw.startsWith('/api/')) return null;
  if (raw.length > 512) return null;
  return raw;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // /dev/* is gated behind NODE_ENV=development + FTAE_ENABLE_DEV_TOOLS=1.
  if (path === DEV_PREFIX || path.startsWith(`${DEV_PREFIX}/`)) {
    if (
      process.env.NODE_ENV !== 'development' ||
      process.env.FTAE_ENABLE_DEV_TOOLS !== '1'
    ) {
      return new NextResponse(null, { status: 404 });
    }
    return supabaseResponse;
  }

  const ttlRaw = request.cookies.get(SESSION_TTL_COOKIE)?.value;
  const ttl = ttlRaw ? Number(ttlRaw) : SESSION_TTL_30D_SECONDS;

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
          cookiesToSet.forEach(({ name, value, options }) => {
            const next: CookieOptions = name.startsWith('sb-')
              ? { ...options, maxAge: ttl }
              : options;
            supabaseResponse.cookies.set(name, value, next);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated branch.
  if (!user) {
    if (isPublicPath(path)) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    const nextValue = path + (request.nextUrl.search || '');
    url.search = `?next=${encodeURIComponent(nextValue)}`;
    return NextResponse.redirect(url);
  }

  // Authenticated branch — bounce away from anonymous-only marketing/auth pages.
  if (ANON_ONLY_ROUTES.has(path)) {
    const url = request.nextUrl.clone();
    const nextParam = safeNext(request.nextUrl.searchParams.get('next'));
    url.pathname = nextParam ?? APP_HOME;
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Active + role checks for any non-public route. This covers /app/*,
  // /onboarding/*, /admin/*, /[username], /[username]/artwork/[artworkId],
  // and any future authed surface.
  const isAdminPath = path === ADMIN_PREFIX || path.startsWith(`${ADMIN_PREFIX}/`);
  if (isPublicPath(path)) return supabaseResponse;

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
    supabaseResponse.cookies.getAll().forEach(({ name }) => response.cookies.delete(name));
    return response;
  }

  if (isAdminPath && profile.role !== 'admin' && profile.role !== 'super_admin') {
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Skip Next.js internals and static asset paths.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)'],
};
