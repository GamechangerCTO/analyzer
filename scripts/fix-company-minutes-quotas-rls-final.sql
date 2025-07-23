-- תיקון מקיף עבור RLS של טבלת company_minutes_quotas
-- פותר את שגיאת 406 בגישה למכסות דקות

-- הפעלת RLS
ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;

-- מחיקת כל ה-policies הקיימים כדי להתחיל מחדש
DROP POLICY IF EXISTS "Users can view own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Users can insert own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Users can update own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Service can manage quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Allow quota creation" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Managers can create company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Managers can update company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Users can view own company minutes quota" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Only admins can modify minutes quotas" ON company_minutes_quotas;

-- Policy 1: קריאה - משתמשים יכולים לראות מכסות של החברה שלהם + אדמינים רואים הכל
CREATE POLICY "Users can view quotas" ON company_minutes_quotas
  FOR SELECT USING (
    -- משתמשי החברה יכולים לראות את המכסה שלהם
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
    OR
    -- אדמינים יכולים לראות הכל
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.email = 'ido.segev23@gmail.com'
    )
    OR
    -- service role יכול לראות הכל
    auth.role() = 'service_role'
  );

-- Policy 2: הכנסה - מאפשר למערכת ליצור מכסות + אדמינים
CREATE POLICY "Allow quota creation" ON company_minutes_quotas
  FOR INSERT WITH CHECK (
    -- אדמינים יכולים ליצור מכסות לכל חברה
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.email = 'ido.segev23@gmail.com'
    )
    OR
    -- מנהלי החברה יכולים ליצור מכסות לחברה שלהם
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
    OR
    -- service role יכול ליצור הכל
    auth.role() = 'service_role'
  );

-- Policy 3: עדכון - מנהלים + אדמינים
CREATE POLICY "Allow quota updates" ON company_minutes_quotas
  FOR UPDATE USING (
    -- אדמינים יכולים לעדכן הכל
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.email = 'ido.segev23@gmail.com'
    )
    OR
    -- מנהלי החברה יכולים לעדכן את המכסה שלהם
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
    OR
    -- service role יכול לעדכן הכל
    auth.role() = 'service_role'
  ) WITH CHECK (
    -- אותן הגבלות לערכים החדשים
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.email = 'ido.segev23@gmail.com'
    )
    OR
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
    OR
    auth.role() = 'service_role'
  );

-- Policy 4: מחיקה - רק אדמינים + service role
CREATE POLICY "Allow quota deletion" ON company_minutes_quotas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.email = 'ido.segev23@gmail.com'
    )
    OR
    auth.role() = 'service_role'
  );

-- הענקת הרשאות מפורשות
GRANT ALL ON company_minutes_quotas TO authenticated;
GRANT ALL ON company_minutes_quotas TO service_role;
GRANT ALL ON company_minutes_quotas TO anon;

-- הרשאות לsequences (אם יש)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- הודעת הצלחה
SELECT 'RLS policies for company_minutes_quotas updated successfully!' as result; 