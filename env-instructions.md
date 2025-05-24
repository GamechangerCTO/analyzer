# הוראות להגדרת מפתח OpenAI API

כדי לפתור את שגיאת ה-401 (Unauthorized) בעת ניתוח שיחות, עליך לוודא שמפתח ה-API של OpenAI מוגדר כראוי במערכת.

## אפשרות 1: הגדרת קובץ .env.local

1. צור קובץ בשם `.env.local` בתיקיית השורש של הפרויקט
2. הוסף את השורה הבאה (עם המפתח האמיתי שלך):
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
3. הפעל מחדש את השרת המקומי אם הוא פועל

## אפשרות 2: הגדרת משתנה סביבה בטרמינל

הגדר את המפתח ישירות בטרמינל לפני הפעלת האפליקציה:

```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
npm run dev
```

## אפשרות 3: הגדרת משתנה סביבה ב-Vercel

אם האפליקציה מאוחסנת ב-Vercel:

1. היכנס לפרויקט ב-Vercel Dashboard
2. עבור ל-Settings -> Environment Variables
3. הוסף את המשתנה `OPENAI_API_KEY` עם המפתח שלך
4. בצע פריסה מחדש של האפליקציה 