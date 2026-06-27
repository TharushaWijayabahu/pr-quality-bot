-- Intentional smoke test file.
-- This should help validate risky file detection.

ALTER TABLE smoke_test_users ADD COLUMN temporary_flag VARCHAR(255);
