/**
 * DEV-ONLY: signs in without email by setting a known password via the admin
 * client, then using signInWithPassword on the SSR client to set session cookies.
 * Never ships to production — hard-blocked by NODE_ENV check.
 */
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'
import styles from './page.module.css'

const DEV_PASSWORD = 'ftae-dev-bypass'

async function devLogin(formData: FormData) {
  'use server'
  if (process.env.NODE_ENV === 'production') redirect('/')

  const email = (formData.get('email') as string).trim()
  if (!email) return

  // 1. Ensure the auth user exists and has the dev password
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const existing = users.find(u => u.email === email)

  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
    })
  } else {
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
    })
  }

  // 2. Sign in with password — SSR client writes session cookies
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  })

  if (error) redirect(`/dev-login?error=${encodeURIComponent(error.message)}`)

  // 3. Hand off to the setup route which creates the DB user row if needed
  redirect('/auth/setup')
}

export default function DevLoginPage() {
  if (process.env.NODE_ENV === 'production') redirect('/')

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.badge}>DEV ONLY</p>
        <h1 className={styles.heading}>Sign in without email</h1>
        <p className={styles.sub}>No magic link, no rate limits.</p>
        <form action={devLogin} className={styles.form}>
          <input
            name="email"
            type="email"
            required
            className={styles.input}
            placeholder="you@example.com"
            autoFocus
          />
          <button type="submit" className={styles.button}>Continue</button>
        </form>
      </div>
    </main>
  )
}
