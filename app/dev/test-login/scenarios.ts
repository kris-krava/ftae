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
  /** Inches; written to width/height/depth columns. */
  width?: number;
  height?: number;
  depth?: number;
  /** Stored in artworks.artist_statement. */
  description?: string;
  photos?: { url: string }[];
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

export interface ScenarioDiscoverPeer {
  name: string;
  location_city: string;
  medium: string;
  avatar_url: string;
  bio?: string;
  website_url?: string;
  social_platform?: SocialPlatform;
  social_handle?: string;
  artworks: ScenarioArtwork[];
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
  /** Auxiliary artist users seeded so their work appears on Discover. */
  discoverPeers?: ScenarioDiscoverPeer[];
  /** Wipe ALL test users (not just this scenario's) before seeding. */
  cleanupAllBefore?: boolean;
}

const HOME: string = '/app/home';
const STEP1 = '/onboarding/step-1';
const STEP3 = '/onboarding/step-3';
const DISCOVER = '/app/discover';

const SAMPLE_PHOTO = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/1024/768`;

const SAMPLE_AVATAR = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-avatar/400/400`;

/** Picsum at an explicit aspect — used to give each piece a varied photo set. */
const PHOTO = (seed: string, w: number, h: number) => ({
  url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`,
});
const P_2x3 = (seed: string) => PHOTO(seed, 800, 1200);
const P_3x4 = (seed: string) => PHOTO(seed, 900, 1200);
const P_4x3 = (seed: string) => PHOTO(seed, 1200, 900);
const P_16x9 = (seed: string) => PHOTO(seed, 1600, 900);
const P_1x1 = (seed: string) => PHOTO(seed, 1024, 1024);

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
    description: 'Steps 1 + 2 complete; no art yet. Lands on Step 3 (Add Art lite).',
    redirect: STEP3,
    profile: {
      name: 'Test Partial',
      location_city: 'Athens, GA',
      bio: 'Landscapes and graphite studies from rural Georgia.',
      avatar_url: SAMPLE_AVATAR('partial-profile'),
      // 80% under current weights (avatar 20 + name 15 + location 15 + mediums 15 + bio 15);
      // missing only the artwork 20pt that step-3 now collects.
      profile_completion_pct: 80,
    },
    mediums: ['Drawing', 'Oil'],
  },
  {
    id: 'founding-member',
    name: 'Complete profile — founding member',
    description: 'Full profile + 2 artworks + 3 months founding credit. Lands on /app/home.',
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
        width: 24,
        height: 36,
        photos: [{ url: SAMPLE_PHOTO('founder-1') }],
      },
      {
        title: 'Quiet Pecan Grove',
        year: 2023,
        medium: 'Oil on canvas',
        width: 18,
        height: 24,
        photos: [{ url: SAMPLE_PHOTO('founder-2') }],
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
        width: 9,
        height: 12,
        photos: [{ url: SAMPLE_PHOTO('ret-1') }],
      },
      {
        title: 'Shem Creek',
        year: 2023,
        medium: 'Oil on panel',
        width: 11,
        height: 14,
        photos: [{ url: SAMPLE_PHOTO('ret-2') }],
      },
      {
        title: 'Sullivan’s Island Shadows',
        year: 2024,
        medium: 'Oil on linen',
        width: 12,
        height: 16,
        photos: [{ url: SAMPLE_PHOTO('ret-3') }],
      },
      {
        title: 'Pineapple Fountain',
        year: 2023,
        medium: 'Oil on panel',
        width: 8,
        height: 10,
        photos: [{ url: SAMPLE_PHOTO('ret-4') }],
      },
      {
        title: 'Morris Lighthouse',
        year: 2022,
        medium: 'Oil on canvas',
        width: 16,
        height: 20,
        photos: [{ url: SAMPLE_PHOTO('ret-5') }],
      },
      {
        title: 'Edisto Oaks',
        year: 2024,
        medium: 'Oil on panel',
        width: 10,
        height: 12,
        photos: [{ url: SAMPLE_PHOTO('ret-6') }],
      },
    ],
    credits: [{ credit_type: 'founding_member', months_credited: 3, note: 'Test — founding grant' }],
    followersCount: 2,
    notifications: [
      { type: 'referral_joined', message: 'Someone just signed up with your link.', is_read: false },
      { type: 'profile_nudge', message: 'Welcome to Free Trade Art Exchange\nThanks for being a founding artist!', is_read: true },
    ],
  },
  {
    id: 'discover-grid',
    name: 'Discover grid — 7 artists',
    description:
      'Wipes all test users, seeds 7 artists (1 primary + 6 peers) with 3–5 artworks each and 2–6 varied-aspect photos per piece. Lands on /app/discover.',
    redirect: DISCOVER,
    cleanupAllBefore: true,
    profile: {
      name: 'Mira Bellanger',
      location_city: 'Savannah, GA',
      bio: 'Plein-air oil painter working the Georgia coast. SCAD ’14. I trade studies for studies — color sketches, marsh light, anything you’ve been sitting with.',
      website_url: 'https://mirabellanger.example',
      social_platform: 'instagram',
      social_handle: 'mira.paints',
      avatar_url: SAMPLE_AVATAR('discover-grid'),
      profile_completion_pct: 100,
    },
    mediums: ['Oil'],
    artworks: [
      {
        title: 'Forsyth Fountain',
        year: 2024,
        medium: 'Oil on panel',
        width: 11,
        height: 14,
        description:
          'Painted on-site at first light, before the joggers crowded out the egrets. The water spray catches the gold and pulls it apart.',
        photos: [P_4x3('forsyth-1'), P_3x4('forsyth-2'), P_1x1('forsyth-3'), P_16x9('forsyth-4')],
      },
      {
        title: 'Bonaventure Light',
        year: 2024,
        medium: 'Oil on linen',
        width: 16,
        height: 20,
        description:
          'Late afternoon under the live oaks. Spanish moss eats most of the sky; what comes through is warmer than you expect.',
        photos: [P_4x3('bonaventure-1'), P_2x3('bonaventure-2'), P_4x3('bonaventure-3')],
      },
      {
        title: 'Tybee Marsh',
        year: 2023,
        medium: 'Oil on panel',
        width: 9,
        height: 12,
        description: 'Two-hour study, painted from a folding stool sinking slowly into pluff mud.',
        photos: [P_16x9('tybee-1'), P_4x3('tybee-2')],
      },
      {
        title: 'Old Pink House',
        year: 2024,
        medium: 'Oil on panel',
        width: 12,
        height: 12,
        description:
          'A square format study of the façade in early evening. Trying to keep the pink honest without it going saccharine.',
        photos: [P_1x1('pink-house-1'), P_1x1('pink-house-2'), P_4x3('pink-house-3')],
      },
    ],
    discoverPeers: [
      {
        name: 'Juniper Hale',
        location_city: 'Asheville, NC',
        medium: 'Watercolor',
        bio: 'Watercolorist working from the Blue Ridge. Wet-on-wet, slow mornings, mountain laurel.',
        website_url: 'https://juniperhale.example',
        social_platform: 'instagram',
        social_handle: 'juniper.hale',
        avatar_url: SAMPLE_AVATAR('peer-juniper'),
        artworks: [
          {
            title: 'Blue Ridge Morning',
            year: 2024,
            medium: 'Watercolor on paper',
            width: 8,
            height: 10,
            description:
              'Painted from the porch in mid-October. The first frost was that morning; you can almost see it in the green.',
            photos: [P_4x3('blue-ridge-1'), P_3x4('blue-ridge-2'), P_1x1('blue-ridge-3'), P_16x9('blue-ridge-4')],
          },
          {
            title: 'Laurel Hollow',
            year: 2023,
            medium: 'Watercolor on paper',
            width: 9,
            height: 12,
            description: 'Mountain laurel in full bloom along a creek bend off the parkway.',
            photos: [P_3x4('laurel-1'), P_3x4('laurel-2'), P_4x3('laurel-3')],
          },
          {
            title: 'Pisgah Fog',
            year: 2024,
            medium: 'Watercolor on paper',
            width: 11,
            height: 15,
            description:
              'The fog rolling out of the cove burned off in maybe forty minutes. I had time for one piece, this was it.',
            photos: [P_16x9('pisgah-1'), P_16x9('pisgah-2')],
          },
          {
            title: 'Cabin in October',
            year: 2023,
            medium: 'Watercolor on paper',
            width: 10,
            height: 10,
            description: 'Studio piece worked up from sketches done over a long weekend with friends.',
            photos: [P_1x1('cabin-1'), P_1x1('cabin-2'), P_4x3('cabin-3'), P_3x4('cabin-4'), P_1x1('cabin-5')],
          },
          {
            title: 'French Broad',
            year: 2024,
            medium: 'Watercolor on paper',
            width: 7,
            height: 14,
            description: 'Long vertical study of a kayaker pulling out of a riffle. Wanted to keep it loose.',
            photos: [P_2x3('frenchbroad-1'), P_2x3('frenchbroad-2')],
          },
        ],
      },
      {
        name: 'Marco Reyes',
        location_city: 'Portland, OR',
        medium: 'Acrylic',
        bio: 'Acrylic painter, Pacific Northwest. Color-field experiments and river studies. Always up to trade.',
        website_url: 'https://marcoreyes.example',
        social_platform: 'instagram',
        social_handle: 'marco.reyes.studio',
        avatar_url: SAMPLE_AVATAR('peer-marco'),
        artworks: [
          {
            title: 'Willamette Reflection',
            year: 2023,
            medium: 'Acrylic on canvas',
            width: 12,
            height: 16,
            description:
              'The river under the Hawthorne in late afternoon, all flattened into bands of color. A study in restraint.',
            photos: [P_3x4('willamette-1'), P_4x3('willamette-2'), P_1x1('willamette-3')],
          },
          {
            title: 'Mt. Tabor',
            year: 2024,
            medium: 'Acrylic on panel',
            width: 18,
            height: 24,
            description: 'Painted from the upper reservoir looking west. The city smaller than you remember.',
            photos: [P_4x3('tabor-1'), P_4x3('tabor-2'), P_16x9('tabor-3'), P_3x4('tabor-4')],
          },
          {
            title: 'Forest Park, Wet',
            year: 2024,
            medium: 'Acrylic on canvas',
            width: 14,
            height: 18,
            description: 'After a long rain. Everything saturated. The trail just visible through the salal.',
            photos: [P_3x4('forestpark-1'), P_2x3('forestpark-2')],
          },
          {
            title: 'East Bank Study #4',
            year: 2023,
            medium: 'Acrylic on board',
            width: 10,
            height: 10,
            description:
              'Fourth in a small series. I was trying to get the warehouse roofline to feel inevitable. Not sure I got it.',
            photos: [P_1x1('eastbank-1'), P_1x1('eastbank-2'), P_4x3('eastbank-3'), P_1x1('eastbank-4'), P_3x4('eastbank-5'), P_1x1('eastbank-6')],
          },
        ],
      },
      {
        name: 'Eleanor Park',
        location_city: 'Brooklyn, NY',
        medium: 'Printmaking',
        bio: 'Printmaker in Bushwick. Linocut and reduction prints, mostly small editions of 12–20.',
        website_url: 'https://eleanorpark.example',
        social_platform: 'instagram',
        social_handle: 'eleanor.cuts',
        avatar_url: SAMPLE_AVATAR('peer-eleanor'),
        artworks: [
          {
            title: 'Tidal Pool',
            year: 2024,
            medium: 'Linocut, edition of 18',
            width: 10,
            height: 12,
            description:
              'Two-color reduction print from sketches at Fort Tilden. The black is a soft black; the blue is mixed warm.',
            photos: [P_4x3('tidalpool-1'), P_3x4('tidalpool-2'), P_1x1('tidalpool-3'), P_4x3('tidalpool-4')],
          },
          {
            title: 'Subway Window',
            year: 2023,
            medium: 'Linocut, edition of 24',
            width: 8,
            height: 10,
            description: 'Drawn from memory of a Q train at night, then cut over a long weekend.',
            photos: [P_3x4('subway-1'), P_3x4('subway-2')],
          },
          {
            title: 'Brooklyn Yard',
            year: 2024,
            medium: 'Reduction linocut, edition of 12',
            width: 11,
            height: 14,
            description:
              'Three-color reduction. Dries between layers took a week each. The yellow is what holds it together.',
            photos: [P_4x3('byard-1'), P_4x3('byard-2'), P_3x4('byard-3')],
          },
        ],
      },
      {
        name: 'Theo Okafor',
        location_city: 'Oakland, CA',
        medium: 'Drawing',
        bio: 'Charcoal and graphite drawings, mostly from the East Bay industrial corridor. Slow looking, slow marking.',
        website_url: 'https://theookafor.example',
        social_platform: 'instagram',
        social_handle: 'theo.draws',
        avatar_url: SAMPLE_AVATAR('peer-theo'),
        artworks: [
          {
            title: 'Shipyard Crane',
            year: 2022,
            medium: 'Charcoal on paper',
            width: 14,
            height: 17,
            description:
              'Drawn over three sessions at the old Bethlehem yard before the cranes came down. The chain is what I keep coming back to.',
            photos: [P_3x4('crane-1'), P_4x3('crane-2'), P_3x4('crane-3'), P_1x1('crane-4')],
          },
          {
            title: 'Grain Elevator',
            year: 2023,
            medium: 'Graphite on paper',
            width: 12,
            height: 18,
            description: 'Long vertical study of the grain elevator off the estuary. Tried not to flatter it.',
            photos: [P_2x3('grain-1'), P_2x3('grain-2'), P_3x4('grain-3')],
          },
          {
            title: 'Container Stack at Dusk',
            year: 2024,
            medium: 'Charcoal and white chalk on toned paper',
            width: 18,
            height: 24,
            description:
              'The light goes from sodium to actual dark in about twelve minutes here. I was working in tonality, not edges.',
            photos: [P_4x3('container-1'), P_4x3('container-2'), P_16x9('container-3')],
          },
          {
            title: 'BART Maintenance Bay',
            year: 2024,
            medium: 'Graphite on paper',
            width: 11,
            height: 14,
            description: 'Done from a single 90-minute pass. I got there early, they let me sit on a milk crate.',
            photos: [P_3x4('bart-1'), P_4x3('bart-2')],
          },
        ],
      },
      {
        name: 'Amal Nasser',
        location_city: 'Austin, TX',
        medium: 'Mixed Media',
        bio: 'Mixed-media work — collage, encaustic, found paper. Topics tend toward memory, migration, and the Texas grid.',
        website_url: 'https://amalnasser.example',
        social_platform: 'instagram',
        social_handle: 'amal.studio',
        avatar_url: SAMPLE_AVATAR('peer-amal'),
        artworks: [
          {
            title: 'Desert Bloom',
            year: 2024,
            medium: 'Mixed media on board',
            width: 9,
            height: 12,
            depth: 1,
            description:
              'Encaustic, monoprint fragments, a little gold leaf. The bloom is meant to be indistinct — you find it or you don’t.',
            photos: [P_3x4('bloom-1'), P_3x4('bloom-2'), P_4x3('bloom-3'), P_1x1('bloom-4'), P_3x4('bloom-5')],
          },
          {
            title: 'Letters Home',
            year: 2023,
            medium: 'Collage and ink on paper',
            width: 16,
            height: 20,
            description: 'Built from envelopes my grandmother kept. The handwriting is hers; the rest is mine.',
            photos: [P_4x3('letters-1'), P_3x4('letters-2'), P_4x3('letters-3')],
          },
          {
            title: 'I-35 South',
            year: 2024,
            medium: 'Acrylic and transfer on canvas',
            width: 24,
            height: 36,
            depth: 1.5,
            description:
              'Driving south at sunset. The grid breaks into Hill Country and you can feel it in the steering. This is what that feels like.',
            photos: [P_2x3('i35-1'), P_3x4('i35-2'), P_2x3('i35-3'), P_3x4('i35-4'), P_3x4('i35-5'), P_3x4('i35-6')],
          },
          {
            title: 'Greenbelt Map',
            year: 2024,
            medium: 'Mixed media on panel',
            width: 12,
            height: 12,
            description: 'A map of the Barton Creek Greenbelt that is mostly wrong. The wrongness is the point.',
            photos: [P_1x1('greenbelt-1'), P_1x1('greenbelt-2')],
          },
          {
            title: 'East Cesar Chavez',
            year: 2023,
            medium: 'Encaustic on board',
            width: 10,
            height: 10,
            depth: 1,
            description: 'Small piece, made fast. The street I lived on for six years.',
            photos: [P_1x1('cesar-1'), P_1x1('cesar-2'), P_4x3('cesar-3')],
          },
        ],
      },
      {
        name: 'Rosa Lindström',
        location_city: 'Minneapolis, MN',
        medium: 'Oil',
        bio: 'Oil painter, Minneapolis. Lakes, light through pine, the way January looks at 3pm.',
        website_url: 'https://rosalindstrom.example',
        social_platform: 'instagram',
        social_handle: 'rosa.lindstrom',
        avatar_url: SAMPLE_AVATAR('peer-rosa'),
        artworks: [
          {
            title: 'Lake Harriet Winter',
            year: 2023,
            medium: 'Oil on linen',
            width: 16,
            height: 20,
            description:
              'A January morning, painted from the bandshell. The white isn’t white; it’s about eight different things.',
            photos: [P_4x3('harriet-1'), P_3x4('harriet-2'), P_16x9('harriet-3'), P_4x3('harriet-4')],
          },
          {
            title: 'Cedar Lake, Late Light',
            year: 2024,
            medium: 'Oil on panel',
            width: 11,
            height: 14,
            description: 'Painted from the north shore in late August. The kind of light that makes you forget what time it is.',
            photos: [P_4x3('cedar-1'), P_4x3('cedar-2'), P_3x4('cedar-3')],
          },
          {
            title: 'North Loop Snow',
            year: 2024,
            medium: 'Oil on panel',
            width: 9,
            height: 12,
            description: 'Quick study after a heavy snow. The brick reads warmer than it should; I kept it.',
            photos: [P_3x4('northloop-1'), P_4x3('northloop-2')],
          },
        ],
      },
    ],
  },
];

export function getScenario(id: string): Scenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
