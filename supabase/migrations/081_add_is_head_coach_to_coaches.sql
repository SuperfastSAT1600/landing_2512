ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS is_head_coach boolean NOT NULL DEFAULT false;
