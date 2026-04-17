export interface CompletionInputs {
  hasAvatar: boolean;
  hasName: boolean;
  hasLocation: boolean;
  mediumCount: number;
  hasBio: boolean;
  hasLinks: boolean;
  artworkCount: number;
}

const WEIGHTS = {
  avatar: 20,
  name: 15,
  location: 15,
  mediums: 15,
  bio: 15,
  links: 5,
  artwork: 15,
} as const;

export function computeCompletion(input: CompletionInputs): number {
  let pct = 0;
  if (input.hasAvatar) pct += WEIGHTS.avatar;
  if (input.hasName) pct += WEIGHTS.name;
  if (input.hasLocation) pct += WEIGHTS.location;
  if (input.mediumCount > 0) pct += WEIGHTS.mediums;
  if (input.hasBio) pct += WEIGHTS.bio;
  if (input.hasLinks) pct += WEIGHTS.links;
  if (input.artworkCount > 0) pct += WEIGHTS.artwork;
  return Math.min(100, Math.max(0, pct));
}
