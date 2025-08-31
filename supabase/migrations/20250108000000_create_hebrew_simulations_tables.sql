-- Migration: Hebrew Simulations System
-- Date: 2025-01-08
-- Description: Create tables for advanced Hebrew-only simulations with detailed reporting

-- טבלת דוחות סימולציות בעברית
CREATE TABLE simulation_reports_hebrew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- ציונים מפורטים (1-10)
  overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 10),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 10),
  objection_handling_score INTEGER CHECK (objection_handling_score >= 1 AND objection_handling_score <= 10),
  rapport_building_score INTEGER CHECK (rapport_building_score >= 1 AND rapport_building_score <= 10),
  closing_score INTEGER CHECK (closing_score >= 1 AND closing_score <= 10),
  product_knowledge_score INTEGER CHECK (product_knowledge_score >= 1 AND product_knowledge_score <= 10),
  
  -- ניתוח מפורט בעברית
  detailed_feedback JSONB NOT NULL DEFAULT '{}', -- ניתוח מקיף בעברית
  quotes_with_timestamps JSONB NOT NULL DEFAULT '[]', -- ציטוטים עם זמנים מדויקים
  improvement_areas TEXT[] NOT NULL DEFAULT '{}', -- תחומי שיפור בעברית
  strengths TEXT[] NOT NULL DEFAULT '{}', -- נקודות חוזק בעברית
  action_items TEXT[] NOT NULL DEFAULT '{}', -- פעולות לביצוע בעברית
  
  -- השוואות וחישובים
  improvement_from_last NUMERIC(4,2), -- שיפור מהסימולציה הקודמת
  comparison_to_average NUMERIC(4,2), -- השוואה לממוצע האישי
  comparison_to_team NUMERIC(4,2), -- השוואה לממוצע הצוות
  
  -- המלצות
  next_simulation_type VARCHAR(100), -- סוג הסימולציה הבאה המומלצת
  practice_recommendations TEXT[], -- המלצות תרגול בעברית
  study_materials TEXT[], -- חומרי לימוד מומלצים בעברית
  
  -- מטאדטה
  report_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  report_language VARCHAR(10) DEFAULT 'hebrew',
  ai_model_used VARCHAR(50) DEFAULT 'gpt-4o',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- אינדקסים לחיפוש מהיר
  CONSTRAINT fk_simulation_reports_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id),
  CONSTRAINT fk_simulation_reports_agent FOREIGN KEY (agent_id) REFERENCES users(id),
  CONSTRAINT fk_simulation_reports_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- טבלת פרסונות לקוחות בעברית
CREATE TABLE customer_personas_hebrew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- פרטי הפרסונה בעברית
  persona_name VARCHAR(100) NOT NULL, -- שם הפרסונה (דוד כהן, שרה לוי)
  personality_type VARCHAR(50) NOT NULL, -- "סקפטי", "מהיר להחלטות", "זקוק למידע"
  communication_style VARCHAR(50) NOT NULL, -- "ישיר", "מנומס", "תוקפני", "חברותי"
  industry_context VARCHAR(100), -- "בנייה", "הייטק", "שירותים", "קמעונאי"
  company_size VARCHAR(50), -- "סטארטאפ", "חברה קטנה", "חברה בינונית", "תאגיד"
  
  -- רקע ותיאור
  background_story TEXT, -- סיפור הרקע של הלקוח בעברית
  current_situation TEXT, -- המצב הנוכחי והצרכים בעברית
  pain_points TEXT[], -- נקודות כאב בעברית
  goals_and_objectives TEXT[], -- מטרות ויעדים בעברית
  
  -- דפוסי התנגדות בעברית
  common_objections TEXT[] NOT NULL DEFAULT '{}', -- התנגדויות נפוצות בעברית
  objection_patterns JSONB DEFAULT '{}', -- דפוסי התנגדויות מורכבים
  objection_difficulty VARCHAR(20) DEFAULT 'בינוני', -- "קל", "בינוני", "קשה", "מתקדם"
  
  -- מאפייני תקשורת
  preferred_communication TEXT[], -- אופן תקשורת מועדף
  decision_making_style VARCHAR(50), -- "מהיר", "זהיר", "נדרש אישור", "מבוסס נתונים"
  budget_sensitivity VARCHAR(20), -- "גבוהה", "בינונית", "נמוכה"
  time_pressure VARCHAR(20), -- "דחוף", "רגיל", "גמיש"
  
  -- הגדרות טכניות
  openai_instructions TEXT NOT NULL, -- הוראות מפורטות ל-OpenAI בעברית
  scenario_templates JSONB DEFAULT '{}', -- תבניות תרחישים בעברית
  voice_characteristics JSONB DEFAULT '{}', -- מאפייני קול (לעתיד)
  
  -- התאמה לחולשות ספציפיות
  targets_weaknesses TEXT[], -- איזה חולשות הפרסונה מיועדת לתרגל
  difficulty_progression JSONB DEFAULT '{}', -- איך הפרסונה מתקשה יותר
  
  -- סטטיסטיקות שימוש
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(4,2), -- אחוז הצלחה של נציגים מול הפרסונה הזו
  average_score NUMERIC(4,2), -- ציון ממוצע של נציגים מול הפרסונה
  
  -- מטאדטה
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE, -- האם זו תבנית לשכפול
  difficulty_level VARCHAR(20) DEFAULT 'בינוני',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_personas_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_personas_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- טבלת מעקב ביצועים בזמן אמת
