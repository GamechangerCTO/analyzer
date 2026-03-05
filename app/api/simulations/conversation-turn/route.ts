import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// פונקציה לניקוי תשובות JSON מ-OpenAI
function cleanOpenAIResponse(content: string): string {
  if (!content) return '{}'
  
  let cleaned = content.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '')
  cleaned = cleaned.replace(/^`+|`+$/g, '').trim()
  
  const jsonStart = cleaned.indexOf('{')
  if (jsonStart !== -1) {
    cleaned = cleaned.substring(jsonStart)
  }
  
  // 🔧 תיקון מפתחות JSON בלבד (לא ערכים!)
  cleaned = cleaned.replace(/,\s*'([^']+)":/g, ', "$1":')
  cleaned = cleaned.replace(/{\s*'([^']+)":/g, '{ "$1":')
  cleaned = cleaned.replace(/,\s*'([^']+)':/g, ', "$1":')
  cleaned = cleaned.replace(/{\s*'([^']+)':/g, '{ "$1":')
  
  // אלגוריתם איזון סוגריים
  let braceCount = 0
  let lastValidEnd = -1
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]
    if (char === '{') braceCount++
    else if (char === '}') {
      braceCount--
      if (braceCount === 0) {
        lastValidEnd = i
        break
      }
    }
  }
  
  if (lastValidEnd !== -1) {
    cleaned = cleaned.substring(0, lastValidEnd + 1)
  }
  
  return cleaned
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const simulationId = formData.get('simulationId') as string
    const textInput = formData.get('textInput') as string | null // אופציונלי - אם רוצים להשתמש בטקסט במקום אודיו
    
    if (!simulationId) {
      return NextResponse.json({ error: 'חסר מזהה סימולציה' }, { status: 400 })
    }
    
    if (!audioFile && !textInput) {
      return NextResponse.json({ error: 'נדרש קלט אודיו או טקסט' }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'לא מאומת' }, { status: 401 })
    }
    
    // שליפת הסימולציה עם הפרסונה
    const { data: simulation, error: simError } = await supabase
      .from('simulations')
      .select(`
        *,
        customer_personas_hebrew:persona_id (*)
      `)
      .eq('id', simulationId)
      .single()
    
    if (simError || !simulation) {
      console.error('Error fetching simulation:', simError)
      return NextResponse.json({ error: 'סימולציה לא נמצאה' }, { status: 404 })
    }
    
    // בדיקת הרשאה
    if (simulation.agent_id !== user.id) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }
    
    // שליפת שאלון חברה
    const { data: questionnaire } = await supabase
      .from('company_questionnaires')
      .select('*')
      .eq('company_id', simulation.company_id)
      .single()
    
    let userTranscript = textInput || ''
    let toneAnalysis = null
    
    // שלב 1: תמלול האודיו (אם יש)
    if (audioFile && !textInput) {
      console.log('📝 מתמלל אודיו...')
      const transcriptionStart = Date.now()
      
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'gpt-4o-mini-transcribe',
          language: 'he',
          response_format: 'json' // verbose_json לא נתמך במודל זה
        })
        
        userTranscript = transcription.text
        console.log(`✅ תמלול הושלם ב-${Date.now() - transcriptionStart}ms: "${userTranscript.substring(0, 100)}..."`)
      } catch (transcriptionError) {
        console.error('❌ שגיאה בתמלול:', transcriptionError)
        return NextResponse.json({ 
          error: 'שגיאה בתמלול האודיו',
          details: transcriptionError instanceof Error ? transcriptionError.message : 'Unknown'
        }, { status: 500 })
      }
    }
    
    if (!userTranscript || userTranscript.trim() === '') {
      return NextResponse.json({ error: 'לא זוהה טקסט בקלט' }, { status: 400 })
    }
    
    // שלב 2: בניית ה-system prompt
    const persona = simulation.customer_personas_hebrew
    const systemPrompt = buildCustomerPersonaPrompt(persona, questionnaire, simulation.selected_topics || [])
    
    // שלב 3: בניית היסטוריית השיחה
    const conversationHistory = simulation.conversation_history || []
    
    // הוספת ההודעה של המשתמש להיסטוריה
    conversationHistory.push({
      role: 'user',
      content: userTranscript,
      timestamp: new Date().toISOString()
    })
    
    // שלב 4: קריאה ל-GPT-5-nano עם Responses API
    console.log('🧠 שולח ל-GPT-5-nano...')
    const responseStart = Date.now()
    
    let aiResponse: string
    let newResponseId: string | null = null
    
    try {
      // בניית ה-input עם כל ההיסטוריה
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]
      
      // שימוש ב-Responses API עם previous_response_id לשמירת context
      const responseParams: any = {
        model: 'gpt-5-nano-2025-08-07',
        input: messages,
        reasoning: { effort: 'low' },
        text: { verbosity: 'medium' }
      }
      
      // אם יש response קודם - משתמשים בו לשמירת context
      if (simulation.last_response_id) {
        responseParams.previous_response_id = simulation.last_response_id
        // כשיש previous_response_id, שולחים רק את ההודעה החדשה
        responseParams.input = userTranscript
      }
      
      const response = await (openai as any).responses.create(responseParams)
      
      aiResponse = response.output_text || response.output?.[0]?.content || 'מצטער, לא הצלחתי להבין. אפשר לחזור על זה?'
      newResponseId = response.id
      
      console.log(`✅ תשובה התקבלה ב-${Date.now() - responseStart}ms`)
    } catch (apiError: any) {
      console.error('❌ שגיאה בקריאה ל-GPT-5-nano:', apiError)
      
      // Fallback ל-Chat Completions API אם Responses API לא עובד
      console.log('⚠️ משתמש ב-fallback ל-Chat Completions...')
      
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]
      
      const fallbackResponse = await (openai as any).responses.create({
        model: 'gpt-5-nano',
        input: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
        reasoning: { effort: 'low' },
      })

      aiResponse = fallbackResponse.output_text || 'מצטער, לא הצלחתי להבין.'
    }
    
    // הוספת תשובת ה-AI להיסטוריה
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    })
    
    // שלב 5: המרה ל-TTS
    console.log('🔊 ממיר ל-TTS...')
    const ttsStart = Date.now()
    
    let audioBase64 = null
    
    try {
      // בחירת קול לפי מגדר הפרסונה
      // קולות נתמכים: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
      const voice = persona?.voice_characteristics?.gender === 'female' ? 'coral' : 'echo'
      
      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: aiResponse,
        response_format: 'mp3',
        speed: 1.0
      })
      
      const audioBuffer = await ttsResponse.arrayBuffer()
      audioBase64 = Buffer.from(audioBuffer).toString('base64')
      
      console.log(`✅ TTS הושלם ב-${Date.now() - ttsStart}ms`)
    } catch (ttsError) {
      console.error('⚠️ שגיאה ב-TTS, ממשיך ללא אודיו:', ttsError)
    }
    
    // שלב 6: עדכון הסימולציה ב-DB
    const { error: updateError } = await supabase
      .from('simulations')
      .update({
        conversation_history: conversationHistory,
        last_response_id: newResponseId,
        current_turn: (simulation.current_turn || 0) + 1,
        status: 'in_progress',
        started_at: simulation.started_at || new Date().toISOString()
      })
      .eq('id', simulationId)
    
    if (updateError) {
      console.error('⚠️ שגיאה בעדכון הסימולציה:', updateError)
    }
    
    const totalTime = Date.now() - startTime
    console.log(`✅ תור שיחה הושלם ב-${totalTime}ms`)
    
    return NextResponse.json({
      success: true,
      userTranscript,
      aiResponse,
      audioBase64,
      audioFormat: 'mp3',
      turnNumber: (simulation.current_turn || 0) + 1,
      toneAnalysis,
      timing: {
        total: totalTime
      }
    })
    
  } catch (error) {
    console.error('❌ שגיאה כללית בתור שיחה:', error)
    return NextResponse.json({ 
      error: 'שגיאה בעיבוד תור השיחה',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// בניית prompt לפרסונת לקוח
function buildCustomerPersonaPrompt(
  persona: any, 
  questionnaire: any,
  selectedTopics: string[]
): string {
  const companyContext = questionnaire ? `
הקשר עסקי:
- תחום: ${questionnaire.industry || 'לא צוין'}
- מוצר/שירות: ${questionnaire.product_service || 'לא צוין'}
- קהל יעד: ${questionnaire.target_audience || 'לא צוין'}
- בידול: ${questionnaire.key_differentiator || 'לא צוין'}
` : ''

  const topicsInstruction = selectedTopics.length > 0 ? `
🎯 נושאים לבדיקה בשיחה זו:
${selectedTopics.map(t => `- ${t.replace(/_/g, ' ')}`).join('\n')}

התמקד באתגר הנציג בנושאים אלה במיוחד!
` : ''

  const personaName = persona?.persona_name || 'לקוח כללי'
  const personalityType = persona?.personality_type || 'סטנדרטי'
  const communicationStyle = persona?.communication_style || 'ישיר'
  const backgroundStory = persona?.background_story || ''
  const currentSituation = persona?.current_situation || ''
  const painPoints = persona?.pain_points || []
  const commonObjections = persona?.common_objections || []
  
  return `אתה ${personaName}, לקוח פוטנציאלי בשיחת מכירות/שירות.

🎭 הדמות שלך:
- סוג אישיות: ${personalityType}
- סגנון תקשורת: ${communicationStyle}
- רקע: ${backgroundStory}
- מצב נוכחי: ${currentSituation}

${companyContext}

${topicsInstruction}

😤 נקודות כאב:
${painPoints.map((p: string) => `- ${p}`).join('\n') || '- מחפש פתרון מתאים'}

🛡️ התנגדויות נפוצות שלך:
${commonObjections.map((o: string) => `- ${o}`).join('\n') || '- מחיר, זמן, צורך בהתייעצות'}

📝 כללים חשובים:
1. אתה הלקוח - לא המוכר!
2. דבר בעברית טבעית וקולחת
3. תגיב כמו לקוח אמיתי - לפעמים מהסס, לפעמים מתעניין
4. העלה התנגדויות באופן טבעי
5. תשובות קצרות (2-3 משפטים מקסימום)
6. אל תהיה קל מדי - זו סימולציית אימון
7. אם הנציג עושה עבודה טובה - אפשר להתקדם לעבר סגירה
8. אם הנציג לא מתמודד טוב - חזק את ההתנגדויות

התחל את השיחה כאילו אתה לקוח שפונה או שפנו אליו.`
}

// GET - שליפת היסטוריית שיחה
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const simulationId = searchParams.get('simulationId')
    
    if (!simulationId) {
      return NextResponse.json({ error: 'חסר מזהה סימולציה' }, { status: 400 })
    }
    
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'לא מאומת' }, { status: 401 })
    }
    
    const { data: simulation, error } = await supabase
      .from('simulations')
      .select('conversation_history, current_turn, status')
      .eq('id', simulationId)
      .eq('agent_id', user.id)
      .single()
    
    if (error || !simulation) {
      return NextResponse.json({ error: 'סימולציה לא נמצאה' }, { status: 404 })
    }
    
    return NextResponse.json({
      conversationHistory: simulation.conversation_history || [],
      currentTurn: simulation.current_turn || 0,
      status: simulation.status
    })
    
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json({ error: 'שגיאה בשליפת השיחה' }, { status: 500 })
  }
}

