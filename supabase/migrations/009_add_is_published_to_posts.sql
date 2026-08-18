-- Add is_published column to posts table
-- Default: true (existing posts remain visible)
-- false = draft (not shown on landing page)

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
UPDATE posts SET is_published = true WHERE is_published IS NULL;
