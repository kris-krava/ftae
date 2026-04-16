export interface ProfileData {
  name?: string | null
  avatar_url?: string | null
  location_city?: string | null
  bio?: string | null
  website_url?: string | null
  social_handle?: string | null
}

/**
 * Calculates profile completion percentage.
 * avatar 20% | name 15% | location 15% | mediums 15% | bio 15% | links 5% | artwork 15%
 */
export function calculateCompletion(
  user: ProfileData,
  mediumCount: number,
  artworkCount: number,
): number {
  let pct = 0
  if (user.avatar_url) pct += 20
  if (user.name) pct += 15
  if (user.location_city) pct += 15
  if (mediumCount > 0) pct += 15
  if (user.bio) pct += 15
  if (user.website_url || user.social_handle) pct += 5
  if (artworkCount > 0) pct += 15
  return pct
}
