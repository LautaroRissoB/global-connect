-- =============================================================
-- Global Connect — Redemption system
-- =============================================================

-- Student saves a promotion to their benefits list
CREATE TABLE IF NOT EXISTS saved_benefits (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  promotion_id     UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
  saved_at         TIMESTAMPTZ DEFAULT NOW(),
  status           TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'redeemed')),
  UNIQUE(user_id, promotion_id)
);

-- Staff swipe creates a redemption record
CREATE TABLE IF NOT EXISTS redemptions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_benefit_id UUID REFERENCES saved_benefits(id) NOT NULL,
  user_id          UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  promotion_id     UUID REFERENCES promotions(id) NOT NULL,
  establishment_id UUID REFERENCES establishments(id) NOT NULL,
  redeemed_at      TIMESTAMPTZ DEFAULT NOW(),
  rating           SMALLINT CHECK (rating BETWEEN 1 AND 5)
);

-- Per-establishment redemption policy
ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS redemption_mode TEXT DEFAULT 'one_per_promo'
  CHECK (redemption_mode IN ('one_per_promo', 'one_per_establishment'));

-- RLS
ALTER TABLE saved_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved benefits"
  ON saved_benefits FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own redemptions"
  ON redemptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own redemptions"
  ON redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all redemptions"
  ON redemptions FOR SELECT USING (is_admin());

CREATE POLICY "Admins view all saved benefits"
  ON saved_benefits FOR SELECT USING (is_admin());
