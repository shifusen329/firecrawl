-- ============================================================
-- FIRECRAWL SELF-HOSTED SUPABASE SCHEMA
-- ============================================================

-- 1. AUTH TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- 2. LOGGING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL, -- scrape, crawl, batch_scrape, search, extract, llmstxt, deep_research, map, agent
  api_version TEXT,
  team_id UUID REFERENCES teams(id),
  origin TEXT,
  integration TEXT,
  target_hint TEXT,
  dr_clean_by TIMESTAMPTZ,
  api_key_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scrapes (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  url TEXT,
  is_successful BOOLEAN,
  error TEXT,
  time_taken INTEGER,
  team_id UUID,
  options JSONB,
  cost_tracking JSONB,
  pdf_num_pages INTEGER,
  credits_cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawls (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  url TEXT,
  team_id UUID,
  options JSONB,
  num_docs INTEGER,
  credits_cost INTEGER DEFAULT 0,
  cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_scrapes (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  team_id UUID,
  num_docs INTEGER,
  credits_cost INTEGER DEFAULT 0,
  cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extracts (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  urls TEXT[],
  team_id UUID,
  options JSONB,
  model_kind TEXT,
  credits_cost INTEGER DEFAULT 0,
  is_successful BOOLEAN,
  error TEXT,
  cost_tracking JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  query TEXT,
  team_id UUID,
  options JSONB,
  credits_cost INTEGER DEFAULT 0,
  is_successful BOOLEAN,
  error TEXT,
  num_results INTEGER,
  time_taken INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  url TEXT,
  team_id UUID,
  options JSONB,
  num_results INTEGER,
  credits_cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  success BOOLEAN,
  error TEXT,
  team_id UUID,
  crawl_id TEXT,
  scrape_id TEXT,
  url TEXT,
  status_code INTEGER,
  event TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_texts (
  origin_url TEXT PRIMARY KEY,
  llmstxt TEXT,
  llmstxt_full TEXT,
  max_urls INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blocklist (
  id SERIAL PRIMARY KEY,
  data JSONB DEFAULT '{"blocklist": [], "allowedKeywords": []}'::jsonb
);

CREATE TABLE IF NOT EXISTS deep_researches (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  query TEXT,
  team_id UUID,
  options JSONB,
  time_taken INTEGER,
  credits_cost INTEGER DEFAULT 0,
  cost_tracking JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llmstxts (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  url TEXT,
  team_id UUID,
  options JSONB,
  num_urls INTEGER,
  credits_cost INTEGER DEFAULT 0,
  cost_tracking JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AUTH RPC FUNCTION (Unlimited Credits)
-- ============================================================

CREATE OR REPLACE FUNCTION auth_credit_usage_chunk_39(
  input_key UUID,
  i_is_extract BOOLEAN DEFAULT false,
  tally_untallied_credits BOOLEAN DEFAULT false
)
RETURNS TABLE (
  api_key TEXT,
  api_key_id INTEGER,
  team_id TEXT,
  sub_id TEXT,
  sub_current_period_start TEXT,
  sub_current_period_end TEXT,
  sub_user_id TEXT,
  price_id TEXT,
  price_credits INTEGER,
  price_should_be_graceful BOOLEAN,
  price_associated_auto_recharge_price_id TEXT,
  credits_used INTEGER,
  coupon_credits INTEGER,
  adjusted_credits_used INTEGER,
  remaining_credits INTEGER,
  total_credits_sum INTEGER,
  plan_priority JSONB,
  rate_limits JSONB,
  concurrency INTEGER,
  flags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.key::TEXT as api_key,
    ak.id as api_key_id,
    ak.team_id::TEXT as team_id,
    'self-hosted'::TEXT as sub_id,
    now()::TEXT as sub_current_period_start,
    (now() + interval '100 years')::TEXT as sub_current_period_end,
    'self-hosted'::TEXT as sub_user_id,
    'self-hosted'::TEXT as price_id,
    999999999 as price_credits,
    false as price_should_be_graceful,
    NULL::TEXT as price_associated_auto_recharge_price_id,
    0 as credits_used,
    999999999 as coupon_credits,
    0 as adjusted_credits_used,
    999999999 as remaining_credits,
    999999999 as total_credits_sum,
    '{"bucketLimit": 1000, "planModifier": 0.1}'::JSONB as plan_priority,
    jsonb_build_object(
      'crawl', 999999999,
      'scrape', 999999999,
      'search', 999999999,
      'map', 999999999,
      'extract', 999999999,
      'preview', 999999999,
      'crawlStatus', 999999999,
      'extractStatus', 999999999,
      'extractAgentPreview', 999999999,
      'scrapeAgentPreview', 999999999
    ) as rate_limits,
    999999999 as concurrency,
    '{}'::JSONB as flags
  FROM api_keys ak
  WHERE ak.key = input_key;
END;
$$ LANGUAGE plpgsql;

-- Same function but by team_id
CREATE OR REPLACE FUNCTION auth_credit_usage_chunk_39_from_team(
  input_team UUID,
  i_is_extract BOOLEAN DEFAULT false,
  tally_untallied_credits BOOLEAN DEFAULT false
)
RETURNS TABLE (
  api_key_id INTEGER,
  team_id TEXT,
  sub_id TEXT,
  sub_current_period_start TEXT,
  sub_current_period_end TEXT,
  sub_user_id TEXT,
  price_id TEXT,
  price_credits INTEGER,
  price_should_be_graceful BOOLEAN,
  price_associated_auto_recharge_price_id TEXT,
  credits_used INTEGER,
  coupon_credits INTEGER,
  adjusted_credits_used INTEGER,
  remaining_credits INTEGER,
  total_credits_sum INTEGER,
  plan_priority JSONB,
  rate_limits JSONB,
  concurrency INTEGER,
  flags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    0 as api_key_id,
    input_team::TEXT as team_id,
    'self-hosted'::TEXT as sub_id,
    now()::TEXT as sub_current_period_start,
    (now() + interval '100 years')::TEXT as sub_current_period_end,
    'self-hosted'::TEXT as sub_user_id,
    'self-hosted'::TEXT as price_id,
    999999999 as price_credits,
    false as price_should_be_graceful,
    NULL::TEXT as price_associated_auto_recharge_price_id,
    0 as credits_used,
    999999999 as coupon_credits,
    0 as adjusted_credits_used,
    999999999 as remaining_credits,
    999999999 as total_credits_sum,
    '{"bucketLimit": 1000, "planModifier": 0.1}'::JSONB as plan_priority,
    jsonb_build_object(
      'crawl', 999999999,
      'scrape', 999999999,
      'search', 999999999,
      'map', 999999999,
      'extract', 999999999,
      'preview', 999999999,
      'crawlStatus', 999999999,
      'extractStatus', 999999999,
      'extractAgentPreview', 999999999,
      'scrapeAgentPreview', 999999999
    ) as rate_limits,
    999999999 as concurrency,
    '{}'::JSONB as flags
  FROM teams t
  WHERE t.id = input_team;
END;
$$ LANGUAGE plpgsql;

-- Billing RPC (no-op for self-hosted)
CREATE OR REPLACE FUNCTION bill_team_6(
  _team_id UUID,
  sub_id TEXT DEFAULT NULL,
  fetch_subscription BOOLEAN DEFAULT false,
  credits INTEGER DEFAULT 0,
  i_api_key_id INTEGER DEFAULT NULL,
  is_extract_param BOOLEAN DEFAULT false
)
RETURNS TABLE (api_key_ids INTEGER[]) AS $$
BEGIN
  RETURN QUERY SELECT ARRAY[]::INTEGER[];
END;
$$ LANGUAGE plpgsql;

-- 4. SEED DATA
-- ============================================================

-- Create default team
INSERT INTO teams (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Self-Hosted Team')
ON CONFLICT (id) DO NOTHING;

-- Create default API key (generate a random UUID with: uuidgen)
-- fc- format: remove dashes from UUID, prefix with fc-
-- Example: a1773a94-b1fd-45b2-9126-5b60051bb07d -> fc-a1773a94b1fd45b291265b60051bb07d
INSERT INTO api_keys (key, team_id, name)
VALUES (
  'a1773a94-b1fd-45b2-9126-5b60051bb07d'::UUID,
  '00000000-0000-0000-0000-000000000001',
  'Default API Key'
)
ON CONFLICT (key) DO NOTHING;

-- Initialize blocklist
INSERT INTO blocklist (data)
VALUES ('{"blocklist": [], "allowedKeywords": []}'::jsonb)
ON CONFLICT DO NOTHING;

-- Grant access to authenticated and anon roles for Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
