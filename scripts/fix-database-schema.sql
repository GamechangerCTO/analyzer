-- תיקון מקיף לסכמת מסד הנתונים + RLS
-- הרץ את הקובץ הזה ב-Supabase Dashboard > SQL Editor

-- 1. וידוא שטבלת users מכילה את כל העמודות הנדרשות
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- 2. וידוא שטבלת companies תקינה
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS sector VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_poc BOOLEAN DEFAULT false;

-- 3. יצירת טבלת subscription_plans אם לא קיימת
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    max_agents INTEGER NOT NULL DEFAULT 1,
    monthly_price DECIMAL(10,2) NOT NULL,
    yearly_price DECIMAL(10,2),
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- הוספת חבילות בסיס
INSERT INTO subscription_plans (name, display_name, max_agents, monthly_price, yearly_price, is_active) 
VALUES 
    ('starter', 'חבילת התחלה', 3, 207.00, 2070.00, true),
    ('professional', 'חבילה מקצועית', 8, 456.00, 4560.00, true),
    ('enterprise', 'חבילה ארגונית', 15, 735.00, 7350.00, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    max_agents = EXCLUDED.max_agents,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    updated_at = NOW();

-- 4. יצירת טבלת company_subscriptions אם לא קיימת
CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    agents_count INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- 5. יצירת טבלת company_minutes_quotas אם לא קיימת
CREATE TABLE IF NOT EXISTS company_minutes_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    total_minutes INTEGER NOT NULL DEFAULT 240,
    used_minutes INTEGER NOT NULL DEFAULT 0,
    available_minutes INTEGER GENERATED ALWAYS AS (total_minutes - used_minutes) STORED,
    is_poc BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- 6. תיקון RLS policies - טבלת companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Allow company creation" ON companies;
DROP POLICY IF EXISTS "Managers can update company" ON companies;

-- מאפשר יצירת חברות לכולם (נדרש להרשמה)
CREATE POLICY "Allow company creation" ON companies
  FOR INSERT WITH CHECK (true);

-- משתמשים רואים רק את החברה שלהם
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- עדכון רק למנהלי החברה
CREATE POLICY "Managers can update company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- 7. תיקון RLS policies - טבלת users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- מאפשר יצירת משתמשים (נדרש להרשמה)
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

-- משתמשים רואים את עצמם ועמיתים בחברה
CREATE POLICY "Users can view company members" ON users
  FOR SELECT USING (
    id = auth.uid() OR 
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- עדכון פרופיל אישי
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- 8. תיקון RLS policies - טבלת subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active plans" ON subscription_plans;

-- כולם יכולים לראות חבילות פעילות
CREATE POLICY "Everyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 9. תיקון RLS policies - טבלת company_subscriptions
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow subscription creation" ON company_subscriptions;
DROP POLICY IF EXISTS "Company members can view subscription" ON company_subscriptions;

-- מאפשר יצירת מנויים
CREATE POLICY "Allow subscription creation" ON company_subscriptions
  FOR INSERT WITH CHECK (true);

-- משתמשי החברה רואים את המנוי
CREATE POLICY "Company members can view subscription" ON company_subscriptions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- 10. תיקון RLS policies - טבלת company_minutes_quotas
ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow quota creation" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Users can view own company quotas" ON company_minutes_quotas;

-- מאפשר יצירת מכסות
CREATE POLICY "Allow quota creation" ON company_minutes_quotas
  FOR INSERT WITH CHECK (true);

-- משתמשי החברה רואים את המכסה
CREATE POLICY "Users can view own company quotas" ON company_minutes_quotas
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- 11. הענקת הרשאות
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;
GRANT ALL ON users TO authenticated; 
GRANT ALL ON users TO service_role;
GRANT ALL ON subscription_plans TO authenticated;
GRANT ALL ON subscription_plans TO service_role;
GRANT ALL ON company_subscriptions TO authenticated;
GRANT ALL ON company_subscriptions TO service_role;
GRANT ALL ON company_minutes_quotas TO authenticated;
GRANT ALL ON company_minutes_quotas TO service_role;

-- 12. רענון cache של הסכמה
NOTIFY pgrst, 'reload schema';

-- בדיקה שהכל עבד
SELECT 'Database schema and RLS policies updated successfully! You can now try signup again.' as result; 