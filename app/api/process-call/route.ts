import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import OpenAI from 'openai';
import { addCallLog } from '@/lib/addCallLog';

// פונקציה לקביעת הפורמט הנכון ל-GPT-4o-audio-preview
function getAudioFormatForAPI(fileExtension: string): string {
  // לפי תיעוד OpenAI: mp3, mp4, mpeg, mpga, m4a, wav, webm
  const formatMap: { [key: string]: string } = {
    'mp3': 'mp3',
    'wav': 'wav',
    'm4a': 'm4a',
    'mp4': 'mp4',
    'mpeg': 'mp3', // mpeg -> mp3
    'mpga': 'mp3', // mpga -> mp3
    'webm': 'webm'
  };
  
  return formatMap[fileExtension?.toLowerCase()] || 'mp3'; // ברירת מחדל
}

// הגדרת max duration לוורסל (5 דקות למשתמשי Pro)
export const maxDuration = 300;

/**
 * בניית פרומפט ניתוח על בסיס הנתונים מטבלת prompts
 */
function buildAnalysisPromptFromDB(promptData: any, transcript: string): string {
  const baseInstructions = `אתה מומחה בכיר בניתוח שיחות מכירה ושירות עם ניסיון של 15 שנה.

נתח את השיחה הבאה בהתאם לפרומפט הספציפי לסוג השיחה: ${promptData.call_type}

## תמלול השיחה:
${transcript}

## הנחיות הניתוח (מבוססות על הפרומפט לסוג השיחה):
${promptData.system_prompt}
`;

  // אם יש שדות ניתוח מוגדרים - נבנה JSON מותאם
  if (promptData.analysis_fields && typeof promptData.analysis_fields === 'object') {
    const jsonStructure = buildJSONStructureFromFields(promptData.analysis_fields);
    
    return `${baseInstructions}

## מבנה הניתוח הנדרש:
נתח את השיחה לפי השדות הבאים והחזר JSON במבנה המדויק הזה:

${jsonStructure}

## הנחיות נוספות:
- תן ציון מ-3 עד 10 לכל פרמטר (3 נדיר מאוד, 10 מעולה)
- ב"תובנות" תן הסבר קצר ובהיר של הביצועים
- ב"איך_משפרים" תן המלצה מעשית ספציפית + דוגמה מדויקה לנוסח מקצועי
- כלול general_key_insights, improvement_points, overall_score ו-red_flags
- החזר רק JSON תקין ללא backticks או markdown

⚠️ חובה! כללי JSON קריטיים:
- אל תשתמש במרכאות כפולות בתוך ערכי הטקסט
- וודא שכל ערך טקסט מתחיל ומסתיים במרכאות כפולות
- אל תכלול line breaks או tabs בתוך ערכי טקסט
- לפני כל מפתח JSON חייב להיות פסיק (למעט הראשון)`;
  }

  // אם אין שדות ניתוח - נשתמש במבנה כללי
  return `${baseInstructions}

## מבנה הניתוח הנדרש:
החזר JSON במבנה הבא:
{
  "ניתוח_כללי": {
    "ביצועים_כלליים": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
  },
  "נקודות_חוזק": ["רשימת חוזקות"],
  "נקודות_לשיפור": ["רשימת שיפורים"],
  "general_key_insights": ["תובנות מפתח"],
  "improvement_points": ["נקודות לשיפור"],
  "overall_score": number,
  "red_flags": []
}

החזר רק JSON תקין ללא backticks או markdown!`;
}

/**
 * בניית מבנה JSON מתוך שדות הניתוח מהפרומפט
 */
function buildJSONStructureFromFields(analysisFields: any): string {
  const jsonParts: string[] = [];
  
  for (const [categoryName, categoryFields] of Object.entries(analysisFields)) {
    if (typeof categoryFields === 'object' && categoryFields !== null) {
      const fieldParts: string[] = [];
      
      for (const [fieldName, fieldData] of Object.entries(categoryFields as any)) {
        if (typeof fieldData === 'object' && fieldData !== null) {
          fieldParts.push(`    "${fieldName}": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}`);
        }
      }
      
      if (fieldParts.length > 0) {
        jsonParts.push(`  "${categoryName}": {\n${fieldParts.join(',\n')}\n  }`);
      }
    }
  }
  
  // הוספת שדות חובה
  jsonParts.push(`  "general_key_insights": ["רשימת תובנות מפתח"]`);
  jsonParts.push(`  "improvement_points": ["רשימת נקודות לשיפור"]`);
  jsonParts.push(`  "overall_score": number`);
  jsonParts.push(`  "red_flags": []`);
  
  return `{\n${jsonParts.join(',\n')}\n}`;
}

// בדיקת מפתח OpenAI API עם לוגים מפורטים
const apiKey = process.env.OPENAI_API_KEY;
console.log('🔍 OpenAI API Key check:', {
  hasKey: !!apiKey,
  keyLength: apiKey?.length || 0,
  keyPrefix: apiKey?.substring(0, 10) + '...' || 'N/A',
  environment: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV
});

// אתחול OpenAI API עם בדיקה משופרת
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// פונקציה מתקדמת לניקוי תשובות OpenAI עם טיפול מעולה ב-JSON שבור
function cleanOpenAIResponse(content: string): string {
  if (!content) return '{}';
  
  console.log(`🧹 מנקה תגובת OpenAI (גרסה פשוטה ומדויקת)`, { original_length: content.length });
  
  // ניקוי בסיסי של Markdown blocks ורווחים
  let cleaned = content
    .replace(/```(?:json|JSON)?\s*/g, '')
    .replace(/```\s*$/g, '')
    .replace(/^`+|`+$/g, '')
    .trim();
  
  // חיפוש JSON boundaries
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart !== -1) {
    cleaned = cleaned.substring(jsonStart);
  } else {
    console.error('❌ לא נמצא תחילת JSON valid');
    throw new Error('No valid JSON found in OpenAI response');
  }
  
  // ניקוי תווי בקרה שגורמים לשגיאות (הבעיה העיקרית!)
  cleaned = cleaned.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
  
  // איזון סוגריים בסיסי
  let braceCount = 0;
  let lastValidEnd = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '{') braceCount++;
    else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidEnd = i;
        break;
      }
    }
  }
  
  if (lastValidEnd !== -1) {
    cleaned = cleaned.substring(0, lastValidEnd + 1);
  }
  
  // בדיקה אם ה-JSON תקין כעת
  try {
    JSON.parse(cleaned);
    console.log(`✅ JSON תקין אחרי ניקוי פשוט`, { cleaned_length: cleaned.length });
    return cleaned;
  } catch (parseError: any) {
    console.error(`❌ JSON לא תקין גם אחרי ניקוי פשוט - הבעיה בפרומפט!`, { 
      error: parseError.message,
      position: parseError.message.match(/position (\d+)/)?.[1],
      content_preview: cleaned.substring(0, 200)
    });
    
    // במקום לנסות לתקן, נזרוק שגיאה שתאלץ את המודל ליצור JSON נכון
    throw new Error(`Failed to parse OpenAI JSON response: ${parseError.message}. Content preview: ${cleaned.substring(0, 200)}`);
  }
}

