#!/bin/bash

# סקריפט בדיקת מוכנות לפריסה
echo "🚀 בודק מוכנות לפריסה בוורסל..."

# בדיקת קיום הקבצים הנדרשים
echo "📁 בודק קיום קבצים חיוניים..."

if [ ! -f "vercel.json" ]; then
    echo "❌ קובץ vercel.json חסר!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ קובץ package.json חסר!"
    exit 1
fi

if [ ! -f "env.example" ]; then
    echo "❌ קובץ env.example חסר!"
    exit 1
fi

echo "✅ כל הקבצים החיוניים קיימים"

# בדיקת תלויות
echo "📦 בודק תלויות..."
npm list --depth=0 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ יש בעיות בתלויות. הרץ: npm install"
    exit 1
fi
echo "✅ התלויות תקינות"

# בדיקת קומפילציה
echo "🔨 בודק קומפילציה..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ שגיאת קומפילציה! הרץ: npm run build לפרטים"
    exit 1
fi
echo "✅ הקומפילציה הצליחה"

# בדיקת TypeScript
echo "📝 בודק TypeScript..."
npx tsc --noEmit > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  יש בעיות TypeScript (לא חובה לפריסה)"
else
    echo "✅ TypeScript תקין"
fi

# בדיקת משתני סביבה בקובץ .env.local
echo "🔐 בודק משתני סביבה..."
if [ -f ".env.local" ]; then
    required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "OPENAI_API_KEY")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env.local; then
            echo "⚠️  משתנה $var חסר ב-.env.local"
        fi
    done
    echo "✅ משתני סביבה נבדקו (וודא שהם מוגדרים בוורסל)"
else
    echo "⚠️  קובץ .env.local לא קיים (נדרש רק לפיתוח מקומי)"
fi

echo ""
echo "🎉 הבדיקה הושלמה!"
echo "📋 רשימת בדיקות לפני פריסה:"
echo "   1. ✅ קבצים חיוניים קיימים"
echo "   2. ✅ תלויות תקינות"
echo "   3. ✅ קומפילציה מצליחה"
echo "   4. ✅ קובץ vercel.json מוגדר"
echo ""
echo "🚀 המערכת מוכנה לפריסה בוורסל!"
echo "📖 עיין ב-DEPLOYMENT.md להוראות מפורטות" 