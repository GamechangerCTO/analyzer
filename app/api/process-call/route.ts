import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import OpenAI from 'openai';

// הגדרת max duration לוורסל (5 דקות למשתמשי Pro)
export const maxDuration = 300;

// אתחול OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// פונקציה עוזרת לשליחת לוגים
async function logToCallLogs(callId: string, message: string, data?: any) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/call-logs/${callId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, data }),
    });
  } catch (error) {
    console.error(`Error logging message for call ${callId}:`, error);
  }
}

export async function POST(request: Request) {
  try {
    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // קבלת ה-ID של השיחה מגוף הבקשה
    const { call_id } = await request.json();

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    await logToCallLogs(call_id, '🚀 התחלת תהליך ניתוח שיחה', { timestamp: new Date().toISOString() });

    // קבלת פרטי השיחה
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      await logToCallLogs(call_id, '❌ שגיאה בטעינת השיחה', { 
        error: callError, 
        error_message: callError?.message || 'שגיאה לא ידועה' 
      });
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    await logToCallLogs(call_id, '✅ נתוני שיחה נטענו בהצלחה', { 
      call_type: callData.call_type,
      audio_path: callData.audio_file_path,
      analysis_type: callData.analysis_type
    });

    // עדכון סטטוס העיבוד ל-transcribing
    await supabase
      .from('calls')
      .update({ processing_status: 'transcribing' })
      .eq('id', call_id);

    await logToCallLogs(call_id, '🔄 עדכון סטטוס לתמלול', { new_status: 'transcribing' });

    // בדיקת סוג הניתוח
    const isFullAnalysis = callData.analysis_type === 'full';
    await logToCallLogs(call_id, `ℹ️ סוג ניתוח: ${isFullAnalysis ? 'מלא (כולל תמלול)' : 'טונציה בלבד'}`);

    // קבלת URL להורדת הקובץ
    const { data, error: getUrlError } = await supabase
      .storage
      .from('audio_files')
      .createSignedUrl(callData.audio_file_path, 60 * 5); // 5 דקות

    const signedUrl = data?.signedUrl;
    
    if (getUrlError || !signedUrl) {
      await logToCallLogs(call_id, '❌ שגיאה בקבלת קישור לקובץ האודיו', { 
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

    await logToCallLogs(call_id, '✅ קישור האודיו נוצר בהצלחה', {
      url_expiry_minutes: 5,
      audio_path: callData.audio_file_path
    });

    // שלב 1: תמלול השיחה (רק עבור ניתוח מלא)
    let transcript = null;
    if (isFullAnalysis) {
      try {
        await logToCallLogs(call_id, '📝 מתחיל תהליך תמלול שיחה', { model: 'whisper-1', language: 'he' });
        
        // הורדת קובץ האודיו
        await logToCallLogs(call_id, '⬇️ מוריד קובץ אודיו מהשרת');
        const audioResponse = await fetch(signedUrl);
        
        if (!audioResponse.ok) {
          throw new Error(`שגיאה בהורדת קובץ אודיו: ${audioResponse.status} ${audioResponse.statusText}`);
        }
        
        const audioBlob = await audioResponse.blob();
        
        await logToCallLogs(call_id, '✅ קובץ אודיו הורד בהצלחה', { 
          size_bytes: audioBlob.size,
          size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
          content_type: audioBlob.type
        });
        
        // המרת ה-blob לקובץ שאפשר לשלוח ל-OpenAI API
        const formData = new FormData();
        formData.append('file', audioBlob);
        formData.append('model', 'whisper-1');
        formData.append('language', 'he');
        formData.append('response_format', 'json');
        
        await logToCallLogs(call_id, '🔄 שולח בקשת תמלול ל-Whisper API', { 
          request_time: new Date().toISOString(),
          file_size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2)
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
              await logToCallLogs(call_id, `⏱️ ממתין ${delayMs/1000} שניות לפני ניסיון חוזר ${retryCount + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              },
              body: formData
            });
            
            if (transcriptionResponse.ok) {
              transcriptionSuccess = true;
              if (retryCount > 0) {
                await logToCallLogs(call_id, `✅ ניסיון חוזר מספר ${retryCount + 1} הצליח!`);
              }
            } else {
              const errorText = await transcriptionResponse.text();
              await logToCallLogs(call_id, `❌ שגיאת Whisper API בניסיון ${retryCount + 1}`, { 
                status: transcriptionResponse.status,
                error_text: errorText
              });
              
              // אם זהו ניסיון אחרון, זרוק שגיאה
              if (retryCount === maxRetries - 1) {
                throw new Error(`Whisper API error: ${transcriptionResponse.status} ${errorText}`);
              }
            }
          } catch (fetchError: any) {
            await logToCallLogs(call_id, `❌ שגיאת תקשורת בניסיון ${retryCount + 1}`, { error: fetchError.message });
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
          throw new Error(`כל ${maxRetries} הניסיונות לתקשר עם Whisper API נכשלו`);
        }
        
        const transcriptionData = await transcriptionResponse.json();
        transcript = transcriptionData.text;
        
        await logToCallLogs(call_id, '✅ תמלול הושלם בהצלחה', { 
          transcript_length: transcript.length,
          transcript_words: transcript.split(' ').length,
          time_taken_ms: new Date().getTime() - new Date(transcriptionData.created_at || Date.now()).getTime()
        });
        
        // עדכון התמליל בטבלה
        await supabase
          .from('calls')
          .update({
            transcript,
            processing_status: 'analyzing_tone'
          })
          .eq('id', call_id);
          
        await logToCallLogs(call_id, '💾 תמליל נשמר בהצלחה במסד הנתונים', {
          new_status: 'analyzing_tone'
        });
          
      } catch (transcribeError: any) {
        await logToCallLogs(call_id, '❌ שגיאה בתמלול', { 
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

        await logToCallLogs(call_id, '⚠️ התמלול נכשל, ממשיך לניתוח טונאלי בלבד', {
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
        
        await logToCallLogs(call_id, '⏩ דילוג על שלב התמלול (ניתוח טונציה בלבד)', {
          new_status: 'analyzing_tone'
        });
    }

    // שלב 2: ניתוח טון ישיר מהאודיו עם GPT-4o
    try {
      await logToCallLogs(call_id, '🎭 מתחיל ניתוח טונציה', { model: 'gpt-4o' });
      
      // הכנת הבקשה לניתוח טונציה
      await logToCallLogs(call_id, '🔄 מכין בקשה לניתוח טונציה עם GPT-4o');
      
      const toneAnalysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
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
              "ציון_טונציה": number, // ציון בין 1-10
              "המלצות_שיפור": ["רשימה של המלצות לשיפור הטון והמקצועיות"],
              "נקודות_חוזק_טונליות": ["רשימה של נקודות חוזק בטון ובאופן התקשורת"]
            }`
          },
          {
            role: 'user',
            content: `נתח את הטון, האנרגיה, המקצועיות והפרוזודיה של השיחה הבאה.
            זהה דגלים אדומים וספק המלצות מקצועיות לשיפור.
            
            סוג השיחה: ${callData.call_type}
            ${transcript ? `תמליל השיחה: ${transcript}` : 'לא קיים תמליל זמין. אנא נתח את הטונציה ורמת האנרגיה רק מהאודיו.'}
            ${!transcript ? 'שים לב: התמלול נכשל, לכן אנא התמקד בניתוח טונאלי מהאודיו בלבד ובזיהוי דגלים אדומים אקוסטיים.' : ''}
            
            הקפד להחזיר את התשובה בפורמט JSON המדויק שצוין למעלה.`
          }
        ],
        response_format: { type: 'json_object' }
      });

      await logToCallLogs(call_id, '✅ תשובת OpenAI התקבלה לניתוח טונציה', { 
        token_usage: toneAnalysisResponse.usage,
        model: toneAnalysisResponse.model,
        response_id: toneAnalysisResponse.id
      });

      const toneAnalysisReport = JSON.parse(toneAnalysisResponse.choices[0].message.content || '{}');
      
      await logToCallLogs(call_id, '✅ ניתוח טונציה הושלם', { 
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

        await logToCallLogs(call_id, '🔄 עדכון סטטוס לניתוח תוכן', { new_status: 'analyzing_content' });
        await logToCallLogs(call_id, '📊 מתחיל ניתוח תוכן', { model: 'gpt-4.1-2025-04-14' });

        // שלב 3: ניתוח תוכן מקצועי עם GPT-4 Turbo
        // קבלת הפרומפט המתאים לסוג השיחה
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('system_prompt')
          .eq('call_type', callData.call_type)
          .single();

        let systemPrompt = '';
        if (promptError || !promptData) {
          // פרומפט ברירת מחדל אם אין התאמה ספציפית
          systemPrompt = `אתה מומחה בניתוח שיחות מכירה ושירות בעברית. נתח את השיחה המצורפת והערך אותה במגוון פרמטרים מקצועיים.
          תן ציון כללי לשיחה (בין 3-10), וציונים נפרדים לקטגוריות ופרמטרים שונים.
          זהה נקודות חוזק לשימור ונקודות לשיפור.
          הצע המלצות פרקטיות לשיפור המכירה או השירות.
          אם הציון בפרמטר נמוך מ-7, סמן אותו כדגל אדום לטיפול מיידי.`;
          await logToCallLogs(call_id, 'ℹ️ משתמש בפרומפט ברירת מחדל (לא נמצא פרומפט ספציפי לסוג השיחה)', {
            call_type: callData.call_type,
            prompt_error: promptError?.message
          });
        } else {
          systemPrompt = promptData.system_prompt;
          await logToCallLogs(call_id, '✅ פרומפט מותאם לסוג השיחה נטען בהצלחה', { 
            call_type: callData.call_type,
            prompt_length: systemPrompt.length
          });
        }

        // קבלת פרטי החברה והמשתמש
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id, full_name, email, role,
            companies:company_id (*)
          `)
          .eq('id', callData.user_id)
          .single();

        const companyName = userData?.companies && 'name' in userData.companies ? userData.companies.name : '';
        
        await logToCallLogs(call_id, '✅ מידע משתמש וחברה נטען', { 
          user_id: userData?.id,
          user_role: userData?.role,
          company_name: companyName || 'לא ידוע'
        });

        // ניתוח התוכן עם GPT-4 Turbo
        await logToCallLogs(call_id, '🔄 שולח בקשה לניתוח תוכן ל-GPT-4 Turbo', {
          transcript_length: transcript?.length || 0,
          prompt_length: systemPrompt.length,
          request_time: new Date().toISOString()
        });
        
        const contentAnalysisResponse = await openai.chat.completions.create({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: systemPrompt.includes('JSON') ? systemPrompt : systemPrompt + '\nהחזר תמיד JSON.'
            },
            {
              role: 'user',
              content: `נתח את השיחה הבאה:
              סוג שיחה: ${callData.call_type}
              תמליל השיחה: ${transcript}
              
              מידע נוסף:
              ${companyName ? `חברה: ${companyName}` : ''}
              ${userData ? `תפקיד המשתמש: ${userData.role}` : ''}
              ${callData.agent_notes ? `הערות נציג: ${callData.agent_notes}` : ''}
              
              הנחיות נוספות:
              1. כלול בניתוח ציטוטים רלוונטיים מהשיחה תחת שדה 'ציטוטים' או 'קטעים_רלוונטיים' 
              2. עבור כל פרמטר שבו נמצאו בעיות, הוסף ציטוטים ספציפיים מהשיחה המדגימים את הבעיה
              3. הצע חלופות מילוליות לכל ציטוט בעייתי
              
              ניתוח טונציה: ${JSON.stringify(toneAnalysisReport)}
              הקפד להחזיר את התשובה בפורמט JSON.`
            }
          ],
          response_format: { type: 'json_object' }
        });

        await logToCallLogs(call_id, '✅ תשובת OpenAI התקבלה לניתוח תוכן', { 
          token_usage: contentAnalysisResponse.usage,
          model: contentAnalysisResponse.model,
          response_id: contentAnalysisResponse.id,
          completion_time: new Date().toISOString()
        });

        const contentAnalysisReport = JSON.parse(contentAnalysisResponse.choices[0].message.content || '{}');
        
        await logToCallLogs(call_id, '✅ ניתוח תוכן הושלם', { 
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
        await supabase
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
          
        await logToCallLogs(call_id, '🏁 ניתוח שיחה הושלם', { 
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

        await supabase
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
          
        await logToCallLogs(call_id, '🏁 ניתוח טונציה הושלם (סוג ניתוח: טונציה בלבד)', { 
          overall_score: finalReport.overall_score,
          red_flag: finalReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((new Date().getTime() - new Date(callData.created_at).getTime()) / 1000)
        });
      }

    } catch (analysisError: any) {
      await logToCallLogs(call_id, '❌ שגיאה בניתוח', { 
        error: analysisError.message,
        error_name: analysisError.name,
        error_stack: analysisError.stack?.substring(0, 200),
        error_time: new Date().toISOString()
      });
      
      await supabase
        .from('calls')
        .update({
          processing_status: 'error',
          error_message: `שגיאת ניתוח: ${analysisError.message}`
        })
        .eq('id', call_id);

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
    console.error('שגיאה כללית:', error);
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 