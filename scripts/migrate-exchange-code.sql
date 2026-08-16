-- Sirius Exchange integration: add exchange_code column to user_profiles
-- Run once on the server: psql $DATABASE_URL -f scripts/migrate-exchange-code.sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS exchange_code TEXT;
