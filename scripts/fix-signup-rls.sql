-- תיקון מיידי לבעיית RLS בהרשמה
-- הרץ את הקובץ הזה ב-Supabase Dashboard > SQL Editor

-- 1. תיקון policy עבור טבלת companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- מחיקת policies קיימים שעלולים להפריע
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Service can create companies" ON companies;
DROP POLICY IF EXISTS "Public signup policy" ON companies;

-- policy חדש שמאפשר יצירת חברות 
CREATE POLICY "Allow company creation" ON companies
  FOR INSERT WITH CHECK (true);

-- policy לקריאה - משתמשים רואים רק את החברה שלהם
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- policy לעדכון - רק מנהלי החברה
CREATE POLICY "Managers can update company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- 2. וידוא שטבלת users מוגדרת נכון
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- מחיקת policies ישנים
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Service can create users" ON users;

-- policy ליצירת משתמשים
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

-- policy לקריאה - משתמשים רואים רק את עצמם ועמיתים בחברה
CREATE POLICY "Users can view company members" ON users
  FOR SELECT USING (
    id = auth.uid() OR 
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- policy לעדכון - משתמשים יכולים לעדכן את עצמם
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- 3. תיקון טבלת company_subscriptions
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view subscription" ON company_subscriptions;
DROP POLICY IF EXISTS "Service can create subscriptions" ON company_subscriptions;

-- policy ליצירת מנויים
CREATE POLICY "Allow subscription creation" ON company_subscriptions
  FOR INSERT WITH CHECK (true);

-- policy לקריאה
CREATE POLICY "Company members can view subscription" ON company_subscriptions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- 4. תיקון טבלת company_minutes_quotas
ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Service can create quotas" ON company_minutes_quotas;

-- policy ליצירת מכסות
CREATE POLICY "Allow quota creation" ON company_minutes_quotas
  FOR INSERT WITH CHECK (true);

-- policy לקריאה
CREATE POLICY "Users can view own company quotas" ON company_minutes_quotas
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- 5. תיקון טבלת subscription_plans (אם קיימת)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active plans" ON subscription_plans;

-- כולם יכולים לראות חבילות פעילות
CREATE POLICY "Everyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 6. הענקת הרשאות בסיסיות
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;
GRANT ALL ON users TO authenticated; 
GRANT ALL ON users TO service_role;
GRANT ALL ON company_subscriptions TO authenticated;
GRANT ALL ON company_subscriptions TO service_role;
GRANT ALL ON company_minutes_quotas TO authenticated;
GRANT ALL ON company_minutes_quotas TO service_role;
GRANT SELECT ON subscription_plans TO authenticated;
GRANT ALL ON subscription_plans TO service_role;

-- בדיקה שהכל עבד
SELECT 'RLS policies updated successfully! You can now try signup again.' as result; 