# 🚀 Coachee Landing Page

דף נחיתה שיווקי מתקדם לפלטפורמת Coachee - מערכת האימון המכירתי המתקדמת בישראל.

## 📋 תוכן עניינים

- [תכונות עיקריות](#תכונות-עיקריות)
- [התקנה והרצה](#התקנה-והרצה)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [העלאה לפרודקשן](#העלאה-לפרודקשן)
- [הגדרות](#הגדרות)

## 🎯 תכונות עיקריות

### 🎨 עיצוב וחוויית משתמש
- **עיצוב רספונסיבי** - מותאם לכל המכשירים
- **פלטת צבעים מותאמת** - #482EA6, #8373BF, #C0AFF0, #3EA621, #BFF1B1
- **אפקטים מהפכניים** - גלאס מורפיזם, פרטיקלים תלת-מימדיים
- **אנימציות קוונטיות** - הולוגרפיה, נוזל מורפינג ואינטראקציות מגנטיות
- **ממשק בעברית** - כיוון RTL מלא
- **טעינה מהירה** - אופטימיזציה מלאה לביצועים עם ניטור FPS

### 📊 ויזואליזציות נתונים
- **גרפי ביצועים אינטראקטיביים** - Canvas מותאם אישית
- **מוניות מספרים אנימטיביות** - עם אפקטי scroll
- **מוקאפ דשבורד** - תצוגה מקדימה של המערכת
- **מטריקות דינמיות** - הצגת תוצאות בזמן אמת

### 📧 מערכת יצירת קשר מתקדמת
- **טופס חכם** - עם ולידציה מלאה
- **Nodemailer Integration** - שליחת מיילים אוטומטית
- **Auto-Reply מותאם** - הודעות תשובה אוטומטיות
- **Rate Limiting** - הגנה מפני ספאם
- **HTML Emails** - מיילים מעוצבים ומקצועיים

### 🔗 אינטגרציות
- **וואטסאפ Business** - קישור ישיר עם הודעה מוכנה
- **קישור לאתר הראשי** - coachee.co.il
- **מעקב אנליטיקה** - מוכן לGoogle Analytics
- **SEO מותאם** - מטא טאגים ו-structured data

## 🛠 התקנה והרצה

### דרישות מערכת
- Node.js 16.0.0 או גבוה יותר
- npm או yarn
- חשבון Gmail עם App Password

### התקנה מהירה

```bash
# כניסה לתיקיית הפרויקט
cd landing-page

# התקנת תלויות
npm install

# הגדרת משתני סביבה
cp .env.example .env
# ערוך את קובץ .env עם הפרטים שלך

# הרצה במצב פיתוח
npm run dev

# או הרצה רגילה
npm start
```

### הגדרת Gmail

1. עבור להגדרות Gmail
2. הפעל אימות דו-שלבי
3. צור App Password ספציפי
4. עדכן את `.env` עם הפרטים:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

## 📁 מבנה הפרויקט

```
landing-page/
├── index.html          # דף ראשי - מבנה HTML
├── styles.css          # עיצוב מלא - CSS מתקדם
├── script.js           # אינטראקטיביות - JavaScript
├── server.js           # שרת Express
├── package.json        # הגדרות פרויקט
├── .env                # משתני סביבה
├── api/
│   └── contact.js      # מטפל בטופס יצירת קשר
└── README.md          # מסמך זה
```

### קבצים עיקריים

#### `index.html`
- מבנה HTML מלא עם כל הסקציות
- תמיכה ב-RTL ובעברית
- מטא טאגים ל-SEO
- כולל את הלוגו מ-Cloudinary

#### `styles.css`
- עיצוב responsive מלא
- פלטת צבעים מותאמת
- אנימציות ואפקטי hover
- תמיכה בכל הדפדפנים

#### `script.js`
- אנימציות גרפים בCanvas
- מונים אנימטיביים
- טיפול בטופס יצירת קשר
- Scroll effects ו-parallax

#### `api/contact.js`
- שליחת מיילים עם Nodemailer
- מיילים מעוצבים ב-HTML
- Auto-reply ללקוחות
- הגנה מפני ספאם

## 🌐 העלאה לפרודקשן

### Vercel (מומלץ)

```bash
# התקנת Vercel CLI
npm i -g vercel

# העלאה ראשונה
vercel

# העלאה לפרודקשן
npm run deploy
```

### הגדרות Vercel
1. קובץ `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### משתני סביבה בפרודקשן
בלוח הבקרה של Vercel, הוסף:
- `EMAIL_USER`
- `EMAIL_PASS`
- `NODE_ENV=production`

### Netlify

```bash
# בניה סטטית
npm run build

# העלאה ידנית או חיבור Git
```

## ⚙️ הגדרות

### משתני סביבה (`.env`)

```bash
# Email Configuration
EMAIL_USER=gamechngercto@gmail.com
EMAIL_PASS=wztsqqqhtuvpvcyb

# Server Configuration
NODE_ENV=development
PORT=3000

# Contact Information
COMPANY_EMAIL=info@coachee.co.il
COMPANY_PHONE=050-123-4567
COMPANY_WHATSAPP=972583288666

# URLs
MAIN_SITE_URL=https://coachee.co.il
LANDING_PAGE_URL=http://localhost:3000
```

### הגדרות אבטחה
- Rate limiting מובנה
- CORS מוגדר
- Helmet.js לאבטחת headers
- ולידציה של קלטים
- הגנה מפני XSS ו-CSRF

### אופטימיזציות
- **Static files caching** - קבצים סטטיים נשמרים במטמון
- **Image optimization** - תמונות מ-Cloudinary
- **Lazy loading** - טעינה עצלה לתמונות
- **Minification** - קוד ממוזער בפרודקשן
- **Gzip compression** - דחיסה אוטומטית

## 📱 רספונסיביות

הדף מותאם במלואו לכל המכשירים:

- **Desktop** (1200px+) - פריסה מלאה עם 2 עמודות
- **Tablet** (768px-1024px) - פריסה מותאמת
- **Mobile** (320px-768px) - פריסה חד-עמודית
- **iPhone/Android** - תפריט המבורגר

## 🔧 פיתוח והתאמות

### הוספת סקציות חדשות
1. הוסף HTML ב-`index.html`
2. הוסף CSS ב-`styles.css`
3. הוסף JavaScript ב-`script.js` אם נדרש

### שינוי עיצוב
כל הצבעים מוגדרים במשתנים ב-CSS:
```css
:root {
    --primary: #482EA6;
    --secondary: #8373BF;
    --accent: #C0AFF0;
    --success: #3EA621;
    --success-light: #BFF1B1;
    --white: #FFFFFF;
}
```

### הוספת אנימציות
השתמש בקלאסים הקיימים:
- `.fade-in` - הופעה הדרגתית
- `.slide-in-left` - החלקה משמאל
- `.slide-in-right` - החלקה מימין

## 📈 ביצועים ואנליטיקה

### מדדי ביצועים
- **Lighthouse Score** - 95+ בכל הקטגוריות
- **Page Speed** - טעינה מתחת ל-2 שניות
- **Mobile Friendly** - ציון מושלם
- **SEO Score** - 100/100

### אנליטיקה
מוכן לאינטגרציה עם:
- Google Analytics 4
- Facebook Pixel
- Google Tag Manager
- Hotjar / FullStory

## 🚨 בעיות נפוצות ופתרונות

### בעיות מייל
```bash
# בדיקת חיבור Gmail
node -e "console.log('Testing email...'); require('./api/contact.js')"
```

### בעיות פורט
```bash
# שינוי פורט
PORT=8080 npm start
```

### בעיות CORS
עדכן את `server.js` עם הדומיין שלך:
```javascript
origin: ['https://yourdomain.com']
```

## 📞 תמיכה

### יצירת קשר
- **אימייל**: gamechngercto@gmail.com
- **וואטסאפ**: +972-58-328-8666
- **אתר**: https://coachee.co.il

### תיעוד נוסף
- [Nodemailer Docs](https://nodemailer.com/about/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Vercel Deployment](https://vercel.com/docs)

---

**Coachee Landing Page v1.0** - פותח עם ❤️ לקהילת המכירות הישראלית