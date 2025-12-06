-- הוספת עמודה לנושאים נבחרים בסימולציות
-- עדכון: 25 ינואר 2025

-- הוספת עמודה selected_topics לטבלת simulations
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS selected_topics TEXT[] DEFAULT ARRAY['פתיחת_שיחה_ובניית_אמון'];

-- הוספת הערה מסבירה על העמודה
COMMENT ON COLUMN simulations.selected_topics IS 'רשימת נושאים שהמשתמש בחר להתמקד בהם בסימולציה. ברירת מחדל: פתיחת שיחה ובניית אמון';

-- עדכון סימולציות קיימות שאין להן ערך (אם יש כאלה)
UPDATE simulations 
SET selected_topics = ARRAY['פתיחת_שיחה_ובניית_אמון']
WHERE selected_topics IS NULL OR array_length(selected_topics, 1) IS NULL;

