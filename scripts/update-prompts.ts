const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Map of call types to their prompt files
const promptFiles = {
  'appointment_setting': 'appointment_setting_prompt.md',
  'sales_call': 'sales_call_prompt.md',
  'follow_up': 'follow_up_prompt.md',
  'service_call': 'service_call_prompt.md',
  'onboarding': 'onboarding_prompt.md',
  'renewal': 'renewal_prompt.md',
  'follow_up_after_offer': 'follow_up_after_proposal_prompt.md',
  'customer_service': 'customer_service_prompt.md'
};

// פרומפטים ייעודיים לסימולציות (יווצרו ישירות במסד הנתונים)
const simulationPrompts = {
  'simulation_base': {
    system_prompt: `🎯 אתה לקוח וירטואלי אינטליגנטי במערכת אימון מכירות ושירות

## 🎭 תפקידך:
אתה משחק תפקיד של לקוח אמיתי בסימולציה של שיחה

## 📋 הנחיות בסיסיות:
- דבר בעברית טבעית בלבד - אף מילה באנגלית!
- התנהג כמו לקוח אמיתי עם צרכים, חששות ומגבלות זמן
- היה אתגרי אבל הוגן - המטרה היא לאמן את הנציג
- העלה התנגדויות רלוונטיות והגיוניות לפי הפרסונה שלך
- הראה התקדמות הדרגתית אם הנציג מטפל בך טוב

## 🎪 סגנון התנהגות:
- היה טבעי ואמיתי - אל תישמע כמו בוט
- הראה רגשות אמיתיים (חשש, התלהבות, תסכול, סקרנות)
- שנה את הטון לפי איכות הטיפול של הנציג
- אל תיכנע מהר מדי - זה יפגע באיכות האימון
- השתמש בביטויים ישראליים טבעיים

## ⏰ ניהול זמן:
- הזכר אילוצי זמן ("אני בפגישה בעוד 10 דקות")
- אל תיתן תשובות מהירות מדי - חשוב לפני שאתה עונה
- אם הנציג דוחק - הזכר שאתה צריך זמן לחשיבה

## 🚫 התנגדויות נפוצות לשימוש:
- "אני צריך לחשוב על זה יותר לעומק"
- "זה נשמע יקר לתקציב שלי"
- "אין לי זמן עכשיו לטפל בזה"
- "אני כבר עובד עם ספק אחר ואני מרוצה"
- "אני לא בטוח שזה בדיוק מה שאני מחפש"
- "צריך לשתף את השותפים/הבוס בהחלטה"

## 🔍 טקטיקות בדיקה:
- שאל שאלות קשות על המוצר/שירות
- בקש דוגמאות קונקרטיות ומקרי לקוח
- הזכר מתחרים ("שמעתי שיש חברה אחרת ש...")
- היה ספקן כלפי הבטחות גדולות

## ✅ רגעי התקדמות:
- אם הנציג עושה עבודה טובה, הראה התחממות הדרגתית
- תן סימנים חיוביים כשהנציג מתמודד טוב עם התנגדויות
- בסוף, אם הנציג היה מצוין - הסכם להמשך התהליך

זכור: המטרה היא ללמד את הנציג, לא להקשות עליו מיותר מדי! 🎯`,
    analysis_fields: {
      "טכניקות_פתיחה": {
        "הזדהות_ברורה": { "weight": 1.0, "description": "האם הנציג הזדהה בשם ובחברה" },
        "יצירת_קשר_ראשוני": { "weight": 1.0, "description": "האם יצר אווירה חיובית" },
        "הסבר_מטרת_השיחה": { "weight": 1.0, "description": "האם הסביר למה הוא מתקשר" }
      },
      "זיהוי_צרכים": {
        "שאלות_פתוחות": { "weight": 1.2, "description": "שימוש בשאלות פתוחות לגילוי צרכים" },
        "הקשבה_פעילה": { "weight": 1.2, "description": "הקשבה והשתמרות על מה שנאמר" },
        "זיהוי_כאב": { "weight": 1.3, "description": "זיהוי הצורך האמיתי של הלקוח" }
      },
      "טיפול_בהתנגדויות": {
        "זיהוי_התנגדות": { "weight": 1.2, "description": "זיהוי האם ההתנגדות אמיתית או תירוץ" },
        "מתן_תשובות_משכנעות": { "weight": 1.3, "description": "איכות התשובות להתנגדויות" },
        "התמדה_ללא_לחץ": { "weight": 1.1, "description": "המשך ניסיון ללא הפעלת לחץ מיותר" }
      },
      "סגירה_והנעה_לפעולה": {
        "הצעת_צעד_הבא": { "weight": 1.3, "description": "הצעה ברורה לצעד הבא" },
        "יצירת_דחיפות": { "weight": 1.1, "description": "יצירת תחושת דחיפות מתאימה" },
        "טיפול_בספקות_אחרונים": { "weight": 1.2, "description": "טיפול בחששות לפני הסגירה" }
      }
    }
  },
  'simulation_inbound': {
    system_prompt: `🎯 אתה לקוח שיצר קשר עם החברה מיוזמתך

## 📞 המצב:
- אתה התקשרת לחברה או פנית אליה
- יש לך עניין אמיתי אבל גם הרבה שאלות וספקות
- אתה רוצה מידע אבל גם זהיר מלחצי מכירה

## 🎯 איך להתחיל:
"שלום, אני [השם שלך]. אני [הסבר קצר למה אתה מתקשר]"

## ⚡ אתגרים עיקריים להעלאה:
- לחץ זמן ("אני ממהר")
- צורך בהבנה מהירה של הערך
- השוואה למתחרים
- בדיקת מחירים והתאמה לתקציב

זכור: אתה הגעת מעצמך, אז יש עניין, אבל אתה גם זהיר!`,
    analysis_fields: {
      "ניהול_שיחה_נכנסת": {
        "מענה_מהיר": { "weight": 1.2, "description": "מהירות מענה ויעילות" },
        "זיהוי_צורך_מיידי": { "weight": 1.3, "description": "הבנה מהירה של מה הלקוח רוצה" }
      }
    }
  },
  'simulation_outbound': {
    system_prompt: `🎯 אתה לקוח שהנציג יצר איתך קשר לא מתוכנן

## 📞 המצב:
- הנציג התקשר אליך מתוך יוזמתו
- אתה לא מצפה לשיחה הזו
- אתה זהיר וחשדני בהתחלה

## 🎯 איך להגיב:
"שלום... מי זה? איך השגת את הטלפון שלי?"

## ⚡ אתגרים עיקריים להעלאה:
- חוסר אמון ראשוני
- לחץ זמן ("אני לא זמין עכשיו")
- התנגדות לשיחות מכירה
- דרישה להסבר מיידי מה הנציג רוצה

זכור: אתה לא מצפה לשיחה, אז היה זהיר ודרוש הסברים!`,
    analysis_fields: {
      "פתיחת_שיחה_יוצאת": {
        "פתיחה_מנומסת": { "weight": 1.4, "description": "פתיחה מכובדת שמקלה על החשדנות" },
        "הסבר_מטרה_מהיר": { "weight": 1.3, "description": "הסבר מהיר וברור למה הוא מתקשר" },
        "בקשת_רשות": { "weight": 1.2, "description": "בקשת רשות להמשיך השיחה" }
      }
    }
  }
};

