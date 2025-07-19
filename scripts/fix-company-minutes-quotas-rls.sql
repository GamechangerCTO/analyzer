-- תיקון RLS עבור טבלת company_minutes_quotas
-- תאריך: דצמבר 2024

-- הפעלת RLS אם לא הופעלה
ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;

-- מחיקת policies קיימים אם יש
DROP POLICY IF EXISTS "Users can view own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Users can insert own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Users can update own company quotas" ON company_minutes_quotas;
DROP POLICY IF EXISTS "Service can manage quotas" ON company_minutes_quotas;

-- policy לקריאה - משתמשים יכולים לראות מכסות של החברה שלהם
CREATE POLICY "Users can view own company quotas" ON company_minutes_quotas
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- policy לכתיבה - רק users מהחברה הרלוונטית יכולים ליצור/עדכן
CREATE POLICY "Users can insert own company quotas" ON company_minutes_quotas
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- policy לעדכון
CREATE POLICY "Users can update own company quotas" ON company_minutes_quotas
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- policy מיוחד לשירותים פנימיים (service role)
CREATE POLICY "Service can manage quotas" ON company_minutes_quotas
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- הענקת הרשאות מפורשות
GRANT ALL ON company_minutes_quotas TO authenticated;
GRANT ALL ON company_minutes_quotas TO service_role;

-- בדיקה שהכלכל עובד
SELECT 'RLS policies created successfully for company_minutes_quotas' as result; 