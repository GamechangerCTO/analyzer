-- תיקון RLS עבור טבלת company_minutes_quotas
-- מאפשר למנהלי חברה ליצור/עדכן מכסות דקות

-- מחיקת מדיניות קיימת (אם יש)
DROP POLICY IF EXISTS "Users can manage own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "company_quotas_select_policy" ON company_minutes_quotas;
DROP POLICY IF EXISTS "company_quotas_insert_policy" ON company_minutes_quotas;
DROP POLICY IF EXISTS "company_quotas_update_policy" ON company_minutes_quotas;

-- מדיניות חדשה לקריאה
CREATE POLICY "Users can view own company quotas" ON company_minutes_quotas
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- מדיניות חדשה להכנסת רשומות - מאפשר למנהלי חברה ליצור מכסות
CREATE POLICY "Managers can create company quotas" ON company_minutes_quotas
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
  );

-- מדיניות לעדכון מכסות
CREATE POLICY "Managers can update company quotas" ON company_minutes_quotas
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
  );

-- ודוא שה-RLS מופעל
ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;

-- תיקון RLS עבור טבלת companies
-- הוספת policy שמאפשר יצירת חברות חדשות

-- בדיקה אם RLS מופעל
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- מחיקת policies קיימים
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Service can create companies" ON companies;
DROP POLICY IF EXISTS "Anyone can create companies during signup" ON companies;

-- Policy לקריאה - משתמשים רואים רק את החברה שלהם
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy ליצירת חברות - מאפשר יצירה בתהליך הרשמה
CREATE POLICY "Service can create companies" ON companies
  FOR INSERT WITH CHECK (true);

-- Policy לעדכון חברות - רק מנהלי החברה
CREATE POLICY "Managers can update own company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
  );

-- הענקת הרשאות מפורשות
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role; 