CREATE TABLE simulation_live_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  
  -- זמן ומיקום בסימולציה
  timestamp_seconds INTEGER NOT NULL, -- שנייה בסימולציה
  conversation_turn INTEGER, -- תור שיחה (1, 2, 3...)
  
  -- מדדי ביצועים בזמן אמת
  confidence_level NUMERIC(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1), -- 0.00-1.00
  response_speed_ms INTEGER, -- מהירות תגובה במילישניות
  customer_satisfaction NUMERIC(3,2) CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 1), -- 0.00-1.00
  emotional_intelligence NUMERIC(3,2) CHECK (emotional_intelligence >= 0 AND emotional_intelligence <= 1), -- קריאת רגשות
  
  -- אירועים ופעולות
  event_type VARCHAR(50), -- "התנגדות_הועלתה", "סגירה_נוסתה", "שאלה_נשאלה"
  event_description TEXT, -- תיאור האירוע בעברית
  agent_action VARCHAR(50), -- פעולת הנציג
  customer_reaction VARCHAR(50), -- תגובת הלקוח
  
  -- הערכה מיידית
  moment_score NUMERIC(3,2), -- ציון לרגע הספציפי (0.00-1.00)
  improvement_opportunity TEXT, -- הזדמנות שיפור בעברית
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_live_metrics_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id)
);

-- טבלת תרחישי סימולציה בעברית
CREATE TABLE simulation_scenarios_hebrew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES customer_personas_hebrew(id) ON DELETE CASCADE,
  
  -- פרטי התרחיש בעברית
  scenario_title VARCHAR(200) NOT NULL, -- "שיחה עם לקוח סקפטי בתחום הבנייה"
  scenario_description TEXT NOT NULL, -- תיאור מפורט בעברית
  scenario_category VARCHAR(50), -- "מכירה_ראשונית", "טיפול_בהתנגדויות", "סגירה"
  
  -- הקשר עסקי
  industry_specific_context TEXT, -- הקשר ספציפי לתעשייה בעברית
  product_context TEXT, -- הקשר מוצר/שירות בעברית
  competitive_context TEXT, -- הקשר תחרותי בעברית
  
  -- מטרות ויעדים
  learning_objectives TEXT[] NOT NULL DEFAULT '{}', -- מטרות למידה בעברית
  success_criteria TEXT[] NOT NULL DEFAULT '{}', -- קריטריונים להצלחה בעברית
  key_challenges TEXT[] NOT NULL DEFAULT '{}', -- אתגרים מרכזיים בעברית
  
  -- הגדרות טכניות
  estimated_duration_minutes INTEGER DEFAULT 10, -- משך זמן משוער
  difficulty_level VARCHAR(20) DEFAULT 'בינוני',
  required_skills TEXT[], -- כישורים נדרשים בעברית
  
  -- תבנית שיחה
  opening_scenario TEXT, -- איך השיחה מתחילה בעברית
  expected_flow JSONB DEFAULT '{}', -- זרימה צפויה של השיחה
  possible_outcomes JSONB DEFAULT '{}', -- תוצאות אפשריות
  
  -- מטאדטה
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(4,2), -- אחוז הצלחה בתרחיש
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_scenarios_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_scenarios_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_scenarios_persona FOREIGN KEY (persona_id) REFERENCES customer_personas_hebrew(id)
);

