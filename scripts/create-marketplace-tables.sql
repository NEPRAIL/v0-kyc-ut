-- Create marketplace tables for KYCut
-- Note: users table already exists in the database

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rarities table
CREATE TABLE IF NOT EXISTS rarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  season_id UUID REFERENCES seasons(id),
  rarity_id UUID REFERENCES rarities(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Variants table
CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES variants(id),
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  quantity INTEGER DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table (was missing from original script)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  kind TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO seasons (name, description) VALUES 
  ('Season 1', 'The original arcade season with classic tokens'),
  ('Season 2', 'Advanced arcade season with enhanced collectibles')
ON CONFLICT (name) DO NOTHING;

INSERT INTO rarities (name, color, sort_order) VALUES 
  ('Common', '#6b7280', 1),
  ('Uncommon', '#10b981', 2),
  ('Rare', '#3b82f6', 3),
  ('Epic', '#8b5cf6', 4),
  ('Legendary', '#f59e0b', 5),
  ('Mythic', '#ef4444', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, slug, description, season_id, rarity_id, image_url) 
SELECT 
  'Arcade Season 1 Rank 1 Token', 
  'arcade-season-1-rank-1', 
  'First rank token from the original arcade season',
  s.id,
  r.id,
  '/green-arcade-token.png'
FROM seasons s, rarities r 
WHERE s.name = 'Season 1' AND r.name = 'Common'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, season_id, rarity_id, image_url) 
SELECT 
  'Arcade Season 1 Redemption Token - Gold', 
  'arcade-season-1-redemption-gold', 
  'Rare gold redemption token from Season 1',
  s.id,
  r.id,
  '/placeholder.svg?height=200&width=200'
FROM seasons s, rarities r 
WHERE s.name = 'Season 1' AND r.name = 'Legendary'
ON CONFLICT (slug) DO NOTHING;

-- Insert sample listings
INSERT INTO listings (product_id, price, stock)
SELECT p.id, 29.99, 100
FROM products p 
WHERE p.slug = 'arcade-season-1-rank-1'
ON CONFLICT DO NOTHING;

INSERT INTO listings (product_id, price, stock)
SELECT p.id, 199.99, 5
FROM products p 
WHERE p.slug = 'arcade-season-1-redemption-gold'
ON CONFLICT DO NOTHING;
