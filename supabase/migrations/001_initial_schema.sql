-- =============================================================
-- Global Connect — Initial Schema
-- =============================================================

-- Profiles (extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  university TEXT NOT NULL,
  home_country TEXT NOT NULL,
  exchange_country TEXT NOT NULL,
  exchange_city TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Establishments
CREATE TABLE establishments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'bar', 'club', 'theater', 'cafe', 'sports', 'cultural', 'other')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  phone TEXT,
  website TEXT,
  opening_hours JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  original_price DECIMAL(10,2),
  discounted_price DECIMAL(10,2),
  discount_percentage INTEGER,
  valid_from DATE,
  valid_until DATE,
  terms_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  display_order INTEGER DEFAULT 0
);

-- Admin users
CREATE TABLE admin_users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at en establishments
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER establishments_updated_at
  BEFORE UPDATE ON establishments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- FUNCIÓN HELPER: rompe la recursión en las RLS policies
-- SECURITY DEFINER permite que corra con permisos del owner,
-- evitando el loop infinito cuando admin_users se consulta a sí misma.
-- =============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies: establishments (público read, admin write)
CREATE POLICY "Anyone can view active establishments"
  ON establishments FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage establishments"
  ON establishments FOR ALL USING (is_admin());

-- Policies: promotions (público read, admin write)
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promotions"
  ON promotions FOR ALL USING (is_admin());

-- Policies: categories (público read, admin write)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL USING (is_admin());

-- Policies: admin_users
-- Usa is_admin() en vez de consultar admin_users directamente → sin recursión
CREATE POLICY "Admins can view admin list"
  ON admin_users FOR SELECT USING (is_admin());

-- =============================================================
-- Seed: categorías iniciales
-- =============================================================
INSERT INTO categories (name, slug, icon, display_order) VALUES
  ('Restaurantes', 'restaurant', 'utensils', 1),
  ('Bares', 'bar', 'beer', 2),
  ('Discotecas', 'club', 'music', 3),
  ('Cafeterías', 'cafe', 'coffee', 4),
  ('Teatro & Cultura', 'cultural', 'theater', 5),
  ('Deportes', 'sports', 'dumbbell', 6),
  ('Otros', 'other', 'sparkles', 7);
