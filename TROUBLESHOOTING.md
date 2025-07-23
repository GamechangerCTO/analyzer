# פתרון בעיות נפוצות

## 🚨 שגיאות נפוצות ופתרונות

### 1. שגיאות בהרשמה (RLS + Schema)

**הבעיות הנפוצות:**
- `new row violates row-level security policy for table companies`
- `Could not find the 'job_title' column of 'users' in the schema cache`
- `relation "subscription_plans" does not exist`

**הפתרון המהיר:**
1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. עבור ל-**SQL Editor**
4. הריץ את הקובץ `scripts/fix-database-schema.sql` (העתק והדבק את התוכן המלא)
5. לחץ "Run" להרצת הסקריפט

**מה הסקריפט עושה:**
- ✅ מוסיף עמודות חסרות לטבלת `users` (`job_title`, `phone`, `avatar_url`)
- ✅ יוצר טבלאות חסרות (`subscription_plans`, `company_subscriptions`)
- ✅ מתקן את כל ה-RLS policies לאפשר הרשמה
- ✅ מרענן את cache של הסכמה

### 2. שגיאת "You exceeded your current quota" מ-OpenAI

**הבעיה:** המערכת מנסה להשתמש ב-OpenAI API אך המכסה תמה.

**פתרונות:**
1. **זמני:** הקומפוננטה AgentSummary כבר הושבתה זמנית ✅
2. **קבוע:** שדרג את חבילת OpenAI או הוסף כרטיס אשראי
3. **בדיקה:** עבור ל-[OpenAI Usage](https://platform.openai.com/usage) לבדיקת המכסה

### 3. שגיאת "SUPABASE_SERVICE_ROLE_KEY is not configured"

**הבעיה:** חסר משתנה סביבה חיוני.

**הפתרון:**
1. העתק את קובץ `env.example` ל-`.env.local`:
   ```bash
   cp env.example .env.local
   ```
2. מלא את כל המשתנים עם הערכים הנכונים:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   ```
3. הפעל מחדש את השרת:
   ```bash
   npm run dev
   ```

### 4. איפה למצוא את המפתחות של Supabase?

1. **Supabase Keys:**
   - היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
   - בחר את הפרויקט שלך
   - עבור ל-**Settings > API**
   - העתק את:
     - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **שמור בסוד!**

2. **OpenAI Key:**
   - היכנס ל-[OpenAI Platform](https://platform.openai.com/api-keys)
   - צור מפתח חדש או השתמש בקיים
   - העתק למשתנה `OPENAI_API_KEY`

### 5. בעיות פריסה בוורסל

אם המערכת עובדת מקומית אבל לא בוורסל:

1. **בדוק משתני סביבה בוורסל:**
   - היכנס ל-[Vercel Dashboard](https://vercel.com/dashboard)
   - בחר את הפרויקט שלך
   - עבור ל-**Settings > Environment Variables**
   - וודא שכל המשתנים מ-`.env.local` מוגדרים שם

2. **פרוס מחדש:**
   ```bash
   vercel --prod
   ```

### 6. אזהרות Next.js (viewport warnings)

**הבעיה:** אזהרות על `Unsupported metadata viewport`

**הפתרון:** אלה אזהרות בלבד ולא משפיעות על הפונקציונליות. ניתן להתעלם מהן.

## 🔧 פקודות שימושיות לפתרון בעיות

### בדיקת חיבור למסד נתונים:
```bash
npm run test:db
```

### רענון כל התלויות:
```bash
rm -rf node_modules package-lock.json
npm install
```

### בדיקת שגיאות TypeScript:
```bash
npx tsc --noEmit
```

### בדיקת שגיאות ESLint:
```bash
npm run lint
```

### הפעלה מחדש של השרת:
```bash
# הפסק את השרת (Ctrl+C)
npm run dev
```

## 📋 סדר פעולות מומלץ לתיקון בעיות

1. **תחילה** - הרץ את `scripts/fix-database-schema.sql` ב-Supabase
2. **שנייה** - וודא שכל משתני הסביבה מוגדרים ב-`.env.local`
3. **שלישית** - הפעל מחדש את השרת המקומי
4. **רביעית** - נסה להירשם שוב

## 📞 תמיכה

אם הבעיות נמשכות:
1. בדוק את הקובץ `DEPLOYMENT.md` להוראות מפורטות
2. בדוק את logs בוורסל Dashboard
3. פתח issue ב-GitHub עם פרטי השגיאה המלאים

## ✅ בדיקה שהכל עובד

לאחר ביצוע התיקונים:
1. ✅ נסה להירשם למשתמש חדש
2. ✅ בדוק שניתן להעלות שיחה
3. ✅ וודא שהדשבורד נטען בלי שגיאות
4. ✅ בדוק את ה-Network tab בדפדפן לשגיאות API

## 🎯 סקריפטים זמינים לתיקון

| קובץ | מטרה | מתי להשתמש |
|------|------|------------|
| `fix-database-schema.sql` | תיקון מקיף של כל הטבלאות + RLS | **מומלץ ראשון** - לכל בעיות הרשמה |
| `fix-signup-rls.sql` | תיקון RLS בלבד | אם רק RLS לא עובד |
| `fix-rls-quotas.sql` | תיקון מכסות דקות | בעיות במכסות בלבד | 