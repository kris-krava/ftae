import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SESSION_TTL_COOKIE, SESSION_TTL_30D_SECONDS } from '@/lib/session-persistence'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Override the maxAge on Supabase auth cookies to match the user's
          // chosen session lifetime. Mobile auto-persists 30d; tablet/desktop
          // get 30d when the "Keep me logged in" box is ticked, otherwise 12h.
          // Falls back to 30d when the preference cookie is absent.
          const ttlRaw = cookieStore.get(SESSION_TTL_COOKIE)?.value
          const ttl = ttlRaw ? Number(ttlRaw) : SESSION_TTL_30D_SECONDS
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const next: CookieOptions = name.startsWith('sb-')
                ? { ...options, maxAge: ttl }
                : options
              cookieStore.set(name, value, next)
            })
          } catch {
            // Called from a Server Component — middleware handles session refresh
          }
        },
      },
    }
  )
}
