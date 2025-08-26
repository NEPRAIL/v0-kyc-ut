-- Enhanced cleanup script for expired Telegram linking codes
-- This script removes codes that are either expired or used more than 1 hour ago

-- Remove expired codes (older than expiration time)
DELETE FROM public.telegram_linking_codes 
WHERE expires_at < NOW();

-- Remove used codes that are older than 1 hour (cleanup used codes)
DELETE FROM public.telegram_linking_codes 
WHERE used_at IS NOT NULL 
  AND used_at < NOW() - INTERVAL '1 hour';

-- Show statistics after cleanup
SELECT 
  COUNT(*) as total_codes,
  COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used_codes,
  COUNT(CASE WHEN expires_at > NOW() AND used_at IS NULL THEN 1 END) as active_codes,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_codes
FROM public.telegram_linking_codes;

-- Create or replace the cleanup function with better logging
CREATE OR REPLACE FUNCTION cleanup_expired_linking_codes()
RETURNS TABLE(
  deleted_expired integer,
  deleted_used integer,
  remaining_active integer
) AS $$
DECLARE
  expired_count integer;
  used_count integer;
  active_count integer;
BEGIN
  -- Delete expired codes
  DELETE FROM public.telegram_linking_codes 
  WHERE expires_at < NOW();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Delete old used codes
  DELETE FROM public.telegram_linking_codes 
  WHERE used_at IS NOT NULL 
    AND used_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS used_count = ROW_COUNT;
  
  -- Count remaining active codes
  SELECT COUNT(*) INTO active_count
  FROM public.telegram_linking_codes 
  WHERE expires_at > NOW() AND used_at IS NULL;
  
  -- Return results
  RETURN QUERY SELECT expired_count, used_count, active_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the cleanup strategy
COMMENT ON FUNCTION cleanup_expired_linking_codes() IS 'Cleans up expired and old used linking codes, returns cleanup statistics';
