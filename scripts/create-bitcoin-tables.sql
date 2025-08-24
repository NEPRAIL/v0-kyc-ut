-- Updated script to work with existing database schema and add missing columns
-- Add missing columns to existing bitcoin_addresses table
ALTER TABLE bitcoin_addresses 
ADD COLUMN IF NOT EXISTS private_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS amount_expected BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_received BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

-- Create bitcoin_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS bitcoin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID NOT NULL REFERENCES bitcoin_addresses(id) ON DELETE CASCADE,
  txid VARCHAR(64) NOT NULL,
  vout INTEGER NOT NULL,
  amount BIGINT NOT NULL, -- in satoshis
  confirmations INTEGER DEFAULT 0,
  block_height INTEGER,
  block_hash VARCHAR(64),
  received_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  UNIQUE(txid, vout)
);

-- Add missing column to existing orders table if needed
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS bitcoin_address_id UUID REFERENCES bitcoin_addresses(id),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS amount_btc BIGINT DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bitcoin_addresses_order_id ON bitcoin_addresses(order_id);
CREATE INDEX IF NOT EXISTS idx_bitcoin_addresses_address ON bitcoin_addresses(address);
CREATE INDEX IF NOT EXISTS idx_bitcoin_addresses_status ON bitcoin_addresses(status);
CREATE INDEX IF NOT EXISTS idx_bitcoin_transactions_address_id ON bitcoin_transactions(address_id);
CREATE INDEX IF NOT EXISTS idx_bitcoin_transactions_txid ON bitcoin_transactions(txid);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_bitcoin_address_id ON orders(bitcoin_address_id);