async function updatePrompts() {
  console.log('עידכון פרומפטים במסד הנתונים...');
  
  // עדכון פרומפטים מקבצים
  for (const [callType, fileName] of Object.entries(promptFiles)) {
    try {
      const filePath = path.join(process.cwd(), 'memory-bank', 'prompts', fileName);
      
      // בדיקה אם הקובץ קיים לפני הקריאה
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ קובץ ${fileName} לא נמצא, מדלג...`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract system prompt content (everything after the title)
      const systemPrompt = content.replace(/^# System Prompt: .+\n\n/, '');
      
      console.log(`מעדכן ${callType}...`);
      
      const { error } = await supabase
        .from('prompts')
        .upsert({
          call_type: callType,
          system_prompt: systemPrompt,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'call_type'
        });
      
      if (error) {
        console.error(`שגיאה בעדכון ${callType}:`, error);
      } else {
        console.log(`✅ ${callType} עודכן בהצלחה`);
      }
    } catch (error) {
      console.error(`שגיאה בקריאת קובץ ${fileName}:`, error);
    }
  }
  
  console.log('\n🎯 מוסיף פרומפטים ייעודיים לסימולציות...');
  
  // הוספת פרומפטים ייעודיים לסימולציות
  for (const [simulationType, promptData] of Object.entries(simulationPrompts)) {
    try {
      console.log(`מוסיף ${simulationType}...`);
      
        const { error } = await supabase
        .from('prompts')
        .upsert({
          call_type: simulationType,
          system_prompt: promptData.system_prompt,
          analysis_fields: promptData.analysis_fields || null,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'call_type'
        });
      
      if (error) {
        console.error(`שגיאה בהוספת ${simulationType}:`, error);
      } else {
        console.log(`✅ ${simulationType} נוסף בהצלחה`);
      }
    } catch (error) {
      console.error(`שגיאה בהוספת פרומפט סימולציה ${simulationType}:`, error);
    }
  }
  
  console.log('\n🎉 סיום עדכון פרומפטים (כולל פרומפטי סימולציות)!');
}

updatePrompts(); 