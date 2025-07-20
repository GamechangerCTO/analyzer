const nodemailer = require('nodemailer');

// Configure nodemailer transporter
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'gamechngercto@gmail.com',
        pass: 'wztsqqqhtuvpvcyb'
    }
});

// Contact form handler
async function handleContactForm(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { name, email, phone, company, teamSize, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !company || !teamSize) {
            res.status(400).json({ error: 'חסרים שדות חובה' });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ error: 'כתובת אימייל לא תקינה' });
            return;
        }

        // Create HTML email content
        const htmlContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="he">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>פנייה חדשה מדף הנחיתה</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        direction: rtl;
                    }
                    .header {
                        background: linear-gradient(135deg, #482EA6, #8373BF);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .content {
                        background: #f8f9fa;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                        border: 1px solid #e9ecef;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 25px;
                    }
                    .info-item {
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        border-right: 4px solid #482EA6;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #482EA6;
                        margin-bottom: 5px;
                    }
                    .info-value {
                        color: #333;
                        font-size: 16px;
                    }
                    .message-section {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        border-right: 4px solid #3EA621;
                        margin-top: 20px;
                    }
                    .message-label {
                        font-weight: bold;
                        color: #3EA621;
                        margin-bottom: 10px;
                    }
                    .message-content {
                        color: #333;
                        line-height: 1.6;
                        white-space: pre-wrap;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        padding: 15px;
                        color: #666;
                        font-size: 14px;
                    }
                    .urgency-badge {
                        display: inline-block;
                        background: #dc3545;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: bold;
                        margin-bottom: 15px;
                    }
                    @media (max-width: 600px) {
                        .info-grid {
                            grid-template-columns: 1fr;
                        }
                        body {
                            padding: 10px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚀 פנייה חדשה מדף הנחיתה</h1>
                    <p>לקוח פוטנציאלי מעוניין ב-Coachee</p>
                </div>
                
                <div class="content">
                    <div class="urgency-badge">דחוף - פנייה חמה</div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">שם מלא</div>
                            <div class="info-value">${name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">אימייל</div>
                            <div class="info-value">${email}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">טלפון</div>
                            <div class="info-value">${phone}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">שם החברה</div>
                            <div class="info-value">${company}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">גודל הצוות</div>
                            <div class="info-value">${teamSize}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">תאריך פנייה</div>
                            <div class="info-value">${new Date().toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</div>
                        </div>
                    </div>
                    
                    ${message ? `
                    <div class="message-section">
                        <div class="message-label">הודעת הלקוח:</div>
                        <div class="message-content">${message}</div>
                    </div>
                    ` : ''}
                    
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px; border-right: 4px solid #007bff;">
                        <strong>פעולות מומלצות:</strong>
                        <ul style="margin: 10px 0; padding-right: 20px;">
                            <li>התקשר תוך שעה (שעות עבודה)</li>
                            <li>שלח אימייל אישי עם מידע נוסף</li>
                            <li>הזמן לדמו אישי</li>
                            <li>הכן הצעת מחיר מותאמת</li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    <p>הודעה זו נשלחה אוטומטית מדף הנחיתה של Coachee<br>
                    לפרטים נוספים: <a href="https://coachee.co.il">coachee.co.il</a></p>
                </div>
            </body>
            </html>
        `;

        // Create plain text version
        const textContent = `
פנייה חדשה מדף הנחיתה - Coachee

פרטי הלקוח:
================
שם: ${name}
אימייל: ${email}
טלפון: ${phone}
חברה: ${company}
גודל צוות: ${teamSize}
תאריך פנייה: ${new Date().toLocaleDateString('he-IL')}

${message ? `הודעה:\n${message}\n` : ''}

פעולות מומלצות:
- התקשר תוך שעה
- שלח אימייל אישי
- הזמן לדמו
- הכן הצעת מחיר

---
הודעה אוטומטית מ-Coachee
        `;

        // Email options
        const mailOptions = {
            from: 'gamechngercto@gmail.com',
            to: 'gamechngercto@gmail.com', // Send to yourself
            subject: `🚀 פנייה חדשה: ${company} (${teamSize}) - ${name}`,
            text: textContent,
            html: htmlContent,
            replyTo: email
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // Send auto-reply to customer
        const autoReplyOptions = {
            from: 'gamechngercto@gmail.com',
            to: email,
            subject: 'תודה על פנייתך ל-Coachee - נחזור אליך בקרוב!',
            html: `
                <!DOCTYPE html>
                <html dir="rtl" lang="he">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>תודה על פנייתך</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            direction: rtl;
                        }
                        .header {
                            background: linear-gradient(135deg, #482EA6, #8373BF);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: #f8f9fa;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                            border: 1px solid #e9ecef;
                        }
                        .highlight-box {
                            background: #e7f3ff;
                            padding: 20px;
                            border-radius: 8px;
                            border-right: 4px solid #007bff;
                            margin: 20px 0;
                        }
                        .cta-button {
                            display: inline-block;
                            background: linear-gradient(135deg, #482EA6, #8373BF);
                            color: white;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                            margin: 10px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>תודה ${name}!</h1>
                        <p>קיבלנו את פנייתך ונחזור אליך בהקדם</p>
                    </div>
                    
                    <div class="content">
                        <h2>מה קורה עכשיו?</h2>
                        
                        <div class="highlight-box">
                            <h3>⏰ תוך שעה</h3>
                            <p>נציג מכירות יתקשר אליך לקביעת פגישת היכרות</p>
                        </div>
                        
                        <div class="highlight-box">
                            <h3>📧 תוך 24 שעות</h3>
                            <p>תקבל מידע מפורט על המערכת ותוכניות המחירים</p>
                        </div>
                        
                        <div class="highlight-box">
                            <h3>🎯 דמו אישי</h3>
                            <p>נציג לך דמו מותאם לצרכי החברה שלך</p>
                        </div>
                        
                        <p>בינתיים, הנה כמה קישורים שעשויים לעניין אותך:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coachee.co.il" class="cta-button">כניסה למערכת</a>
                            <br><br>
                            <a href="https://wa.me/972501234567" class="cta-button">דבר איתנו בוואטסאפ</a>
                        </div>
                        
                        <p><strong>יש שאלות?</strong><br>
                        צור קשר: info@coachee.co.il<br>
                        טלפון: 050-123-4567</p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p style="font-size: 14px; color: #666;">
                            <strong>Coachee</strong> - פלטפורמת האימון המכירתי המתקדמת<br>
                            המערכת הראשונה בישראל לניתוח שיחות מכירה באמצעות AI
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
שלום ${name},

תודה על פנייתך ל-Coachee!

קיבלנו את הפרטים שלך ונחזור אליך בקרוב:
• תוך שעה - נציג מכירות יתקשר אליך
• תוך 24 שעות - תקבל מידע מפורט על המערכת
• דמו אישי - נציג לך את המערכת בפעולה

קישורים שימושיים:
🌐 כניסה למערכת: https://coachee.co.il
💬 וואטסאפ: https://wa.me/972501234567

יש שאלות? info@coachee.co.il

תודה,
צוות Coachee
            `
        };

        await transporter.sendMail(autoReplyOptions);

        // Success response
        res.status(200).json({ 
            success: true, 
            message: 'הודעתך נשלחה בהצלחה! נחזור אליך בקרוב.' 
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ 
            error: 'אירעה שגיאה בשליחת הטופס. אנא נסה שוב.' 
        });
    }
}

module.exports = handleContactForm;