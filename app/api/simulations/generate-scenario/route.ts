import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createScenarioPrompt } from '@/lib/simulation-prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ScenarioGenerationRequest {
  personaId: string
  companyId?: string
  difficulty?: 'קל' | 'בינוני' | 'קשה' | 'מתקדם'
  focusArea?: string
  estimatedDuration?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ScenarioGenerationRequest = await request.json()
    const { personaId, companyId, difficulty = 'בינוני', focusArea, estimatedDuration = 10 } = body

    // קבלת נתוני הפרסונה
    const { data: persona, error: personaError } = await supabase
      .from('customer_personas_hebrew')
      .select('*')
      .eq('id', personaId)
      .single()

    if (personaError || !persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // קבלת נתוני החברה
    let companyData = null
    if (companyId) {
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

    // יצירת תרחיש מותאם
    const scenarioPrompt = createScenarioPrompt({ 
      persona, 
      company: companyData, 
      callType: persona.simulation_type || 'inbound',
      difficultyLevel: difficulty, 
      focusAreas: [focusArea || 'שיפור כללי'] 
    })
    
    // ✅ שימוש ב-Responses API למודלי GPT-5
    const systemInstruction = `אתה מומחה ליצירת תרחישי אימון מכירות בעברית. 
המטרה שלך היא ליצור תרחיש מאתגר וריאליסטי שיעזור לנציג להתפתח בתחומים הנדרשים.
התרחיש צריך להיות מפורט, מעשי וכולל הדרכות ברורות.
תמיד תחזיר תוצאה במבנה JSON תקין בעברית.`

    const scenarioResponse = await openai.responses.create({
      model: "gpt-5-nano-2025-08-07",
      input: systemInstruction + '\n\n' + scenarioPrompt,
      reasoning: { effort: "low" }, // יצירה יצירתית של תרחיש
      text: { verbosity: "high" } // רוצים תרחיש מפורט
    })

    const scenarioData = JSON.parse(scenarioResponse.output_text || '{}')
    
    // שמירת התרחיש במסד הנתונים
    const { data: savedScenario, error: saveError } = await supabase
      .from('simulation_scenarios_hebrew')
      .insert({
        company_id: companyId,
        created_by: session.user.id,
        persona_id: personaId,
        scenario_title: scenarioData.scenario_title,
        scenario_description: scenarioData.scenario_description,
        scenario_category: scenarioData.scenario_category,
        industry_specific_context: scenarioData.industry_specific_context,
        product_context: scenarioData.product_context,
        competitive_context: scenarioData.competitive_context,
        learning_objectives: scenarioData.learning_objectives || [],
        success_criteria: scenarioData.success_criteria || [],
        key_challenges: scenarioData.key_challenges || [],
        estimated_duration_minutes: estimatedDuration,
        difficulty_level: difficulty,
        required_skills: scenarioData.required_skills || [],
        opening_scenario: scenarioData.opening_scenario,
        expected_flow: scenarioData.expected_flow || {},
        possible_outcomes: scenarioData.possible_outcomes || {},
        is_template: false
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving scenario:', saveError)
      return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 })
    }

    return NextResponse.json({ 
      scenario: savedScenario,
      generated_data: scenarioData 
    })

  } catch (error) {
    console.error('Error generating scenario:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildScenarioPrompt(
  persona: any,
  companyData: any,
  difficulty: string,
  focusArea?: string,
  estimatedDuration?: number
): string {
  let prompt = `צור תרחיש אימון מכירות מפורט בעברית עבור הפרסונה הבאה:

פרטי הלקוח הווירטואלי:
- שם: ${persona.persona_name}
- אישיות: ${persona.personality_type}
- סגנון תקשורת: ${persona.communication_style}
- רקע: ${persona.background_story}
- מצב נוכחי: ${persona.current_situation}
- נקודות כאב: ${persona.pain_points?.join(', ') || 'לא זמין'}
- התנגדויות נפוצות: ${persona.common_objections?.join(', ') || 'לא זמין'}
- רגישות תקציב: ${persona.budget_sensitivity}
- לחץ זמן: ${persona.time_pressure}
`

  if (companyData) {
    prompt += `
נתוני החברה המוכרת:
- תחום: ${companyData.company_questionnaires?.[0]?.industry || 'לא זמין'}
- מוצר/שירות: ${companyData.company_questionnaires?.[0]?.product_service || 'לא זמין'}
- קהל יעד: ${companyData.company_questionnaires?.[0]?.target_audience || 'לא זמין'}
- בידול מרכזי: ${companyData.company_questionnaires?.[0]?.key_differentiator || 'לא זמין'}
- תועלות לקוח: ${companyData.company_questionnaires?.[0]?.customer_benefits || 'לא זמין'}
`
  }

  if (focusArea) {
    prompt += `
תחום מיקוד לאימון: ${focusArea}
`
  }

  prompt += `
רמת קושי: ${difficulty}
משך זמן משוער: ${estimatedDuration} דקות

צור תרחיש מפורט שכולל:

1. **סיטואציה ריאליסטית** - הקשר השיחה והסיבה שהלקוח מתקשר
2. **אתגרים ספציפיים** - מה הנציג יצטרך להתמודד איתו
3. **מטרות למידה ברורות** - מה הנציג אמור ללמוד
4. **קריטריונים להצלחה** - איך מודדים הצלחה
5. **זרימת שיחה צפויה** - איך התרחיש אמור להתפתח

החזר JSON במבנה הבא:
{
  "scenario_title": "כותרת התרחיש בעברית",
  "scenario_description": "תיאור מפורט של התרחיש והסיטואציה",
  "scenario_category": "קטגוריה (מכירה_ראשונית, טיפול_בהתנגדויות, סגירה, שירות_לקוחות)",
  "industry_specific_context": "הקשר ספציפי לתעשייה",
  "product_context": "הקשר המוצר/שירות הנמכר",
  "competitive_context": "הקשר תחרותי אם רלוונטי",
  "learning_objectives": [
    "מטרת למידה 1 בעברית",
    "מטרת למידה 2 בעברית"
  ],
  "success_criteria": [
    "קריטריון הצלחה 1",
    "קריטריון הצלחה 2"
  ],
  "key_challenges": [
    "אתגר מרכזי 1",
    "אתגר מרכזי 2"
  ],
  "required_skills": [
    "כישור נדרש 1",
    "כישור נדרש 2"
  ],
  "opening_scenario": "איך השיחה מתחילה - מה הלקוח אומר בפתיחה",
  "expected_flow": {
    "phase_1": "שלב ראשון - היכרות וזיהוי צרכים",
    "phase_2": "שלב שני - הצגת פתרון",
    "phase_3": "שלב שלישי - טיפול בהתנגדויות",
    "phase_4": "שלב רביעי - סגירה או המשך"
  },
  "possible_outcomes": {
    "success": "מה קורה אם הנציג מצליח",
    "partial_success": "מה קורה בהצלחה חלקית",
    "failure": "מה קורה אם הנציג לא מצליח"
  }
}

התרחיש צריך להיות:
- **מאתגר אבל הוגן** ברמת הקושי ${difficulty}
- **ריאליסטי** - כמו מקרים אמיתיים
- **מותאם אישית** לפרסונה הספציפית
- **מעשי** - עם הדרכות ברורות
- **בעברית בלבד**`

  return prompt
}
