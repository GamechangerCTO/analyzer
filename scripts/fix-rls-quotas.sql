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