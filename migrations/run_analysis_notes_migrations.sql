-- מיגרציה מאוחדת להוספת פיצ'ר פרמטרי ניתוח מיוחדים
-- נעשה באופן בטוח עם בדיקות אם העמודה כבר קיימת

-- 1. הוספת עמודת analysis_notes לטבלת calls
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'analysis_notes'
    ) THEN
        ALTER TABLE calls ADD COLUMN analysis_notes TEXT NULL;
        -- הוספת תגובה על העמודה החדשה
        COMMENT ON COLUMN calls.analysis_notes IS 'פרמטרים מיוחדים לניתוח - הערות, דגשים ובקשות ספציפיות שישפיעו על הניתוח';
    END IF;
END $$;

-- 2. עדכון פונקציית insert_call להכללת פרמטר analysis_notes
CREATE OR REPLACE FUNCTION insert_call(
  p_user_id UUID,
  p_company_id UUID DEFAULT NULL,
  p_call_type TEXT,
  p_audio_file_path TEXT,
  p_agent_notes TEXT DEFAULT NULL,
  p_analysis_notes TEXT DEFAULT NULL,
  p_analysis_type TEXT DEFAULT 'full'
)
RETURNS TABLE(id UUID)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO calls (
    user_id,
    company_id, 
    call_type,
    audio_file_path,
    agent_notes,
    analysis_notes,
    analysis_type,
    processing_status,
    created_at
  )
  VALUES (
    p_user_id,
    p_company_id,
    p_call_type,
    p_audio_file_path,
    p_agent_notes,
    p_analysis_notes,
    p_analysis_type,
    'pending',
    NOW()
  )
  RETURNING calls.id;
END;
$$; 