import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage } from '@/app/_lib/artworks';
import { getLandingStats } from '@/app/_lib/landing-stats';
import { getOrigin } from '@/app/_lib/host';
import { StatsModule } from '@/components/StatsModule';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

export default async function FollowingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [{ data: profile }, { items: artworks }, stats] = await Promise.all([
    supabaseAdmin.from('users').select('referral_code').eq('id', user.id).single(),
    fetchArtworksPage(null),
    getLandingStats(),
  ]);

  const origin = getOrigin();
  const referralCode = profile?.referral_code as string | undefined;
  const referralUrl = referralCode ? `${origin}/r/${referralCode}` : `${origin}/`;

  // Repeat the artwork tiles to fill the grid even if there are few entries.
  const TILE_COUNT_MOBILE = 16;
  const tiles = Array.from({ length: TILE_COUNT_MOBILE }, (_, i) => artworks[i % Math.max(artworks.length, 1)]);

  return (
    <main className="bg-canvas min-h-screen w-full relative">
      <header
        className={
          'bg-canvas h-[56px] flex items-center pt-[30px] sticky top-0 z-10 ' +
          'px-[32px] tab:px-[120px] desk:px-[320px]'
        }
      >
        <h1 className="font-sans font-semibold text-[18px] text-ink">Following</h1>
      </header>

      {/* Blurred image grid */}
      <div className="grid grid-cols-2 tab:grid-cols-3 desk:grid-cols-5 gap-[4px] px-0">
        {tiles.map((art, i) => (
          <BlurredTile key={i} url={art?.primary_photo_url ?? null} index={i} />
        ))}
      </div>

      {/* Scrim + floating stats module */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 top-[56px] bottom-[80px] tab:bottom-0 tab:left-[60px] bg-black/40 z-20"
      />
      <div
        className={
          'fixed inset-x-0 z-30 flex justify-center px-[22px] ' +
          'top-[280px] tab:top-[425px] desk:top-[363px] ' +
          'tab:left-[60px] tab:right-0'
        }
      >
        <ErrorBoundary label="following-stats">
          <StatsModule
            foundingMembers={stats.foundingArtists}
            piecesToTrade={stats.piecesToTrade}
            daysUntilLaunch={stats.daysUntilLaunch}
            referralUrl={referralUrl}
          />
        </ErrorBoundary>
      </div>

      <DiscoverHint />
    </main>
  );
}

function BlurredTile({ url, index }: { url: string | null; index: number }) {
  const fallbackColors = ['#d1a680', '#85abc4', '#a6c999', '#d6998a', '#c4b57a', '#9191c7', '#8c7a73', '#b29e94'];
  const bg = fallbackColors[index % fallbackColors.length];
  return (
    <div
      className="relative aspect-square overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {url && (
        <Image
          src={url}
          alt=""
          fill
          sizes="(min-width: 1280px) 256px, (min-width: 768px) 256px, 50vw"
          className="object-cover blur-md scale-110"
          priority={index < 4}
        />
      )}
    </div>
  );
}

function DiscoverHint() {
  return (
    <>
      {/* Mobile: chip above bottom nav, pulse ring on Discover icon (icon 2 of 5, centered at x=117) */}
      <div className="fixed bottom-[80px] left-0 right-0 z-40 pointer-events-none tab:hidden">
        <div className="relative w-[195px] mx-auto">
          <span
            aria-hidden
            className="absolute -bottom-[30px] left-[78px] -translate-x-1/2 w-[44px] h-[44px] rounded-full border-2 border-accent/60 animate-ping"
          />
          <div className="bg-accent text-surface rounded-[10px] h-[36px] px-[14px] flex items-center shadow-[0_6px_16px_rgba(196,92,58,0.35)] mb-[14px]">
            <p className="font-sans font-semibold text-[13px] whitespace-nowrap">
              Tap Discover to find artists
            </p>
          </div>
        </div>
      </div>

      {/* Tablet/desktop: chip to the right of sidebar Discover icon (sidebar=60px wide, icon center y≈188px) */}
      <div className="hidden tab:block fixed top-[167px] left-[58px] z-40 pointer-events-none">
        <div className="relative">
          <span
            aria-hidden
            className="absolute -left-[58px] top-0 w-[44px] h-[44px] rounded-full border-2 border-accent/60 animate-ping"
          />
          <div className="bg-accent text-surface rounded-[10px] h-[41px] px-[16px] flex items-center shadow-[0_6px_16px_rgba(196,92,58,0.35)]">
            <p className="font-sans font-semibold text-[14px] whitespace-nowrap">
              Tap Discover to find artists you&rsquo;ll love
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
