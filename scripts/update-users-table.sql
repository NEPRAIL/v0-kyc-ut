-- Update users table to support username-based authentication and Telegram integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS telegram_user_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Create sessions table for Lucia auth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Update existing users to have username if they don't
UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL;
