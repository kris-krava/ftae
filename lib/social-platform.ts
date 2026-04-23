// Maps the database `social_platform` enum to the human-readable label used
// in profile UI ("Instagram: @handle"). Keep in sync with the enum in the
// initial schema migration.

const LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
};

export function getPlatformLabel(platform: string | null | undefined): string | null {
  if (!platform) return null;
  return LABELS[platform] ?? null;
}
