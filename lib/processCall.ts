/**
 * מפעיל את פונקציית Vercel Serverless שמנתחת שיחה
 * @param callId מזהה השיחה שיש לנתח
 * @returns תוצאות הפעלת הפונקציה
 */
export async function processCall(callId: string) {
  try {
    console.log('מפעיל ניתוח שיחה:', callId);
    
    const response = await fetch('/api/process-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ call_id: callId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('שגיאה בהפעלת ניתוח השיחה:', errorData);
      throw new Error(`שגיאה בהפעלת ניתוח השיחה: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error('Process call error:', err);
    throw new Error('שגיאה בתהליך ניתוח השיחה. נסה שוב מאוחר יותר.');
  }
} 