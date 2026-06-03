-- Optional admin-assigned title + badge image per networker (not profile avatar).
ALTER TABLE networker_users
  ADD COLUMN IF NOT EXISTS admin_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS admin_title_image_object_key TEXT NULL;
