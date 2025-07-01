import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          מדיניות פרטיות
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">מבוא</h2>
            <p>
              ברוכים הבאים לפלטפורמת "חדר כושר למכירות" - פלטפורמת אימון דיגיטלית המיועדת לשפר ביצועי מכירות ושירות. 
              אנו מחויבים להגן על פרטיותכם ולשמור על הנתונים הרגישים שלכם, כולל הקלטות שיחות ונתונים עסקיים. 
              מדיניות פרטיות זו מסבירה כיצד אנו אוספים, עמוססים, מעבדים ומגנים על המידע שלכם.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">איסוף מידע</h2>
            <p>במסגרת פלטפורמת האימון שלנו, אנו אוספים את סוגי המידע הבאים:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>מידע פרופיל וחברה:</strong> שם מלא, תפקיד, פרטי חברה, תחום עסקי, מוצרים ושירותים</li>
              <li><strong>קבצי שיחות והקלטות:</strong> קבצי אודיו בפורמטים שונים (MP3, WAV, M4A, WMA וכו'), תמלולי שיחות, הערות והעלות המשתמש</li>
              <li><strong>נתוני ניתוח:</strong> דוחות ניתוח שיחות, ציונים, ציטוטים, המלצות לשיפור, מגמות ביצועים</li>
              <li><strong>חומרים מקצועיים:</strong> תסריטי שיחה, בנק התנגדויות, אוגדני מכירות ושירות שהועלו על ידכם</li>
              <li><strong>מידע טכני:</strong> כתובת IP, נתוני דפדפן, זמני גישה, פעילות במערכת</li>
              <li><strong>נתוני שימוש:</strong> תדירות שימוש, אינטראקציות עם הפלטפורמה, התקדמות באימונים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">שימוש במידע</h2>
            <p>אנו משתמשים במידע שנאסף למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>עיבוד וניתוח שיחות:</strong> שימוש בטכנולוגיות ניתוח מתקדמות (OpenAI GPT-4, Whisper) לתמלול שיחות וניתוח ביצועים</li>
              <li><strong>יצירת דוחות מותאמים אישית:</strong> הפקת תובנות, המלצות לשיפור ומעקב התקדמות</li>
              <li><strong>ניהול צוותים:</strong> מתן כלים למנהלים לניטור ושיפור ביצועי הצוות</li>
              <li><strong>שיפור השירות:</strong> פיתוח והשבחת אלגוריתמי הניתוח והפלטפורמה</li>
              <li><strong>תמיכה טכנית:</strong> פתרון בעיות ומתן סיוע למשתמשים</li>
              <li><strong>אבטחת מידע:</strong> מניעת גישה לא מורשית והגנה על הנתונים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">אבטחת מידע והקלטות</h2>
            <p>
              אנו נוקטים באמצעי אבטחה מתקדמים המותאמים במיוחד להגנה על הקלטות שיחות ונתונים עסקיים רגישים:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>הצפנה מתקדמת:</strong> כל הקבצים מוצפנים במהלך ההעלאה, העיבוד והאחסון</li>
              <li><strong>אחסון מאובטח:</strong> שימוש בפלטפורמת Supabase עם תקני אבטחה גבוהים</li>
              <li><strong>בקרת גישה:</strong> הרשאות מדויקות לכל משתמש בהתאם לתפקידו בארגון</li>
              <li><strong>מחיקה אוטומטית:</strong> הקלטות נמחקות אוטומטית לאחר תקופה מוגדרת (אלא אם נשמרו במפורש)</li>
              <li><strong>זיהוי דגלים אדומים:</strong> מערכת להתרעה על תוכן רגיש או בעייתי</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">שיתוף מידע וצדדים שלישיים</h2>
            <p>
              אנו לא נשתף את המידע והקלטות שלכם עם צדדים שלישיים, למעט במקרים הבאים:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>ספקי טכנולוגיה:</strong> שימוש ב-OpenAI (GPT-4, Whisper) לעיבוד הקלטות - עם התחייבות למחיקת נתונים</li>
              <li><strong>בהסכמתכם המפורשת:</strong> שיתוף דוחות או הקלטות עם חברים בצוות או מנהלים</li>
              <li><strong>דרישות חוק:</strong> כאשר נדרש על פי חוק או בית משפט</li>
              <li><strong>הגנה על זכויות:</strong> כדי להגן על הזכויות, הבטיחות או הקניין שלנו</li>
            </ul>
            <p className="mt-4">
              <strong>חשוב לדעת:</strong> ההקלטות שלכם לא משמשות לאימון מודלים או לשיפור שירותי צדדים שלישיים.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">זכויות המשתמש והקלטות</h2>
            <p>יש לכם הזכויות הבאות בנוגע למידע והקלטות שלכם:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>זכות צפייה:</strong> צפייה בכל המידע האישי והקלטות שלכם במערכת</li>
              <li><strong>זכות תיקון:</strong> עדכון ותיקון פרטים אישיים ועסקיים</li>
              <li><strong>זכות מחיקה:</strong> מחיקת הקלטות ספציפיות או כל המידע שלכם</li>
              <li><strong>זכות ייצוא:</strong> הורדת כל הנתונים והדוחות שלכם בפורמט נגיש</li>
              <li><strong>זכות הגבלה:</strong> הגבלת השימוש בהקלטות או במידע מסוים</li>
              <li><strong>זכות שליטה:</strong> קביעה מי בארגון יכול לצפות בהקלטות שלכם</li>
              <li><strong>זכות ביטול הסכמה:</strong> ביטול הסכמה לעיבוד אוטומטי או לשיתוף עם הצוות</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">הסכמות והקלטות</h2>
            <p>שימוש בפלטפורמה מחייב הסכמות מיוחדות:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>הקלטת שיחות:</strong> אחריותכם לוודא שכל הצדדים בשיחה הסכימו להקלטה</li>
              <li><strong>עיבוד אוטומטי:</strong> הסכמה לעיבוד ההקלטות באמצעות טכנולוגיות ניתוח מתקדמות</li>
              <li><strong>שיתוף בצוות:</strong> אפשרות לשתף הקלטות ודוחות עם מנהלים וחברי צוות</li>
              <li><strong>שמירת דוחות:</strong> דוחות הניתוח נשמרים לצורכי מעקב והתפתחות מקצועית</li>
              <li><strong>גיבוי מידע:</strong> הנתונים עשויים להיות מגובים למטרות אבטחה והמשכיות עסקית</li>
            </ul>
            <p className="mt-4">
              <strong>הסכמה מדורגת:</strong> תוכלו לבחור רמות שונות של הסכמה ולשנות אותן בכל עת בהגדרות החשבון שלכם.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">עדכונים למדיניות</h2>
            <p>
              אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. נודיע לכם על כל שינוי מהותי 
              באמצעות האתר או בדרכים אחרות.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">יצירת קשר</h2>
            <p>
              אם יש לכם שאלות או דאגות בנוגע למדיניות הפרטיות שלנו, אתם מוזמנים ליצור איתנו קשר 
              באמצעות פרטי הקשר הזמינים באתר.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>
      </div>
    </div>
  );
} 