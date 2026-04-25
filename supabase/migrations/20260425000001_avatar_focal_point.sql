-- =============================================================================
-- Avatar focal point + aspect ratio
-- =============================================================================
-- Reuses the focal-point system from artwork_photos so users can pick what
-- part of their avatar stays centered when displayed in a square (and
-- therefore circular) container. Same math (lib/focal-point.ts).
--
-- avatar_aspect_ratio is stored alongside the focal so display code can
-- compute object-position correctly without loading the image client-side
-- and waiting on an onload to know the natural dimensions.

alter table users
  add column avatar_focal_x       real not null default 0.5,
  add column avatar_focal_y       real not null default 0.5,
  add column avatar_aspect_ratio  real;

alter table users
  add constraint users_avatar_focal_x_range check (avatar_focal_x >= 0 and avatar_focal_x <= 1),
  add constraint users_avatar_focal_y_range check (avatar_focal_y >= 0 and avatar_focal_y <= 1);
