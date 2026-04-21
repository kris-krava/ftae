import 'server-only';

// Declarative scenario definitions. Adding a new scenario = append to this
// array. The seeder interprets each field; no bespoke code per scenario unless
// you need a custom hook.

export type SocialPlatform =
  | 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube' | 'pinterest' | 'linkedin';

export interface ScenarioProfile {
  name?: string | null;
  location_city?: string | null;
  bio?: string | null;
  website_url?: string | null;
  social_platform?: SocialPlatform | null;
  social_handle?: string | null;
  avatar_url?: string | null;
  is_founding_member?: boolean;
  profile_completion_pct?: number;
}

export interface ScenarioArtwork {
  title: string;
  year: number;
  medium: string;
  dimensions?: string;
  photos?: { url: string; photo_type: 'front' | 'back' | 'detail' | 'shipping' }[];
}

export interface ScenarioCredit {
  credit_type: 'founding_member' | 'referral_bonus';
  months_credited: number;
  note?: string;
}

export interface ScenarioNotification {
  type:
    | 'profile_nudge' | 'referral_joined' | 'referral_completed'
    | 'trade_proposal' | 'trade_match' | 'system';
  message: string;
  is_read?: boolean;
}

export interface ScenarioReferral {
  /** True = this user is a referrer. Creates an aux referred user. */
  asReferrer: boolean;
  /** True = the referred user completed their profile, bonus issued. */
  completed: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  /** Where the browser lands after login. */
  redirect: string;
  profile?: ScenarioProfile;
  /** Medium names; resolved against the mediums table during seeding. */
  mediums?: string[];
  artworks?: ScenarioArtwork[];
  credits?: ScenarioCredit[];
  notifications?: ScenarioNotification[];
  referral?: ScenarioReferral;
  /** Number of auxiliary test users who follow the primary user. */
  followersCount?: number;
}

const HOME: string = '/app/following';
const STEP1 = '/onboarding/step-1';
const STEP3 = '/onboarding/step-3';

const SAMPLE_PHOTO = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/1024/768`;

const SAMPLE_AVATAR = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-avatar/400/400`;

export const SCENARIOS: Scenario[] = [
  {
    id: 'new-user',
    name: 'New user',
    description: 'Authenticated, empty profile. Lands on Step 1.',
    redirect: STEP1,
    profile: { profile_completion_pct: 0 },
  },
  {
    id: 'partial-profile',
    name: 'Partial profile',
    description: 'Steps 1 + 2 complete. Lands on Step 3.',
    redirect: STEP3,
    profile: {
      name: 'Test Partial',
      location_city: 'Athens, GA',
      bio: 'Landscapes and graphite studies from rural Georgia.',
      avatar_url: SAMPLE_AVATAR('partial-profile'),
      profile_completion_pct: 50,
    },
    mediums: ['Drawing', 'Oil'],
  },
  {
    id: 'founding-member',
    name: 'Complete profile — founding member',
    description: 'Full profile + 2 artworks + 3 months founding credit. Lands on /app/following.',
    redirect: HOME,
    profile: {
      name: 'Test Founder',
      location_city: 'Atlanta, GA',
      bio: 'Oil on linen; rural Georgia landscapes.',
      website_url: 'https://example.com/founder',
      social_platform: 'instagram',
      social_handle: 'testfounder',
      avatar_url: SAMPLE_AVATAR('founding-member'),
      is_founding_member: true,
      profile_completion_pct: 100,
    },
    mediums: ['Oil', 'Watercolor'],
    artworks: [
      {
        title: 'Morning on the Altamaha',
        year: 2024,
        medium: 'Oil on linen',
        dimensions: '24 × 36 in',
        photos: [{ url: SAMPLE_PHOTO('founder-1'), photo_type: 'front' }],
      },
      {
        title: 'Quiet Pecan Grove',
        year: 2023,
        medium: 'Oil on canvas',
        dimensions: '18 × 24 in',
        photos: [{ url: SAMPLE_PHOTO('founder-2'), photo_type: 'front' }],
      },
    ],
    credits: [{ credit_type: 'founding_member', months_credited: 3, note: 'Test — founding grant' }],
  },
  {
    id: 'returning-user',
    name: 'Returning user',
    description: 'Founding member with follows + notifications.',
    redirect: HOME,
    profile: {
      name: 'Test Returning',
      location_city: 'Charleston, SC',
      bio: 'Plein-air oils. Charleston + Lowcountry.',
      website_url: 'https://example.com/returning',
      social_platform: 'instagram',
      social_handle: 'testreturning',
      avatar_url: SAMPLE_AVATAR('returning-user'),
      is_founding_member: true,
      profile_completion_pct: 100,
    },
    mediums: ['Oil'],
    artworks: [
      {
        title: 'Battery at Dawn',
        year: 2024,
        medium: 'Oil on panel',
        dimensions: '9 × 12 in',
        photos: [{ url: SAMPLE_PHOTO('ret-1'), photo_type: 'front' }],
      },
      {
        title: 'Shem Creek',
        year: 2023,
        medium: 'Oil on panel',
        dimensions: '11 × 14 in',
        photos: [{ url: SAMPLE_PHOTO('ret-2'), photo_type: 'front' }],
      },
    ],
    credits: [{ credit_type: 'founding_member', months_credited: 3, note: 'Test — founding grant' }],
    followersCount: 2,
    notifications: [
      { type: 'referral_joined', message: 'Someone just signed up with your link.', is_read: false },
      { type: 'profile_nudge', message: 'Your profile is looking good\nAdd more work you\u2019d love to trade.', is_read: true },
    ],
  },
];

export function getScenario(id: string): Scenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
