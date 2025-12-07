'use client'

import { useQuestionnaireCheck } from '@/hooks/useQuestionnaireCheck'
import QuestionnaireRequiredModal from './QuestionnaireRequiredModal'
import { Loader2 } from 'lucide-react'

interface QuestionnaireGuardProps {
  children: React.ReactNode
}

export default function QuestionnaireGuard({ children }: QuestionnaireGuardProps) {
  const { isLoading, isComplete, showModal, userRole } = useQuestionnaireCheck()
  
  // טעינה
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      {/* הפופאפ יופיע מעל התוכן */}
      <QuestionnaireRequiredModal isOpen={showModal} userRole={userRole || undefined} />
      
      {/* התוכן עצמו - מטושטש אם השאלון לא מולא */}
      <div className={showModal ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </>
  )
}
