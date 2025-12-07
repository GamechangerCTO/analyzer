import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createBaseSystemPrompt } from '@/lib/simulation-prompts'
import { 
  validateCompanyQuestionnaire, 
  createFallbackPersona,
  calculateQuestionnaireCompleteness 
} from '@/lib/questionnaire-validation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface PersonaGenerationRequest {
  agentId?: string
  companyId?: string
  targetWeaknesses?: string[]
  difficulty?: 'קל' | 'בינוני' | 'קשה' | 'מתקדם'
  specificScenario?: string
  callAnalysis?: {
    call_type: string
    overall_score: number
    content_analysis: any
    tone_analysis: any
    red_flags: string[]
    improvement_areas: string[]
    duration_seconds?: number
    created_at: string
  }
}


// 🔧 פונקציה משופרת לניקוי JSON מתשובות OpenAI (כולל JSON חתוך)
function cleanOpenAIResponse(content: string): string {
  if (!content) return '{}'
  
  // ניקוי Markdown blocks
  let cleaned = content.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '')
  cleaned = cleaned.replace(/^`+|`+$/g, '').trim()
  
  // חיפוש תחילת JSON
  const jsonStart = cleaned.indexOf('{')
  if (jsonStart === -1) return '{}'
  cleaned = cleaned.substring(jsonStart)
  
  // ניסיון ראשון: אולי ה-JSON תקין
  try {
    JSON.parse(cleaned)
    return cleaned
  } catch {}
  
  // ניסיון שני: מציאת סוף JSON תקין
  let braceCount = 0
  let lastValidEnd = -1
  let inString = false
  let escapeNext = false
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }
    
    if (!inString) {
      if (char === '{') braceCount++
      else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          lastValidEnd = i
          break
        }
      }
    }
  }
  
  if (lastValidEnd !== -1) {
    const result = cleaned.substring(0, lastValidEnd + 1)
    try {
      JSON.parse(result)
      return result
    } catch {}
  }
  
  // ניסיון שלישי: תיקון JSON חתוך
  // מנסים לסגור את ה-JSON בצורה חכמה
  let truncated = cleaned
  
  // מוצא את המפתח האחרון שנסגר בהצלחה
  const lastCompleteField = truncated.lastIndexOf('",')
  if (lastCompleteField > 0) {
    truncated = truncated.substring(0, lastCompleteField + 1) // כולל ה-"
  } else {
    // מחפש את המפתח האחרון עם ערך
    const lastQuote = truncated.lastIndexOf('"')
    if (lastQuote > 0) {
      // בודק אם זה סוף של ערך או באמצע
      const beforeQuote = truncated.substring(0, lastQuote)
      const lastColon = beforeQuote.lastIndexOf(':')
      if (lastColon > 0) {
        // יש ערך שנחתך - מנסים לסגור אותו
        truncated = truncated.substring(0, lastQuote + 1)
      }
    }
  }
  
  // סוגרים את כל הסוגריים הפתוחים
  let openBraces = (truncated.match(/{/g) || []).length
  let closeBraces = (truncated.match(/}/g) || []).length
  let openBrackets = (truncated.match(/\[/g) || []).length
  let closeBrackets = (truncated.match(/]/g) || []).length
  
  // מוודא שהstring נסגר
  const quoteCount = (truncated.match(/(?<!\\)"/g) || []).length
  if (quoteCount % 2 !== 0) {
    truncated += '"'
  }
  
  // מוסיף סוגרים חסרים
  while (openBrackets > closeBrackets) {
    truncated += ']'
    closeBrackets++
  }
  while (openBraces > closeBraces) {
    truncated += '}'
    closeBraces++
  }
  
  // מנקה פסיקים מיותרים לפני סוגריים
  truncated = truncated.replace(/,\s*([}\]])/g, '$1')
  
  try {
    JSON.parse(truncated)
    console.log('🔧 Fixed truncated JSON successfully')
    return truncated
  } catch (e) {
    console.error('❌ Could not fix JSON:', (e as Error).message)
    // מחזירים לפחות את השדות שהצלחנו לחלץ
    return '{}'
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let personaId: string | null = null
  let companyId: string | undefined = undefined
  
  try {
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // קבלת נתוני הבקשה
    const body: PersonaGenerationRequest = await request.json()
    const { agentId, targetWeaknesses, difficulty = 'בינוני', specificScenario, callAnalysis } = body
    companyId = body.companyId

    // ✅ בדיקת שאלון חברה (קריטי!)
    if (!companyId) {
      return NextResponse.json({ 
        error: 'חובה לספק מזהה חברה ליצירת פרסונה אותנטית' 
      }, { status: 400 })
    }

    const validation = await validateCompanyQuestionnaire(companyId)
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'לא נמצא שאלון חברה. אנא מלא את השאלון תחילה.',
        redirect: '/company-questionnaire',
        code: 'MISSING_QUESTIONNAIRE'
      }, { status: 400 })
    }

    if (!validation.isComplete) {
      console.warn(`⚠️ שאלון לא מלא (${validation.completeness}%): ${validation.missing.join(', ')}`)
    }

    if (validation.isStale) {
      console.warn(`⚠️ שאלון לא עודכן ${validation.ageInDays} יום`)
    }

    // קבלת נתוני הנציג והחברה
    let agentAnalysis = null
    let companyData = null

    if (callAnalysis) {
      // השתמש בניתוח הספציפי שנשלח
      agentAnalysis = [callAnalysis]
    } else if (agentId) {
      // קבלת ניתוחי שיחות אחרונים של הנציג
      const { data: recentCalls } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', agentId)
        .not('analysis_report', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)

      agentAnalysis = recentCalls
    }

    // קבלת נתוני החברה מהשאלון
    const { data: company } = await supabase
      .from('companies')
      .select(`
        *,
        company_questionnaires (*)
      `)
      .eq('id', companyId)
      .single()

    companyData = company
    const questionnaire = company?.company_questionnaires?.[0]

    // 🤖 ניסיון יצירת פרסונה עם AI
    let personaData: any = null
    let usedAI = true
    let aiError: string | null = null

    try {
      // יצירת פרסונה מותאמת בעברית
      const personaPrompt = buildPersonaPrompt(agentAnalysis, companyData, targetWeaknesses, difficulty, specificScenario)
      
      // ✅ שימוש ב-Responses API למודלי GPT-5
      const systemInstruction = `אתה מומחה ליצירת פרסונות לקוחות לאימון מכירות בעברית. 
המטרה שלך היא ליצור לקוח ווירטואלי שיאתגר את הנציג בדיוק בתחומים שהוא צריך לשפר.
תמיד תחזיר תוצאה במבנה JSON תקין בעברית.`

      const personaResponse = await openai.responses.create({
        model: "gpt-5-nano-2025-08-07",
        input: systemInstruction + '\n\n' + personaPrompt,
        reasoning: { effort: "low" }, // יצירה יצירתית, לא צריך חשיבה עמוקה
      })

      // 🔍 לוג התוכן הגולמי לדיבוג
      console.log('📄 Raw AI response:', (personaResponse.output_text || '').substring(0, 500))
      
      const cleanedContent = cleanOpenAIResponse(personaResponse.output_text || '{}')
      console.log('🧹 Cleaned content:', cleanedContent.substring(0, 300))
      
      personaData = JSON.parse(cleanedContent)
      
      // 🛡️ בדיקה שהפרסונה תקינה - אם לא, נפול ל-fallback
      if (!personaData.persona_name || Object.keys(personaData).length === 0) {
        console.warn('⚠️ AI returned empty/invalid persona, using fallback')
        throw new Error('Empty persona from AI')
      }
      
      console.log('✅ Generated persona with AI:', personaData.persona_name)

    } catch (aiErrorCaught: any) {
      console.error('❌ AI generation failed, using fallback:', aiErrorCaught.message)
      aiError = aiErrorCaught.message
      usedAI = false
      
      // 🛡️ Fallback חכם - יצירת פרסונה מבוססת שאלון בלבד
      personaData = createFallbackPersona(questionnaire)
      console.log('🛡️ Created fallback persona:', personaData.persona_name)
    }
    
    console.log('Generated persona data:', JSON.stringify(personaData, null, 2).substring(0, 300) + '...')
    
    // שמירת הפרסונה במסד הנתונים - עם הגבלת אורך
    const truncateString = (str: string, maxLength: number) => {
      return str && str.length > maxLength ? str.substring(0, maxLength) : str
    }
    
    const { data: savedPersona, error: saveError } = await supabase
      .from('customer_personas_hebrew')
      .insert({
        company_id: companyId,
        created_by: session.user.id,
        persona_name: truncateString(personaData.persona_name, 100),
        personality_type: truncateString(personaData.personality_type, 50),
        communication_style: truncateString(personaData.communication_style, 50),
        industry_context: truncateString(personaData.industry_context, 100),
        company_size: truncateString(personaData.company_size, 50),
        background_story: personaData.background_story,
        current_situation: personaData.current_situation,
        pain_points: personaData.pain_points || [],
        goals_and_objectives: personaData.goals_and_objectives || [],
        common_objections: personaData.common_objections || [],
        objection_patterns: personaData.objection_patterns || {},
        objection_difficulty: truncateString(difficulty, 20),
        preferred_communication: personaData.preferred_communication || [],
        decision_making_style: truncateString(personaData.decision_making_style, 50),
        budget_sensitivity: truncateString(personaData.budget_sensitivity, 20),
        time_pressure: truncateString(personaData.time_pressure, 20),
        openai_instructions: personaData.openai_instructions,
        scenario_templates: personaData.scenario_templates || {},
        voice_characteristics: personaData.voice_characteristics || { gender: 'female' }, // 🔴 שמירת מגדר הפרסונה
        targets_weaknesses: targetWeaknesses || [],
        difficulty_level: truncateString(difficulty, 20),
        is_template: false
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving persona:', saveError)
      
      // תיעוד כשלון
      await supabase.from('persona_creation_logs').insert({
        company_id: companyId,
        persona_id: null,
        questionnaire_completeness: validation.completeness,
        ai_model_used: usedAI ? 'gpt-5-nano-2025-08-07' : 'fallback',
        generation_time_ms: Date.now() - startTime,
        success: false,
        error_message: saveError.message
      })
      
      return NextResponse.json({ error: 'Failed to save persona' }, { status: 500 })
    }

    personaId = savedPersona.id

    // 📝 תיעוד הצלחה ב-logs
    const generationTime = Date.now() - startTime
    await supabase.from('persona_creation_logs').insert({
      company_id: companyId,
      persona_id: personaId,
      questionnaire_completeness: validation.completeness,
      ai_model_used: usedAI ? 'gpt-5-nano-2025-08-07' : 'fallback',
      generation_time_ms: generationTime,
      success: true,
      error_message: aiError,
      prompt_length: usedAI ? buildPersonaPrompt(agentAnalysis, companyData, targetWeaknesses, difficulty, specificScenario).length : 0,
      response_length: JSON.stringify(personaData).length
    })

    console.log(`✅ Persona created successfully in ${generationTime}ms`)

    return NextResponse.json({ 
      persona: savedPersona,
      generated_data: personaData,
      metadata: {
        usedAI,
        generationTime,
        questionnaireCompleteness: validation.completeness,
        questionnaireAge: validation.ageInDays
      }
    })

  } catch (error) {
    console.error('Error generating persona:', error)
    
    // תיעוד שגיאה כללית
    const supabase = createClient()
    if (companyId) {
      await supabase.from('persona_creation_logs').insert({
        company_id: companyId,
        persona_id: null,
        questionnaire_completeness: 0,
        ai_model_used: 'unknown',
        generation_time_ms: Date.now() - startTime,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildPersonaPrompt(
  agentAnalysis: any, 
  companyData: any, 
  targetWeaknesses: string[] = [], 
  difficulty: string,
  specificScenario?: string
): string {
  let prompt = `אתה מומחה ביצירת לקוחות ווירטואליים לאימון מכירות. צור פרסונה מותאמת בדיוק לחולשות הנציג.

## 🎯 מטרת האימון:
יצירת לקוח ווירטואלי שיתרגל בצורה ממוקדת את הנקודות הבעייתיות שזוהו בניתוח השיחות האמיתיות של הנציג.

`

  if (agentAnalysis && agentAnalysis.length > 0) {
    prompt += `
## 📊 ניתוח שיחות אמיתיות של הנציג:
${agentAnalysis.map((call: any, index: number) => {
      let callAnalysis = ''
      
      // ניתוח תוכן
      if (call.content_analysis) {
        try {
          const content = typeof call.content_analysis === 'string' ? 
            JSON.parse(call.content_analysis) : call.content_analysis
          callAnalysis += `
📋 ניתוח תוכן:
${content.תובנות_מרכזיות || content.insights || 'לא זמין'}
נקודות לשיפור: ${content.איך_משפרים || content.improvement_areas || 'לא זמין'}
`
        } catch (e) {
          callAnalysis += `ניתוח תוכן: ${call.content_analysis}\n`
        }
      }

      // ניתוח טונציה
      if (call.tone_analysis) {
        try {
          const tone = typeof call.tone_analysis === 'string' ? 
            JSON.parse(call.tone_analysis) : call.tone_analysis
          callAnalysis += `
🎭 ניתוח טונציה:
ביטחון: ${tone.ביטחון || tone.confidence || 'לא זמין'}
אמפתיה: ${tone.אמפתיה || tone.empathy || 'לא זמין'}
מקצועיות: ${tone.מקצועיות || tone.professionalism || 'לא זמין'}
`
        } catch (e) {
          callAnalysis += `ניתוח טונציה: ${call.tone_analysis}\n`
        }
      }

      // דגלים אדומים
      if (call.red_flags && Array.isArray(call.red_flags)) {
        callAnalysis += `
🚩 דגלים אדומים: ${call.red_flags.join(', ')}
`
      }

      return `
שיחה ${index + 1} (${call.call_type}):
- ציון כללי: ${call.overall_score}/10
${callAnalysis}
`
    }).join('\n')}

## 🎯 נקודות חולשה מזוהות לתירגול:
${targetWeaknesses.length > 0 ? targetWeaknesses.join(', ') : 'בהתבסס על הניתוח למעלה'}
`
  }

  if (companyData) {
    const questionnaire = companyData.company_questionnaires?.[0]
    prompt += `
## 🏢 פרופיל החברה - חשוב מאוד לאותנטיות!
**הלקוח הווירטואלי חייב להיות נאמן לפרופיל החברה הזו:**

- 🏭 **תחום עסקי**: ${questionnaire?.industry || 'לא זמין'}
- 📦 **מוצר/שירות**: ${questionnaire?.product_service || 'לא זמין'}
- 🎯 **קהל יעד**: ${questionnaire?.target_audience || 'לא זמין'}
- ⭐ **בידול מרכזי**: ${questionnaire?.key_differentiator || 'לא זמין'}
- 💎 **תועלות לקוח**: ${questionnaire?.customer_benefits || 'לא זמין'}
- 💰 **מחיר ממוצע**: ${questionnaire?.average_deal_size || 'לא זמין'}
- ⏱️ **מחזור מכירה**: ${questionnaire?.sales_cycle || 'לא זמין'}
- 🚩 **התנגדויות נפוצות**: ${questionnaire?.common_objections || 'לא זמין'}

**⚠️ קריטי: הלקוח חייב להיות מישהו שמתאים בדיוק לקהל היעד של החברה!**
**דוגמה: אם החברה מוכרת תוספי תזונה, הלקוח צריך להיות מישהו שמעוניין בבריאות/כושר/תזונה.**
**אם זו חברת B2B, הלקוח חייב להיות בעל תפקיד רלוונטי בארגון מתאים.**
`
  } else {
    prompt += `
⚠️ אזהרה: לא נמצא שאלון חברה. יש ליצור לקוח כללי אך מקצועי.
`
  }

  if (targetWeaknesses.length > 0) {
    prompt += `
תחומי חולשה לתרגול:
${targetWeaknesses.join(', ')}
`
  }

  if (specificScenario) {
    prompt += `
תרחיש ספציפי: ${specificScenario}
`
  }

  prompt += `
## 🎯 רמת קושי רצויה: ${difficulty}

## ✨ דרישות מיוחדות ליצירת הפרסונה:

### 🔍 התמחות בנקודות החולשה:
- הפרסונה חייבת לאתגר בדיוק את הנקודות שזוהו בניתוח השיחות
- אם זוהה קושי עם התנגדות מחיר - הלקוח יהיה רגיש מאוד למחיר ויקשה בנושא
- אם זוהה קושי בזיהוי צרכים - הלקוח יהיה מעורפל ולא יחשוף בקלות את הצרכים
- אם זוהה קושי בסגירת עסקות - הלקוח יהיה מהסס ויצטרך שכנוע חזק

### 📋 התנגדויות ממוקדות:
צור התנגדויות ספציפיות שיתרגלו את החולשות המזוהות:
- התנגדויות שיכילו בדיוק את הסוגים שהנציג מתקשה איתם
- דרכי התמודדות שידרשו מהנציג לשפר את הטכניקות שלו
- תרחישים שיחזרו את הסיטואציות הבעייתיות מהשיחות האמיתיות

### 🎭 אישיות ריאליסטית:
- מבוססת על תחום החברה והלקוחות האמיתיים
- עם רקע מקצועי רלוונטי לעסק
- התנהגות שמשקפת לקוחות אמיתיים בתחום

החזר JSON במבנה הבא:
{
  "persona_name": "שם הלקוח הווירטואלי (דוגמה: רינה שמואל - מנהלת רכש)",
  "personality_type": "סוג אישיות (דוגמה: סקפטית, מהירה להחלטות, זקוקה למידע)",
  "communication_style": "סגנון תקשורת (דוגמה: ישירה, מנומסת, תוקפנית)",
  "industry_context": "הקשר תעשייתי",
  "company_size": "גודל חברה (דוגמה: סטארטאפ, חברה קטנה, בינונית, תאגיד)",
  "background_story": "סיפור רקע של הלקוח בעברית - מי הוא, מה הניסיון שלו",
  "current_situation": "המצב הנוכחי והצרכים של הלקוח",
  "pain_points": ["נקודות כאב בעברית"],
  "goals_and_objectives": ["מטרות ויעדים בעברית"],
  "common_objections": ["התנגדויות נפוצות שהוא יעלה בעברית"],
  "objection_patterns": {
    "price": "איך הוא מתנגד למחיר",
    "trust": "איך הוא מבטא חוסר אמון",
    "timing": "איך הוא מתנגד לזמנים"
  },
  "preferred_communication": ["דרכי תקשורת מועדפות"],
  "decision_making_style": "איך הוא מקבל החלטות",
  "budget_sensitivity": "רגישות לתקציב (גבוהה/בינונית/נמוכה)",
  "time_pressure": "לחץ זמן (דחוף/רגיל/גמיש)",
  "openai_instructions": "הוראות מפורטות לAI בעברית - איך להתנהג כלקוח הזה בסימולציה",
  "scenario_templates": {
    "opening": "איך מתחילים איתו שיחה",
    "objections": "איך הוא מעלה התנגדויות",
    "closing": "איך מנסים לסגור איתו"
  },
  "voice_characteristics": {
    "gender": "male או female - המגדר של הפרסונה (לקביעת הקול בסימולציה)"
  }
}

חשוב: כל הטקסט בעברית בלבד!`

  return prompt
}
