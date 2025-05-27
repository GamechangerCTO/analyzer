-- הוספת עמודת analysis_notes לטבלת calls
ALTER TABLE calls 
ADD COLUMN analysis_notes TEXT NULL;

-- הוספת תגובה על העמודה החדשה
COMMENT ON COLUMN calls.analysis_notes IS 'פרמטרים מיוחדים לניתוח - הערות, דגשים ובקשות ספציפיות שישפיעו על הניתוח'; 