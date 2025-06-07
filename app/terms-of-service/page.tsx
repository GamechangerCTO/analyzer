import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          תנאי השירות
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">הסכמה לתנאים</h2>
            <p>
              על ידי גישה לפלטפורמת "חדר כושר למכירות" ושימוש בה, אתם מסכימים להיות קשורים בתנאי השירות הללו. 
              השימוש בפלטפורמה מחייב הסכמה נוספת להקלטת, עיבוד וניתוח שיחות באמצעות בינה מלאכותית.
              אם אינכם מסכימים לכל התנאים, אנא הימנעו משימוש בשירות.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">תיאור השירות</h2>
            <p>
              "חדר כושר למכירות" הוא פלטפורמת אימון דיגיטלית המיועדת לשפר ביצועי מכירות ושירות. 
              השירות כולל:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>עיבוד הקלטות שיחות:</strong> תמיכה בכל פורמטי האודיו (MP3, WAV, M4A, WMA וכו')</li>
              <li><strong>תמלול אוטומטי:</strong> באמצעות טכנולוגיית OpenAI Whisper</li>
              <li><strong>ניתוח ביצועים:</strong> באמצעות GPT-4 עם פרמטרים מותאמים למכירות ושירות</li>
              <li><strong>דוחות מפורטים:</strong> ציונים, ציטוטים, המלצות לשיפור ותובנות</li>
              <li><strong>דשבורדים:</strong> מעקב התקדמות אישי וצוותי</li>
              <li><strong>ניהול צוותים:</strong> כלים למנהלים לניטור ושיפור הביצועים</li>
            </ul>
            <p className="mt-4">
              אנו שומרים לעצמנו את הזכות לשנות, להשעות או להפסיק כל חלק מהשירות בכל עת.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">התחייבויות המשתמש</h2>
            <p>כמשתמש בפלטפורמת "חדר כושר למכירות", אתם מתחייבים:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>הקלטות חוקיות:</strong> לוודא שכל הקלטת שיחה בוצעה בהתאם לחוק ובהסכמת כל הצדדים</li>
              <li><strong>מידע מדויק:</strong> לספק מידע מדויק ומעודכן על החברה, המוצרים והשירותים</li>
              <li><strong>שימוש אחראי:</strong> להשתמש בשירות אך ורק למטרות מקצועיות וחוקיות</li>
              <li><strong>הגנת פרטיות:</strong> לא להעלות הקלטות הכוללות מידע רפואי, פיננסי או אישי רגיש של לקוחות</li>
              <li><strong>אבטחת מידע:</strong> לשמור על סודיות פרטי הגישה ולא לחלוק אותם עם אחרים</li>
              <li><strong>איסור שיתוף:</strong> לא לחלוק או להעביר הקלטות מחוץ לפלטפורמה ללא רשות מפורשת</li>
              <li><strong>זכויות יוצרים:</strong> לכבד זכויות יוצרים של התוכן, הפרומפטים והטכנולוגיה</li>
              <li><strong>איסור פגיעה:</strong> לא לנסות לפגוע בתפקוד השירות, לפרוץ למערכת או לעקוף הגבלות</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">הקלטות ועיבוד AI</h2>
            <p>שימוש בשירותי העיבוד וה-AI שלנו כפוף לתנאים הבאים:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>איכות ההקלטות:</strong> אתם אחראים לאיכות ובהירות ההקלטות שאתם מעלים</li>
              <li><strong>שפות נתמכות:</strong> השירות מותאם בעיקר לעברית ואנגלית</li>
              <li><strong>דיוק הניתוח:</strong> ניתוח ה-AI מספק תוצאות הטובות ביותר הזמינות, אך אינו מובטח להיות מושלם</li>
              <li><strong>עיבוד אוטומטי:</strong> ההקלטות עוברות עיבוד אוטומטי ללא התערבות אנושית</li>
              <li><strong>זמני עיבוד:</strong> זמני העיבוד תלויים באורך ההקלטה ובעומס המערכת</li>
              <li><strong>שמירת נתונים:</strong> דוחות הניתוח נשמרים לצורכי מעקב והשוואה</li>
              <li><strong>גיבויים:</strong> ההקלטות עשויות להיות מגובות למטרות אבטחה</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">קניין רוחני</h2>
            <p>
              כל התוכן, התכונות והפונקציונליות של השירות הם בבעלותנו הבלעדית ומוגנים 
              על ידי חוקי זכויות יוצרים, סימני מסחר וחוקי קניין רוחני אחרים.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">זמינות השירות</h2>
            <p>
              אנו מתחייבים לספק שירות זמין ויציב, אך איננו יכולים להבטיח זמינות של 100%. 
              השירות עשוי להיות זמין לתחזוקה או שדרוגים מעת לעת.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">הגבלת אחריות</h2>
            <p>
              השירות מסופק "כפי שהוא" ו"כפי שזמין". הגבלות האחריות הספציפיות שלנו:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>דיוק הניתוח:</strong> אנו לא מתחייבים לדיוק מוחלט של ניתוח ה-AI או התמלולים</li>
              <li><strong>החלטות עסקיות:</strong> השירות מספק תובנות בלבד - החלטות עסקיות נותרות באחריותכם</li>
              <li><strong>אובדן נתונים:</strong> למרות אמצעי הגנה מתקדמים, איננו אחראים לאובדן נתונים</li>
              <li><strong>זמינות השירות:</strong> איננו מתחייבים לזמינות 24/7 - תחזוקות ושדרוגים עשויים לגרום להפסקות</li>
              <li><strong>שירותי צד שלישי:</strong> איננו אחראים לתקלות בשירותי OpenAI או ספקים נוספים</li>
              <li><strong>תוצאות עסקיות:</strong> איננו מבטיחים שיפור במכירות או ביצועים עסקיים</li>
              <li><strong>תאימות לחוק:</strong> אחריותכם לוודא שהשימוש תואם לחוקי המדינה שלכם</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">סיום השירות</h2>
            <p>
              אנו רשאים לסיים או להשעות את הגישה שלכם לשירות בכל עת, מכל סיבה שהיא, 
              כולל במקרה של הפרת תנאי השירות.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">תשלומים והחזרים</h2>
            <p>
              במידה והשירות כולל רכיבים בתשלום, התשלומים יבוצעו בהתאם למידע המפורט באתר. 
              מדיניות ההחזרים תהיה כפופה לתנאים הנוספים שיפורטו בעת הרכישה.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">שינויים בתנאים</h2>
            <p>
              אנו שומרים לעצמנו את הזכות לעדכן תנאי שירות אלה בכל עת. 
              המשך השימוש בשירות לאחר שינוי התנאים מהווה הסכמה לתנאים החדשים.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">דין החל</h2>
            <p>
              תנאי שירות אלה יפורשו ויחולו בהתאם לחוקי מדינת ישראל. 
              כל סכסוך יידון בבתי המשפט המוסמכים בישראל.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">יצירת קשר</h2>
            <p>
              לשאלות או הבהרות בנוגע לתנאי השירות, אתם מוזמנים ליצור איתנו קשר 
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