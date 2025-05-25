import { createClient } from '@supabase/supabase-js';

// מערך לשמירת לוגים בזיכרון לשליפה מהירה 
const callLogs: Record<string, Array<{ timestamp: string; message: string; data?: any }>> = {};

// פונקציה להוספת לוג חדש
export async function addCallLog(callId: string, message: string, data?: any) {
  try {
    // 1. שמירה בזיכרון
    if (!callLogs[callId]) {
      callLogs[callId] = [];
    }
    
    const timestamp = new Date().toISOString();
    
    callLogs[callId].push({
      timestamp,
      message,
      data
    });
    
    // שמירה על מקסימום 100 לוגים לכל שיחה בזיכרון
    if (callLogs[callId].length > 100) {
      callLogs[callId] = callLogs[callId].slice(-100);
    }
    
    // 2. הדפסה לקונסול (בסביבת פיתוח/שרת)
    console.log(`[${callId}] ${message}`, data || '');
    
    // 3. שמירה בסופהבייס - גישה ישירה במקום קריאה ל-API פנימי
    try {
      // יצירת קליינט סופאבייס עם סיסמה סודית (מוגדרת משתנה סביבה)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '' // שימוש במפתח שירות כדי לעקוף בעיות אימות
      );
      
      // ניסיון להוסיף את הלוג
      const { error: insertError } = await supabaseAdmin
        .from('call_logs')
        .insert([
          { 
            call_id: callId, 
            message, 
            data,
            created_at: timestamp 
          }
        ]);
      
      if (insertError) {
        console.error('שגיאה בשמירת לוג ישירות לסופהבייס:', insertError);
      }
    } catch (dbError) {
      // אם נכשלה השמירה לסופהבייס, נמשיך בכל זאת
      console.error('שגיאה בשמירת לוג לסופהבייס:', dbError);
    }
  } catch (error) {
    console.error('שגיאה כללית בהוספת לוג:', error);
  }
} 

// פונקציה לקבלת לוגים מהזיכרון
export function getCallLogsFromMemory(callId: string) {
  return callLogs[callId] || [];
} 