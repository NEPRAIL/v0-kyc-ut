-- Create telegram_linking_codes table for secure account linking
CREATE TABLE IF NOT EXISTS public.telegram_linking_codes (
  code text PRIMARY KEY,
  user_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_linking_codes_user_id ON public.telegram_linking_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_linking_codes_expires_at ON public.telegram_linking_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_linking_codes_used_at ON public.telegram_linking_codes(used_at);

-- Add cleanup function to remove expired codes (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_linking_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.telegram_linking_codes 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired codes (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-linking-codes', '0 * * * *', 'SELECT cleanup_expired_linking_codes();');

COMMENT ON TABLE public.telegram_linking_codes IS 'Temporary codes for linking Telegram accounts to user accounts';
COMMENT ON COLUMN public.telegram_linking_codes.code IS '8-character alphanumeric linking code';
COMMENT ON COLUMN public.telegram_linking_codes.user_id IS 'User ID from the users table';
COMMENT ON COLUMN public.telegram_linking_codes.expires_at IS 'When the code expires (10 minutes from creation)';
COMMENT ON COLUMN public.telegram_linking_codes.used_at IS 'When the code was used (NULL if unused)';
