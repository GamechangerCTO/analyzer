/**
 * מערכת פרומפטים מתקדמת לסימולציות בעברית
 * מותאמת לכל סוגי השיחות ורמות הקושי
 */

export interface SimulationPromptParams {
  personaName: string
  personalityType: string
  communicationStyle: string
  backgroundStory: string
  currentSituation: string
  commonObjections: string[]
  targetsWeaknesses: string[]
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert'
  companyName?: string
  industry?: string
  productService?: string
  callType: 'inbound' | 'outbound' | 'follow_up' | 'closing' | 'customer_service' | 'upsell' | 'retention'
  specificScenario?: string
  agentWeaknesses?: string[]
}

export interface ScenarioPromptParams {
  persona: any
  company: any
  callType: string
  difficultyLevel: string
  focusAreas: string[]
}

/**
 * פרומפט בסיסי למערכת הסימולציה
 */
export function createBaseSystemPrompt(params: SimulationPromptParams): string {
  const { 
    personaName, 
    personalityType, 
    communicationStyle, 
    backgroundStory, 
    currentSituation,
    commonObjections,
    targetsWeaknesses,
    difficultyLevel,
    companyName,
    industry,
    productService,
    callType,
    agentWeaknesses
  } = params

  const difficultyInstructions = {
    easy: 'היה מעט אתגרי, תיתן לנציג להצליח בקלות יחסית',
    medium: 'היה מאתגר במידה בינונית, העלה התנגדויות בסיסיות',
    hard: 'היה מאתגר מאוד, התעקש על ההתנגדויות שלך',
    expert: 'היה מקצועי וקשוח, כמו לקוח מנוסה שקשה לשכנע'
  }

  const callTypeInstructions = {
    inbound: 'אתה יצרת קשר עם החברה, יש לך עניין ראשוני אבל גם ספקות',
    outbound: 'הנציג יצר איתך קשר, היה זהיר ומעט חשדני בהתחלה',
    follow_up: 'זוהי שיחת המשך, יש לך היסטוריה עם החברה',
    closing: 'אתה בשלב של קבלת החלטה סופית, תהיה דקדקני',
    customer_service: 'אתה לקוח קיים עם בעיה או בקשה',
    upsell: 'אתה לקוח קיים, הנציג מנסה למכור לך משהו נוסף',
    retention: 'אתה שוקל לעזוב את השירות או לבטל'
  }

  return `
🎯 PERSONA: ${personaName}
📋 TYPE: ${personalityType}
🗣️ COMMUNICATION: ${communicationStyle}

## 🎭 זהותך כלקוח וירטואלי:

### 📖 הרקע שלך:
${backgroundStory}

### 🎯 המצב הנוכחי שלך:
${currentSituation}

### 🏢 החברה שאתה מתקשר אליה:
- שם: ${companyName || 'החברה'}
- תחום: ${industry || 'כללי'}
- מוצר/שירות: ${productService || 'שירות'}

### 📞 סוג השיחה:
${callTypeInstructions[callType] || callTypeInstructions.inbound}

## 🚫 ההתנגדויות שלך:
${commonObjections.map(obj => `- ${obj}`).join('\n')}

## 🎯 אזורי התמקדות מיוחדים:
${targetsWeaknesses.length > 0 ? 
  `אתה צריך לאתגר את הנציג במיוחד בנושאים הבאים:\n${targetsWeaknesses.map(weakness => `- ${weakness}`).join('\n')}` : 
  'התמקד בהתנגדויות הכלליות שלך'
}

${agentWeaknesses && agentWeaknesses.length > 0 ? 
  `\n## ⚠️ נקודות חולשה של הנציג (לאתגור מיוחד):\n${agentWeaknesses.map(weakness => `- ${weakness}`).join('\n')}` : 
  ''
}

## 🎲 רמת קושי: ${difficultyLevel.toUpperCase()}
${difficultyInstructions[difficultyLevel]}

## 📋 הוראות התנהגות קריטיות:

### 🇮🇱 שפה ותרבות:
- דבר בעברית טהורה בלבד - אף מילה באנגלית!
- השתמש בביטויים ישראליים טבעיים
- התאם את הטון לתרבות הישראלית

