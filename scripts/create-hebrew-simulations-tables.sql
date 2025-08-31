-- יצירת טבלאות למערכת סימולציות בעברית
-- הרץ סקריפט זה ישירות ב-Supabase SQL Editor

-- 1. טבלת דוחות סימולציות בעברית
CREATE TABLE IF NOT EXISTS simulation_reports_hebrew (
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
  detailed_feedback JSONB NOT NULL DEFAULT '{}',
  quotes_with_timestamps JSONB NOT NULL DEFAULT '[]',
  improvement_areas TEXT[] NOT NULL DEFAULT '{}',
  strengths TEXT[] NOT NULL DEFAULT '{}',
  action_items TEXT[] NOT NULL DEFAULT '{}',
  
  -- השוואות וחישובים
  improvement_from_last NUMERIC(4,2),
  comparison_to_average NUMERIC(4,2),
  comparison_to_team NUMERIC(4,2),
  
  -- המלצות
  next_simulation_type VARCHAR(100),
  practice_recommendations TEXT[],
  study_materials TEXT[],
  
  -- מטאדטה
  report_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  report_language VARCHAR(10) DEFAULT 'hebrew',
  ai_model_used VARCHAR(50) DEFAULT 'gpt-4o',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. טבלת פרסונות לקוחות בעברית
CREATE TABLE IF NOT EXISTS customer_personas_hebrew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- פרטי הפרסונה בעברית
  persona_name VARCHAR(100) NOT NULL,
  personality_type VARCHAR(50) NOT NULL,
  communication_style VARCHAR(50) NOT NULL,
  industry_context VARCHAR(100),
  company_size VARCHAR(50),
  
  -- רקע ותיאור
  background_story TEXT,
  current_situation TEXT,
  pain_points TEXT[],
  goals_and_objectives TEXT[],
  
  -- דפוסי התנגדות בעברית
  common_objections TEXT[] NOT NULL DEFAULT '{}',
  objection_patterns JSONB DEFAULT '{}',
  objection_difficulty VARCHAR(20) DEFAULT 'בינוני',
  
  -- מאפייני תקשורת
  preferred_communication TEXT[],
  decision_making_style VARCHAR(50),
  budget_sensitivity VARCHAR(20),
  time_pressure VARCHAR(20),
  
  -- הגדרות טכניות
  openai_instructions TEXT NOT NULL,
  scenario_templates JSONB DEFAULT '{}',
  voice_characteristics JSONB DEFAULT '{}',
  
  -- התאמה לחולשות ספציפיות
  targets_weaknesses TEXT[],
  difficulty_progression JSONB DEFAULT '{}',
  
  -- סטטיסטיקות שימוש
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(4,2),
  average_score NUMERIC(4,2),
  
  -- מטאדטה
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  difficulty_level VARCHAR(20) DEFAULT 'בינוני',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. טבלת מעקב ביצועים בזמן אמת
CREATE TABLE IF NOT EXISTS simulation_live_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  
  -- זמן ומיקום בסימולציה
  timestamp_seconds INTEGER NOT NULL,
  conversation_turn INTEGER,
  
  -- מדדי ביצועים בזמן אמת
  confidence_level NUMERIC(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  response_speed_ms INTEGER,
  customer_satisfaction NUMERIC(3,2) CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 1),
  emotional_intelligence NUMERIC(3,2) CHECK (emotional_intelligence >= 0 AND emotional_intelligence <= 1),
  
  -- אירועים ופעולות
  event_type VARCHAR(50),
  event_description TEXT,
  agent_action VARCHAR(50),
  customer_reaction VARCHAR(50),
  
  -- הערכה מיידית
  moment_score NUMERIC(3,2),
  improvement_opportunity TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. טבלת תרחישי סימולציה בעברית
CREATE TABLE IF NOT EXISTS simulation_scenarios_hebrew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES customer_personas_hebrew(id) ON DELETE CASCADE,
  
  -- פרטי התרחיש בעברית
  scenario_title VARCHAR(200) NOT NULL,
  scenario_description TEXT NOT NULL,
  scenario_category VARCHAR(50),
  
  -- הקשר עסקי
  industry_specific_context TEXT,
  product_context TEXT,
  competitive_context TEXT,
  
  -- מטרות ויעדים
  learning_objectives TEXT[] NOT NULL DEFAULT '{}',
  success_criteria TEXT[] NOT NULL DEFAULT '{}',
  key_challenges TEXT[] NOT NULL DEFAULT '{}',
  
  -- הגדרות טכניות
  estimated_duration_minutes INTEGER DEFAULT 10,
  difficulty_level VARCHAR(20) DEFAULT 'בינוני',
  required_skills TEXT[],
  
  -- תבנית שיחה
  opening_scenario TEXT,
  expected_flow JSONB DEFAULT '{}',
  possible_outcomes JSONB DEFAULT '{}',
  
  -- מטאדטה
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(4,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. טבלת מעקב התקדמות נציגים
CREATE TABLE IF NOT EXISTS agent_simulation_progress (
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
  improvement_trend VARCHAR(20),
  improvement_rate NUMERIC(4,2),
  consistency_score NUMERIC(4,2),
  
  -- תחומי חוזק וחולשה
  strongest_skill VARCHAR(100),
  weakest_skill VARCHAR(100),
  improvement_areas TEXT[],
  mastered_skills TEXT[],
  
  -- המלצות אישיות
  recommended_scenarios TEXT[],
  next_difficulty_level VARCHAR(20),
  focus_areas TEXT[],
  
  -- זמנים
  last_simulation_date TIMESTAMP WITH TIME ZONE,
  last_improvement_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint לוודא רק רשומה אחת לכל נציג
  UNIQUE(agent_id)
);

-- יצירת אינדקסים לביצועים מיטביים
CREATE INDEX IF NOT EXISTS idx_simulation_reports_agent_date ON simulation_reports_hebrew(agent_id, report_generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_reports_company_date ON simulation_reports_hebrew(company_id, report_generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_reports_score ON simulation_reports_hebrew(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_personas_company_active ON customer_personas_hebrew(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_personas_difficulty ON customer_personas_hebrew(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_personas_usage ON customer_personas_hebrew(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_live_metrics_simulation ON simulation_live_metrics(simulation_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_live_metrics_events ON simulation_live_metrics(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scenarios_company_active ON simulation_scenarios_hebrew(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_scenarios_category ON simulation_scenarios_hebrew(scenario_category);

CREATE INDEX IF NOT EXISTS idx_progress_agent ON agent_simulation_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_progress_company ON agent_simulation_progress(company_id);

-- הערה: RLS יתווסף בסקריפט נפרד כי זה עלול לדרוש הרשאות גבוהות יותר
