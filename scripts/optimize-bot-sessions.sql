-- Optimize bot session management with indexes and cleanup
-- This script improves performance and adds automatic cleanup for bot sessions

-- Add indexes for better bot session performance
CREATE INDEX IF NOT EXISTS idx_telegram_links_bot_token_hash ON public.telegram_links(bot_token_hash);
CREATE INDEX IF NOT EXISTS idx_telegram_links_expires_at ON public.telegram_links(bot_token_expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_links_last_seen ON public.telegram_links(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_telegram_links_user_active ON public.telegram_links(user_id, is_revoked, bot_token_expires_at);

-- Function to cleanup expired bot tokens
CREATE OR REPLACE FUNCTION cleanup_expired_bot_tokens()
RETURNS TABLE(
  revoked_count integer,
  active_count integer
) AS $$
DECLARE
  revoked_count integer;
  active_count integer;
BEGIN
  -- Revoke expired bot tokens
  UPDATE public.telegram_links 
  SET is_revoked = true, updated_at = NOW()
  WHERE bot_token_expires_at < NOW() 
    AND is_revoked = false;
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Count active sessions
  SELECT COUNT(*) INTO active_count
  FROM public.telegram_links 
  WHERE is_revoked = false 
    AND bot_token_expires_at > NOW();
  
  -- Return results
  RETURN QUERY SELECT revoked_count, active_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get bot session statistics
CREATE OR REPLACE FUNCTION get_bot_session_stats()
RETURNS TABLE(
  total_links integer,
  active_sessions integer,
  expired_sessions integer,
  revoked_sessions integer,
  sessions_expiring_soon integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_links,
    COUNT(CASE WHEN is_revoked = false AND bot_token_expires_at > NOW() THEN 1 END)::integer as active_sessions,
    COUNT(CASE WHEN is_revoked = false AND bot_token_expires_at <= NOW() THEN 1 END)::integer as expired_sessions,
    COUNT(CASE WHEN is_revoked = true THEN 1 END)::integer as revoked_sessions,
    COUNT(CASE WHEN is_revoked = false AND bot_token_expires_at > NOW() AND bot_token_expires_at < NOW() + INTERVAL '7 days' THEN 1 END)::integer as sessions_expiring_soon
  FROM public.telegram_links;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION cleanup_expired_bot_tokens() IS 'Revokes expired bot tokens and returns cleanup statistics';
COMMENT ON FUNCTION get_bot_session_stats() IS 'Returns comprehensive statistics about bot session states';

-- Show current session statistics
SELECT * FROM get_bot_session_stats();
