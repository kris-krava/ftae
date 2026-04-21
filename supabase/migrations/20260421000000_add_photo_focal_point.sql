-- =============================================================================
-- Add focal point to artwork_photos
-- Fractions [0, 1] of the photo's natural dimensions marking where the subject
-- sits. Square thumbnail surfaces (Profile grid, Discover grid) render with
-- CSS `object-position: X% Y%` derived from these so the subject stays in
-- view instead of the geometric center being cropped.
-- =============================================================================

alter table artwork_photos
  add column focal_x real not null default 0.5,
  add column focal_y real not null default 0.5;

alter table artwork_photos
  add constraint artwork_photos_focal_x_range check (focal_x >= 0 and focal_x <= 1),
  add constraint artwork_photos_focal_y_range check (focal_y >= 0 and focal_y <= 1);
