// Cross-component artwork lifecycle signals dispatched on window after a
// successful EditArtModal save or delete. The various ArtworkDetailsModal
// hosts (profile grid, Discover, Home feed) listen via useArtworkModal so
// the open modal can refetch (on update) or close itself (on delete) without
// any prop drilling between EditArt and its parents.

declare global {
  interface WindowEventMap {
    'artwork:updated': CustomEvent<{ artworkId: string }>;
    'artwork:deleted': CustomEvent<{ artworkId: string }>;
    'bookmark:toggled': CustomEvent<{ artworkId: string; bookmarked: boolean }>;
  }
}

export function emitArtworkUpdated(artworkId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('artwork:updated', { detail: { artworkId } }));
}

export function emitArtworkDeleted(artworkId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('artwork:deleted', { detail: { artworkId } }));
}

export function emitBookmarkToggled(artworkId: string, bookmarked: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('bookmark:toggled', { detail: { artworkId, bookmarked } }),
  );
}
