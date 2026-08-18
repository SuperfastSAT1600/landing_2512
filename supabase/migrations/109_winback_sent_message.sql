-- Store the exact message recorded as sent for each winback target.
ALTER TABLE winback_targets
  ADD COLUMN IF NOT EXISTS sent_message TEXT;
