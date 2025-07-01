# חדר כושר למכירות

פלטפורמת אימון דיגיטלית המיועדת לשפר ביצועים עסקיים (מכירות ושירות). הפלטפורמה משמשת כ"חדר כושר" יומי לשיפור מיומנויות מכירה ושירות באמצעות כלים אנליטיים ותרגולים מותאמים אישית.

## טכנולוגיות

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenAI Whisper API, GPT-4.1 Turbo, GPT-4o

## הוראות התקנה מקומית

### דרישות מקדימות

- Node.js גרסה 18 ומעלה
- חשבון Supabase
- חשבון OpenAI (לשלבים מתקדמים)

### שלבי התקנה

1. שכפל את הפרויקט:
   ```bash
   git clone https://github.com/GamechangerCTO/analyzer.git
   cd analyzer
   ```

2. התקן את התלויות:
   ```bash
   npm install
   ```

3. צור פרויקט חדש ב-Supabase והגדר את בסיס הנתונים:
   - צור את הטבלאות `companies`, `users` ו-`calls` לפי הסכמה המתוארת ב-`systemPatterns.md`
   - הגדר הרשאות RLS לפי הצורך

4. צור קובץ `.env.local` ומלא את הפרטים הבאים:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   OPENAI_API_KEY=<your-openai-api-key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. הגדר אותנטיקציה עם Google ב-Supabase:
   - הגדר ב-Supabase Dashboard את ה-Google OAuth Provider
   - צור קליינט חדש ב-Google Cloud Platform
   - הגדר את ה-Client ID וה-Client Secret ב-Supabase

6. הפעל את הפרויקט:
   ```bash
   npm run dev
   ```

## פריסה בוורסל

### בדיקת מוכנות לפריסה
```bash
npm run deploy-check
```

### הוראות פריסה מפורטות
ראה קובץ **[DEPLOYMENT.md](./DEPLOYMENT.md)** להוראות פריסה מלאות בוורסל.

### העלאה לגיטהאב
לאחר שכבר יש לך Personal Access Token מ-GitHub:

```bash
chmod +x scripts/github-push.sh
./scripts/github-push.sh YOUR_PERSONAL_ACCESS_TOKEN
```

**ליצירת Personal Access Token:**
1. היכנס ל: https://github.com/settings/tokens
2. לחץ "Generate new token (classic)"
3. בחר הרשאות: `repo`, `workflow`, `write:packages`
4. העתק את הטוקן והשתמש בסקריפט למעלה

## מבנה הפרויקט

- `/app` - עמודי האפליקציה ב-Next.js App Router
- `/components` - קומפוננטות React לשימוש חוזר
- `/lib` - לוגיקה עסקית והתממשקות ל-API
- `/types` - הגדרות טיפוסי TypeScript
- `/scripts` - סקריפטים לפריסה ובדיקות
- `/memory-bank` - תיעוד ומפרטים מפורטים של המערכת

## סקריפטים זמינים

```bash
# פיתוח
npm run dev                 # הפעלת שרת פיתוח
npm run build              # בנייה לייצור
npm run start              # הפעלת שרת ייצור

# בדיקות
npm run lint               # בדיקת קוד
npm run type-check         # בדיקת TypeScript
npm run deploy-check       # בדיקת מוכנות לפריסה

# פריסה
./scripts/github-push.sh   # העלאה לגיטהאב
```

## תכונות עיקריות

### 🎯 ניתוח שיחות מתקדם
- תמלול אוטומטי עם Whisper
- ניתוח טונציה ורגשות עם GPT-4o  
- ניתוח תוכן מקצועי עם GPT-4 Turbo
- זיהוי דגלים אדומים

### 👥 ניהול משתמשים
- היררכיית תפקידים (Admin → Manager → Agent)
- ניהול חברות ונציגים
- פרופילים אישיים עם אווטרים

### 📊 דשבורדים אנליטיים
- תצוגות מותאמות לכל תפקיד
- גרפים וסטטיסטיקות
- מעקב אחר התקדמות

### 🔐 אבטחה
- אימות עם Supabase Auth
- Row Level Security (RLS)
- הרשאות מבוססות תפקיד

## תמיכה

לתמיכה טכנית ושאלות, פנה אל:
- 📧 gamechangercto@gmail.com
- 📖 תיעוד מפורט: `memory-bank/`
- 🚀 הוראות פריסה: `DEPLOYMENT.md` 