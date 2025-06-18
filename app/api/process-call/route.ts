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

// פונקציה מתקדמת לניקוי תשובות OpenAI עם טיפול טוב יותר ב-JSON שבור
function cleanOpenAIResponse(content: string): string {
  if (!content) return '{}';
  
  console.log(`🧹 מנקה תגובת OpenAI`, { original_length: content.length });
  
  // שלב 1: ניקוי בסיסי
  let cleaned = content
    .replace(/```(?:json|JSON)?\s*/g, '') // הסרת code blocks
    .replace(/```\s*$/g, '')
    .replace(/^`+|`+$/g, '') // הסרת backticks
    .trim();
  
  // שלב 2: חיפוש JSON boundaries
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart !== -1) {
    cleaned = cleaned.substring(jsonStart);
  } else {
    console.error('❌ לא נמצא תחילת JSON valid');
    return '{}';
  }
  
  // שלב 3: אלגוריתם מתקדם לאיזון סוגריים
  let braceCount = 0;
  let lastValidEnd = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidEnd = i;
          break; // נמצא JSON מלא ותקין
        }
      }
    }
  }
  
  // שלב 4: חיתוך לJSON תקין
  if (lastValidEnd !== -1) {
    cleaned = cleaned.substring(0, lastValidEnd + 1);
  } else {
    // אם לא מצאנו סוף תקין, נסה לתקן
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    const missingBraces = openBraces - closeBraces;
    
    if (missingBraces > 0 && missingBraces < 10) { // מגבלה סבירה
      cleaned += '}'.repeat(missingBraces);
    }
  }
  
  // שלב 5: ניסיון parse ראשוני
  try {
    JSON.parse(cleaned);
    console.log(`✅ JSON תקין אחרי ניקוי`, { cleaned_length: cleaned.length });
    return cleaned;
  } catch (parseError: any) {
    console.warn(`⚠️ JSON לא תקין אחרי ניקוי, מנסה תיקונים`, { 
      error: parseError.message,
      position: parseError.message.match(/position (\d+)/)?.[1] 
    });
    
    // שלב 6: תיקונים מתקדמים
    try {
      let fixed = cleaned
        // הסרת פסיקים מיותרים
        .replace(/,(\s*[}\]])/g, '$1')
        // תיקון newlines בתוך strings
        .replace(/([^\\]")([^"]*?)\n([^"]*?)(")/g, '$1$2 $3$4')
        // תיקון escaped quotes כפולים
        .replace(/\\"/g, '"')
        .replace(/\\n/g, ' ')
        // תיקון quotes לא מאוזנים
        .replace(/([{,]\s*)([a-zA-Z_]+):/g, '$1"$2":');
      
      // אם JSON לא מסתיים בצורה תקינה
      if (!fixed.endsWith('}') && fixed.includes('{')) {
        fixed += '}';
      }
      
      JSON.parse(fixed);
      console.log(`✅ JSON תוקן בהצלחה`);
      return fixed;
    } catch (secondError: any) {
      console.error(`❌ כשל בתיקון JSON`, { 
        error: secondError.message,
        preview: cleaned.substring(0, 200) 
      });
      
      // שלב 7: ניסיון חילוץ partial JSON
      const errorPosition = parseError.message.match(/position (\d+)/)?.[1];
      if (errorPosition) {
        const position = parseInt(errorPosition);
        const truncatedContent = cleaned.substring(0, position);
        
        try {
          // נסה לחלץ JSON חלקי
          const partialJson = truncatedContent + '}';
          const result = JSON.parse(partialJson);
          console.log(`⚠️ חולץ JSON חלקי בהצלחה`);
          return partialJson;
        } catch {
          // אם גם זה נכשל, נחזיר fallback אינטליגנטי
        }
      }
      
      // שלב 8: fallback אינטליגנטי על פי סוג הניתוח
      const intelligentFallback = {
        error: "Failed to parse OpenAI response",
        recovered_data: "Attempting intelligent recovery...",
        red_flags: [],
        recommendations: ["בדוק את התמלול ונסה שוב", "יתכן שהתשובה חתוכה או פגומה"],
        original_content_preview: content.substring(0, 300)
      };
      
      console.log(`🔄 משתמש ב-fallback אינטליגנטי`);
      return JSON.stringify(intelligentFallback);
    }
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
                "צעקות_זוהו": boolean,
                "לחץ_גבוה": boolean,
                "חוסר_סבלנות": boolean,
                "אגרסיביות": boolean,
                "טון_לא_מקצועי": boolean
              },
              "ניתוח_פרוזודי": "ניתוח מפורט של קצב דיבור, הפסקות, עוצמה והטמעות",
              "ציון_טונציה": number, // ציון בין 3-10 (3 נדיר מאוד, 4-6 טווח נמוך, 7-8 טוב, 9-10 מעולה)
              "המלצות_שיפור": ["רשימה של המלצות לשיפור הטון והמקצועיות"],
              "נקודות_חוזק_טונליות": ["רשימה של נקודות חוזק בטון ובאופן התקשורת"]
            }`
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
                
                חשוב מאוד: החזר רק JSON נקי ללא עיטוף Markdown או backticks. התחל ישירות ב-{ וסיים ב-}.`
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
      
      const cleanedToneContent = cleanOpenAIResponse(rawToneContent);
      
      await addCallLog(call_id, '🧹 תשובה אחרי ניקוי לטונציה', { 
        cleaned_length: cleanedToneContent.length,
        is_valid_json_start: cleanedToneContent.trim().startsWith('{'),
        cleaned_preview: cleanedToneContent.substring(0, 200),
        cleaning_success: rawToneContent !== cleanedToneContent
      });
      
      let toneAnalysisReport;
      try {
        toneAnalysisReport = JSON.parse(cleanedToneContent);
      } catch (parseError: any) {
        await addCallLog(call_id, '❌ שגיאה בניתוח JSON של ניתוח טונציה - מנסה תיקון', { 
          error: parseError.message,
          error_position: parseError.message.includes('position') ? parseError.message.match(/position (\d+)/)?.[1] : null,
          raw_content_preview: rawToneContent.substring(0, 500),
          cleaned_content_preview: cleanedToneContent.substring(0, 500)
        });
        
        // ניסיון תיקון נוסף ספציפי לטונציה
        try {
          // אם השגיאה מכילה מיקום, ננתח רק את החלק התקין
          const positionMatch = parseError.message.match(/position (\d+)/);
          if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const validPart = cleanedToneContent.substring(0, position);
            const lastOpenBrace = validPart.lastIndexOf('{');
            if (lastOpenBrace !== -1) {
              let truncated = validPart.substring(lastOpenBrace);
              // הוספת סוגריים חסרים
              const openCount = (truncated.match(/\{/g) || []).length;
              const closeCount = (truncated.match(/\}/g) || []).length;
              truncated += '}'.repeat(Math.max(0, openCount - closeCount));
              
              toneAnalysisReport = JSON.parse(truncated);
              await addCallLog(call_id, '✅ תיקון JSON של ניתוח טונציה הצליח', { 
                original_length: cleanedToneContent.length,
                fixed_length: truncated.length
              });
            } else {
              throw new Error('לא ניתן לתקן JSON');
            }
          } else {
            throw new Error('לא ניתן לזהות מיקום שגיאה');
          }
        } catch (secondParseError: any) {
          await addCallLog(call_id, '❌ גם תיקון JSON של ניתוח טונציה נכשל - משתמש ברירת מחדל', { 
            second_error: secondParseError.message
          });
          
          // ברירת מחדל לטונציה
          toneAnalysisReport = {
            טון_כללי: "לא ניתן לנתח בשל שגיאת פורמט",
            רמת_אנרגיה: "לא זמין",
            מקצועיות: "לא זמין", 
            חיוביות: "לא זמין",
            דגלים_אדומים: {
              צעקות_זוהו: false,
              לחץ_גבוה: false,
              חוסר_סבלנות: false,
              אגרסיביות: false,
              טון_לא_מקצועי: false
            },
            ניתוח_פרוזודי: "לא ניתן לנתח בשל שגיאת פורמט התשובה מ-OpenAI",
            ציון_טונציה: 6,
            המלצות_שיפור: ["לא זמין בשל שגיאת פורמט"],
            נקודות_חוזק_טונליות: ["לא זמין בשל שגיאת פורמט"],
            error_info: {
              original_error: parseError.message,
              content_preview: cleanedToneContent.substring(0, 200)
            }
          };
        }
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
        // קבלת הפרומפט המתאים לסוג השיחה
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('system_prompt')
          .eq('call_type', callData.call_type)
          .single();

        let systemPrompt = '';
        if (promptError || !promptData) {
          // פרומפט מקצועי מפורט כברירת מחדל
          systemPrompt = `אתה מומחה בכיר בניתוח שיחות מכירה ושירות עם ניסיון של 15 שנה.
          
          נתח את השיחה לפי 32 פרמטרים מקצועיים והחזר ציון מ-3 עד 10 לכל פרמטר (3 נדיר מאוד):
          
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
              "דיבור_מאוזן": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "זרימה_וסדר": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "הצפת_יתר": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "הצגת_פתרון_והדגשת_ערך": {
              "פתרון_מותאם": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "תועלות_וערכים": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "תועלות_רגשיות": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "עדויות_הוכחות": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "יתרון_על_המחיר": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "מומחיות_מקצועית": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "טיפול_בהתנגדויות": {
              "זיהוי_אמת_תירוץ": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "צריך_לחשוב": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "יקר_לי": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "הנעה_לפעולה_וסגירה": {
              "הנעה_לפעולה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "סיכום_ברור": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "סירוב_מכבד": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "שפת_תקשורת_ודינמיקה_קולית": {
              "אינטונציה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "התלהבות_אנרגיה": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "שפה_חיובית_ונחרצת": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "סיכום_שיחה": {
              "סיכום_שיחה_ברור": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"},
              "צידה_לדרך": {"ציון": number, "תובנות": "string", "איך_משפרים": "string"}
            },
            "general_key_insights": ["רשימת תובנות מפתח"],
            "improvement_points": ["רשימת נקודות לשיפור"],
            "overall_score": number,
            "red_flag": boolean,
            "ציטוטים_רלוונטיים": [
              {
                "ציטוט": "המשפט המדויק מהתמליל (החלף שמות ב'הנציג' ו'הלקוח')",
                "קטגוריה": "שם הקטגוריה הרלוונטית",
                "הערה": "הסבר למה הציטוט הזה חשוב",
                "timestamp": "דקה:שנייה (למשל 2:35)"
              }
            ]
          }
          
          הנחיות:
          - לכל פרמטר תן ציון מ-3-10 עם הסבר קצר ב"תובנות" (3 נדיר מאוד, 4-6 טווח נמוך, 7-8 טוב, 9-10 מעולה)
          - ב"איך_משפרים" תן המלצה מעשית ספציפית לשיפור
          - בציטוטים השתמש ב"הנציג" ו"הלקוח" במקום שמות
          - ציין נקודות כשל מרכזיות ב-improvement_points
          - סכם עם תובנות מפתח ב-general_key_insights
          - חשב ממוצע משוקלל כללי ב-overall_score
          
          **חובה! הוספת ציטוטים עם timestamps:**
          - כלול ב"ציטוטים_רלוונטיים" 8-15 ציטוטים מדויקים מהתמליל
          - לכל ציטוט הוסף את הזמן המדויק בפורמט דקה:שנייה
          - התמקד בציטוטים המדגימים נקודות חזקות או חולשות
          - החלף תמיד שמות ב"הנציג" ו"הלקוח"
          - הוסף הסבר קצר למה כל ציטוט חשוב
          - סמן את הקטגוריה הרלוונטית לכל ציטוט
          
          החזר רק JSON תקין ללא backticks או markdown!`;
          await addCallLog(call_id, 'ℹ️ משתמש בפרומפט מקצועי מפורט (לא נמצא פרומפט ספציפי לסוג השיחה)', {
            call_type: callData.call_type,
            prompt_error: promptError?.message
          });
        } else {
          systemPrompt = promptData.system_prompt;
          await addCallLog(call_id, '✅ פרומפט מותאם לסוג השיחה נטען בהצלחה', { 
            call_type: callData.call_type,
            prompt_length: systemPrompt.length
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

        // ניתוח התוכן עם gpt-4.1-2025-04-14
        await addCallLog(call_id, '🔄 שולח בקשה לניתוח תוכן ל-gpt-4.1-2025-04-14', {
          transcript_length: transcript?.length || 0,
          prompt_length: systemPrompt.length,
          request_time: new Date().toISOString()
        });
        
        const contentAnalysisResponse = await openai.chat.completions.create({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'user',
              content: systemPrompt + '\n\n' + `נתח את השיחה הבאה:
              סוג שיחה: ${callData.call_type}
              תמליל השיחה: ${transcript}
              
              מידע נוסף:
              ${companyName ? `חברה: ${companyName}` : ''}
              ${userData ? `תפקיד המשתמש: ${userData.role}` : ''}
              ${callData.agent_notes ? `הערות נציג: ${callData.agent_notes}` : ''}
              
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
          ]
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
          first_200_chars: rawContentResponse.substring(0, 200)
        });
        
        const cleanedContentResponse = cleanOpenAIResponse(rawContentResponse);
        
        await addCallLog(call_id, '🧹 תשובה אחרי ניקוי לתוכן', { 
          cleaned_length: cleanedContentResponse.length,
          is_valid_json_start: cleanedContentResponse.trim().startsWith('{'),
          cleaned_preview: cleanedContentResponse.substring(0, 300),
          cleaning_success: rawContentResponse !== cleanedContentResponse
        });
        
        let contentAnalysisReport;
        try {
          contentAnalysisReport = JSON.parse(cleanedContentResponse);
        } catch (parseError: any) {
          await addCallLog(call_id, '❌ שגיאה בניתוח JSON של ניתוח תוכן - מנסה תיקון', { 
            error: parseError.message,
            error_position: parseError.message.includes('position') ? parseError.message.match(/position (\d+)/)?.[1] : null,
            raw_content_preview: rawContentResponse.substring(0, 500),
            cleaned_content_preview: cleanedContentResponse.substring(0, 500)
          });
          
          // ניסיון תיקון נוסף ספציפי לניתוח תוכן
          try {
            // אם השגיאה מכילה מיקום, ננתח רק את החלק התקין
            const positionMatch = parseError.message.match(/position (\d+)/);
            if (positionMatch) {
              const position = parseInt(positionMatch[1]);
              const validPart = cleanedContentResponse.substring(0, position);
              const lastOpenBrace = validPart.lastIndexOf('{');
              if (lastOpenBrace !== -1) {
                let truncated = validPart.substring(lastOpenBrace);
                // הוספת סוגריים חסרים
                const openCount = (truncated.match(/\{/g) || []).length;
                const closeCount = (truncated.match(/\}/g) || []).length;
                truncated += '}'.repeat(Math.max(0, openCount - closeCount));
                
                contentAnalysisReport = JSON.parse(truncated);
                await addCallLog(call_id, '✅ תיקון JSON של ניתוח תוכן הצליח', { 
                  original_length: cleanedContentResponse.length,
                  fixed_length: truncated.length
                });
              } else {
                throw new Error('לא ניתן לתקן JSON');
              }
            } else {
              throw new Error('לא ניתן לזהות מיקום שגיאה');
            }
          } catch (secondParseError: any) {
            await addCallLog(call_id, '❌ גם תיקון JSON של ניתוח תוכן נכשל - משתמש ברירת מחדל', { 
              second_error: secondParseError.message
            });
            
            // ברירת מחדל לניתוח תוכן
            contentAnalysisReport = {
              overall_score: 6,
              red_flag: false,
              general_key_insights: ["לא ניתן לנתח בשל שגיאת פורמט התשובה מ-OpenAI"],
              improvement_points: ["לא זמין בשל שגיאת פורמט"],
              strengths_and_preservation_points: ["לא זמין בשל שגיאת פורמט"],
              executive_summary: "לא ניתן לבצע ניתוח מפורט בשל שגיאת פורמט התשובה מהמודל",
              error_info: {
                original_error: parseError.message,
                content_preview: cleanedContentResponse.substring(0, 200)
              }
            };
          }
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

        // עדכון הניתוח הסופי בטבלה
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            analysis_report: finalReport,
            tone_analysis_report: toneAnalysisReport,
            overall_score: contentAnalysisReport.overall_score || 0,
            red_flag: contentAnalysisReport.red_flag || false,
            processing_status: 'completed',
            analyzed_at: new Date().toISOString()
          })
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
          
      } else {
        // רק ניתוח טונציה - עדכון הניתוח בטבלה
        const finalReport = {
          tone_analysis_report: toneAnalysisReport,
          // עבור ניתוח טונציה בלבד, נשתמש בשדות summary
          executive_summary: toneAnalysisReport.summary || '',
          overall_score: toneAnalysisReport.ציון_טונציה || 0,
          red_flag: toneAnalysisReport.דגלים_אדומים?.צעקות_זוהו || 
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