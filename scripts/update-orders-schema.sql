-- Update orders table structure for Telegram integration
DROP TABLE IF EXISTS order_items CASCADE;

-- Recreate orders table with new structure
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  items jsonb NOT NULL,
  total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  tg_deeplink text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create telegram_links table
CREATE TABLE IF NOT EXISTS public.telegram_links (
  user_id text PRIMARY KEY,
  telegram_user_id text NOT NULL,
  telegram_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_telegram_links_telegram_user_id ON public.telegram_links(telegram_user_id);
