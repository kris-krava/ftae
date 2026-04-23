// 30-day cooldown between username changes. Timer starts at the moment of a
// successful change (when the magic-link callback writes the new username +
// stamps users.username_changed_at). The first onboarding pick does not
// stamp the column, so the user can change once with no cooldown applied.

export const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
