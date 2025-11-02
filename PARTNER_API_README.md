# Partner API - Setup & Usage Guide

## 🎯 מה זה Partner API?

Partner API מאפשר לשותפים עסקיים לשלב את מערכת הניתוח שלנו בתוך המערכות שלהם (לדוגמה, מערכות call center) ללא צורך בממשק משתמש.

## 🏗️ מבנה המערכת

Partner API מבודד לחלוטין מהמערכת הקיימת:
- נתיבים נפרדים: `/api/partner/v1/*`
- טבלאות DB חדשות בלבד
- אימות נפרד (API Keys במקום JWT)
- לא משפיע על המשתמשים הרגילים

## 🚀 Setup

### 1. הרצת Migration

```bash
# הרצת המיגרציה ליצירת טבלאות Partner API
cd supabase
supabase migration up
```

המיגרציה תיצור 4 טבלאות:
- `partner_api_keys` - מפתחות API
- `async_jobs` - משימות אסינכרוניות
- `webhook_logs` - לוגים של webhooks
- `partner_api_requests` - לוגים של כל הקריאות

### 2. הגדרת משתני סביבה

הוסף ל-`.env.local`:

```env
# הפעלת Partner API
PARTNER_API_ENABLED=true

# סוד לחתימת webhooks
WEBHOOK_SECRET=your-secure-random-string-here
```

**חשוב:** שנה את `WEBHOOK_SECRET` לערך אקראי ומאובטח בproduction!

### 3. בניית הפרויקט

```bash
npm run build
```

ודא שאין שגיאות TypeScript.

## 🔑 יצירת API Key לשותף

### דרך הממשק (מומלץ)

1. התחבר כ-`super_admin`
2. עבור ל: `/dashboard/admin/partner-api`
3. מלא את הטופס:
   - **שם השותף**: לדוגמה "CompanyX Call Center"
   - **סביבה**: `sandbox` לבדיקות, `production` לשימוש אמיתי
   - **תוקף**: מספר ימים (ברירת מחדל: 365)
4. לחץ "צור מפתח חדש"
5. **⚠️ חשוב:** העתק את ה-`api_key` וה-`api_secret` - הם מוצגים פעם אחת בלבד!

### דרך ה-DB (אלטרנטיבה)

```sql
SELECT * FROM generate_partner_api_key(
  'CompanyX Call Center',  -- partner_name
  'sandbox',               -- environment
  NULL,                    -- company_id (optional)
  365                      -- expires_in_days
);
```

## 📡 שימוש ב-API

### Health Check

```bash
curl -X GET https://yourdomain.com/api/partner/v1/health \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..."
```

### יצירת חברה

```bash
curl -X POST https://yourdomain.com/api/partner/v1/companies/create \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "industry": "retail",
    "contact_email": "admin@testcompany.com"
  }'
```

### גילוי חברות קיימות

📍 **חשוב:** לפני יצירת אג'נטים או ניתוח שיחות, השותף צריך לדעת מה ה-Company IDs!

```bash
curl -X GET "https://yourdomain.com/api/partner/v1/companies?limit=50&offset=0" \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..."
```

תגובה:
```json
{
  "companies": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Company",
      "industry": "retail",
      "created_at": "2024-12-15T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Another Company",
      "industry": "tech",
      "created_at": "2024-12-14T09:30:00Z"
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0,
  "partner_access": "all_companies",
  "message": "This API key has access to all companies"
}
```

**Query Parameters:**
- `limit` (אופציונלי): מספר מקסימלי של חברות להחזיר (ברירת מחדל: 50)
- `offset` (אופציונלי): כמה חברות לדלג (לpagination, ברירת מחדל: 0)
- `search` (אופציונלי): חיפוש לפי שם חברה או תעשייה

**שימושים נפוצים:**
```bash
# חיפוש חברה לפי שם
curl -X GET "https://yourdomain.com/api/partner/v1/companies?search=retail" \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..."

# Pagination - עמוד 2
curl -X GET "https://yourdomain.com/api/partner/v1/companies?limit=10&offset=10" \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..."
```

**הערות:**
- אם ה-API Key קשור לחברה ספציפית, תקבל רק את החברה הזאת
- אם ה-API Key לא מוגבל, תקבל גישה לכל החברות במערכת
- השתמש ב-`company_id` שמתקבל כדי ליצור אג'נטים או לנתח שיחות

### יצירת אג'נט

```bash
curl -X POST https://yourdomain.com/api/partner/v1/companies/{company_id}/agents/create \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@testcompany.com",
    "name": "John Doe",
    "role": "agent"
  }'
```

