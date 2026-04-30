export interface CompletionInputs {
  hasAvatar: boolean;
  hasName: boolean;
  hasLocation: boolean;
  mediumCount: number;
  hasBio: boolean;
  artworkCount: number;
}

// Weights sum to 100 so profile_completion_pct caps at 100 with all
// fields filled. Website + social handle are optional — they used to
// carry 5pt; that 5pt rolled into artwork (now 20) so having a piece
// matters more than a profile link.
const WEIGHTS = {
  avatar: 20,
  name: 15,
  location: 15,
  mediums: 15,
  bio: 15,
  artwork: 20,
} as const;

export function computeCompletion(input: CompletionInputs): number {
  let pct = 0;
  if (input.hasAvatar) pct += WEIGHTS.avatar;
  if (input.hasName) pct += WEIGHTS.name;
  if (input.hasLocation) pct += WEIGHTS.location;
  if (input.mediumCount > 0) pct += WEIGHTS.mediums;
  if (input.hasBio) pct += WEIGHTS.bio;
  if (input.artworkCount > 0) pct += WEIGHTS.artwork;
  return Math.min(100, Math.max(0, pct));
}
