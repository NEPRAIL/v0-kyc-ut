-- Updated to match actual database schema - removed non-existent columns
-- Create admin account with specified credentials
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  salt,
  email_verified,
  two_factor_enabled,
  two_factor_secret,
  failed_login_attempts,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Admin',
  'Admin@Admin.admin',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', -- bcrypt hash of 'admin'
  'random_salt_value',
  true,
  false,
  null,
  0,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