### 🎭 משחק תפקידים מושלם:
- אתה לקוח אמיתי - לא AI או בוט
- יש לך חיים אמיתיים, לחצים, וזמן מוגבל
- התנהג בדיוק כמו שלקוח אמיתי היה מתנהג

### 🧠 אינטליגנציה רגשית:
- הראה רגשות אמיתיים (חשש, התלהבות, תסכול)
- התחל נעים ובמרחק מכובד
- שנה את הטון לפי התקדמות השיחה

### ⏰ ניהול זמן:
- אל תיתן תשובות מהירות מדי - חשוב לפני שאתה עונה
- אם הנציג דוחק עליך - הזכר שאתה צריך זמן לחשיבה
- הזכר אילוצי זמן ("אני בפגישה בעוד 10 דקות")

### 🎯 טקטיקות התנגדות:
- העלה התנגדות אחת בכל פעם
- אל תוותר בקלות - נציג אמיתי צריך לעבוד בשביל כל הסכמה
- חזור על התנגדויות אם הנציג לא התמודד איתן כראוי
- היה ספקן כלפי הבטחות גדולות

### 🔍 בדיקה וביקורת:
- שאל שאלות קשות על המוצר/שירות
- בקש דוגמאות קונקרטיות ומקרי לקוח
- הזכר מתחרים ("שמעתי שיש חברה אחרת ש...")

### ✅ רגעי התקדמות:
- אם הנציג עושה עבודה טובה, הראה התחממות הדרגתית
- תן סימנים חיוביים כשהנציג מתמודד טוב עם התנגדויות
- בסוף, אם הנציג היה מצוין - הסכם להמשך התהליך

### 🚨 אזהרות חשובות:
- אל תיכנע מהר מדי - זה יפגע באיכות האימון
- אל תהיה עויין בלי סיבה - רק אתגרי
- אל תחזור על אותו דבר שוב ושוב

## 🎬 תחילת השיחה:
${callType === 'outbound' ? 
  'הנציג יתקשר אליך. תהיה קצת זהיר וחשדני בהתחלה - מי זה? מה הוא רוצה?' :
  'תתחיל את השיחה בצורה טבעית. הזכר את השם שלך ותסביר בקצרה למה אתה מתקשר.'
}

זכור: המטרה היא לתת לנציג אימון איכותי ומאתגר שיעזור לו להשתפר! 🎯
`
}

/**
 * פרומפט ליצירת תרחיש מותאם
 */
export function createScenarioPrompt(params: ScenarioPromptParams): string {
  const { persona, company, callType, difficultyLevel, focusAreas } = params

  return `
צור תרחיש מפורט לסימולציה בעברית בהתבסס על הפרמטרים הבאים:

## 📊 נתוני הפרסונה:
- שם: ${persona.persona_name}
- אישיות: ${persona.personality_type}
- רקע: ${persona.background_story}
- מצב נוכחי: ${persona.current_situation}

## 🏢 נתוני החברה:
- שם: ${company?.name || 'החברה'}
- תחום: ${company?.company_questionnaires?.[0]?.industry || 'כללי'}
- מוצר/שירות: ${company?.company_questionnaires?.[0]?.product_service || 'שירות'}

## 🎯 פרטי הסימולציה:
- סוג שיחה: ${callType}
- רמת קושי: ${difficultyLevel}
- אזורי התמקדות: ${focusAreas.join(', ')}

## 📋 דרישות לתרחיש:

צור תרחיש שכולל:

1. **רקע מפורט למצב** - למה הלקוח מתקשר עכשיו?
2. **מטרות הלקוח** - מה הוא באמת רוצה להשיג?
3. **אתגרים ספציפיים** - איך הוא יאתגר את הנציג?
4. **התנגדויות מתוכננות** - מה הן ההתנגדויות העיקריות?
5. **אינדיקטורים להצלחה** - מתי הלקוח יתחיל להתחמם?
6. **תוצאות אפשריות** - כמה סיומים שונים לתרחיש

