'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LegalTermsPage() {
  const searchParams = useSearchParams()
  const requireApproval = searchParams.get('requireApproval') === '1'
  const router = useRouter()

  const [isChecked, setIsChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/legal-terms/accept', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'אירעה שגיאה בשמירת האישור')
      }
      router.replace('/dashboard')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-primary/5 via-white to-glacier-accent/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="coachee-glass rounded-2xl border border-neutral-200 shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">תקנון משפטי</h1>
          <div className="text-neutral-700 space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            <p>
              ברוכים הבאים לפלטפורמה. להלן התקנון המשפטי לשימוש במערכת. אנא קראו בעיון את התנאים, המדיניות וההתחייבויות החלות עליכם כמנהלים ומשתמשים במערכת.
            </p>
            <p>
              השימוש במערכת כפוף למדיניות הפרטיות, אבטחת מידע, שימוש הוגן והנחיות תאימות רגולטורית. באישור התקנון אתם מאשרים שקראתם והבנתם את התנאים, ושאתם מתחייבים לעמוד בהם.
            </p>
            <p>
              מובהר כי אנו רשאים לעדכן את התקנון מעת לעת. נודיע על שינויים מהותיים במערכת. שימוש מתמשך לאחר עדכון ייחשב כהסכמה לתנאים המעודכנים.
            </p>
            <p>
              לפרטים מלאים, צרו קשר עם התמיכה.
            </p>
          </div>

          {requireApproval && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-start gap-3">
                <input
                  id="approve"
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                />
                <label htmlFor="approve" className="text-sm text-neutral-700">
                  אני מאשר/ת שקראתי ואני מסכימ/ה לתנאי התקנון
                </label>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl border-r-4 bg-red-50 border-red-400 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={handleApprove}
                  disabled={!isChecked || isSubmitting}
                  className="px-5 py-2 rounded-2xl text-white bg-gradient-to-r from-glacier-primary to-glacier-accent disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
                >
                  {isSubmitting ? 'שומר...' : 'מאשר/ת'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

