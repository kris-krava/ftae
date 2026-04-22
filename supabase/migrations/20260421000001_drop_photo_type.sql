-- =============================================================================
-- Drop photo_type from artwork_photos
-- The column was scaffolded with enum values front/back/detail/shipping, but
-- assignments were position-based and the UI never surfaced the distinction.
-- Thumbnail selection now relies solely on sort_order (first photo wins).
-- =============================================================================

alter table artwork_photos drop column photo_type;

drop type artwork_photo_type;
