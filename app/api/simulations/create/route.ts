import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client only when needed to avoid build-time errors
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}

interface CreateSimulationRequest {
  simulation_type: string
  customer_persona: string
  difficulty_level: string
  triggered_by_call_id?: string
}

const scenarioPrompts = {
  objection_handling: {
    aggressive: "לקוח שזועם ומרבה להקטע, מעלה התנגדויות חזקות ודורש תשובות מיידיות",
    hesitant: "לקוח לא בטוח שמעלה חששות רבים ומהסס להתחייב",
    technical: "לקוח הדורש פרטים טכניים מדויקים ושואל שאלות מעמיקות",
    emotional: "לקוח המקבל החלטות על בסיס רגשי ומחפש חיבור אישי",
    time_pressed: "לקוח שממהר ומחפש פתרון מהיר וחד משמעי",
    business: "מנהל שמתמקד ב-ROI ובתועלות עסקיות מדידות"
  },
  closing_techniques: {
    aggressive: "לקוח שמתנגד לכל ניסיון סגירה ודורש הנחות גדולות",
    hesitant: "לקוח שמתקשה להחליט וממשיך לדחות את ההחלטה",
    technical: "לקוח שמעלה בעיות טכניות כסיבה לא לקנות",
    emotional: "לקוח שמפחד מההחלטה ודורש ביטחון רגשי",
    time_pressed: "לקוח שרוצה להחליט מהר אבל מתלבט",
    business: "מנהל שמחפש נתונים עסקיים לאישור הרכישה"
  },
  follow_up_skills: {
    aggressive: "לקוח שכועס שמתקשרים אליו שוב ומאיים לנתק",
    hesitant: "לקוח שעדיין לא החליט ומראה חוסר עניין",
    technical: "לקוח שמעלה שאלות טכניות חדשות שלא נענו",
    emotional: "לקוח שמרגיש לחוץ מהמעקב הרציף",
    time_pressed: "לקוח שאומר שאין לו זמן לשיחה",
    business: "מנהל שעדיין בוחן את ההצעה מול חלופות"
  },
  price_negotiation: {
    aggressive: "לקוח שדורש הנחה משמעותית ומאיים ללכת למתחרה",
    hesitant: "לקוח שמתלונן על המחיר אבל לא ברור אם באמת זה הבעיה",
    technical: "לקוח שמשווה מחירים ומפרט טכני למתחרים",
    emotional: "לקוח שמרגיש שהוא משלם יותר מהוגן",
    time_pressed: "לקוח שרוצה הנחה מהירה או שהוא הולך",
    business: "מנהל שמנהל משא ומתן מקצועי על תקציב"
  },
  customer_service: {
    aggressive: "לקוח זועם עם תלונה קשה שדורש פתרון מיידי",
    hesitant: "לקוח שלא בטוח איך להסביר את הבעיה שלו",
    technical: "לקוח עם בעיה טכנית מורכבת שדורש הסבר מפורט",
    emotional: "לקוח מתוסכל שמרגיש שהוא לא מקבל יחס הוגן",
    time_pressed: "לקוח שדורש פתרון מהיר כי הוא בלחץ זמן",
    business: "מנהל עם בעיה שמשפיעה על העסק שלו"
  },
  appointment_setting: {
    aggressive: "לקוח שלא מעוניין בפגישה ומנסה לסיים את השיחה",
    hesitant: "לקוח שמתעניין אבל מתקשה לקבוע זמן מתאים",
    technical: "לקוח שרוצה לדעת מה בדיוק יהיה בפגישה לפני שהוא מסכים",
    emotional: "לקוח שמפחד שהפגישה תהיה לחוצה",
    time_pressed: "לקוח עם לוח זמנים צפוף מאוד",
    business: "מנהל שרוצה לדעת מי עוד ישתתף בפגישה ומה סדר היום"
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // בדיקת אימות
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // שליפת פרטי המשתמש
    const { data: user } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', session.user.id)
      .single()

    if (!user || !user.company_id) {
      return NextResponse.json({ error: 'User not found or not associated with company' }, { status: 400 })
    }

    const body: CreateSimulationRequest = await request.json()
    const { simulation_type, customer_persona, difficulty_level, triggered_by_call_id } = body

    // בניית תרחיש הסימולציה
    let scenarioDescription = "תרחיש סימולציה כללי"
    let enhancedScenario = ""

    if (scenarioPrompts[simulation_type as keyof typeof scenarioPrompts]) {
      const baseScenario = scenarioPrompts[simulation_type as keyof typeof scenarioPrompts][customer_persona as keyof typeof scenarioPrompts.objection_handling]
      
      // שילוב מידע מהשיחה המקורית אם קיימת
      let originalCallContext = ""
      if (triggered_by_call_id) {
        const { data: originalCall } = await supabase
          .from('calls')
          .select('analysis_report, call_type')
          .eq('id', triggered_by_call_id)
          .single()

        if (originalCall?.analysis_report) {
          originalCallContext = `
השיחה המקורית הייתה ${originalCall.call_type} עם הבעיות הבאות:
${JSON.stringify(originalCall.analysis_report.improvement_areas || {}, null, 2)}
          `
        }
      }

      // יצירת תרחיש מותאם עם GPT
      const prompt = `
בנה תרחיש סימולציה למכירות/שירות בעברית:
- סוג התרגול: ${simulation_type}
- טיפוס לקוח: ${customer_persona}
- רמת קושי: ${difficulty_level}
- תיאור בסיסי: ${baseScenario}
${originalCallContext}

החזר JSON עם:
{
  "scenario_description": "תיאור קצר של התרחיש (1-2 משפטים)",
  "customer_background": "רקע הלקוח והמצב",
  "main_challenge": "האתגר המרכזי בתרחיש",
  "success_criteria": "קריטריונים להצלחה"
}
      `

      try {
        // Initialize OpenAI client
        const openai = getOpenAIClient();
        
        // Try with gpt-4o first (supports json_object)
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "אתה מומחה ליצירת תרחישי אימון למכירות ושירות. החזר תמיד JSON תקף בעברית."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        })

        const scenarioData = JSON.parse(completion.choices[0].message.content || '{}')
        scenarioDescription = scenarioData.scenario_description || baseScenario
        enhancedScenario = JSON.stringify(scenarioData)
      } catch (aiError) {
        console.error('AI scenario generation failed:', aiError)
        // Fallback: try without response_format
        try {
          const openai = getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "אתה מומחה ליצירת תרחישי אימון למכירות ושירות. החזר תמיד תשובה קצרה בעברית."
              },
              {
                role: "user",
                content: `תן תיאור קצר (1-2 משפטים) לתרחיש סימולציה: ${baseScenario}`
              }
            ],
            temperature: 0.7,
            max_tokens: 200
          })
          
          scenarioDescription = completion.choices[0].message.content || baseScenario
        } catch (fallbackError) {
          console.error('Fallback AI generation also failed:', fallbackError)
          scenarioDescription = baseScenario
        }
      }
    }

    // יצירת הסימולציה בבסיס הנתונים
    const { data: simulation, error: insertError } = await supabase
      .from('simulations')
      .insert({
        agent_id: session.user.id,
        company_id: user.company_id,
        triggered_by_call_id,
        simulation_type,
        customer_persona, // חזרה לשם המקורי של הטבלה
        difficulty_level,
        scenario_description: scenarioDescription,
        status: 'pending',
        ai_feedback: enhancedScenario ? JSON.parse(enhancedScenario) : null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating simulation:', insertError)
      return NextResponse.json({ error: 'Failed to create simulation' }, { status: 500 })
    }

    // וידוא שקיים רשומה במטבעות עבור הנציג
    const { data: existingCoins } = await supabase
      .from('agent_coins')
      .select('id')
      .eq('user_id', session.user.id) // חזרה לשם המקורי של הטבלה
      .single()

    if (!existingCoins) {
      await supabase
        .from('agent_coins')
        .insert({
          user_id: session.user.id, // חזרה לשם המקורי של הטבלה
          company_id: user.company_id,
          total_coins: 0
        })
    }

    // יצירת התראה לנציג
    await supabase
      .from('agent_notifications')
      .insert({
        user_id: session.user.id, // חזרה לשם המקורי של הטבלה
        company_id: user.company_id,
        notification_type: 'simulation_required',
        title: 'סימולציה חדשה נוצרה',
        message: `סימולציה של ${simulation_type} מוכנה להתחלה`,
        action_url: `/simulations/${simulation.id}`,
        priority: triggered_by_call_id ? 'high' : 'normal'
      })

    return NextResponse.json({ simulation }, { status: 201 })

  } catch (error) {
    console.error('Error in create simulation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 