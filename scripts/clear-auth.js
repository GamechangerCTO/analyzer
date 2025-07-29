// Clear Authentication State Script
// Run this in the browser console to clear all auth-related data

console.log('🧹 Clearing authentication state...')

// Clear localStorage
const keysToRemove = []
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
    keysToRemove.push(key)
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key)
  console.log(`Removed: ${key}`)
})

// Clear sessionStorage
const sessionKeysToRemove = []
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i)
  if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
    sessionKeysToRemove.push(key)
  }
}

sessionKeysToRemove.forEach(key => {
  sessionStorage.removeItem(key)
  console.log(`Removed session: ${key}`)
})

// Clear cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
})

console.log('✅ Authentication state cleared!')
console.log('🔄 Please refresh the page and try logging in again.') 