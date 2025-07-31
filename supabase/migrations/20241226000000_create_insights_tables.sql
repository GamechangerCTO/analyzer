-- יצירת טבלאות לשמירת תובנות הצוות והסוכנים

-- טבלת תובנות הצוות
CREATE TABLE IF NOT EXISTS team_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    insights_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_period TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת תובנות הסוכנים
CREATE TABLE IF NOT EXISTS agent_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    insights_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_period TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_team_insights_company_id ON team_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_team_insights_last_updated ON team_insights(last_updated);
CREATE INDEX IF NOT EXISTS idx_agent_insights_user_id ON agent_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_company_id ON agent_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_last_updated ON agent_insights(last_updated);

-- הפעלת Row Level Security
ALTER TABLE team_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;

-- מדיניות RLS לטבלת team_insights
CREATE POLICY "Users can view own company team insights" ON team_insights
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own company team insights" ON team_insights
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company team insights" ON team_insights
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- מדיניות RLS לטבלת agent_insights
CREATE POLICY "Users can view own company agent insights" ON agent_insights
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own company agent insights" ON agent_insights
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company agent insights" ON agent_insights
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- פונקציית trigger לעדכון updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- הוספת triggers לעדכון אוטומטי של updated_at
DROP TRIGGER IF EXISTS update_team_insights_updated_at ON team_insights;
CREATE TRIGGER update_team_insights_updated_at
    BEFORE UPDATE ON team_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_insights_updated_at ON agent_insights;
CREATE TRIGGER update_agent_insights_updated_at
    BEFORE UPDATE ON agent_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- הוספת הערות לטבלאות
COMMENT ON TABLE team_insights IS 'שמירת תובנות מנותחות של הצוות לחיסכון בקריאות API';
COMMENT ON TABLE agent_insights IS 'שמירת תובנות מנותחות של סוכנים לחיסכון בקריאות API';

COMMENT ON COLUMN team_insights.insights_data IS 'נתוני התובנות בפורמט JSON כפי שמתקבל מ-OpenAI';
COMMENT ON COLUMN team_insights.last_updated IS 'מועד העדכון האחרון של התובנות';
COMMENT ON COLUMN team_insights.analysis_period IS 'תיאור התקופה שעליה מבוסס הניתוח';

COMMENT ON COLUMN agent_insights.insights_data IS 'נתוני התובנות בפורמט JSON כפי שמתקבל מ-OpenAI';
COMMENT ON COLUMN agent_insights.last_updated IS 'מועד העדכון האחרון של התובנות';
COMMENT ON COLUMN agent_insights.analysis_period IS 'תיאור התקופה שעליה מבוסס הניתוח';