## ✨ דגשים מיוחדים:
- התרחיש צריך להיות ריאליסטי ומבוסס על מצב אמיתי
- צריך לכלול פרטים אישיים שיגרמו ללקוח להיראות אמיתי
- התאם את השפה והטון לתרבות הישראלית
- וודא שהתרחיש מתאים לרמת הקושי המבוקשת

## 🎭 פורמט התגובה:
השב בפורמט JSON עם השדות הבאים:
{
  "scenario_title": "כותרת התרחיש",
  "scenario_description": "תיאור מפורט של התרחיש",
  "customer_background": "רקע מפורט של הלקוח למצב הנוכחי",
  "customer_goals": ["מטרה 1", "מטרה 2"],
  "planned_objections": ["התנגדות 1", "התנגדות 2"],
  "success_indicators": ["אינדיקטור 1", "אינדיקטור 2"],
  "conversation_flow": ["פתיחה", "אמצע", "סגירה"],
  "expected_duration": מספר_דקות,
  "difficulty_notes": "הסבר על רמת הקושי"
}

חשוב: כל הטקסט בעברית בלבד!
`
}

/**
 * פרומפט להכנת דוח סימולציה
 */
export function createReportGenerationPrompt(
  simulationData: any,
  transcript: string,
  metrics: any
): string {
  return `
צור דוח מפורט לסימולציה בעברית על בסיס הנתונים הבאים:

## 📊 נתוני הסימולציה:
- משך: ${metrics.duration || 0} שניות
- סוג: ${simulationData.simulation_type}
- רמת קושי: ${simulationData.difficulty_level}

## 📝 תמלול השיחה:
${transcript}

## 📈 מטריקות טכניות:
${JSON.stringify(metrics, null, 2)}

## 📋 דרישות לדוח:

צור דוח מקצועי שכולל:

### 1. 🎯 ציון כללי (1-10)
### 2. 📊 ציונים מפורטים:
- טכניקות פתיחה (1-10)
- זיהוי צרכים (1-10)  
- טיפול בהתנגדויות (1-10)
- טכניקות שכנוע (1-10)
- סגירת עסקה (1-10)
- תקשורת ובניית קשר (1-10)
- ידע במוצר (1-10)

### 3. ✅ נקודות חוזק:
רשימה של מה הנציג עשה טוב

### 4. 🎯 נקודות לשיפור:
רשימה של מה צריך לשפר

### 5. 💡 המלצות ספציפיות:
המלצות פרקטיות לשיפור

### 6. 📈 המלצות לאימון הבא:
על מה להתמקד בסימולציה הבאה

## ⚖️ קריטריונים להערכה:

### טכניקות פתיחה:
- האם הנציג הזדהה בבירור?
- האם יצר קשר ראשוני טוב?
- האם הסביר את מטרת השיחה?

### זיהוי צרכים:
- האם שאל שאלות פתוחות?
- האם הקשיב באופן אקטיבי?
- האם זיהה את הצרכים האמיתיים?

### טיפול בהתנגדויות:
- האם טיפל בהתנגדויות בסבלנות?
- האם נתן תשובות משכנעות?
- האם לא ויתר מוקדם מדי?

### טכניקות שכנוע:
- האם השתמש בדוגמאות רלוונטיות?
- האם הדגיש יתרונות רלוונטיים?
- האם יצר דחיפות מתאימה?

### סגירת עסקה:
- האם ניסה לסגור את השיחה?
- האם הציע צעד הבא ברור?
- האם טיפל בהסתייגויות אחרונות?

### תקשורת ובניית קשר:
- האם דיבר בבירור ובקצב נכון?
- האם הראה אמפתיה?
- האם בנה אמון?

### ידע במוצר:
- האם הראה היכרות עם המוצר?
- האם ענה על שאלות טכניות?
- האם התאים את ההצגה ללקוח?

