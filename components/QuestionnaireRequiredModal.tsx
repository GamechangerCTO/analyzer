'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, ClipboardList, ArrowLeft } from 'lucide-react'

interface QuestionnaireRequiredModalProps {
  isOpen: boolean
  userRole?: string
}

export default function QuestionnaireRequiredModal({ isOpen, userRole }: QuestionnaireRequiredModalProps) {
  const router = useRouter()
  
  if (!isOpen) return null
  
  // רק מנהלים יכולים למלא שאלון
  const canFillQuestionnaire = userRole === 'manager' || userRole === 'admin'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* רקע כהה */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* תוכן הפופאפ */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in duration-300">
        {/* אייקון */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          </div>
        </div>
        
        {/* כותרת */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          🛑 השאלון לא הושלם
        </h2>
        
        {/* הודעה */}
        <p className="text-gray-600 text-center mb-6 leading-relaxed">
          {canFillQuestionnaire ? (
            <>
              כדי להשתמש במערכת, יש למלא את <strong>שאלון החברה</strong> תחילה.
              <br />
              השאלון עוזר לנו להתאים את הניתוחים וההמלצות לעסק שלך.
            </>
          ) : (
            <>
              מנהל החברה טרם מילא את <strong>שאלון החברה</strong>.
              <br />
              אנא פנה למנהל שלך כדי שימלא את השאלון.
            </>
          )}
        </p>
        
        {/* כפתורים */}
        <div className="space-y-3">
          {canFillQuestionnaire ? (
            <button
              onClick={() => router.push('/company-questionnaire')}
              className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ClipboardList className="w-5 h-5" />
              מלא שאלון עכשיו
            </button>
          ) : (
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              חזור לדשבורד
            </button>
          )}
        </div>
        
        {/* הערה */}
        <p className="text-xs text-gray-400 text-center mt-4">
          מילוי השאלון לוקח כ-5 דקות בלבד
        </p>
      </div>
    </div>
  )
}
