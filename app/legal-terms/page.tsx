'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'

function LegalTermsContent() {
  const searchParams = useSearchParams()
  const requireApproval = searchParams.get('requireApproval') === '1'
  const router = useRouter()

  const [isChecked, setIsChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/legal-terms/accept', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'אירעה שגיאה בשמירת האישור')
      }
      router.replace('/dashboard')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-primary/5 via-white to-glacier-accent/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="coachee-glass rounded-2xl border border-neutral-200 shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">תקנון משפטי למערכת ניתוח שיחות וסימולציות</h1>
          <div className="text-neutral-700 space-y-4 max-h-[50vh] overflow-y-auto pr-2 leading-relaxed text-sm">
            
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">1. תיאור השירות</h2>
              <p>
                חברת coachee מקבוצת KA וגיים צ'יינג'ר מפעילה מערכת טכנולוגית מתקדמת עבור לקוחות בישראל, המאפשרת למשתמשים להעלות שיחות מכירה או שירות (באמצעות העלאת קבצים או חיבור אינטגרטיבי דרך API ייעודי), ולקבל ניתוח מקצועי הכולל הערות, דגשים, ציונים ותוכן סימולציות מותאם. המערכת משתמשת בטכנולוגיית בינה מלאכותית (AI) אך ורק לצורך תמלול השיחות והפקת קול לסימולציות. כל הניתוחים, ההערכות, ההמלצות, הדירוגים, הציונים ותוכן הסימולציות נערכים על בסיס דאטה מקצועי, ניסיון מצטבר ומסדי נתונים רחבים של החברה אשר נצברו בעבודה עם למעלה מ-500 לקוחות בישראל, ואינם מבוצעים באמצעי אוטומציה או AI. טעויות, שגיאות, הטיות סטטיסטיות, סטיות בבנצ'מארק או אי-דיוקים אשר עלולים להיווצר (ככל שיתרחשו) – מקורם בשלב התמלול והקול המבוצעים ב-AI, והחברה פטורה מכל אחריות בגינן.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">2. מבוא</h2>
              <p>
                תקנון זה מסדיר את תנאי השימוש במערכת הטכנולוגית ופונה ללקוחות עסקיים ומוסדיים בישראל בלבד. כל שימוש במערכת מהווה הסכמה מלאה ומחייבת לכללים המפורטים כאן ויוצר גבול אחריות משפטי מירבי, בכפוף לדין הישראלי.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">3. הגדרות</h2>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>המערכת:</strong> הפלטפורמה, התוכנה, האלגוריתמים ומנגנוני הניתוח והסימולציה, לרבות ממשקי API.</li>
                <li><strong>משתמש/לקוח:</strong> כל אדם או תאגיד המורשה להשתמש במערכת, לרבות נציגי הארגון מטעם הלקוח.</li>
                <li><strong>שיחה/מידע:</strong> כל קובץ, הקלטה או נתון שמועלה או מוזרם למערכת (קבצים/חיבור API).</li>
                <li><strong>API:</strong> ממשק תכנות ייעודי לאינטגרציה אוטומטית של מידע.</li>
                <li><strong>AI:</strong> טכנולוגיית בינה מלאכותית לתמלול שיחות והפקת קול לסימולציות.</li>
                <li><strong>נתוני החברה:</strong> דאטה מקצועי ומצטבר על בסיס עיבוד מאות רבות של לקוחות בישראל לצורך המלצות, דירוגים וסימולציות.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">4. תנאי שימוש והרשאות</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>השימוש במערכת מותר למטרות עסקיות וחוקיות בלבד בישראל, בהתאם להסכם זה.</li>
                <li>המשתמש מתחייב להעלות רק מידע בבעלותו או שיש לו הרשאה חוקית לשימוש בו (לרבות הסכמת כל צד רלוונטי).</li>
                <li>חל איסור מוחלט על העלאת מידע פוגעני, בלתי חוקי, מסווג, מפר זכויות צדדים שלישיים, או מידע אישי/רגיש של עובד/לקוח ללא אישור והסכמה.</li>
                <li>המשתמש אחראי להשגת כל ההרשאות הנדרשות מהמצויים בשיחות, במיוחד מעובדים ולקוחות.</li>
                <li>למשתמש אין להעביר, לשכפל, להפיץ, למכור או להשתמש בתוצרי המערכת, ניתוחים, סימולציות או נתונים – למעט לצרכיו הפנימיים ובאופן חוקי ומוסכם בלבד.</li>
                <li>המשתמש מעניק לחברת coachee מקבוצת KA וגיים צ'יינג'ר רישיון לא בלעדי, ללא תמלוגים, להשתמש, לעבד, לנתח, לאכסן ולהפיק נגזרות ממידע שהעלה, לצורך מתן השירות וביצוע בנצ'מארקים אנונימיים בלבד.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">5. אינטגרציה וקבלת מידע (API)</h2>
              <h3 className="font-semibold">5.1 אחריות המשתמש</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>המשתמש מצהיר כי בידיו כל הזכויות ההרשאות וההסכמות להעברת ו/או קבלת מידע למערכת, לרבות בעבודה מול API ואינטגרציות שונות, ולרבות הסכמות נדרשות של עובדים, לקוחות או צדדים שלישיים.</li>
                <li>המשתמש מתחייב לעמוד בכל חובותיו מכוח חוקי העבודה, הפרטיות וכל דין רלוונטי בישראל, ולוודא חוקיותו של המידע המוזרם והעלאתו בתום לב בלבד.</li>
              </ul>
              <h3 className="font-semibold">5.2 הגבלת אחריות החברה</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>החברה לא תישא באחריות לדיוק, שלמות, עדכנות, חוקיות, תכולה או אמינות מידע ששודר בקבצים או API, ולא לנזקים ישירים/עקיפים, הפסדים או תביעות עקב שימוש ב-API או תקשורת נתונים אחרת.</li>
                <li>החברה אינה אחראית לכל חשיפה או תביעה הנובעת מהעלאת מידע ללא הרשאות או הסכמות מספקות מצד הלקוח.</li>
              </ul>
              <h3 className="font-semibold">5.3 אבטחת מידע</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>החברה מפעילה פרוטוקולי הצפנה ובקרות אבטחת מידע מהמחמירים ביותר המקובלים, אולם אינה אחראית לאירועים ואף לא לתקיפות סייבר מחוץ לשליטתה (כגון מתקפות Zero-Day).</li>
                <li>חובת שמירת סודיות ושמירה על סיסמאות מערכת מוטלת על המשתמש בלבד.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">6. פרטיות ומידע אישי</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>החברה מתחייבת לעמוד בדרישות חוק הגנת הפרטיות בישראל, לרבות לעניין כל עיבוד, אחסון, שיתוף, מחיקה וניהול מידע אישי.</li>
                <li>החברה תעשה שימוש במידע לצרכי השירות בלבד, לא תעביר מידע אישי מזהה לצד שלישי אלא בהתאם לחוק או לפעילות נדרשת שירותית.</li>
                <li>ייתכן תיעוד של שיחות ותוצרי אינטגרציה לצורכי שירות, בקרת איכות ואבטחה בלבד.</li>
                <li>המשתמש אחראי לא רק להשגת הסכמות בעלי עניין, אלא גם ליידע את העובדים/לקוחות/צדדים שלישיים ככל שמדובר בשימוש במידע אישי.</li>
                <li>למחיקת מידע, עיון או שינוי – יש לפנות בטופס צור קשר.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">7. קניין רוחני</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>כל הזכויות, לרבות תוכנה, תוצרים, השוואות דאטה, סימולציות, בנצ'מארקים, קוד מקור ואלגוריתמים – שייכים בלעדית לחברה.</li>
                <li>איסור מוחלט על העתקה, הנדסה לאחור, פרסום או מסירה לצד ג' של כל רכיב מערכתי או תוצר, ללא הסכמה בכתב.</li>
                <li>המשתמש רשאי לעשות שימוש רק בנתונים ותוצרים שהפיק עבור פעילותו הפנימית.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">8. שימוש ב-AI, תמלול, סימולציות והגבלת אחריות ייחודית</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>תמלול שיחות והפקת קול לסימולציות נעשים באמצעות AI, וטעויות, שגיאות, הטיות סטטיסטיות, סטיות בבנצ'מארק או אי-דיוקים – מקורם בשלב זה בלבד ולחברה אין כל אחריות או התחייבות לספק תוצר ללא שגיאות.</li>
                <li>כלל הניתוחים, ההערכות, ההמלצות, הדירוגים, הציונים ותוכן הסימולציות מבוססים דאטה מקצועי וניסיון מצטבר בלבד – ואינם תוצאה של אוטומציה או AI.</li>
                <li>אין להסתמך על תוצרי סימולציה או תמלול בפעולות ניהול, קבלת החלטות קריטיות, פיטורים וכד' ללא בדיקה אנושית משלימה.</li>
                <li>המשתמש אחראי לוודא את נכונות התוצרים, במיוחד במקרים של השפעה עסקית/ארגונית מהותית.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">9. הגבלת אחריות (כוללת ט.ל.ח וכוח עליון)</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>השירות ניתן "כמות שהוא" (AS IS) וללא אחריות לא לדיוק, שלמות, עדכנות, זמינות, תועלת, מהימנות, התאמה לשימוש או תוצאה עסקית.</li>
                <li>החברה, עובדיה, מפתחים ונציגיה לא יישאו באחריות, במישרין או בעקיפין, לכל נזק (ישיר/עקיף), הפסד רווח, אובדן מידע, תקלה או תביעה – בשל שגיאות בתמלול, ניתוח, ניהול דאטה, דירוגים, המלצות, תוצרים אוטומטיים ואחרים, תקלה בממשק, שיבוש API, טעויות טכניות/קלריקליות, או כוח עליון – לרבות עיכובים, עצירות שירות, מגפה, שביתה, אירועי סייבר וכו'.</li>
                <li>המשתמש מוותר מראש ובאופן בלתי חוזר על כל טענה/תביעה עקב שגיאות תמלול, תוצאות ניתוח, בנצ'מארק שגוי, החלטה תפעולית לא מדויקת, אפליה לא מכוונת, או חשש לאוטומציה מוטעית.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">10. שיפוי, פיצוי והגנה הדדית</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>המשתמש מתחייב לשפות ולפצות את החברה (כולל עובדיה, מנהליה, סוכניה) על כל תביעה, הוצאה, נזק, הפסד, או עלות – ובכלל זה שכר טרחת עורכי דין – בגין הפרת התקנון, העלאת מידע לא מורשה או פגיעה באחר/ה (לרבות זכויות עובדים, פרטיות לקוחות).</li>
                <li>ובכל מקרה החברה לא תשפה את המשתמש.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">11. סיום והשבתה</h2>
              <p>החברה רשאית להפסיק, להגביל או לחסום את הגישה למערכת בכל אחד מהמקרים הבאים:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>הפרה של תנאי התקנון</li>
                <li>פעילות בלתי חוקית</li>
                <li>פגיעה באבטחת המערכת</li>
                <li>אי עמידה בתנאי התשלום שנקבעו בין הצדדים</li>
                <li>או דרישת רשות מוסמכת בישראל</li>
              </ul>
              <p>המשתמש יקבל הודעה על סיום השירות, בכפוף לתנאי ההסכם. עם סיום השימוש, כל ההוראות בתקנון שטבען לשרוד סיום, כגון זכויות קניין רוחני, הגבלת אחריות ופיצויים, ימשיכו לחול.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">12. שינויים בתקנון</h2>
              <p>החברה רשאית להחליף, לתקן או לעדכן תקנון זה בכל עת, תוך פרסום הגרסה המעודכנת למשתמשים. הנוסח העדכני מחייב עם פרסומו.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">13. דין חל וסמכות שיפוט</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>רק הדין הישראלי חל.</li>
                <li>כל מחלוקת או תביעה תתברר בבוררות בישראל על פי כללי לשכת עורכי הדין, בשפה העברית.</li>
                <li>אם לא ניתן לבוררות – סמכות שיפוט ייחודית לבתי המשפט בת"א-יפו.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">14. כוח עליון ושונות</h2>
              <p>החברה אינה אחראית לעיכובים, כשלים, תקלה טכנולוגית או שירות, או כל אירוע שאינו בשליטתה המלאה (כוח עליון: לרבות מלחמה, מגפה, אסון טבע, סייבר חריג, תקלות שרתים וכו').</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">15. הסכם מלא</h2>
              <p>התקנון מהווה את ההסכם המלא בין הצדדים וכל הסכם או תקשורת אחרת קודמת (בכתב/בע"פ) בטלים בזאת.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">16. הודעות</h2>
              <p>כל הודעה, דרישה, תקשורת משפטית – בכתב בלבד, לפי הפרטים שמוסכמים באתר החברה או כפי שנמסרו ממך.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">17. שימור/מחיקת נתונים</h2>
              <p>החברה תשמור מידע רק לפרק הזמן הדרוש למתן השירות או לפי דרישת חוק; לבקשת מחיקה – תפעל למחוק נתונים בכפוף להתחייבויות חוקיות; דאטה אנונימי כללי עשוי להישמר.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">18. ציות לחוק, מניעת אפליה, ייעוץ</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>על המשתמש לוודא עמידה בכלל חוקי ישראל, לרבות חוק הגנת הפרטיות, חוקי עבודה וחוקי מניעת אפליה.</li>
                <li>המערכת מהווה כלי עזר בלבד, אינה תחליף לייעוץ מקצועי, משפטי או ארגוני לארגון.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">19. חובות סודיות</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>המשתמש מתחייב לשמור על סודיות מידע מהמערכת ולא להעבירו לצד ג' כלשהו ללא רשות כתובה מהחברה.</li>
                <li>החברה שומרת על סודיות המידע שהועלה לה, למעט שימוש בנתונים אנונימיים למטרות בנצ'מארק.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">20. זכויות ביקורת</h2>
              <p>המשתמש רשאי לבקש בתיאום מראש לבדוק נהלי אבטחה ופרטיות של החברה, בכפוף לאמור בחוק ובדרך שלא תפגע בחברה.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">21. ט.ל.ח (טעות לעולם חוזרת)</h2>
              <p>כל טעות טכנית, קלריקלית, באג תוכנה, שגיאת ניסוח או נתון בתוצרי המערכת או במסמכים – לא תחייב את החברה והיא רשאית לתקן טעות שכזו בלוחות זמנים סבירים.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">22. הגנה מפני תביעות עובדים</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>המשתמש אחראי באורח בלעדי לכל תביעה או דרישה מצד עובדים, לקוחות או צד ג' בגין שימוש בתוצרי המערכת – לרבות משוב, הערכות, דירוגים וסימולציות – ומתחייב לשפות את החברה בגין כל נזק שיגרם בשל כך.</li>
                <li>החברה פטורה מכל אחריות לנזק או פגיעה בזכות, בפרטיות או בכבוד שנגרמה עקב שימוש בתוצרי המערכת, בין אם במישרין ובין אם בעקיפין.</li>
              </ul>
            </div>

          </div>

          {requireApproval && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-start gap-3">
                <input
                  id="approve"
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                />
                <label htmlFor="approve" className="text-sm text-neutral-700">
                  אני מאשר/ת שקראתי ואני מסכימ/ה לתנאי התקנון
                </label>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl border-r-4 bg-red-50 border-red-400 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={handleApprove}
                  disabled={!isChecked || isSubmitting}
                  className="px-5 py-2 rounded-2xl text-white bg-gradient-to-r from-glacier-primary to-glacier-accent disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
                >
                  {isSubmitting ? 'שומר...' : 'מאשר/ת'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LegalTermsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-glacier-primary/5 via-white to-glacier-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-glacier-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">טוען תקנון...</p>
        </div>
      </div>
    }>
      <LegalTermsContent />
    </Suspense>
  )
}