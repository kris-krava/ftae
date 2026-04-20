'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const SAFE_NEXT = /^\/[A-Za-z0-9/_\-.?=&%]*$/;

export function FinishClient() {
  const [status, setStatus] = useState('Finishing login…');

  useEffect(() => {
    async function finish() {
      // Read intended destination from query string.
      const search = new URLSearchParams(window.location.search);
      const nextRaw = search.get('next') ?? '/app/following';
      const next = SAFE_NEXT.test(nextRaw) ? nextRaw : '/app/following';

      const supabase = createClient();

      // PKCE flow (when Supabase returns ?code=...) — handled server-style
      // by exchangeCodeForSession. Admin-generated links don't use this path,
      // but support it for completeness.
      const code = search.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus(`Auth error: ${error.message}`);
          return;
        }
        window.location.href = next;
        return;
      }

      // Implicit flow: tokens live in the URL fragment. This is what
      // supabase.auth.admin.generateLink() produces for magic links.
      const rawHash = window.location.hash.replace(/^#/, '');
      if (!rawHash) {
        setStatus('No auth token in URL. Go back and pick a scenario again.');
        return;
      }
      const hash = new URLSearchParams(rawHash);
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (!accessToken || !refreshToken) {
        setStatus('Missing access or refresh token in URL fragment.');
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setStatus(`Auth error: ${error.message}`);
        return;
      }

      // Strip the hash so the eventual URL is clean.
      window.location.href = next;
    }

    finish();
  }, []);

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-[24px]">
      <p className="font-sans text-muted text-[14px] leading-[22px] text-center">{status}</p>
    </main>
  );
}