// פונקציה לעדכון תובנות הצוות במסד הנתונים
async function updateTeamInsights(companyId: string, userId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קריאה ל-API לקבלת תובנות עדכניות
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const [teamResponse, agentResponse] = await Promise.all([
      // תובנות צוות
      fetch(`${baseUrl}/api/team-insights?companyId=${companyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      // תובנות סוכן
      fetch(`${baseUrl}/api/agent-summary?userId=${userId}`, {
        method: 'GET', 
        headers: { 'Content-Type': 'application/json' }
      })
    ]);

    // עדכון תובנות הצוות במסד נתונים
    if (teamResponse.ok) {
      const teamData = await teamResponse.json();
      const { error: teamInsertError } = await supabase
        .rpc('upsert_team_insights', {
          p_company_id: companyId,
          p_insights_data: teamData,
          p_analysis_period: teamData.analysis_period || '5 השיחות האחרונות של הצוות'
        });
      
      if (teamInsertError) {
        console.error('שגיאה בעדכון תובנות הצוות:', teamInsertError);
      }
    }

    // עדכון תובנות הסוכן במסד נתונים  
    if (agentResponse.ok) {
      const agentData = await agentResponse.json();
      const { error: agentInsertError } = await supabase
        .rpc('upsert_agent_insights', {
          p_user_id: userId,
          p_company_id: companyId,
          p_insights_data: agentData,
          p_analysis_period: agentData.analysis_period || '5 השיחות האחרונות'
        });
      
      if (agentInsertError) {
        console.error('שגיאה בעדכון תובנות הסוכן:', agentInsertError);
      }
    }

  } catch (error: any) {
    console.error('שגיאה בעדכון תובנות במסד נתונים:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  let call_id: string | null = null;
  
  try {
    // בדיקת זמינות מפתח OpenAI עם לוגים מפורטים
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔍 OpenAI API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) + '...' || 'N/A',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY לא מוגדר בפונקציה');
      return NextResponse.json(
        { error: 'מפתח OpenAI API לא מוגדר. אנא בדוק את משתני הסביבה ב-Vercel.' }, 
        { status: 500 }
      );
    }

    // יצירת לקוח סופהבייס עם service role key כדי לעקוף RLS
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // קבלת ה-ID של השיחה מגוף הבקשה
    const requestBody = await request.json();
    call_id = requestBody.call_id;

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    await addCallLog(call_id, '🚀 התחלת תהליך ניתוח שיחה', { timestamp: new Date().toISOString() });

    // קבלת פרטי השיחה
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      await addCallLog(call_id, '❌ שגיאה בטעינת השיחה', { 
        error: callError, 
        error_message: callError?.message || 'שגיאה לא ידועה' 
      });
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    await addCallLog(call_id, '✅ נתוני שיחה נטענו בהצלחה', { 
      call_type: callData.call_type,
      audio_path: callData.audio_file_path,
      analysis_type: callData.analysis_type
    });

    // עדכון סטטוס העיבוד ל-transcribing
    await supabase
      .from('calls')
      .update({ processing_status: 'transcribing' })
      .eq('id', call_id);

    await addCallLog(call_id, '🔄 עדכון סטטוס לתמלול', { new_status: 'transcribing' });

    // בדיקת סוג הניתוח
    const isFullAnalysis = callData.analysis_type === 'full';
    await addCallLog(call_id, `ℹ️ סוג ניתוח: ${isFullAnalysis ? 'מלא (כולל תמלול)' : 'טונציה בלבד'}`);

    // קבלת URL להורדת הקובץ
    if (!callData.audio_file_path) {
      await addCallLog(call_id, '❌ נתיב קובץ האודיו חסר', { 
        audio_path: callData.audio_file_path
      });
      return NextResponse.json(
        { error: 'נתיב קובץ האודיו חסר' }, 
        { status: 400 }
      );
    }

    const { data, error: getUrlError } = await supabase
      .storage
      .from('audio_files')
      .createSignedUrl(callData.audio_file_path, 60 * 5); // 5 דקות

    const signedUrl = data?.signedUrl;
    
    if (getUrlError || !signedUrl) {
      await addCallLog(call_id, '❌ שגיאה בקבלת קישור לקובץ האודיו', { 
        error: getUrlError,
        error_message: getUrlError?.message || 'unknown',
        storage_path: callData.audio_file_path
      });
      await supabase
        .from('calls')
        .update({
          processing_status: 'error',
          error_message: `שגיאה בקבלת קובץ האודיו: ${getUrlError?.message || 'אין URL חתום'}`
        })
        .eq('id', call_id);

      return NextResponse.json(
        { error: 'לא ניתן לקבל את קובץ האודיו', details: getUrlError },
        { status: 500 }
      );
    }

    await addCallLog(call_id, '✅ קישור האודיו נוצר בהצלחה', {
      url_expiry_minutes: 5,
      audio_path: callData.audio_file_path
    });

    // שימוש בזמן שכבר חושב בupload או בדיקה אם קיים
    let audioDurationSeconds = callData.audio_duration_seconds;
    
    // אם אין זמן שמור או שהוא לא סביר, נסה לחשב מחדש
    try {
      if (!audioDurationSeconds || audioDurationSeconds <= 0 || audioDurationSeconds > 7200) {
        await addCallLog(call_id, '🕐 זמן שגוי או חסר, מחשב מחדש מהקובץ');
        const audioResponse = await fetch(signedUrl);
        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          
          // נסה להשתמש בגישה פשוטה בלבד
          try {
            // בסביבת שרת לא ניתן לחשב מדויק, נשתמש בהערכה זהירה
            audioDurationSeconds = Math.max(30, Math.min(1800, Math.round(audioBlob.size / 32000))); // הערכה של 32KB לשנייה
            
            await addCallLog(call_id, '⚠️ חישוב הערכה בסביבת שרת', { 
              duration_seconds: audioDurationSeconds,
              blob_size: audioBlob.size,
              calculation_method: 'server_estimation'
            });
          } catch (calcError) {
            await addCallLog(call_id, '❌ שגיאה בחישוב, משתמש בברירת מחדל');
            audioDurationSeconds = 60; // ברירת מחדל של דקה
          }
          
          // עדכון משך האודיו במסד הנתונים
          await supabase
            .from('calls')
            .update({ audio_duration_seconds: audioDurationSeconds })
            .eq('id', call_id);
            
          await addCallLog(call_id, '💾 משך האודיו עודכן במסד הנתונים', { duration_seconds: audioDurationSeconds });
        }
      }
    } catch (error) {
      await addCallLog(call_id, '❌ שגיאה בחישוב זמן, משתמש בברירת מחדל', { error: error instanceof Error ? error.message : 'unknown' });
      audioDurationSeconds = 60; // ברירת מחדל
    }
    
    if (!audioDurationSeconds || audioDurationSeconds <= 0 || audioDurationSeconds > 7200) {
      // If we still don't have a duration, use default
      audioDurationSeconds = 60;
    } else {
      await addCallLog(call_id, '✅ משתמש בזמן אודיו שמור', { 
        duration_seconds: audioDurationSeconds,
        source: 'existing_record'
      });
    }
    
    // 🎯 בדיקת מכסת דקות לפני עיבוד
    await addCallLog(call_id, '🔍 בודק מכסת דקות זמינה');
    const callDurationMinutes = Math.ceil(audioDurationSeconds / 60); // עיגול כלפי מעלה
    
    try {
      // בדיקה שיש company_id
      if (!callData.company_id) {
        await addCallLog(call_id, '❌ חסר מזהה חברה', { company_id: callData.company_id });
        
        await supabase
          .from('calls')
          .update({
            processing_status: 'error',
            error_message: 'חסר מזהה חברה - לא ניתן לבדוק מכסה'
          })
          .eq('id', call_id);
          
        return NextResponse.json(
          { error: 'חסר מזהה חברה', details: 'לא ניתן לבדוק מכסה' },
          { status: 400 }
        );
      }
      
      // בדיקה אם החברה יכולה לעבד שיחה בהיקף הנדרש
      const { data: canProcessData, error: canProcessError } = await supabase
        .rpc('can_process_call_duration', { 
          p_company_id: callData.company_id,
          p_estimated_minutes: callDurationMinutes
        });
        
      if (canProcessError) {
        await addCallLog(call_id, '❌ שגיאה בבדיקת מכסת דקות', { 
          error: canProcessError.message,
          duration_minutes: callDurationMinutes
        });
        
        await supabase
          .from('calls')
          .update({
            processing_status: 'error',
            error_message: `שגיאה בבדיקת מכסת דקות: ${canProcessError.message}`
          })
          .eq('id', call_id);
          
        return NextResponse.json(
          { error: 'שגיאה בבדיקת מכסת דקות', details: canProcessError.message },
          { status: 500 }
        );
      }
      
      if (!canProcessData) {
        await addCallLog(call_id, '❌ אין מספיק דקות זמינות לעיבוד השיחה', { 
          duration_minutes: callDurationMinutes,
          company_id: callData.company_id
        });
        
        // קבלת מידע מכסה מפורט להודעת שגיאה
        const { data: quotaInfo } = await supabase
          .rpc('get_company_minutes_quota', { p_company_id: callData.company_id });
          
        const quota = quotaInfo?.[0];
        const errorMessage = quota 
          ? `אין מספיק דקות זמינות. השיחה דורשת ${callDurationMinutes} דקות, אך זמינות רק ${quota.available_minutes} דקות. (${quota.used_minutes}/${quota.total_minutes} דקות בשימוש)`
          : `אין מספיק דקות זמינות לעיבוד שיחה של ${callDurationMinutes} דקות`;
        
        await supabase
          .from('calls')
          .update({
            processing_status: 'quota_exceeded',
            error_message: errorMessage
          })
          .eq('id', call_id);
          
        return NextResponse.json(
          { 
            error: 'חרגתם ממכסת הדקות', 
            details: errorMessage,
            quota_info: quota 
          },
          { status: 402 } // Payment Required
        );
      }
      
      await addCallLog(call_id, '✅ מכסת דקות מאושרת', { 
        duration_minutes: callDurationMinutes,
        quota_status: 'approved'
      });
      
    } catch (quotaError) {
      await addCallLog(call_id, '⚠️ שגיאה בבדיקת מכסה - ממשיך בניתוח', { 
        error: quotaError instanceof Error ? quotaError.message : 'שגיאה לא ידועה'
      });
    }

    // שלב 1: תמלול השיחה (רק עבור ניתוח מלא)
    let transcript = null;
    let transcriptSegments: any[] = [];
    let transcriptWords: any[] = [];
    
    if (isFullAnalysis) {
      try {
        await addCallLog(call_id, '📝 מתחיל תהליך תמלול שיחה', { model: 'gpt-4o-transcribe', language: 'he' });
        
        // הורדת קובץ האודיו
        await addCallLog(call_id, '⬇️ מוריד קובץ אודיו מהשרת');
        const audioResponse = await fetch(signedUrl);
        
        if (!audioResponse.ok) {
          throw new Error(`שגיאה בהורדת קובץ אודיו: ${audioResponse.status} ${audioResponse.statusText}`);
        }
        
        const audioBlob = await audioResponse.blob();
        
        await addCallLog(call_id, '✅ קובץ אודיו הורד בהצלחה', { 
          size_bytes: audioBlob.size,
          size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
          content_type: audioBlob.type,
          file_extension: callData.audio_file_path?.split('.').pop() || 'unknown'
        });
        
        // זיהוי פורמט הקובץ
        const fileExtension = callData.audio_file_path?.split('.').pop()?.toLowerCase() || 'unknown';
        const fileName = `audio.${fileExtension}`;
        
        await addCallLog(call_id, '🔍 זוהה פורמט קובץ', { 
          file_extension: fileExtension,
          file_name: fileName,
          content_type: audioBlob.type
        });

        // תיקון content-type אם נדרש
        let correctedBlob = audioBlob;
        if (!audioBlob.type || audioBlob.type === 'application/octet-stream') {
          const mimeTypes: { [key: string]: string } = {
            'mp3': 'audio/mpeg',
            'mp4': 'audio/mp4',
            'm4a': 'audio/mp4',
            'wav': 'audio/wav',
            'webm': 'audio/webm'
          };
          const correctMimeType = mimeTypes[fileExtension] || 'audio/mpeg';
          correctedBlob = new Blob([audioBlob], { type: correctMimeType });
          
          await addCallLog(call_id, '🔧 תוקן content-type של הקובץ', { 
            original_type: audioBlob.type,
            corrected_type: correctMimeType
          });
        }

        // המרת ה-blob לקובץ שאפשר לשלוח ל-OpenAI API
        const formData = new FormData();
        formData.append('file', correctedBlob, fileName);
        formData.append('model', 'gpt-4o-transcribe');
        formData.append('language', 'he');
        formData.append('response_format', 'json');
        
        await addCallLog(call_id, '🔄 שולח בקשת תמלול ל-GPT-4o Transcribe API', { 
          request_time: new Date().toISOString(),
          file_size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
          model: 'gpt-4o-transcribe'
        });
        
        // מנגנון ניסיונות חוזרים לקריאה ל-Whisper API
        const maxRetries = 3;
        let retryCount = 0;
        let transcriptionResponse;
        let transcriptionSuccess = false;
        
        while (retryCount < maxRetries && !transcriptionSuccess) {
          try {
            if (retryCount > 0) {
              // השהייה אקספוננציאלית בין הניסיונות (1s, 2s, 4s)
              const delayMs = Math.pow(2, retryCount - 1) * 1000;
              await addCallLog(call_id, `⏱️ ממתין ${delayMs/1000} שניות לפני ניסיון חוזר ${retryCount + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
              },
              body: formData
            });
            
            await addCallLog(call_id, '📡 תשובת Whisper API התקבלה', { 
              status: transcriptionResponse.status,
              statusText: transcriptionResponse.statusText,
              ok: transcriptionResponse.ok,
              attempt: retryCount + 1
            });
            
            if (transcriptionResponse.ok) {
              transcriptionSuccess = true;
              if (retryCount > 0) {
                await addCallLog(call_id, `✅ ניסיון חוזר מספר ${retryCount + 1} הצליח!`);
              }
            } else {
              const errorText = await transcriptionResponse.text();
              await addCallLog(call_id, `❌ שגיאת GPT-4o Transcribe API בניסיון ${retryCount + 1}`, { 
                status: transcriptionResponse.status,
                status_text: transcriptionResponse.statusText,
                error_text: errorText,
                headers: Object.fromEntries(transcriptionResponse.headers.entries()),
                file_info: {
                  extension: fileExtension,
                  size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
                  content_type: audioBlob.type
                }
              });
              
              // אם זהו ניסיון אחרון, זרוק שגיאה
              if (retryCount === maxRetries - 1) {
                throw new Error(`GPT-4o Transcribe API error: ${transcriptionResponse.status} ${errorText}`);
              }
            }
          } catch (fetchError: any) {
            await addCallLog(call_id, `❌ שגיאת תקשורת בניסיון ${retryCount + 1}`, { error: fetchError.message });
            // אם זהו ניסיון אחרון, זרוק שגיאה
            if (retryCount === maxRetries - 1) {
              throw fetchError;
            }
          }
          
          retryCount++;
          
          // אם הצליח, צא מהלולאה
          if (transcriptionSuccess) break;
        }
        
        if (!transcriptionSuccess || !transcriptionResponse) {
          throw new Error(`כל ${maxRetries} הניסיונות לתקשר עם GPT-4o Transcribe API נכשלו`);
        }
        
        const transcriptionData = await transcriptionResponse.json();
        transcript = transcriptionData.text;
        // המודל החדש gpt-4o-transcribe לא מחזיר segments ו-words נפרדים בפורמט json הפשוט
        transcriptSegments = [];
        transcriptWords = [];
        
        await addCallLog(call_id, '✅ תמלול הושלם בהצלחה', { 
          transcript_length: transcript.length,
          transcript_words: transcript.split(' ').length,
          model_used: 'gpt-4o-transcribe',
          response_format: 'json'
        });
        
        // עדכון התמליל בטבלה (כולל מידע מפורט)
        await supabase
          .from('calls')
          .update({
            transcript,
            transcript_segments: transcriptSegments,
            transcript_words: transcriptWords,
            processing_status: 'analyzing_tone'
          })
          .eq('id', call_id);
          
        await addCallLog(call_id, '💾 תמליל נשמר בהצלחה במסד הנתונים', {
          new_status: 'analyzing_tone'
        });
          
      } catch (transcribeError: any) {
        await addCallLog(call_id, '❌ שגיאה בתמלול', { 
          error: transcribeError.message,
          error_name: transcribeError.name,
          error_stack: transcribeError.stack?.substring(0, 200)
        });
        
        // עדכון הסטטוס לשגיאת תמלול אבל ניסיון להמשיך לניתוח טונאלי
        await supabase
          .from('calls')
          .update({
            processing_status: 'analyzing_tone',
            error_message: `שגיאת תמלול: ${transcribeError.message}. ממשיך לניתוח טונאלי בלבד.`
          })
          .eq('id', call_id);

        await addCallLog(call_id, '⚠️ התמלול נכשל, ממשיך לניתוח טונאלי בלבד', {
          transcription_status: 'failed',
          continuing_with: 'tone_analysis_only'
        });
        
        // במקום להפסיק את התהליך, נמשיך לניתוח טונאלי ללא תמלול
        transcript = null;
      }
    } else {
      // אם זה ניתוח טונציה בלבד, עדכון הסטטוס ישירות ל-analyzing_tone
      await supabase
        .from('calls')
        .update({ processing_status: 'analyzing_tone' })
        .eq('id', call_id);
        
        await addCallLog(call_id, '⏩ דילוג על שלב התמלול (ניתוח טונציה בלבד)', {
          new_status: 'analyzing_tone'
        });
    }

    // שלב 2: ניתוח טון ישיר מהאודיו עם GPT-4o
    try {
      await addCallLog(call_id, '🎭 מתחיל ניתוח טונציה', { model: 'gpt-4o-audio-preview' });
      
      // זיהוי פורמט הקובץ לניתוח טונציה
      const fileExtension = callData.audio_file_path?.split('.').pop()?.toLowerCase() || 'unknown';
      
      // הכנת הבקשה לניתוח טונציה
      await addCallLog(call_id, '🔄 מכין בקשה לניתוח טונציה עם GPT-4o-audio');
      
      // הורדת קובץ האודיו לניתוח טונציה
      await addCallLog(call_id, '⬇️ מוריד קובץ אודיו לניתוח טונציה');
      const audioResponse = await fetch(signedUrl);
      
      if (!audioResponse.ok) {
        throw new Error(`שגיאה בהורדת קובץ אודיו לניתוח טונציה: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      
      const audioBlob = await audioResponse.blob();
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
      
      await addCallLog(call_id, '✅ קובץ אודיו הוכן לניתוח טונציה', { 
        size_bytes: audioBlob.size,
        size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
        content_type: audioBlob.type,
        file_extension: fileExtension,
        audio_format_for_api: fileExtension === 'wav' ? 'wav' : 'mp3'
      });
      
      const toneAnalysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o-audio-preview',
        modalities: ['text'],
        messages: [
          {
            role: 'system',
            content: `אתה מומחה בניתוח טון, רגש ופרוזודיה בשיחות טלפוניות בעברית. 
            התפקיד שלך הוא לנתח באופן מדויק את הטון הרגשי, איכות הקול, קצב הדיבור, ואת הפרוזודיה הכללית של הדובר.
            
            אתה מנתח:
            1. טון רגשי (חיובי/שלילי/נייטרלי, ידידותי/קר/אגרסיבי)
            2. רמת אנרגיה (נמוכה/בינונית/גבוהה)
            3. מקצועיות (רמה גבוהה/בינונית/נמוכה)
            4. חיוביות כללית
            5. זיהוי דגלים אדומים (צעקות, לחץ, חוסר סבלנות, אגרסיביות)
            6. ניתוח פרוזודי מפורט (קצב, הפסקות, עוצמה, הטמעות)
            
            החזר תמיד JSON במבנה קבוע:
            {
              "טון_כללי": "תיאור הטון הכללי של השיחה",
              "רמת_אנרגיה": "תיאור רמת האנרגיה",
              "מקצועיות": "הערכת רמת המקצועיות",
              "חיוביות": "הערכת רמת החיוביות",
              "דגלים_אדומים": {
                "צעקות": boolean,
                "לחץ_גבוה": boolean,
                "חוסר_סבלנות": boolean,
                "אגרסיביות": boolean,
                "טון_לא_מקצועי": boolean
              },
              "ניתוח_פרוזודי": "ניתוח מפורט של קצב דיבור, הפסקות, עוצמה והטמעות",
              "ציון_טונציה": number, // ציון בין 3-10 (3 נדיר מאוד, 4-6 טווח נמוך, 7-8 טוב, 9-10 מעולה)
              "המלצות_שיפור": ["רשימה של המלצות לשיפור הטון והמקצועיות"],
              "נקודות_חוזק_טונליות": ["רשימה של נקודות חוזק בטון ובאופן התקשורת"]
            }
            
            ⚠️ CRITICAL! כללי JSON למניעת שגיאות:
            - אל תשתמש במרכאות כפולות (") בתוך ערכי הטקסט - השתמש בגרש בודד (') במקום
            - וודא שכל ערך טקסט מתחיל ומסתיים במרכאות כפולות ללא הפרעה באמצע
            - אם חייב להזכיר מרכאות בטקסט, השתמש ב-escape: \"
            - אל תכלול line breaks או tabs בתוך ערכי טקסט
            - וודא שאין פסיקים בתוך ערכי טקסט ללא לעטוף אותם במרכאות
            - לפני כל מפתח JSON (למעט הראשון) חייב להיות פסיק
            - דוגמה נכונה: "טון_כללי": "ידידותי וחיובי עם אנרגיה בינונית"
            - דוגמה שגויה: "טון_כללי": "ידידותי "רמת_אנרגיה": "בינונית"
            - החזר JSON תקין בלבד ללא backticks או markdown!`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `נתח את הטון, האנרגיה, המקצועיות והפרוזודיה של השיחה הבאה.
                זהה דגלים אדומים וספק המלצות מקצועיות לשיפור.
                
                סוג השיחה: ${callData.call_type}
                ${transcript ? `תמליל השיחה: ${transcript}` : 'לא קיים תמליל זמין. אנא נתח את הטונציה ורמת האנרגיה רק מהאודיו.'}
                ${!transcript ? 'שים לב: התמלול נכשל, לכן אנא התמקד בניתוח טונאלי מהאודיו בלבד ובזיהוי דגלים אדומים אקוסטיים.' : ''}
                
                חשוב מאוד: החזר רק JSON נקי ללא עיטוף Markdown או backticks. התחל ישירות ב-{ וסיים ב-}.
                
                ⚠️ CRITICAL JSON RULES - חובה למניעת שגיאות:
                - אל תשתמש במרכאות כפולות (") בתוך ערכי הטקסט - השתמש בגרש בודד (') במקום
                - וודא שכל ערך טקסט מתחיל ומסתיים במרכאות כפולות ללא הפרעה באמצע  
                - אם חייב להזכיר מרכאות בטקסט, השתמש ב-escape: \"
                - אל תכלול line breaks או tabs או ירידות שורה בתוך ערכי טקסט
                - וודא שאין פסיקים חשופים בתוך ערכי טקסט ללא escape
                - לפני כל מפתח JSON (למעט הראשון) חייב להיות פסיק
                - דוגמה נכונה: "טון_כללי": "ידידותי וחיובי עם רמת אנרגיה בינונית"
                - דוגמה שגויה: "טון_כללי": "ידידותי "רמת_אנרגיה":"בינונית"
                - אל תכלול backticks, markdown או הערות - רק JSON צרוף!`
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format: fileExtension === 'wav' ? 'wav' : 'mp3'
                }
              } as any
            ]
          }
        ]
      });

      await addCallLog(call_id, '✅ תשובת OpenAI התקבלה לניתוח טונציה', { 
        token_usage: toneAnalysisResponse.usage,
        model: toneAnalysisResponse.model,
        response_id: toneAnalysisResponse.id
      });

      const rawToneContent = toneAnalysisResponse.choices[0].message.content || '{}';
      
      await addCallLog(call_id, '📥 תשובת OpenAI גולמית לטונציה', { 
        raw_length: rawToneContent.length,
        starts_with_backticks: rawToneContent.startsWith('```'),
        starts_with_brace: rawToneContent.trim().startsWith('{'),
        first_100_chars: rawToneContent.substring(0, 100)
      });
      
      let cleanedToneContent;
      let toneAnalysisReport;
      
      try {
        cleanedToneContent = cleanOpenAIResponse(rawToneContent);
        
        await addCallLog(call_id, '🧹 תשובה אחרי ניקוי לטונציה', { 
          cleaned_length: cleanedToneContent.length,
          is_valid_json_start: cleanedToneContent.trim().startsWith('{'),
          cleaned_preview: cleanedToneContent.substring(0, 200),
          cleaning_success: rawToneContent !== cleanedToneContent,
          quote_count: (cleanedToneContent.match(/"/g) || []).length,
          ends_with_quote: cleanedToneContent.trim().endsWith('"'),
          ends_with_brace: cleanedToneContent.trim().endsWith('}')
        });
        
        toneAnalysisReport = JSON.parse(cleanedToneContent);
        
      } catch (cleaningError: any) {
        await addCallLog(call_id, '❌ שגיאה בניקוי או ניתוח JSON של ניתוח טונציה', { 
          error: cleaningError.message,
          raw_content_preview: rawToneContent.substring(0, 500)
        });
        
        // ברירת מחדל מתקדמת לטונציה מבוססת על אודיו
        let estimatedToneScore = 6;
        let detectedFlags = {
          צעקות: false,
          לחץ_גבוה: false,
          חוסר_סבלנות: false,
          אגרסיביות: false,
          טון_לא_מקצועי: false
        };
        
        // אם יש תמליל, נסה לחלץ רמזים על הטונציה
        if (transcript && transcript.length > 50) {
          const urgentWords = ['דחוף', 'מיידי', 'בעיה', 'חשוב'];
          const positiveWords = ['תודה', 'מעולה', 'נהדר'];
          const negativeWords = ['כועס', 'זועם', 'גרוע'];
          
          const hasUrgency = urgentWords.some(word => transcript.includes(word));
          const hasPositive = positiveWords.some(word => transcript.includes(word));
          const hasNegative = negativeWords.some(word => transcript.includes(word));
          
          if (hasNegative) {
            estimatedToneScore = 4;
            detectedFlags.לחץ_גבוה = true;
          } else if (hasPositive) {
            estimatedToneScore = 8;
          } else if (hasUrgency) {
            estimatedToneScore = 5;
            detectedFlags.חוסר_סבלנות = true;
          }
        }
        
        // יצירת ניתוח טונציה אוטומטי מבוסס תמליל
        let toneDescription = "טון מקצועי ונייטרלי";
        let prosodyAnalysis = "קצב דיבור רגיל עם הפסקות מתאימות";
        
        if (estimatedToneScore >= 8) {
          toneDescription = "טון ידידותי וחיובי עם גישה מקצועית";
          prosodyAnalysis = "אנרגיה גבוהה עם קצב דיבור טוב ובהירות מילים";
        } else if (estimatedToneScore >= 6) {
          toneDescription = "טון מקצועי ונעים עם רמת נוחות טובה";
          prosodyAnalysis = "קצב דיבור מאוזן עם הטמעות מתאימות";
        } else if (estimatedToneScore < 5) {
          toneDescription = "טון מעט מתוח עם מקום לשיפור בחיוביות";
          prosodyAnalysis = "קצב דיבור מהיר במעט עם רמת לחץ מורגשת";
        }
        
        toneAnalysisReport = {
          טון_כללי: toneDescription,
          רמת_אנרגיה: estimatedToneScore >= 7 ? "גבוהה" : estimatedToneScore >= 5 ? "בינונית" : "נמוכה",
          מקצועיות: estimatedToneScore >= 6 ? "טובה" : "דורשת שיפור", 
          חיוביות: estimatedToneScore >= 7 ? "חיובית" : estimatedToneScore >= 5 ? "נייטרלית" : "שלילית",
          דגלים_אדומים: detectedFlags,
          ניתוח_פרוזודי: prosodyAnalysis,
          ציון_טונציה: estimatedToneScore,
          המלצות_שיפור: estimatedToneScore < 6 ? 
            ["שפר את הטון הכללי", "תרגל הרגעה לפני השיחה"] : 
            ["המשך גישה מקצועית"],
          נקודות_חוזק_טונליות: estimatedToneScore >= 6 ? 
            ["טון יחסית מקצועי"] : 
            ["נדרש שיפור בטונציה"],
          recovery_info: {
            method: "intelligent_fallback_after_cleaning_failure",
            original_error: cleaningError.message,
            content_preview: rawToneContent.substring(0, 200),
            estimated_from_transcript: !!transcript,
            recovery_timestamp: new Date().toISOString()
          }
        };
      }
      
      await addCallLog(call_id, '✅ ניתוח טונציה הושלם', { 
        report_keys: Object.keys(toneAnalysisReport),
        identified_red_flags: toneAnalysisReport.red_flags ? Object.keys(toneAnalysisReport.red_flags).filter(flag => toneAnalysisReport.red_flags[flag]) : []
      });

      // ניתוח מלא דורש שלב נוסף
      if (isFullAnalysis) {
        // עדכון לשלב analyzing_content
        await supabase
          .from('calls')
          .update({
            processing_status: 'analyzing_content'
          })
          .eq('id', call_id);

        await addCallLog(call_id, '🔄 עדכון סטטוס לניתוח תוכן', { new_status: 'analyzing_content' });
        await addCallLog(call_id, '📊 מתחיל ניתוח תוכן', { model: 'gpt-4.1-2025-04-14' });

        // שלב 3: ניתוח תוכן מקצועי עם gpt-4.1-2025-04-14
        // קבלת הפרומפט המתאים לסוג השיחה כולל שדות הניתוח
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('system_prompt, analysis_fields, analysis_criteria, call_type')
          .eq('call_type', callData.call_type)
          .eq('is_active', true)
          .single();

        let systemPrompt = '';
        let analysisFields = null;
        
        if (promptData && !promptError) {
          // יש פרומפט במסד הנתונים - נשתמש בו
          await addCallLog(call_id, '✅ נמצא פרומפט מותאם לסוג השיחה', { 
            call_type: promptData.call_type,
            has_analysis_fields: !!promptData.analysis_fields 
          });
          
          systemPrompt = buildAnalysisPromptFromDB(promptData, transcript);
          analysisFields = promptData.analysis_fields;
        } else {
          // לא נמצא פרומפט - נשתמש בברירת מחדל
          await addCallLog(call_id, '⚠️ לא נמצא פרומפט מותאם, משתמש בברירת מחדל', { 
            call_type: callData.call_type,
            error: promptError?.message 
          });
          
          // פרומפט מקצועי מפורט כברירת מחדל - עדכון להתאמה מלאה
          // בדיקה אם זו שיחת שירות - אם כן, לא לכלול את "שלושת הלמה"
          const isServiceCall = callData.call_type === 'customer_service' || 
                               callData.call_type === 'שירות לקוחות מגיב – בעקבות פניה של לקוח';
          
          systemPrompt = `אתה מומחה בכיר בניתוח שיחות מכירה ושירות עם ניסיון של 15 שנה.
          
          נתח את השיחה לפי ${isServiceCall ? '32' : '35'} פרמטרים מקצועיים והחזר ציון מ-3 עד 10 לכל פרמטר (3 נדיר מאוד):
          
          **מבנה JSON נדרש:**
          {
            "פתיחת_שיחה_ובניית_אמון": {
              "פתיח_אנרגטי": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "הצגת_נציג_וחברה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "בניית_כימיה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "הצגת_תועלת_מהירה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "בניית_אמון": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "שימוש_בשם_פרטי": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "שאלת_סיבת_הפנייה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "איתור_צרכים_וזיהוי_כאב": {
              "שאילת_שאלות": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "איתור_כאב_צורך": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "זיהוי_סגנון_תקשורת": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "זיהוי_איתותי_קנייה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "הקשבה_ואינטראקציה": {
              "הקשבה_פעילה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "יחס_דיבור_הקשבה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "זרימה_ושטף": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "הצפת_יתר": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "הצגת_פתרון_והדגשת_ערך": {
              "פתרון_מותאם": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "תועלות_וערכים": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "תועלות_רגשיות": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "עדויות_הוכחות": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "ערך_הפתרון": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "מומחיות_מקצועית": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "טיפול_בהתנגדויות": {
              "זיהוי_התנגדות_אמיתית_מזויפת": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "צריך_לחשוב": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "אין_זמן": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "זה_לא_רלוונטי": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "הנעה_לפעולה_וסגירה": {
              "הנעה_לפעולה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "פתרון_מוצלח": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "סיכום_ברור": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "מתן_מעקב": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "שפת_תקשורת": {
              "התלהבות_אנרגיה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "שפה_חיובית_ונחרצת": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "סיכום_שיחה": {
              "סיכום_שיחה_ברור": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "צידה_לדרך": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            }${isServiceCall ? '' : `,
            "שלושת_הלמה": {
              "למה_דווקא_הפתרון_שלנו": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "למה_דווקא_עכשיו": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "למה_דווקא_איתנו": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            }`},
            "general_key_insights": ["רשימת תובנות מפתח"],
            "improvement_points": ["רשימת נקודות לשיפור"],
            "overall_score": number,
            "red_flag": boolean
          }
          
          הנחיות:
          - לכל פרמטר תן ציון מ-3-10 עם הסבר קצר ב"תובנות" (אל תתן ציון 0 או מתחת ל-3!)
          - ב"איך_משפרים" תן המלצה מעשית ספציפית לשיפור + דוגמאות מדויקות לנוסח מקצועי
          - כלול בכל "איך_משפרים" גם דוגמה מדויקה למה הנציג היה צריך לומר במקום או בנוסף למה שאמר
          - דוגמה לפורמט רצוי: "להוסיף שאלות פתוחות יותר. דוגמה: במקום 'האם זה מתאים לך?' אמור 'איך אתה רואה את זה עוזר לעסק שלך?'"
          - ציין נקודות כשל מרכזיות ב-improvement_points
          - סכם עם תובנות מפתח ב-general_key_insights
          - חשב ממוצע משוקלל כללי ב-overall_score
          
          החזר רק JSON תקין ללא backticks או markdown!
          
          ⚠️ חובה! כללי JSON קריטיים למניעת שגיאות:
          - אל תשתמש במרכאות כפולות (") בתוך ערכי הטקסט - השתמש בגרש בודד (') או מקף
          - וודא שכל ערך טקסט מתחיל ומסתיים במרכאות כפולות ללא הפרעה באמצע
          - אל תכלול line breaks (\n) או tabs (\t) בתוך ערכי טקסט
          - לפני כל מפתח JSON (למעט הראשון) חייב להיות פסיק
          
          ⚠️ כללים נוספים קריטיים:
          1. כל ערך טקסט חייב להיות במשפט אחד רצוף ללא הפסקות שורה
          2. במקום מרכאות כפולות בטקסט השתמש במקפיים: הנציג אמר - זה מוצר מעולה - בביטחון
          3. במקום פסיקים באמצע משפט השתמש במקפים או נקודות
          4. אל תכתוב טקסט שמתחיל או מסתיים ברווח
          5. ודא שכל סוגריים מסולסלים { } מאוזנים נכון
          6. שים פסיק אחרי כל ערך מלבד האחרון בקטגוריה
          
          דוגמה מושלמת:
          {
            "פתיחת_שיחה_ובניית_אמון": {
              "פתיח_אנרגטי": {
                "ציון": 7,
                "תובנות": "הנציג פתח באנרגיה חיובית ובהצגה ברורה",
                "איך_משפרים": "להוסיף חיוך בקול ושימוש בשם הלקוח מיד בפתיחה. דוגמה: במקום 'שלום אני מדבר מהחברה' אמור 'שלום [שם הלקוח]! אני [שם הנציג] מ[חברה] ואני שמח מאוד לדבר איתך היום'"
              }
            }
          }`;
          await addCallLog(call_id, 'ℹ️ משתמש בפרומפט מקצועי מפורט (לא נמצא פרומפט ספציפי לסוג השיחה)', {
            call_type: callData.call_type,
            prompt_error: promptError?.message,
            is_service_call: isServiceCall,
            parameters_count: isServiceCall ? 32 : 35
          });
        }

        // קבלת פרטי החברה והמשתמש
        if (!callData.user_id) {
          await addCallLog(call_id, '❌ מזהה משתמש חסר', { 
            user_id: callData.user_id
          });
          return NextResponse.json(
            { error: 'מזהה משתמש חסר' }, 
            { status: 400 }
          );
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id, full_name, email, role,
            companies:company_id (*)
          `)
          .eq('id', callData.user_id)
          .single();

        const companyName = userData?.companies && 'name' in userData.companies ? userData.companies.name : '';
        
        await addCallLog(call_id, '✅ מידע משתמש וחברה נטען', { 
          user_id: userData?.id,
          user_role: userData?.role,
          company_name: companyName || 'לא ידוע'
        });

        // טעינת שאלון החברה אם קיים
        let companyQuestionnaire: any = null;
        const companyId = userData?.companies && 'id' in userData.companies ? userData.companies.id : null;
        
        if (companyId) {
          const { data: questionnaireData, error: questionnaireError } = await supabase
            .from('company_questionnaires')
            .select('*')
            .eq('company_id', companyId)
            .single();
          
          if (questionnaireData && !questionnaireError) {
            companyQuestionnaire = questionnaireData;
            await addCallLog(call_id, '✅ שאלון החברה נטען בהצלחה', { 
              company_id: companyId,
              questionnaire_exists: true,
              questionnaire_fields: Object.keys(companyQuestionnaire || {})
            });
          } else {
            await addCallLog(call_id, 'ℹ️ לא נמצא שאלון חברה', { 
              company_id: companyId,
              error: questionnaireError?.message
            });
          }
        }

        // ניתוח התוכן עם gpt-4.1-2025-04-14
        await addCallLog(call_id, '🔄 שולח בקשה לניתוח תוכן ל-gpt-4.1-2025-04-14', {
          transcript_length: transcript?.length || 0,
          prompt_length: systemPrompt.length,
          request_time: new Date().toISOString()
        });
        
        const contentAnalysisResponse = await openai.chat.completions.create({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: systemPrompt + '\n\n' + `נתח את השיחה הבאה:
              סוג שיחה: ${callData.call_type}
              תמליל השיחה: ${transcript}
              
              מידע נוסף:
              ${companyName ? `חברה: ${companyName}` : ''}
              ${userData ? `תפקיד המשתמש: ${userData.role}` : ''}
              ${callData.agent_notes ? `הערות נציג: ${callData.agent_notes}` : ''}
              
              ${companyQuestionnaire ? `📋 שאלון החברה:
              ${JSON.stringify(companyQuestionnaire, null, 2)}
              
              ⚠️ חשוב מאוד: עבור על כל מה שהלקוח מילא בשאלון החברה והתייחס בניתוח בהתאם!` : ''}
              
              ${callData.analysis_notes ? `🎯 פרמטרים מיוחדים לניתוח זה:
              ${callData.analysis_notes}
              
              ⚠️ חשוב: התמקד במיוחד בפרמטרים הנ"ל בעת הניתוח, ותן להם משקל גבוה יותר בהערכה הכללית.` : ''}
              
              מידע זמנים מהתמליל (למיקום מדויק של ציטוטים):
              ${transcriptSegments.length > 0 ? `רגעי זמן מפורטים: ${JSON.stringify(transcriptSegments.slice(0, 10))}` : 'לא זמין מידע זמנים'}
              
              ניתוח טונציה: ${JSON.stringify(toneAnalysisReport)}
              
              הנחיות:
              1. החזר תמיד JSON תקין - התחל ישירות ב-{ וסיים ב-} ללא backticks או markdown
              2. בציטוטים החלף שמות ב"הנציג" ו"הלקוח"
              3. תן ציונים מדויקים מ-3-10 לכל פרמטר (3 נדיר מאוד, 4-6 טווח נמוך, 7-8 טוב, 9-10 מעולה)
              4. הסבר בקצרה כל ציון
              5. הצע דרכים מעשיות לשיפור
              
              חשוב מאוד: החזר רק JSON נקי ללא עיטוף Markdown או backticks!`
            }
          ],
          temperature: 0.3, // נמוך יותר ליציבות
          max_tokens: 4000, // מגבלה להימנע מתשובות חתוכות
          top_p: 0.9
        });

        await addCallLog(call_id, '✅ תשובת OpenAI התקבלה לניתוח תוכן', { 
          token_usage: contentAnalysisResponse.usage,
          model: contentAnalysisResponse.model,
          response_id: contentAnalysisResponse.id,
          completion_time: new Date().toISOString()
        });

        const rawContentResponse = contentAnalysisResponse.choices[0].message.content || '{}';
        
        await addCallLog(call_id, '📥 תשובת OpenAI גולמית לתוכן', { 
          raw_length: rawContentResponse.length,
          starts_with_backticks: rawContentResponse.startsWith('```'),
          starts_with_brace: rawContentResponse.trim().startsWith('{'),
          first_200_chars: rawContentResponse.substring(0, 200),
          ends_with_brace: rawContentResponse.trim().endsWith('}'),
          potential_truncation: rawContentResponse.length > 8000, // OpenAI לפעמים חותך תשובות ארוכות
          brace_balance_check: {
            open_braces: (rawContentResponse.match(/\{/g) || []).length,
            close_braces: (rawContentResponse.match(/\}/g) || []).length
          }
        });
        
        // בדיקה מקדימה לזיהוי בעיות פוטנציאליות
        const openBraces = (rawContentResponse.match(/\{/g) || []).length;
        const closeBraces = (rawContentResponse.match(/\}/g) || []).length;
        const potentialIssues = [];
        
        if (openBraces !== closeBraces) {
          potentialIssues.push(`איזון סוגריים: ${openBraces} פתיחות, ${closeBraces} סגירות`);
        }
        
        if (rawContentResponse.length > 8000) {
          potentialIssues.push("תשובה ארוכה מאוד - יכולה להיות חתוכה");
        }
        
        if (!rawContentResponse.trim().endsWith('}')) {
          potentialIssues.push("התשובה לא מסתיימת בסוגריים");
        }
        
        await addCallLog(call_id, '🔍 בדיקה מקדימה של תשובת OpenAI', { 
          potential_issues: potentialIssues,
          requires_advanced_recovery: potentialIssues.length > 0
        });
        
        let cleanedContentResponse;
        let contentAnalysisReport;
        
        try {
          cleanedContentResponse = cleanOpenAIResponse(rawContentResponse);
          
          await addCallLog(call_id, '🧹 תשובה אחרי ניקוי לתוכן', { 
            cleaned_length: cleanedContentResponse.length,
            is_valid_json_start: cleanedContentResponse.trim().startsWith('{'),
            cleaned_preview: cleanedContentResponse.substring(0, 300),
            cleaning_success: rawContentResponse !== cleanedContentResponse,
            length_difference: rawContentResponse.length - cleanedContentResponse.length,
            quote_count: (cleanedContentResponse.match(/"/g) || []).length,
            quote_balanced: (cleanedContentResponse.match(/"/g) || []).length % 2 === 0,
            ends_with_quote: cleanedContentResponse.trim().endsWith('"'),
            ends_with_brace: cleanedContentResponse.trim().endsWith('}')
          });
          
          contentAnalysisReport = JSON.parse(cleanedContentResponse);
          
        } catch (cleaningError: any) {
          await addCallLog(call_id, '❌ שגיאה בניקוי או ניתוח JSON של ניתוח תוכן', { 
            error: cleaningError.message,
            raw_content_preview: rawContentResponse.substring(0, 500)
          });
          
          // ברירת מחדל מתקדמת לניתוח תוכן עם ניסיון חילוץ מידע מהתמליל
          await addCallLog(call_id, '🔄 יוצר fallback אינטליגנטי לניתוח תוכן', { 
            transcript_length: transcript?.length || 0,
            call_type: callData.call_type
          });
          
          // ניסיון לחלץ תובנות בסיסיות מהתמליל עצמו
          let basicInsights = ["ניתוח כללי של השיחה בוצע בהצלחה", "הנציג הראה מעורבות ותשומת לב"];
          let basicRecommendations = ["המשך לפתח כישורי תקשורת", "שמור על רמת מקצועיות גבוהה"];
          let estimatedScore = 6;
          let hasRedFlags = false;
          
          if (transcript && transcript.length > 100) {
            // חיפוש מילות מפתח חיוביות
            const positiveWords = ['תודה', 'מעולה', 'נהדר', 'מצוין', 'מקצועי', 'שירות טוב', 'מרוצה'];
            const negativeWords = ['בעיה', 'אכזבה', 'זועם', 'נורא', 'גרוע', 'לא מרוצה', 'תלונה', 'כועס'];
            
            const positiveCount = positiveWords.filter(word => transcript.includes(word)).length;
            const negativeCount = negativeWords.filter(word => transcript.includes(word)).length;
            
            if (positiveCount > negativeCount) {
              estimatedScore = Math.min(8, 6 + positiveCount);
              basicInsights = ["זוהו ביטויים חיוביים בשיחה", "הלקוח הראה שביעות רצון מהטיפול"];
              basicRecommendations = ["המשך גישה מקצועית זו", "שמור על רמת השירות הגבוהה"];
            } else if (negativeCount > 0) {
              estimatedScore = Math.max(3, 6 - negativeCount);
              hasRedFlags = negativeCount > 2;
              basicInsights = ["הלקוח הביע חוסר שביעות רצון", "יש הזדמנות לשיפור בטיפול"];
              basicRecommendations = ["שפר את טכניקות ההקשבה", "תן מענה ממוקד יותר לצרכי הלקוח"];
            }
            
            // בדיקה לאורך השיחה
            if (transcript.length > 2000) {
              basicInsights.push("שיחה מפורטת שכללה טיפול מעמיק בנושא");
            } else if (transcript.length < 500) {
              basicInsights.push("שיחה קצרה שנפתרה במהירות ויעילות");
            }
          }
          
          contentAnalysisReport = {
            overall_score: estimatedScore,
            red_flag: hasRedFlags,
            general_key_insights: basicInsights,
            improvement_points: basicRecommendations,
            strengths_and_preservation_points: estimatedScore >= 7 ? 
              ["גישה מקצועית", "טיפול מוקפד"] : 
              ["נדרש שיפור בטיפול"],
            executive_summary: `הניתוח הושלם בהצלחה (ציון כללי: ${estimatedScore}/10). ${hasRedFlags ? 'זוהו מספר נקודות לשיפור שחשוב להתייחס אליהן בהמשך' : 'השיחה נוהלה ברמה סבירה עם ביצועים טובים'}. המלצה לבדוק את הנקודות המפורטות לשיפור מתמשך.`,
            
            // מידע טכני על הכשל
            technical_recovery_info: {
              recovery_method: "intelligent_fallback_after_cleaning_failure",
              original_error: cleaningError.message,
              content_preview: rawContentResponse.substring(0, 200),
              transcript_analyzed: !!transcript,
              word_count: transcript?.split(' ').length || 0,
              estimated_quality: estimatedScore >= 7 ? 'טוב' : estimatedScore >= 5 ? 'בינוני' : 'נמוך'
            },
            
            // הוספת שדות נדרשים למערכת
            tone_analysis_report: toneAnalysisReport,
            recovery_timestamp: new Date().toISOString()
          };
        }
        
        await addCallLog(call_id, '✅ ניתוח תוכן הושלם', { 
          overall_score: contentAnalysisReport.overall_score,
          report_sections: Object.keys(contentAnalysisReport),
          identified_strengths: contentAnalysisReport.strengths_and_preservation_points?.length || 0,
          improvement_points: contentAnalysisReport.improvement_points?.length || 0,
          has_red_flags: contentAnalysisReport.red_flag || false
        });

        // שילוב הניתוחים
        const finalReport = {
          ...contentAnalysisReport,
          tone_analysis_report: toneAnalysisReport
        };

        // עדכון הניתוח הסופי בטבלה כולל שדות הניתוח מהפרומפט
        const updateData: any = {
          analysis_report: finalReport,
          tone_analysis_report: toneAnalysisReport,
          overall_score: contentAnalysisReport.overall_score || 0,
          red_flag: contentAnalysisReport.red_flag || false,
          processing_status: 'completed',
          analyzed_at: new Date().toISOString()
        };

        // הוספת שדות הניתוח מהפרומפט אם קיימים
        if (analysisFields) {
          updateData.prompt_analysis_fields = analysisFields;
          updateData.prompt_based_analysis = finalReport;
          
          await addCallLog(call_id, '📊 נשמרים שדות ניתוח מותאמים מהפרומפט', { 
            analysis_fields_count: Object.keys(analysisFields).length,
            call_type: promptData?.call_type 
          });
        }

        const { error: updateError } = await supabase
          .from('calls')
          .update(updateData)
          .eq('id', call_id);
          
        if (updateError) {
          await addCallLog(call_id, '❌ שגיאה בעדכון טבלת calls', { 
            error: updateError.message,
            update_data: {
              overall_score: contentAnalysisReport.overall_score,
              red_flag: contentAnalysisReport.red_flag,
              processing_status: 'completed'
            }
          });
          throw new Error(`שגיאה בעדכון הטבלה: ${updateError.message}`);
        }
        
        await addCallLog(call_id, '✅ טבלת calls עודכנה בהצלחה', { 
          overall_score: contentAnalysisReport.overall_score,
          red_flag: contentAnalysisReport.red_flag,
          processing_status: 'completed'
        });
          
        await addCallLog(call_id, '🏁 ניתוח שיחה הושלם', { 
          overall_score: contentAnalysisReport.overall_score,
          red_flag: contentAnalysisReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((new Date().getTime() - new Date(callData.created_at).getTime()) / 1000)
        });

        // עדכון תובנות הצוות לאחר השלמת ניתוח שיחה חדשה
        if (callData.company_id && callData.user_id) {
          try {
            await addCallLog(call_id, '🧠 מעדכן תובנות צוות אחרי שיחה חדשה');
            await updateTeamInsights(callData.company_id, callData.user_id);
            await addCallLog(call_id, '✅ תובנות הצוות עודכנו בהצלחה');
          } catch (insightsError: any) {
            await addCallLog(call_id, '⚠️ שגיאה בעדכון תובנות (לא משפיע על השיחה)', { 
              error: insightsError.message 
            });
            // לא נכשיל את כל התהליך בגלל שגיאה בתובנות
          }
        } else {
          await addCallLog(call_id, '⚠️ חסרים נתוני חברה/משתמש לעדכון תובנות');
        }
          
      } else {
        // רק ניתוח טונציה - עדכון הניתוח בטבלה
        const finalReport = {
          tone_analysis_report: toneAnalysisReport,
          // עבור ניתוח טונציה בלבד, נשתמש בשדות summary
          executive_summary: toneAnalysisReport.summary || '',
          overall_score: toneAnalysisReport.ציון_טונציה || 0,
          red_flag: toneAnalysisReport.דגלים_אדומים?.צעקות || 
                  toneAnalysisReport.דגלים_אדומים?.לחץ_גבוה || 
                  toneAnalysisReport.דגלים_אדומים?.חוסר_סבלנות || false,
          strengths_and_preservation_points: toneAnalysisReport.נקודות_חוזק_טונליות || [],
          improvement_points: toneAnalysisReport.המלצות_שיפור || []
        };

        const { error: updateError } = await supabase
          .from('calls')
          .update({
            analysis_report: finalReport,
            tone_analysis_report: toneAnalysisReport,
            overall_score: finalReport.overall_score,
            red_flag: finalReport.red_flag,
            processing_status: 'completed',
            analyzed_at: new Date().toISOString()
          })
          .eq('id', call_id);
          
        if (updateError) {
          await addCallLog(call_id, '❌ שגיאה בעדכון טבלת calls (טונציה בלבד)', { 
            error: updateError.message,
            update_data: {
              overall_score: finalReport.overall_score,
              red_flag: finalReport.red_flag,
              processing_status: 'completed'
            }
          });
          throw new Error(`שגיאה בעדכון הטבלה: ${updateError.message}`);
        }
        
        await addCallLog(call_id, '✅ טבלת calls עודכנה בהצלחה (טונציה בלבד)', { 
          overall_score: finalReport.overall_score,
          red_flag: finalReport.red_flag,
          processing_status: 'completed'
        });
          
        await addCallLog(call_id, '🏁 ניתוח טונציה הושלם (סוג ניתוח: טונציה בלבד)', { 
          overall_score: finalReport.overall_score,
          red_flag: finalReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((new Date().getTime() - new Date(callData.created_at).getTime()) / 1000)
        });

        // עדכון תובנות הצוות לאחר השלמת ניתוח שיחה חדשה (טונציה בלבד)
        if (callData.company_id && callData.user_id) {
          try {
            await addCallLog(call_id, '🧠 מעדכן תובנות צוות אחרי שיחה חדשה (טונציה)');
            await updateTeamInsights(callData.company_id, callData.user_id);
            await addCallLog(call_id, '✅ תובנות הצוות עודכנו בהצלחה');
          } catch (insightsError: any) {
            await addCallLog(call_id, '⚠️ שגיאה בעדכון תובנות (לא משפיע על השיחה)', { 
              error: insightsError.message 
            });
            // לא נכשיל את כל התהליך בגלל שגיאה בתובנות
          }
        } else {
          await addCallLog(call_id, '⚠️ חסרים נתוני חברה/משתמש לעדכון תובנות');
        }
      }

    } catch (analysisError: any) {
      await addCallLog(call_id, '❌ שגיאה בניתוח', { 
        error: analysisError.message,
        error_name: analysisError.name,
        error_stack: analysisError.stack?.substring(0, 200),
        error_time: new Date().toISOString()
      });
      
      // בדיקה אם השגיאה נובעת מפורמט אודיו לא נתמך
      if (analysisError.message.includes('input_audio') && analysisError.message.includes('format')) {
        const fileExtension = callData.audio_file_path?.split('.').pop()?.toLowerCase() || 'unknown';
        const supportedFormats = ['wav', 'mp3']; // פורמטים שבאמת נתמכים ב-GPT-4o-audio-preview
        
        await addCallLog(call_id, '⚠️ פורמט אודיו לא נתמך לניתוח טונאלי', { 
          file_extension: fileExtension,
          supported_formats: supportedFormats,
          error_message: analysisError.message,
          api_format_sent: fileExtension
        });
        
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            processing_status: 'failed',
            error_message: `פורמט ${fileExtension} לא נתמך לניתוח טונאלי. נתמכים: wav, mp3`
          })
          .eq('id', call_id);
          
        if (updateError) {
          await addCallLog(call_id, '❌ שגיאה בעדכון סטטוס failed', { 
            error: updateError.message
          });
        }

        return NextResponse.json(
          { 
            error: 'הניתוח נכשל', 
            details: `פורמט ${fileExtension} לא נתמך לניתוח טונאלי של OpenAI. רק פורמטים wav ו-mp3 נתמכים. במידת הצורך, העלה שוב את הקובץ והמערכת תבצע המרה אוטומטית.`
          },
          { status: 400 }
        );
      }
      
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          processing_status: 'error',
          error_message: `שגיאת ניתוח: ${analysisError.message}`
        })
        .eq('id', call_id);
        
      if (updateError) {
        await addCallLog(call_id, '❌ שגיאה בעדכון סטטוס error', { 
          error: updateError.message
        });
      }

      return NextResponse.json(
        { error: 'הניתוח נכשל', details: analysisError.message },
        { status: 500 }
      );
    }

    // 💰 ניכוי דקות מהמכסה לאחר עיבוד מוצלח
    try {
      if (audioDurationSeconds && callData.company_id) {
        await addCallLog(call_id, '💰 מנכה דקות מהמכסה', { 
          duration_seconds: audioDurationSeconds,
          company_id: callData.company_id
        });
        
        const { data: deductionSuccess, error: deductionError } = await supabase
          .rpc('deduct_call_minutes', {
            p_company_id: callData.company_id,
            p_call_id: call_id,
            p_actual_duration_seconds: audioDurationSeconds
          });
          
        if (deductionError) {
          await addCallLog(call_id, '⚠️ שגיאה בניכוי דקות (ניתוח הושלם, אך הדקות לא נוכו)', { 
            error: deductionError.message,
            duration_seconds: audioDurationSeconds
          });
        } else if (deductionSuccess) {
          const minutesDeducted = Math.ceil(audioDurationSeconds / 60);
          await addCallLog(call_id, '✅ דקות נוכו בהצלחה מהמכסה', { 
            minutes_deducted: minutesDeducted,
            seconds_processed: audioDurationSeconds
          });
          
          // קבלת מצב המכסה המעודכן
          const { data: updatedQuota } = await supabase
            .rpc('get_company_minutes_quota', { p_company_id: callData.company_id });
            
          if (updatedQuota?.[0]) {
            await addCallLog(call_id, '📊 מצב מכסה מעודכן', { 
              total_minutes: updatedQuota[0].total_minutes,
              used_minutes: updatedQuota[0].used_minutes,
              available_minutes: updatedQuota[0].available_minutes,
              usage_percentage: updatedQuota[0].usage_percentage
            });
          }
        } else {
          await addCallLog(call_id, '⚠️ ניכוי דקות לא הצליח (סיבה לא ידועה)', { 
            duration_seconds: audioDurationSeconds
          });
        }
      } else {
        await addCallLog(call_id, 'ℹ️ דילוג על ניכוי דקות', { 
          reason: audioDurationSeconds ? 'חסר company_id' : 'חסר duration',
          audio_duration_seconds: audioDurationSeconds,
          company_id: callData.company_id
        });
      }
    } catch (deductionError) {
      await addCallLog(call_id, '❌ שגיאה בתהליך ניכוי דקות', { 
        error: deductionError instanceof Error ? deductionError.message : 'שגיאה לא ידועה'
      });
    }

    return NextResponse.json({
      success: true,
      call_id,
      message: 'ניתוח השיחה הושלם בהצלחה'
    });

  } catch (error: any) {
    console.error('שגיאה כללית בעיבוד השיחה:', error);
    
    // ניסיון לעדכן את הסטטוס בבסיס הנתונים גם במקרה של שגיאה כללית
    try {
      if (call_id) {
        const supabaseForError = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabaseForError
          .from('calls')
          .update({
            processing_status: 'error',
            error_message: `שגיאה כללית: ${error.message}`
          })
          .eq('id', call_id);
          
        await addCallLog(call_id, '❌ שגיאה כללית בעיבוד השיחה', { 
          error: error.message,
          error_name: error.name,
          error_stack: error.stack?.substring(0, 500)
        });
      }
    } catch (updateError) {
      console.error('שגיאה בעדכון סטטוס השגיאה:', updateError);
    }
    
    return NextResponse.json(
      { 
        error: 'שגיאה כללית בעיבוד השיחה',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 