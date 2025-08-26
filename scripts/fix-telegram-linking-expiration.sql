-- Enhanced SQL script with comprehensive logging and error handling
-- Ensure linking codes expire after exactly 10 minutes and clean up old codes

-- Log start of script execution
DO $$
BEGIN
    RAISE NOTICE 'Starting Telegram linking expiration fix at %', NOW();
END $$;

-- Clean up expired linking codes (older than 10 minutes)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM telegram_linking_codes 
    WHERE expires_at < NOW() - INTERVAL '10 minutes';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % expired linking codes', deleted_count;
END $$;

-- Update any existing codes to have proper 10-minute expiration
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE telegram_linking_codes 
    SET expires_at = created_at + INTERVAL '10 minutes'
    WHERE expires_at > created_at + INTERVAL '10 minutes' 
       OR expires_at < created_at + INTERVAL '5 minutes';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % linking codes to proper 10-minute expiration', updated_count;
END $$;

-- Safe index creation with conflict handling
-- Create index for better performance on expiration queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_telegram_linking_codes_expires_at'
    ) THEN
        CREATE INDEX idx_telegram_linking_codes_expires_at 
        ON telegram_linking_codes(expires_at);
        RAISE NOTICE 'Created index: idx_telegram_linking_codes_expires_at';
    ELSE
        RAISE NOTICE 'Index already exists: idx_telegram_linking_codes_expires_at';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create expires_at index: %', SQLERRM;
END $$;

-- Create index for better performance on code lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_telegram_linking_codes_code_expires'
    ) THEN
        CREATE INDEX idx_telegram_linking_codes_code_expires 
        ON telegram_linking_codes(code, expires_at) 
        WHERE used_at IS NULL;
        RAISE NOTICE 'Created index: idx_telegram_linking_codes_code_expires';
    ELSE
        RAISE NOTICE 'Index already exists: idx_telegram_linking_codes_code_expires';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create code_expires index: %', SQLERRM;
END $$;

-- Added comprehensive statistics and validation
-- Show current linking codes statistics
DO $$
DECLARE
    total_codes INTEGER;
    active_codes INTEGER;
    expired_codes INTEGER;
    used_codes INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_codes FROM telegram_linking_codes;
    SELECT COUNT(*) INTO active_codes FROM telegram_linking_codes WHERE expires_at > NOW() AND used_at IS NULL;
    SELECT COUNT(*) INTO expired_codes FROM telegram_linking_codes WHERE expires_at <= NOW();
    SELECT COUNT(*) INTO used_codes FROM telegram_linking_codes WHERE used_at IS NOT NULL;
    
    RAISE NOTICE '=== TELEGRAM LINKING CODES STATISTICS ===';
    RAISE NOTICE 'Total codes: %', total_codes;
    RAISE NOTICE 'Active codes: %', active_codes;
    RAISE NOTICE 'Expired codes: %', expired_codes;
    RAISE NOTICE 'Used codes: %', used_codes;
    RAISE NOTICE '==========================================';
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Telegram linking expiration fix completed at %', NOW();
END $$;
