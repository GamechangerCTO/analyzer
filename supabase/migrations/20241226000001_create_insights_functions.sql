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

-- הוספת הרשאות לפונקציות
GRANT EXECUTE ON FUNCTION upsert_team_insights TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_agent_insights TO authenticated;

-- הוספת הערות לפונקציות
COMMENT ON FUNCTION upsert_team_insights IS 'עדכון או הוספת תובנות צוות עם UPSERT אוטומטי';
COMMENT ON FUNCTION upsert_agent_insights IS 'עדכון או הוספת תובנות סוכן עם UPSERT אוטומטי';