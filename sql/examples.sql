-- Enable once if needed:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update password by username (bcrypt hash already generated)
UPDATE public.users
SET password_hash = '$2b$12$REPLACE_WITH_YOUR_HASH', updated_at = now()
WHERE username = 'TEST';

-- Update password by email (case-insensitive)
UPDATE public.users
SET password_hash = '$2b$12$REPLACE_WITH_YOUR_HASH', updated_at = now()
WHERE lower(email) = lower('usr@mail.com');

-- Insert a new user (uuid default)
-- INSERT INTO public.users (username, email, password_hash, created_at, updated_at)
-- VALUES ('TEST','usr@mail.com','$2b$12$REPLACE', now(), now());