-- טבלת מעקב התקדמות נציגים
CREATE TABLE agent_simulation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- סטטיסטיקות כלליות
  total_simulations INTEGER DEFAULT 0,
  completed_simulations INTEGER DEFAULT 0,
  average_score NUMERIC(4,2),
  best_score INTEGER,
  worst_score INTEGER,
  
  -- מעקב שיפור
  improvement_trend VARCHAR(20), -- "עולה", "יורד", "יציב"
  improvement_rate NUMERIC(4,2), -- קצב שיפור
  consistency_score NUMERIC(4,2), -- עקביות בביצועים
  
  -- תחומי חוזק וחולשה
  strongest_skill VARCHAR(100), -- תחום החזק ביותר בעברית
  weakest_skill VARCHAR(100), -- תחום החלש ביותר בעברית
  improvement_areas TEXT[], -- תחומים לשיפור בעברית
  mastered_skills TEXT[], -- כישורים שנרכשו בעברית
  
  -- המלצות אישיות
  recommended_scenarios TEXT[], -- תרחישים מומלצים בעברית
  next_difficulty_level VARCHAR(20), -- רמת קושי הבאה
  focus_areas TEXT[], -- תחומי מיקוד בעברית
  
  -- זמנים
  last_simulation_date TIMESTAMP WITH TIME ZONE,
  last_improvement_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_progress_agent FOREIGN KEY (agent_id) REFERENCES users(id),
  CONSTRAINT fk_progress_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- יצירת אינדקסים לביצועים מיטביים
CREATE INDEX idx_simulation_reports_agent_date ON simulation_reports_hebrew(agent_id, report_generated_at DESC);
CREATE INDEX idx_simulation_reports_company_date ON simulation_reports_hebrew(company_id, report_generated_at DESC);
CREATE INDEX idx_simulation_reports_score ON simulation_reports_hebrew(overall_score DESC);

CREATE INDEX idx_personas_company_active ON customer_personas_hebrew(company_id, is_active);
CREATE INDEX idx_personas_difficulty ON customer_personas_hebrew(difficulty_level);
CREATE INDEX idx_personas_usage ON customer_personas_hebrew(usage_count DESC);

CREATE INDEX idx_live_metrics_simulation ON simulation_live_metrics(simulation_id, timestamp_seconds);
CREATE INDEX idx_live_metrics_events ON simulation_live_metrics(event_type, created_at DESC);

CREATE INDEX idx_scenarios_company_active ON simulation_scenarios_hebrew(company_id, is_active);
CREATE INDEX idx_scenarios_category ON simulation_scenarios_hebrew(scenario_category);

CREATE INDEX idx_progress_agent ON agent_simulation_progress(agent_id);
CREATE INDEX idx_progress_company ON agent_simulation_progress(company_id);

-- הוספת RLS (Row Level Security) לכל הטבלאות
ALTER TABLE simulation_reports_hebrew ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_personas_hebrew ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_live_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_scenarios_hebrew ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_simulation_progress ENABLE ROW LEVEL SECURITY;

-- מדיניות RLS עבור דוחות סימולציות
CREATE POLICY "Users can view own company simulation reports" ON simulation_reports_hebrew
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Agents can view own simulation reports" ON simulation_reports_hebrew
  FOR SELECT USING (
    agent_id = auth.uid() OR 
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'super_admin')
    )
  );

-- מדיניות RLS עבור פרסונות
CREATE POLICY "Users can view own company personas" ON customer_personas_hebrew
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage company personas" ON customer_personas_hebrew
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'super_admin')
    )
  );

