-- מיגרציה להוספת מערכת מנויי משתמשים לחברות
-- ביטול הצורך באישור אדמין אם יש מנויים זמינים

-- 1. יצירת טבלת ניהול מנויי משתמשים
CREATE TABLE IF NOT EXISTS company_user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  total_users INTEGER NOT NULL DEFAULT 0, -- סך הכל משתמשים מותרים (כולל מנהל)
  used_users INTEGER NOT NULL DEFAULT 0, -- משתמשים בשימוש
  available_users INTEGER GENERATED ALWAYS AS (total_users - used_users) STORED, -- משתמשים זמינים
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- הוספת אילוצים
ALTER TABLE company_user_quotas
ADD CONSTRAINT check_used_users_positive CHECK (used_users >= 0),
ADD CONSTRAINT check_total_users_positive CHECK (total_users >= 0),
ADD CONSTRAINT check_used_not_exceed_total CHECK (used_users <= total_users);

-- יצירת אינדקס ייחודי לכל חברה
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_user_quotas_company_id 
ON company_user_quotas(company_id);

-- 2. פונקציה לעדכון אוטומטי של מונה המשתמשים
CREATE OR REPLACE FUNCTION update_company_user_count()
RETURNS TRIGGER AS $$
DECLARE
  company_to_update UUID;
  current_user_count INTEGER;
BEGIN
  -- קבלת מזהה החברה (יכול להיות מ-NEW או OLD בהתאם לפעולה)
  IF TG_OP = 'DELETE' THEN
    company_to_update := OLD.company_id;
  ELSE
    company_to_update := NEW.company_id;
  END IF;
  
  -- ספירת משתמשים פעילים בחברה
  SELECT COUNT(*) INTO current_user_count
  FROM users 
  WHERE company_id = company_to_update 
  AND is_approved = true;
  
  -- עדכון הרשומה בטבלת המכסות
  UPDATE company_user_quotas
  SET used_users = current_user_count,
      updated_at = NOW()
  WHERE company_id = company_to_update;
  
  -- אם לא קיימת רשומה, ניצור אותה עם 5 משתמשים כברירת מחדל
  IF NOT FOUND THEN
    INSERT INTO company_user_quotas (company_id, total_users, used_users)
    VALUES (company_to_update, 5, current_user_count);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. יצירת טריגרים לעדכון אוטומטי
DROP TRIGGER IF EXISTS trigger_update_user_count_on_insert ON users;
CREATE TRIGGER trigger_update_user_count_on_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_company_user_count();

DROP TRIGGER IF EXISTS trigger_update_user_count_on_update ON users;
CREATE TRIGGER trigger_update_user_count_on_update
  AFTER UPDATE OF company_id, is_approved ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_company_user_count();

DROP TRIGGER IF EXISTS trigger_update_user_count_on_delete ON users;
CREATE TRIGGER trigger_update_user_count_on_delete
  AFTER DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_company_user_count();

-- 4. אתחול נתונים קיימים
-- יצירת רשומות עבור חברות קיימות עם 5 משתמשים כברירת מחדל
INSERT INTO company_user_quotas (company_id, total_users, used_users)
SELECT 
  c.id as company_id,
  5 as total_users, -- ברירת מחדל: מנהל + 4 נציגים
  COALESCE(user_counts.user_count, 0) as used_users
FROM companies c
LEFT JOIN (
  SELECT 
    company_id, 
    COUNT(*) as user_count
  FROM users 
  WHERE company_id IS NOT NULL 
  AND is_approved = true
  GROUP BY company_id
) user_counts ON c.id = user_counts.company_id
WHERE NOT EXISTS (
  SELECT 1 FROM company_user_quotas WHERE company_id = c.id
);

-- 5. פונקציה לבדיקה אם אפשר להוסיף משתמש
CREATE OR REPLACE FUNCTION can_add_user_to_company(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  available_slots INTEGER;
BEGIN
  SELECT available_users INTO available_slots
  FROM company_user_quotas
  WHERE company_id = p_company_id;
  
  -- אם לא קיימת רשומה, ניצור אותה עם 5 משתמשים
  IF NOT FOUND THEN
    INSERT INTO company_user_quotas (company_id, total_users, used_users)
    VALUES (p_company_id, 5, 0);
    RETURN TRUE;
  END IF;
  
  RETURN available_slots > 0;
END;
$$ LANGUAGE plpgsql;

-- 6. פונקציה לקבלת פרטי מכסת המשתמשים של חברה
CREATE OR REPLACE FUNCTION get_company_user_quota(p_company_id UUID)
RETURNS TABLE(
  total_users INTEGER,
  used_users INTEGER,
  available_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cuq.total_users,
    cuq.used_users,
    cuq.available_users
  FROM company_user_quotas cuq
  WHERE cuq.company_id = p_company_id;
  
  -- אם לא נמצאה רשומה, החזר ברירת מחדל
  IF NOT FOUND THEN
    INSERT INTO company_user_quotas (company_id, total_users, used_users)
    VALUES (p_company_id, 5, 0);
    
    RETURN QUERY
    SELECT 5::INTEGER, 0::INTEGER, 5::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. הוספת הערות לטבלה
COMMENT ON TABLE company_user_quotas IS 'ניהול מכסות משתמשים לחברות - מגדיר כמה משתמשים מותר לכל חברה';
COMMENT ON COLUMN company_user_quotas.total_users IS 'סך הכל משתמשים מותרים (כולל מנהל)';
COMMENT ON COLUMN company_user_quotas.used_users IS 'משתמשים בשימוש נוכחי';
COMMENT ON COLUMN company_user_quotas.available_users IS 'משתמשים זמינים להוספה (מחושב אוטומטית)'; 