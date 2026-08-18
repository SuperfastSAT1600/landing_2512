-- Add access_code column to posts table
-- NULL = public post, 6-digit string = gated post (requires code to view)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS access_code VARCHAR(6) NULL;
