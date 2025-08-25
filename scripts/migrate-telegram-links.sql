-- Migration to update telegram_links table structure for bot token support
-- Run this to update the existing table

-- First, backup existing data
CREATE TABLE telegram_links_backup AS SELECT * FROM telegram_links;

-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS telegram_links CASCADE;

CREATE TABLE telegram_links (
  telegram_user_id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_username TEXT,
  linked_via TEXT NOT NULL DEFAULT 'code',
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  bot_token_hash TEXT,
  bot_token_expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX telegram_links_user_unique ON telegram_links(user_id);
CREATE UNIQUE INDEX telegram_links_tgid_unique ON telegram_links(telegram_user_id);
CREATE INDEX telegram_links_token_idx ON telegram_links(bot_token_hash);

-- Migrate data from backup (adjust as needed based on your existing data structure)
INSERT INTO telegram_links (telegram_user_id, user_id, telegram_username, linked_via, is_revoked, created_at)
SELECT 
  telegram_user_id::BIGINT,
  user_id::UUID,
  telegram_username,
  'code',
  false,
  created_at
FROM telegram_links_backup;

-- Drop backup table after verification
-- DROP TABLE telegram_links_backup;
