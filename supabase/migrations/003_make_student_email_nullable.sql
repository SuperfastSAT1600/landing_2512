-- Make student_email nullable in both tables
-- Students now provide their email directly during the test flow

ALTER TABLE diagnostic_access_tokens ALTER COLUMN student_email DROP NOT NULL;
ALTER TABLE diagnostic_test_results ALTER COLUMN student_email DROP NOT NULL;
