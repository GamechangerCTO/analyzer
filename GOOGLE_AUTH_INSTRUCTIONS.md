# הגדרת Google OAuth ב-Supabase

## שלב 1: הגדרת Google Cloud Console

1. **עבור אל Google Cloud Console:**
   - לך ל-[Google Cloud Console](https://console.cloud.google.com/)
   - צור פרויקט חדש או בחר פרויקט קיים

2. **הפעל Google+ API:**
   - עבור ל-APIs & Services > Library
   - חפש "Google+ API" והפעל אותו

3. **יצירת OAuth 2.0 credentials:**
   - עבור ל-APIs & Services > Credentials
   - לחץ על "Create Credentials" > "OAuth 2.0 Client IDs"
   - בחר Application type: "Web application"
   - הוסף Authorized redirect URIs:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
   - שמור את Client ID ו-Client Secret

## שלב 2: הגדרת Supabase

1. **עבור אל Supabase Dashboard:**
   - לך לפרויקט שלך ב-[Supabase](https://supabase.com/dashboard)
   - עבור ל-Authentication > Providers

2. **הגדרת Google Provider:**
   - הפעל את Google provider
   - הכנס את Client ID ו-Client Secret מ-Google Cloud Console
   - בחלק Redirect URLs, וודא שיש:
     ```
     https://your-domain.vercel.app/api/auth/callback
     http://localhost:3000/api/auth/callback (לפיתוח)
     ```

## שלב 3: הגדרת משתני סביבה (אופציונלי)

אם אתה רוצה להוסיף משתני סביבה לGoogle OAuth:

```env
# הוסף לקובץ .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## שלב 4: בדיקת התקנה

1. **ריצת הפרויקט:**
   ```bash
   npm run dev
   ```

2. **בדיקת Google OAuth:**
   - עבור לדף הלוגין
   - לחץ על "התחבר עם Google"
   - וודא שאתה מועבר ל-Google Auth
   - אחרי האישור, אתה אמור להיות מועבר בחזרה לפלטפורמה

## פתרון בעיות נפוצות

### בעיה: חזרה למסך לוגין
**פתרון:** וודא ש:
- Redirect URLs נכונים ב-Google Cloud Console
- Google Provider מופעל ב-Supabase
- הוגדר Client ID ו-Client Secret

### בעיה: CORS Error
**פתרון:** הוסף את הדומיין שלך ל-Authorized origins ב-Google Cloud Console

### בעיה: Invalid Client
**פתרון:** וודא שה-Client ID תואם בין Google Cloud Console ל-Supabase

## הערות נוספות

- Google OAuth יוצר חשבון אוטומטית אם המשתמש לא קיים
- הסיסטם מזהה אוטומטית Super Admin לפי כתובת המייל
- משתמשים רגילים חדשים דורשים אישור מאדמין
- ההגדרה שונה לפיתוח ולפרודקשן 