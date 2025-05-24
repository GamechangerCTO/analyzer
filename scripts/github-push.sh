#!/bin/bash

echo "🚀 העלאה לגיטהאב עם Personal Access Token"
echo "============================================="

# בדיקה שהפרמטר של הטוקן הועבר
if [ -z "$1" ]; then
    echo "❌ שגיאה: חסר Personal Access Token"
    echo ""
    echo "שימוש:"
    echo "  ./scripts/github-push.sh YOUR_PERSONAL_ACCESS_TOKEN"
    echo ""
    echo "ליצירת Personal Access Token:"
    echo "1. היכנס ל: https://github.com/settings/tokens"
    echo "2. לחץ 'Generate new token (classic)'"
    echo "3. בחר הרשאות: repo, workflow, write:packages"
    echo "4. העתק את הטוקן והרץ:"
    echo "   ./scripts/github-push.sh YOUR_TOKEN_HERE"
    exit 1
fi

TOKEN=$1

echo "📋 מידע על הרפוזיטורי:"
echo "   Remote: $(git remote get-url origin)"
echo "   Branch: $(git branch --show-current)"
echo ""

# בדיקה שיש changes לעשות push להם
if git diff --cached --quiet && git diff HEAD --quiet; then
    echo "⚠️  אין שינויים חדשים לעשות push להם"
    echo "כל השינויים כבר עודכנו ב-GitHub"
    exit 0
fi

echo "📤 מעלה לגיטהאב..."

# שינוי זמני של ה-remote כדי לכלול את הטוקן
ORIGINAL_URL=$(git remote get-url origin)
GITHUB_URL="https://gamechangercto:${TOKEN}@github.com/GamechangerCTO/analyzer.git"

# עדכון זמני של ה-remote
git remote set-url origin $GITHUB_URL

# ביצוע push
if git push -u origin main; then
    echo "✅ הקוד הועלה בהצלחה לגיטהאב!"
    echo "🔗 כתובת הרפוזיטורי: https://github.com/GamechangerCTO/analyzer"
    echo ""
    echo "📋 השלבים הבאים:"
    echo "1. 🔗 חבר את הרפוזיטורי לוורסל"
    echo "2. ⚙️  הגדר משתני סביבה (ראה DEPLOYMENT.md)"
    echo "3. 🚀 בצע פריסה ראשונה"
else
    echo "❌ שגיאה בהעלאה לגיטהאב"
    echo "בדוק שהטוקן תקין ושיש לך הרשאות לרפוזיטורי"
fi

# החזרת ה-remote למצב המקורי (ללא טוקן)
git remote set-url origin $ORIGINAL_URL

echo ""
echo "🔒 הטוקן הוסר מההגדרות המקומיות מטעמי אבטחה" 