export interface CallData {
  id: string;
  created_at: string;
  user_id: string;
  company_id: string | null;
  call_type: string;
  customer_name: string | null;
  audio_file_path: string;
  transcript: string | null;
  transcript_segments: Array<{ text: string; start: number }> | null; // רשימת segments עם timestamps מ-Whisper
  transcript_words: any[] | null; // רשימת מילים עם timestamps מ-Whisper
  analysis_report: any | null; // מומלץ להגדיר טיפוס ספציפי לדו"ח הניתוח
  tone_analysis_report: any | null; // דו"ח ניתוח טונציה נפרד
  processing_status: 'pending' | 'transcribing' | 'analyzing_tone' | 'analyzing_content' | 'completed' | 'error' | null;
  error_message: string | null;
  overall_score: number | null;
  red_flag: boolean | null;
  agent_notes: string | null;
  analysis_notes: string | null;
  audio_duration_seconds: number | null;
  analysis_type: 'full' | 'tone';
  analyzed_at: string | null;
  // הוסף כאן שדות נוספים לפי הצורך
  users: { // Optional: אם אתה טוען מידע זה עם join
    id: string;
    full_name: string | null;
    email: string;
  } | null;
  companies: { // Optional: אם אתה טוען מידע זה עם join
    id: string;
    name: string;
  } | null;
} 