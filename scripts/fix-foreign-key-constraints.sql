-- Fix foreign key constraints by ensuring users table exists first
-- Drop existing tables if they exist to recreate with proper constraints
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS linking_codes CASCADE;

-- Recreate tables with proper foreign key constraints
CREATE TABLE IF NOT EXISTS linking_codes (
  code VARCHAR(8) PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE NOT NULL,
  CONSTRAINT linking_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  total_amount NUMERIC DEFAULT 0 NOT NULL,
  status VARCHAR(24) DEFAULT 'pending' NOT NULL,
  items JSONB DEFAULT '[]' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  product_name VARCHAR(256) NOT NULL,
  price NUMERIC NOT NULL,
  quantity NUMERIC DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
