-- Initialize leads database schema

-- Enum for lead status
CREATE TYPE lead_status AS ENUM (
  'new',
  'qualified', 
  'contacted',
  'meeting_scheduled',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
  'unqualified'
);

-- Main leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company info
  name TEXT NOT NULL,
  siren TEXT UNIQUE,
  city TEXT NOT NULL,
  postal_code TEXT,
  department TEXT,
  region TEXT,
  
  -- Creation date (from Pappers)
  company_created_at TIMESTAMPTZ,
  
  -- Website info
  has_website BOOLEAN DEFAULT FALSE,
  website_url TEXT,
  website_checked_at TIMESTAMPTZ,
  
  -- NAF/Sector
  naf_code TEXT,
  naf_label TEXT,
  
  -- Contact info
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  
  -- Scoring
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB,
  
  -- Pipeline status
  status lead_status DEFAULT 'new',
  
  -- Notes & tags
  notes TEXT,
  tags TEXT[],
  
  -- Outreach tracking
  emails_sent INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  
  -- Metadata
  source TEXT DEFAULT 'pappers',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  scraped_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_has_website ON leads(has_website) WHERE has_website = FALSE;
CREATE INDEX idx_leads_created_at ON leads(company_created_at DESC);
CREATE INDEX idx_leads_region ON leads(region);
CREATE INDEX idx_leads_postal_code ON leads(postal_code);
CREATE INDEX idx_leads_source ON leads(source);

-- View for high-priority leads (no website, high score)
CREATE VIEW high_priority_leads AS
SELECT * FROM leads
WHERE has_website = FALSE 
  AND score >= 60
  AND status IN ('new', 'qualified')
ORDER BY score DESC, company_created_at DESC;

-- View for leads needing follow-up
CREATE VIEW follow_up_needed AS
SELECT * FROM leads
WHERE status = 'contacted'
  AND (next_followup_at IS NULL OR next_followup_at <= NOW())
ORDER BY last_contacted_at ASC NULLS FIRST;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read leads
CREATE POLICY "Allow read access to authenticated users"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert leads
CREATE POLICY "Allow insert access to authenticated users"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update leads they created or any lead
CREATE POLICY "Allow update access to authenticated users"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow users to delete leads
CREATE POLICY "Allow delete access to authenticated users"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Seed data: sample leads for testing (optional, remove in production)
-- INSERT INTO leads (name, city, has_website, score, status) VALUES
--   ('Test Company', 'Nantes', false, 85, 'new'),
--   ('Another Test', 'Paris', true, 45, 'new');