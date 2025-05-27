import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// הגדרת הTransporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // או ספק אימייל אחר
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

interface EmailData {
  type: string
  recipients: string[]
  data: any
}

export async function POST(request: NextRequest) {
  try {
    const { type, recipients, data }: EmailData = await request.json()

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
    }

    let subject = ''
    let htmlContent = ''

    switch (type) {
      case 'red_flag':
        subject = `🚨 דגל אדום - ${data.agent_name} זקוק לתמיכה`
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #dc2626; margin: 0;">🚨 דגל אדום</h1>
                <h2 style="color: #374151; margin: 10px 0;">נציג זקוק לתמיכה מיידית</h2>
              </div>
              
              <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #991b1b; margin-top: 0;">פרטי ההתראה:</h3>
                <ul style="color: #7f1d1d; margin: 10px 0;">
                  <li><strong>נציג:</strong> ${data.agent_name}</li>
                  <li><strong>מספר שיחות מתחת לציון 7:</strong> ${data.low_score_count}</li>
                  <li><strong>סטטוס:</strong> טרם בוצע תרגול לשיחות אלו</li>
                </ul>
              </div>

              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #1e40af; margin-top: 0;">פעולות מומלצות:</h3>
                <ul style="color: #1e3a8a;">
                  <li>שיחה אישית עם הנציג</li>
                  <li>סקירת השיחות עם ציון נמוך</li>
                  <li>קביעת תוכנית אימון מותאמת</li>
                  <li>מעקב הדוק אחר התקדמות</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/team?agent_id=${data.agent_id}" 
                   style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  צפה בפרטי הנציג במערכת
                </a>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                הודעה זו נשלחה אוטומטית ממערכת ניתוח השיחות
              </div>
            </div>
          </div>
        `
        break

      case 'daily_reminder':
        subject = `🏋️‍♂️ תזכורת יומית - חדר הכושר למכירות`
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0f9ff;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #0369a1;">🏋️‍♂️ חדר הכושר היומי</h1>
                <h2 style="color: #374151; margin: 10px 0;">זמן לתרגל ולהשתפר!</h2>
              </div>
              
              <div style="background-color: #fef3c7; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #92400e; margin-top: 0;">יש לך תרגולים ממתינים:</h3>
                <ul style="color: #78350f;">
                  <li><strong>סימולציות ממתינות:</strong> ${data.pending_simulations || 0}</li>
                  <li><strong>שיחות לתרגול:</strong> ${data.calls_to_practice || 0}</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/simulations" 
                   style="background-color: #0369a1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                   התחל תרגול עכשיו
                </a>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                תרגול יומי = שיפור מתמיד!
              </div>
            </div>
          </div>
        `
        break

      case 'achievement':
        subject = `🏆 כל הכבוד! השגת הישג חדש`
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0fdf4;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #059669;">🏆 כל הכבוד!</h1>
                <h2 style="color: #374151; margin: 10px 0;">${data.achievement_title}</h2>
              </div>
              
              <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <h3 style="color: #166534; margin-top: 0;">🪙 זכית ב-${data.coins_earned} מטבעות!</h3>
                <p style="color: #15803d; margin: 10px 0;">${data.achievement_description}</p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/simulations" 
                   style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                   המשך לתרגל
                </a>
              </div>
            </div>
          </div>
        `
        break

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    // שליחת האימייל
    const mailOptions = {
      from: `"חדר כושר למכירות" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject,
      html: htmlContent,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, message: 'Email sent successfully' })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
} 