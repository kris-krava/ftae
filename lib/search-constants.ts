/**
 * Shared search constants — kept outside `app/_lib` so client components can
 * import them without dragging the `server-only` marker into the bundle.
 */

/** Minimum input length the server will actually run a pattern query for.
 * Single characters generate huge result sets and are almost never useful;
 * this also caps wasted DB work from accidental keystrokes. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Hard cap on the input string the server will accept; anything longer is
 * treated as an empty result. Protects DB logs and the trigram path. */
export const SEARCH_MAX_QUERY_LENGTH = 80;
