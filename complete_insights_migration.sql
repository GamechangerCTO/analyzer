-- יצירת טבלאות ופונקציות תובנות במסד נתונים

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

-- יצירת פונקציות RPC לעדכון תובנות

-- פונקציה לעדכון תובנות הצוות
CREATE OR REPLACE FUNCTION upsert_team_insights(
    p_company_id UUID,
    p_insights_data JSONB,
    p_analysis_period TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO team_insights (
        company_id, 
        insights_data, 
        analysis_period,
        last_updated
    )
    VALUES (
        p_company_id, 
        p_insights_data, 
        p_analysis_period,
        NOW()
    )
    ON CONFLICT (company_id) 
    DO UPDATE SET
        insights_data = EXCLUDED.insights_data,
        analysis_period = EXCLUDED.analysis_period,
        last_updated = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- פונקציה לעדכון תובנות הסוכן
CREATE OR REPLACE FUNCTION upsert_agent_insights(
    p_user_id UUID,
    p_company_id UUID,
    p_insights_data JSONB,
    p_analysis_period TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO agent_insights (
        user_id,
        company_id, 
        insights_data, 
        analysis_period,
        last_updated
    )
    VALUES (
        p_user_id,
        p_company_id, 
        p_insights_data, 
        p_analysis_period,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        insights_data = EXCLUDED.insights_data,
        analysis_period = EXCLUDED.analysis_period,
        last_updated = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- הוספת unique constraints אם הם לא קיימים
ALTER TABLE team_insights 
ADD CONSTRAINT IF NOT EXISTS team_insights_company_id_unique 
UNIQUE (company_id);

ALTER TABLE agent_insights 
ADD CONSTRAINT IF NOT EXISTS agent_insights_user_id_unique 
UNIQUE (user_id);
