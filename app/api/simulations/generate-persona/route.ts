import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createBaseSystemPrompt } from '@/lib/simulation-prompts'

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // קבלת נתוני הבקשה
    const body: PersonaGenerationRequest = await request.json()
    const { agentId, companyId, targetWeaknesses, difficulty = 'בינוני', specificScenario, callAnalysis } = body

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

    if (companyId) {
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
    }

    // יצירת פרסונה מותאמת בעברית
    const personaPrompt = buildPersonaPrompt(agentAnalysis, companyData, targetWeaknesses, difficulty, specificScenario)
    
    const personaResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `אתה מומחה ליצירת פרסונות לקוחות לאימון מכירות בעברית. 
המטרה שלך היא ליצור לקוח ווירטואלי שיאתגר את הנציג בדיוק בתחומים שהוא צריך לשפר.
תמיד תחזיר תוצאה במבנה JSON תקין בעברית.`
        },
        {
          role: "user", 
          content: personaPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8
    })

    const personaData = JSON.parse(personaResponse.choices[0].message.content || '{}')
    
    console.log('Generated persona data:', JSON.stringify(personaData, null, 2))
    
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
        targets_weaknesses: targetWeaknesses || [],
        difficulty_level: truncateString(difficulty, 20),
        is_template: false
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving persona:', saveError)
      return NextResponse.json({ error: 'Failed to save persona' }, { status: 500 })
    }

    return NextResponse.json({ 
      persona: savedPersona,
      generated_data: personaData 
    })

  } catch (error) {
    console.error('Error generating persona:', error)
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
    prompt += `
נתוני החברה:
- תחום: ${companyData.company_questionnaires?.[0]?.industry || 'לא זמין'}
- מוצר/שירות: ${companyData.company_questionnaires?.[0]?.product_service || 'לא זמין'}
- קהל יעד: ${companyData.company_questionnaires?.[0]?.target_audience || 'לא זמין'}
- בידול מרכזי: ${companyData.company_questionnaires?.[0]?.key_differentiator || 'לא זמין'}
- תועלות לקוח: ${companyData.company_questionnaires?.[0]?.customer_benefits || 'לא זמין'}
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
  }
}

חשוב: כל הטקסט בעברית בלבד!`

  return prompt
}
