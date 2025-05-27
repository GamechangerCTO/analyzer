-- עדכון או יצירת הפונקציה insert_call להכללת פרמטר analysis_notes
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