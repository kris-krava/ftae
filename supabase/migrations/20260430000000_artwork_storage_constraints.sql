-- Tighten the artwork-photos bucket so Storage itself rejects oversize or
-- wrong-type uploads — defense-in-depth against any client that ignores the
-- ~2 MB browser-side compression target. The signed-URL upload pipeline lets
-- us trust the path prefix (server-controlled) but Storage is the final
-- gatekeeper for file contents.
--
-- 5 MB ceiling: comfortably above the ~2 MB compression target so a noisy
-- compressor pass can still land, but well below anything that would slow
-- the home feed or torch user data plans.
update storage.buckets
   set file_size_limit   = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'artwork-photos';

-- Avatars get the same treatment at a tighter ceiling — single photo, never
-- shown larger than 180×180.
update storage.buckets
   set file_size_limit   = 1572864,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';
