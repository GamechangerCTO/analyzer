/**
 * בודק את הסטטוס של שיחה
 * @param callId מזהה השיחה לבדיקה
 * @returns פרטי סטטוס השיחה
 */
export async function getCallStatus(callId: string) {
  try {
    console.log('בודק סטטוס ניתוח שיחה:', callId);
    
    const response = await fetch(`/api/call-status/${callId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('שגיאה בבדיקת סטטוס השיחה:', errorData);
      throw new Error(`שגיאה בבדיקת סטטוס השיחה: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      status: data.status,
      errorMessage: data.error,
      isComplete: data.is_completed,
      isError: data.is_error,
      isProcessing: data.is_processing,
      analyzedAt: data.analyzed_at,
      overallScore: data.overall_score,
      redFlag: data.red_flag
    };
  } catch (err: any) {
    console.error('Get call status error:', err);
    throw new Error('שגיאה בבדיקת סטטוס השיחה. נסה שוב מאוחר יותר.');
  }
} 