-- מדיניות RLS עבור מטריקות לייב
CREATE POLICY "Users can view own company live metrics" ON simulation_live_metrics
  FOR SELECT USING (
    simulation_id IN (
      SELECT id FROM simulations 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- מדיניות RLS עבור תרחישים
CREATE POLICY "Users can view own company scenarios" ON simulation_scenarios_hebrew
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- מדיניות RLS עבור התקדמות נציגים
CREATE POLICY "Agents can view own progress" ON agent_simulation_progress
  FOR SELECT USING (
    agent_id = auth.uid() OR 
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'super_admin')
    )
  );

-- פונקציות עזר לחישובים
CREATE OR REPLACE FUNCTION update_agent_simulation_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- עדכון התקדמות הנציג אחרי כל סימולציה חדשה
  INSERT INTO agent_simulation_progress (agent_id, company_id)
  VALUES (NEW.agent_id, NEW.company_id)
  ON CONFLICT (agent_id) DO UPDATE SET
    total_simulations = agent_simulation_progress.total_simulations + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_progress
  AFTER INSERT ON simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_simulation_progress();

-- פונקציה לחישוב ציון ממוצע של נציג
CREATE OR REPLACE FUNCTION calculate_agent_average_score(agent_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT AVG(overall_score)
    FROM simulation_reports_hebrew
    WHERE agent_id = agent_uuid
    AND overall_score IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- פונקציה לקבלת המלצות אישיות
CREATE OR REPLACE FUNCTION get_personalized_recommendations(agent_uuid UUID)
RETURNS TABLE (
  recommended_scenario_type TEXT,
  focus_area TEXT,
  difficulty_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_scores AS (
    SELECT 
      communication_score,
      objection_handling_score,
      rapport_building_score,
      closing_score,
      product_knowledge_score
    FROM simulation_reports_hebrew
    WHERE agent_id = agent_uuid
    ORDER BY report_generated_at DESC
    LIMIT 5
  ),
  weakest_areas AS (
    SELECT 
      CASE 
        WHEN communication_score = LEAST(communication_score, objection_handling_score, rapport_building_score, closing_score, product_knowledge_score) THEN 'תקשורת'
        WHEN objection_handling_score = LEAST(communication_score, objection_handling_score, rapport_building_score, closing_score, product_knowledge_score) THEN 'התמודדות עם התנגדויות'
        WHEN rapport_building_score = LEAST(communication_score, objection_handling_score, rapport_building_score, closing_score, product_knowledge_score) THEN 'בניית קשר'
        WHEN closing_score = LEAST(communication_score, objection_handling_score, rapport_building_score, closing_score, product_knowledge_score) THEN 'סגירת עסקה'
        ELSE 'ידע מוצר'
      END as weakest_skill
    FROM agent_scores
  )
  SELECT 
    CASE wa.weakest_skill
      WHEN 'תקשורת' THEN 'שיחת מכירה בסיסית'
      WHEN 'התמודדות עם התנגדויות' THEN 'טיפול בהתנגדויות'
      WHEN 'בניית קשר' THEN 'שיחת היכרות'
      WHEN 'סגירת עסקה' THEN 'סגירת עסקה'
      ELSE 'הצגת מוצר'
    END::TEXT,
    wa.weakest_skill::TEXT,
    'בינוני'::TEXT
  FROM weakest_areas wa
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- הוספת הערות לטבלאות
COMMENT ON TABLE simulation_reports_hebrew IS 'דוחות מפורטים לסימולציות בעברית עם ניתוח מקיף';
COMMENT ON TABLE customer_personas_hebrew IS 'פרסונות לקוחות ווירטואליים בעברית להתאמה אישית';
COMMENT ON TABLE simulation_live_metrics IS 'מעקב ביצועים בזמן אמת במהלך סימולציות';
COMMENT ON TABLE simulation_scenarios_hebrew IS 'תרחישי אימון מותאמים לחברה בעברית';
COMMENT ON TABLE agent_simulation_progress IS 'מעקב התקדמות ארוך טווח של נציגים';
