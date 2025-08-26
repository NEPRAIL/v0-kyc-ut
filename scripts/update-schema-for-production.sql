-- Add new schema tables for production auth system
CREATE TABLE IF NOT EXISTS linking_codes (
  code VARCHAR(8) PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE NOT NULL
);

-- Update users table to support Telegram integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);

-- Update orders table to match new schema
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(32),
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT '0' NOT NULL,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]' NOT NULL;

-- Create unique constraint on order_number if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_key') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
    END IF;
END $$;

-- Update existing orders to have order numbers if they don't
UPDATE orders 
SET order_number = COALESCE(order_number, 'ORD-' || EXTRACT(EPOCH FROM created_at)::TEXT || '-' || SUBSTRING(id, 1, 8))
WHERE order_number IS NULL;
