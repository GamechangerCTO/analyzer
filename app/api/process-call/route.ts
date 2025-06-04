import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import OpenAI from 'openai';
import { addCallLog } from '@/lib/addCallLog';

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

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting process-call function');
    const startTime = Date.now();
    
    // בדיקת זמינות מפתח OpenAI עם לוגים מפורטים
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔍 OpenAI API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) + '...' || 'N/A',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION || 'unknown'
    });

    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY לא מוגדר בפונקציה');
      return NextResponse.json(
        { error: 'מפתח OpenAI API לא מוגדר. אנא בדוק את משתני הסביבה ב-Vercel.' }, 
        { status: 500 }
      );
    }

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

    console.log(`📞 Processing call: ${call_id}`);
    await addCallLog(call_id, '🚀 התחלת תהליך ניתוח שיחה', { 
      timestamp: new Date().toISOString(),
      function_region: process.env.VERCEL_REGION || 'unknown',
      execution_start: startTime
    });

    // קבלת פרטי השיחה
    console.log('📊 Fetching call data from Supabase');
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      console.error('❌ Call not found:', callError);
      await addCallLog(call_id, '❌ שגיאה בטעינת השיחה', { 
        error: callError, 
        error_message: callError?.message || 'שגיאה לא ידועה' 
      });
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    console.log('✅ Call data loaded:', {
      call_type: callData.call_type,
      analysis_type: callData.analysis_type,
      audio_path: callData.audio_file_path
    });

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
      console.error('❌ Missing audio file path');
      await addCallLog(call_id, '❌ נתיב קובץ האודיו חסר', { 
        audio_path: callData.audio_file_path
      });
      return NextResponse.json(
        { error: 'נתיב קובץ האודיו חסר' }, 
        { status: 400 }
      );
    }

    console.log('🔗 Creating signed URL for audio file');
    const { data, error: getUrlError } = await supabase
      .storage
      .from('audio_files')
      .createSignedUrl(callData.audio_file_path, 60 * 5); // 5 דקות

    const signedUrl = data?.signedUrl;
    
    if (getUrlError || !signedUrl) {
      console.error('❌ Failed to get signed URL:', getUrlError);
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

    console.log('✅ Signed URL created successfully');
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
        console.log('📝 Starting transcription process');
        await addCallLog(call_id, '📝 מתחיל תהליך תמלול שיחה', { model: 'whisper-1', language: 'he' });
        
        // הורדת קובץ האודיו
        console.log('⬇️ Downloading audio file');
        await addCallLog(call_id, '⬇️ מוריד קובץ אודיו מהשרת');
        
        const audioResponse = await fetch(signedUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'OpenAI-Whisper-Client/1.0'
          }
        });
        
        if (!audioResponse.ok) {
          throw new Error(`שגיאה בהורדת קובץ אודיו: ${audioResponse.status} ${audioResponse.statusText}`);
        }
        
        const audioBlob = await audioResponse.blob();
        
        console.log('✅ Audio file downloaded:', {
          size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
          type: audioBlob.type
        });
        
        await addCallLog(call_id, '✅ קובץ אודיו הורד בהצלחה', { 
          size_bytes: audioBlob.size,
          size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
          content_type: audioBlob.type
        });
        
        // המרת ה-blob לקובץ שאפשר לשלוח ל-OpenAI API
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        formData.append('model', 'whisper-1');
        formData.append('language', 'he');
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'word');
        formData.append('timestamp_granularities[]', 'segment');
        
        console.log('🔄 Sending transcription request to Whisper API');
        await addCallLog(call_id, '🔄 שולח בקשת תמלול ל-Whisper API', { 
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
              console.log(`⏱️ Waiting ${delayMs/1000}s before retry ${retryCount + 1}/${maxRetries}`);
              await addCallLog(call_id, `⏱️ ממתין ${delayMs/1000} שניות לפני ניסיון חוזר ${retryCount + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
                'User-Agent': 'OpenAI-Whisper-Client/1.0'
              },
              body: formData
            });
            
            console.log('📡 Whisper API response received:', {
              status: transcriptionResponse.status,
              statusText: transcriptionResponse.statusText,
              ok: transcriptionResponse.ok,
              attempt: retryCount + 1
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
                console.log(`✅ Retry attempt ${retryCount + 1} succeeded!`);
                await addCallLog(call_id, `✅ ניסיון חוזר מספר ${retryCount + 1} הצליח!`);
              }
            } else {
              const errorText = await transcriptionResponse.text();
              console.error(`❌ Whisper API error on attempt ${retryCount + 1}:`, {
                status: transcriptionResponse.status,
                error_text: errorText
              });
              await addCallLog(call_id, `❌ שגיאת Whisper API בניסיון ${retryCount + 1}`, { 
                status: transcriptionResponse.status,
                error_text: errorText
              });
              
              // אם זהו ניסיון אחרון, זרוק שגיאה
              if (retryCount === maxRetries - 1) {
                throw new Error(`Whisper API error: ${transcriptionResponse.status} ${errorText}`);
              }
            }
          } catch (fetchError: any) {
            console.error(`❌ Network error on attempt ${retryCount + 1}:`, fetchError.message);
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
          throw new Error(`כל ${maxRetries} הניסיונות לתקשר עם Whisper API נכשלו`);
        }
        
        console.log('📝 Processing transcription response');
        const transcriptionData = await transcriptionResponse.json();
        transcript = transcriptionData.text;
        transcriptSegments = transcriptionData.segments || [];
        transcriptWords = transcriptionData.words || [];
        
        console.log('✅ Transcription completed:', {
          transcript_length: transcript.length,
          transcript_words: transcript.split(' ').length,
          segments_count: transcriptSegments.length,
          words_with_timestamps: transcriptWords.length
        });
        
        await addCallLog(call_id, '✅ תמלול הושלם בהצלחה', { 
          transcript_length: transcript.length,
          transcript_words: transcript.split(' ').length,
          segments_count: transcriptSegments.length,
          words_with_timestamps: transcriptWords.length,
          time_taken_ms: Date.now() - startTime
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
        console.error('❌ Transcription error:', transcribeError);
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
      console.log('🎭 Starting tone analysis');
      await addCallLog(call_id, '🎭 מתחיל ניתוח טונציה', { model: 'gpt-4o' });
      
      // הכנת הבקשה לניתוח טונציה
      await addCallLog(call_id, '🔄 מכין בקשה לניתוח טונציה עם GPT-4o');
      
      console.log('🔄 Sending tone analysis request to OpenAI');
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

      console.log('✅ Tone analysis response received from OpenAI');
      await addCallLog(call_id, '✅ תשובת OpenAI התקבלה לניתוח טונציה', { 
        token_usage: toneAnalysisResponse.usage,
        model: toneAnalysisResponse.model,
        response_id: toneAnalysisResponse.id
      });

      const toneAnalysisReport = JSON.parse(toneAnalysisResponse.choices[0].message.content || '{}');
      
      console.log('✅ Tone analysis completed');
      await addCallLog(call_id, '✅ ניתוח טונציה הושלם', { 
        report_keys: Object.keys(toneAnalysisReport),
        identified_red_flags: toneAnalysisReport.דגלים_אדומים ? Object.keys(toneAnalysisReport.דגלים_אדומים).filter(flag => toneAnalysisReport.דגלים_אדומים[flag]) : []
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
        console.log('📊 Starting content analysis');
        await addCallLog(call_id, '📊 מתחיל ניתוח תוכן', { model: 'gpt-4-turbo' });

        // שלב 3: ניתוח תוכן מקצועי עם GPT-4 Turbo
        // קבלת הפרומפט המתאים לסוג השיחה
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('system_prompt')
          .eq('call_type', callData.call_type)
          .single();

        let systemPrompt = '';
        if (promptError || !promptData) {
          console.log('⚠️ Using default prompt (prompt not found for call type)');
          await addCallLog(call_id, '⚠️ משתמש בפרומפט ברירת מחדל', { 
            call_type: callData.call_type, 
            prompt_error: promptError?.message 
          });
          
          systemPrompt = `אתה מומחה בניתוח שיחות מכירה ושירות לקוחות בעברית.
          תפקידך לנתח שיחות באופן מעמיק ולספק משוב מקצועי.
          
          אנא נתח את השיחה הבאה ותן ציון כללי (1-10), זהה נקודות חוזק וחולשה,
          וספק המלצות מעשיות לשיפור.
          
          החזר את התוצאות בפורמט JSON עם השדות הבאים:
          {
            "overall_score": number,
            "red_flag": boolean,
            "executive_summary": "סיכום מנהלים קצר",
            "strengths_and_preservation_points": ["נקודות חוזק"],
            "improvement_points": ["נקודות לשיפור"],
            "practical_recommendations": ["המלצות מעשיות"],
            "segment_quotes": [{"text": "ציטוט", "comment": "הערה", "category": "קטגוריה"}]
          }`;
        } else {
          systemPrompt = promptData.system_prompt;
          await addCallLog(call_id, '✅ פרומפט מותאם נטען בהצלחה', { 
            call_type: callData.call_type
          });
        }

        console.log('🔄 Sending content analysis request to OpenAI');
        const contentAnalysisResponse = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `נתח את השיחה הבאה:
              
              סוג השיחה: ${callData.call_type}
              תמליל: ${transcript || 'לא זמין'}
              ${callData.analysis_notes ? `פרמטרים מיוחדים לניתוח: ${callData.analysis_notes}` : ''}
              
              הנחיות נוספות:
              1. כלול בניתוח ציטוטים רלוונטיים מהשיחה תחת שדה 'ציטוטים' או 'קטעים_רלוונטיים' 
              2. עבור כל פרמטר שבו נמצאו בעיות, הוסף ציטוטים ספציפיים מהשיחה המדגימים את הבעיה
              3. לכל ציטוט, נסה לספק גם timestamp_seconds מדויק בהתבסס על מידע הזמנים שסופק
              4. הצע חלופות מילוליות לכל ציטוט בעייתי
              5. פורמט הציטוט: {"text": "הציטוט", "timestamp_seconds": מספר, "comment": "הערה", "category": "קטגוריה"}
              ${callData.analysis_notes ? '6. וודא שהניתוח מתייחס לפרמטרים המיוחדים שצוינו למעלה' : ''}
              
              ניתוח טונציה: ${JSON.stringify(toneAnalysisReport)}
              הקפד להחזיר את התשובה בפורמט JSON.`
            }
          ],
          response_format: { type: 'json_object' }
        });

        console.log('✅ Content analysis response received from OpenAI');
        await addCallLog(call_id, '✅ תשובת OpenAI התקבלה לניתוח תוכן', { 
          token_usage: contentAnalysisResponse.usage,
          model: contentAnalysisResponse.model,
          response_id: contentAnalysisResponse.id,
          completion_time: new Date().toISOString()
        });

        const contentAnalysisReport = JSON.parse(contentAnalysisResponse.choices[0].message.content || '{}');
        
        console.log('✅ Content analysis completed');
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
          
        console.log('🏁 Full analysis completed');
        await addCallLog(call_id, '🏁 ניתוח שיחה הושלם', { 
          overall_score: contentAnalysisReport.overall_score,
          red_flag: contentAnalysisReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((Date.now() - startTime) / 1000)
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
          
        console.log('🏁 Tone-only analysis completed');
        await addCallLog(call_id, '🏁 ניתוח טונציה הושלם (סוג ניתוח: טונציה בלבד)', { 
          overall_score: finalReport.overall_score,
          red_flag: finalReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((Date.now() - startTime) / 1000)
        });
      }

    } catch (analysisError: any) {
      console.error('❌ Analysis error:', analysisError);
      await addCallLog(call_id, '❌ שגיאה בניתוח', { 
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

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Process completed successfully in ${totalTime} seconds`);
    
    return NextResponse.json({
      success: true,
      call_id,
      message: 'ניתוח השיחה הושלם בהצלחה',
      execution_time_seconds: totalTime
    });

  } catch (error: any) {
    console.error('❌ General error:', error);
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 