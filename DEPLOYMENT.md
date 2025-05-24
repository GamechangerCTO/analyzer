# מדריך פריסה בוורסל - פלטפורמת חדר כושר למכירות

## שלב 1: הכנת הפרויקט לפריסה

### 1.1 וידוא שהפרויקט פועל מקומית
```bash
npm install
npm run build
npm run start
```

### 1.2 בדיקת הקבצים הנדרשים
- ✅ `vercel.json` - הוגדר עם כל ההגדרות הנדרשות
- ✅ `package.json` - מכיל את כל הסקריפטים הנדרשים
- ✅ `env.example` - מדריך למשתני הסביבה

## שלב 2: הגדרת פרויקט בוורסל

### 2.1 התקנת Vercel CLI (אופציונלי)
```bash
npm install -g vercel
```

### 2.2 יצירת חשבון והתחברות
1. היכנס ל-[vercel.com](https://vercel.com)
2. התחבר עם GitHub/GitLab/Bitbucket
3. חבר את הרפוזיטורי של הפרויקט

### 2.3 הגדרת הפרויקט
1. לחץ על "Add New..." → "Project"
2. בחר את הרפוזיטורי של הפרויקט
3. Vercel יזהה אוטומטית שזה פרויקט Next.js

## שלב 3: הגדרת משתני סביבה

ב-Vercel Dashboard → Settings → Environment Variables, הוסף את המשתנים הבאים:

### 3.1 משתני Supabase (חובה)
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY = eyJ...your-service-role-key
```

### 3.2 משתני OpenAI (חובה)
```
OPENAI_API_KEY = sk-...your-openai-api-key
```

### 3.3 משתני אתר (חובה)
```
NEXT_PUBLIC_SITE_URL = https://your-domain.vercel.app
```

**חשוב:** שים את המשתנים בכל הסביבות (Production, Preview, Development)

## שלב 4: הגדרות Supabase לפריסה

### 4.1 עדכון Auth Settings ב-Supabase
1. היכנס ל-Supabase Dashboard
2. עבור ל-Authentication → Settings → URL Configuration
3. הוסף את כתובת הוורסל שלך ל:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/auth/callback`

### 4.2 עדכון CORS Settings
ב-Supabase Dashboard → Settings → API:
- הוסף את הדומיין של וורסל ל-CORS origins

### 4.3 וידוא Edge Functions (אם יש)
1. ודא שכל ה-Edge Functions נפרסו ב-Supabase
2. בדוק שהן מקבלות את משתני הסביבה הנכונים

## שלב 5: פריסה ראשונה

### 5.1 פריסה אוטומטית
לאחר חיבור הרפוזיטורי, Vercel יפרוס אוטומטיות כל commit ל-main/master

### 5.2 פריסה ידנית (עם CLI)
```bash
vercel
```

## שלב 6: בדיקות לאחר הפריסה

### 6.1 בדיקות בסיסיות
- ✅ האתר נטען ללא שגיאות
- ✅ התחברות עובדת (Google OAuth)
- ✅ דשבורד נטען עם נתונים
- ✅ העלאת שיחות פועלת

### 6.2 בדיקות מתקדמות
- ✅ ניתוח שיחות עובד (OpenAI API)
- ✅ התמונות והקבצים נטענים (Supabase Storage)
- ✅ הודעות שגיאה מוצגות נכון
- ✅ ממשק נטען נכון על נייד וטאבלט

## שלב 7: הגדרות נוספות

### 7.1 דומיין מותאם (אופציונלי)
1. רכוש דומיין
2. הוסף אותו ב-Vercel Dashboard → Settings → Domains
3. עדכן DNS records לפי הוראות Vercel

### 7.2 Analytics
הפעל Vercel Analytics ב-Dashboard לקבלת סטטיסטיקות

### 7.3 Performance Monitoring
הגדר Speed Insights לניטור ביצועים

## שגיאות נפוצות ופתרונות

### שגיאת Build
```
Error: Failed to compile
```
**פתרון:** ודא שכל התלויות מותקנות ואין שגיאות TypeScript

### שגיאת Environment Variables
```
Error: Missing environment variable
```
**פתרון:** ודא שכל המשתנים מוגדרים בוורסל בכל הסביבות

### שגיאת Supabase Connection
```
Error: Invalid API key
```
**פתרון:** ודא שהמשתנים נכונים ושה-CORS מוגדר

### שגיאת OpenAI API
```
Error: 401 Unauthorized
```
**פתרון:** ודא שמפתח OpenAI תקין ויש לך יתרה בחשבון

## מידע חשוב לתחזוקה

### גיבויים
- הנתונים ב-Supabase מגובים אוטומטית
- הקוד מגובה ב-Git repository

### עדכונים
- עדכונים נפרסים אוטומטית מ-Git
- ניתן לבצע rollback דרך Vercel Dashboard

### ניטור
- עקוב אחר לוגים ב-Vercel Dashboard → Functions
- בדוק ביצועים ב-Speed Insights
- עקוב אחר שימוש ב-Analytics

## צור קשר לתמיכה
במקרה של בעיות, ודא שיש לך גישה ל:
- Vercel Dashboard
- Supabase Dashboard  
- OpenAI Dashboard
- GitHub/Git repository 