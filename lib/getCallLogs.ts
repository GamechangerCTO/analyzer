/**
 * מחזיר לוגים של שיחה לפי מזהה השיחה
 * @param callId מזהה השיחה
 * @returns לוגים של השיחה
 */
export async function getCallLogs(callId: string) {
  try {
    console.log('מבקש לוגים של שיחה:', callId);
    
    const response = await fetch(`/api/call-logs/${callId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('שגיאה בקבלת לוגים של השיחה:', errorData);
      throw new Error(`שגיאה בקבלת לוגים של השיחה: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error('Get call logs error:', err);
    return { callId, logs: [], count: 0, error: err.message };
  }
} 