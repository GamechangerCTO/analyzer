-- סקריפט להגדלת מכסות לכל החברות
-- הפעל את זה במסד הנתונים כדי לתת לכל חברה מכסה של 1000 משתמשים

-- עדכון מכסות קיימות
UPDATE company_user_quotas 
SET total_users = 1000, 
    updated_at = NOW()
WHERE total_users < 1000;

-- הוספת מכסות לחברות חדשות שאין להן מכסה
INSERT INTO company_user_quotas (company_id, total_users, used_users, created_at, updated_at)
SELECT 
    c.id as company_id,
    1000 as total_users,
    COALESCE((SELECT COUNT(*) FROM users u WHERE u.company_id = c.id), 0) as used_users,
    NOW() as created_at,
    NOW() as updated_at
FROM companies c
WHERE c.id NOT IN (SELECT company_id FROM company_user_quotas);

-- בדיקה שהכל עבד
SELECT 
    c.name as company_name,
    cq.total_users,
    cq.used_users,
    cq.available_users
FROM company_user_quotas cq
JOIN companies c ON c.id = cq.company_id
ORDER BY c.name; 