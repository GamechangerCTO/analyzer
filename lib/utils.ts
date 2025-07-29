import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Authentication error handling utilities
export const handleAuthError = (error: any): string => {
  if (!error) return 'שגיאה לא ידועה'
  
  const errorMessage = error.message || error.toString()
  
  // Handle specific error types
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return 'יותר מדי ניסיונות התחברות - אנא המתן דקה ונסה שוב'
  }
  
  if (errorMessage.includes('Invalid login credentials')) {
    return 'שם משתמש או סיסמה שגויים'
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'יש לאשר את כתובת האימייל לפני ההתחברות'
  }
  
  if (errorMessage.includes('User not found')) {
    return 'משתמש לא נמצא במערכת'
  }
  
  if (errorMessage.includes('Too many requests')) {
    return 'יותר מדי בקשות - אנא המתן ונסה שוב'
  }
  
  return 'שגיאה בהתחברות - אנא נסה שוב'
}

// Rate limiting utility
export const createRateLimiter = (maxAttempts: number = 3, windowMs: number = 60000) => {
  let attempts = 0
  let resetTime = Date.now() + windowMs
  
  return {
    canAttempt: (): boolean => {
      const now = Date.now()
      
      // Reset if window has passed
      if (now > resetTime) {
        attempts = 0
        resetTime = now + windowMs
      }
      
      if (attempts >= maxAttempts) {
        return false
      }
      
      attempts++
      return true
    },
    
    getRemainingTime: (): number => {
      const now = Date.now()
      return Math.max(0, resetTime - now)
    },
    
    reset: () => {
      attempts = 0
      resetTime = Date.now() + windowMs
    }
  }
}

// Debounce utility for preventing rapid auth calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
} 