### ניתוח שיחה

```bash
curl -X POST https://yourdomain.com/api/partner/v1/calls/analyze \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..." \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique-request-id-123" \
  -d '{
    "audio_file": "base64_encoded_audio_or_url",
    "company_id": "company-uuid",
    "agent_id": "agent-uuid",
    "call_type": "sales_call",
    "webhook_url": "https://partner.com/webhook/callback"
  }'
```

תגובה:
```json
{
  "job_id": "job-uuid",
  "status": "queued",
  "estimated_time": "2-3 minutes",
  "message": "Analysis job created successfully"
}
```

### בדיקת סטטוס (Polling)

```bash
curl -X GET https://yourdomain.com/api/partner/v1/jobs/{job_id}/status \
  -H "Authorization: Bearer pk_sandbox_..." \
  -H "X-API-Secret: sk_..."
```

### Webhook Callback

כאשר הניתוח מסתיים, המערכת תשלח POST ל-`webhook_url`:

```json
{
  "job_id": "job-uuid",
  "job_type": "call_analysis",
  "status": "completed",
  "timestamp": "2024-12-15T10:30:00Z",
  "call_id": "call-uuid",
  "results": {
    "transcript": "...",
    "tone_analysis": {...},
    "content_analysis": {...},
    "overall_score": 8.5
  }
}
```

Headers שיכללו:
- `X-Partner-Signature`: HMAC-SHA256 signature לאימות
- `X-Webhook-Attempt`: מספר ניסיון (1, 2, 3)
- `X-Webhook-ID`: job_id

## 🔒 אבטחה

### אימות Webhook

השותף צריך לאמת שהwebhook באמת הגיע מהמערכת שלכם:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// בendpoint של הwebhook:
app.post('/webhook/callback', (req, res) => {
  const signature = req.headers['x-partner-signature'];
  const payload = req.body;
  
  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // עיבוד הנתונים...
  res.status(200).send('OK');
});
```

### Rate Limiting

כל API key מוגבל ל-1000 requests לדקה (ברירת מחדל). ניתן לשנות בממשק הניהול.

### IP Whitelist

ניתן להגביל API key לרשימת IP addresses ספציפית.

## 📊 ניטור ולוגים

### צפייה בלוגים

כל קריאת API נרשמת בטבלת `partner_api_requests`:

```sql
SELECT 
  endpoint, 
  method, 
  response_status, 
  response_time_ms,
  created_at
FROM partner_api_requests
WHERE partner_api_key_id = 'key-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

### Webhook Logs

```sql
SELECT 
  webhook_url,
  http_status,
  attempt_number,
  success,
  error_message,
  created_at
FROM webhook_logs
WHERE async_job_id = 'job-uuid'
ORDER BY created_at DESC;
```

### Usage Statistics

```sql
SELECT * FROM get_partner_api_usage(
  'key-uuid',                    -- partner_api_key_id
  NOW() - INTERVAL '30 days',    -- from_date
  NOW()                          -- to_date
);
```

## 🔧 Maintenance

### Cleanup ישן

```sql
-- מחיקת לוגים ישנים מעל 90 יום
SELECT * FROM cleanup_partner_api_logs(90);
```

### Retry Webhooks שנכשלו

```javascript
// בcron job או scheduled task:
const { retryAllFailedWebhooks } = require('./lib/webhook-caller');

async function retryFailedWebhooks() {
  const result = await retryAllFailedWebhooks();
  console.log(`Retried ${result.total} webhooks: ${result.successful} successful, ${result.failed} failed`);
}
```

## 🐛 Troubleshooting

### Partner API לא עובד

1. ודא ש-`PARTNER_API_ENABLED=true` ב-`.env.local`
2. ודא שהמיגרציה רצה בהצלחה
3. בדוק logs של השרת

### Webhook לא מגיע

1. בדוק ב-`webhook_logs` אם היו ניסיונות
2. ודא שה-URL של הwebhook נגיש מהאינטרנט
3. ודא timeout מספיק גבוה (30 שניות)

### API Key לא עובד

1. בדוק שהמפתח `is_active = true`
2. בדוק שהמפתח לא פג תוקפו (`expires_at`)
3. בדוק שה-IP בwhitelist (אם הוגדר)

## 📚 דוגמאות נוספות

ראה את הקבצים:
- `/docs/partner-api-postman-collection.json` - Postman collection מלא
- `/docs/partner-api-examples/` - דוגמאות קוד ב-Node.js, Python, PHP, cURL

## 🆘 תמיכה

בעיות? פנה ל-api-support@yourdomain.com

