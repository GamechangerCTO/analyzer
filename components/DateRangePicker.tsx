'use client'

import { useState, useEffect, useCallback } from 'react'
import { endOfMonth, startOfMonth, format, subMonths } from 'date-fns'
import { he } from 'date-fns/locale'

interface DateRangePickerProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void
  initialStartDate?: Date
  initialEndDate?: Date
}

export default function DateRangePicker({ 
  onDateRangeChange, 
  initialStartDate,
  initialEndDate 
}: DateRangePickerProps) {
  // קביעת טווח ברירת מחדל לחודש האחרון או לפי הפרופס
  const [startDate, setStartDate] = useState<Date>(() => 
    initialStartDate || startOfMonth(subMonths(new Date(), 1))
  )
  const [endDate, setEndDate] = useState<Date>(() => 
    initialEndDate || endOfMonth(subMonths(new Date(), 1))
  )

  // עדכון תאריך התחלה
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    setStartDate(newDate)
    onDateRangeChange(newDate, endDate)
  }, [endDate, onDateRangeChange])

  // עדכון תאריך סיום
  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    setEndDate(newDate)
    onDateRangeChange(startDate, newDate)
  }, [startDate, onDateRangeChange])

  // קריאה ראשונה בלבד לפונקציית הקולבק
  useEffect(() => {
    // קריאה ראשונה עם הערכים הדיפולטיים רק אם אין ערכים ראשוניים
    if (!initialStartDate && !initialEndDate) {
      onDateRangeChange(startDate, endDate)
    }
  }, []) // ללא dependencies כדי שתרוץ רק פעם אחת

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white rounded-lg shadow p-4">
      <div className="flex-1">
        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
          מתאריך
        </label>
        <input
          type="date"
          id="start-date"
          className="block w-full p-2 border border-gray-300 rounded-md"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={handleStartDateChange}
        />
      </div>
      <div className="flex-1">
        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
          עד תאריך
        </label>
        <input
          type="date"
          id="end-date"
          className="block w-full p-2 border border-gray-300 rounded-md"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={handleEndDateChange}
        />
      </div>
    </div>
  )
} 