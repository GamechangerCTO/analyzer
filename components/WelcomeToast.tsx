'use client'

import { useState, useEffect } from 'react'

interface WelcomeToastProps {
  userName: string
}

export default function WelcomeToast({ userName }: WelcomeToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  // אוטומטית נסגור את ההודעה אחרי 5 שניות
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (!isVisible) return null
  
  return (
    <div className="fixed top-5 right-5 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 max-w-md">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold">ברוך הבא, {userName}!</p>
          <p>התחברת בהצלחה למערכת.</p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-green-500 hover:text-green-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
} 