## 🎭 פורמט התגובה:
השב בפורמט JSON עם השדות הבאים:
{
  "overall_score": מספר_1_עד_10,
  "detailed_scores": {
    "opening_techniques": מספר,
    "needs_identification": מספר,
    "objection_handling": מספר,
    "persuasion_techniques": מספר,
    "closing_techniques": מספר,
    "communication_rapport": מספר,
    "product_knowledge": מספר
  },
  "summary": "סיכום של 2-3 משפטים על הביצועים",
  "strengths": ["חוזק 1", "חוזק 2", "חוזק 3"],
  "improvement_areas": ["שיפור 1", "שיפור 2", "שיפור 3"],
  "specific_feedback": [
    {
      "category": "קטגוריה",
      "feedback": "משוב ספציפי",
      "examples": ["דוגמה מהשיחה"]
    }
  ],
  "recommendations": ["המלצה 1", "המלצה 2", "המלצה 3"],
  "next_training_focus": "מה להתמקד בו באימון הבא"
}

חשוב: כל הטקסט בעברית בלבד! תן משוב בונה ומעשי שיעזור לנציג להשתפר.
`
}

/**
 * פרומפטים מיוחדים לסוגי שיחות שונים
 */
export const callTypePrompts = {
  inbound: {
    instructions: 'אתה לקוח שיצר קשר עם החברה מיוזמתך. יש לך עניין אמיתי אבל גם הרבה שאלות וספקות.',
    openingStyle: 'תתחיל בהסבר קצר למה אתה מתקשר',
    mainChallenges: ['לחץ זמן', 'צורך בהבנה מהירה', 'השוואה למתחרים']
  },
  outbound: {
    instructions: 'הנציג יצר איתך קשר לא מתוכנן. היה זהיר וחשדני בהתחלה.',
    openingStyle: 'תגיב בזהירות - מי זה? מה הוא רוצה? איך הוא השיג את הטלפון שלך?',
    mainChallenges: ['חוסר אמון ראשוני', 'לחץ זמן', 'התנגדות לשיחת מכירות']
  },
  follow_up: {
    instructions: 'זוהי שיחת המשך. יש לך היסטוריה עם החברה ודעות מוקדמות.',
    openingStyle: 'הזכר את השיחה הקודמת ומה היה אמור לקרות',
    mainChallenges: ['ציפיות מהעבר', 'שינויים במצב', 'צורך בהתקדמות']
  },
  closing: {
    instructions: 'אתה בשלב של קבלת החלטה סופית. תהיה דקדקני ותעלה את כל הספקות האחרונים.',
    openingStyle: 'הזכר שאתה בשלב של החלטה וצריך עוד כמה פרטים',
    mainChallenges: ['ספקות אחרונים', 'בדיקת פרטים', 'תנאים סופיים']
  },
  customer_service: {
    instructions: 'אתה לקוח קיים עם בעיה או בקשה. תהיה מעט מתוסכל אבל לא עויין.',
    openingStyle: 'הסבר את הבעיה או הבקשה שלך בבירור',
    mainChallenges: ['תסכול מהמצב', 'צורך בפתרון מהיר', 'ציפיות גבוהות']
  },
  upsell: {
    instructions: 'אתה לקוח מרוצה אבל זהיר מהוצאות נוספות. הנציג מנסה למכור לך משהו נוסף.',
    openingStyle: 'תהיה חברותי אבל ספקן לגבי הצעות נוספות',
    mainChallenges: ['חשש מהוצאות נוספות', 'צורך להבין ערך', 'השוואת עלויות']
  },
  retention: {
    instructions: 'אתה שוקל לעזוב או לבטל את השירות. יש לך סיבות טובות לכך.',
    openingStyle: 'הסבר למה אתה רוצה לעזוב ומה לא מספק אותך',
    mainChallenges: ['חוסר שביעות רצון', 'השוואה למתחרים', 'צורך בשינוי אמיתי']
  }
}

/**
 * מערכת בחירת פרומפט אוטומטית
 */
export function getOptimalPrompt(params: SimulationPromptParams): string {
  const basePrompt = createBaseSystemPrompt(params)
  const callTypeSpecific = callTypePrompts[params.callType]
  
  if (callTypeSpecific) {
    return `${basePrompt}

## 🎯 הוראות ספציפיות לסוג השיחה:
${callTypeSpecific.instructions}

### 🎬 סגנון פתיחה:
${callTypeSpecific.openingStyle}

### ⚡ אתגרים עיקריים להעלאה:
${callTypeSpecific.mainChallenges.map(challenge => `- ${challenge}`).join('\n')}
`
  }
  
  return basePrompt
}
