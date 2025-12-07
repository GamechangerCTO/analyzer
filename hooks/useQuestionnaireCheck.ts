'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface QuestionnaireStatus {
  isLoading: boolean
  isComplete: boolean
  showModal: boolean
  userRole: string | null
}

export function useQuestionnaireCheck(): QuestionnaireStatus {
  const [status, setStatus] = useState<QuestionnaireStatus>({
    isLoading: true,
    isComplete: false,
    showModal: false,
    userRole: null
  })
  
  useEffect(() => {
    const checkQuestionnaire = async () => {
      const supabase = createClient()
      
      try {
        // קבלת המשתמש הנוכחי
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setStatus({ isLoading: false, isComplete: false, showModal: false, userRole: null })
          return
        }
        
        // קבלת פרטי המשתמש
        const { data: userData } = await supabase
          .from('users')
          .select('role, company_id')
          .eq('id', user.id)
          .single()
        
        if (!userData?.company_id) {
          // אין חברה - לא צריך שאלון
          setStatus({ isLoading: false, isComplete: true, showModal: false, userRole: userData?.role || null })
          return
        }
        
        // בדיקה אם יש שאלון מלא לחברה
        const { data: questionnaire } = await supabase
          .from('company_questionnaires')
          .select('is_complete')
          .eq('company_id', userData.company_id)
          .single()
        
        const isComplete = questionnaire?.is_complete === true
        
        setStatus({
          isLoading: false,
          isComplete,
          showModal: !isComplete,
          userRole: userData?.role || null
        })
        
      } catch (error) {
        console.error('Error checking questionnaire:', error)
        setStatus({ isLoading: false, isComplete: false, showModal: false, userRole: null })
      }
    }
    
    checkQuestionnaire()
  }, [])
  
  return status
}
