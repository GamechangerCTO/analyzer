/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'], // Space Grotesk
        mono: ['var(--font-mono)'] // JetBrains Mono
      },
      colors: {
        // Coachee Glacier Bright Color Palette - Modern 2025 Design
        // Primary Glacier Colors - מבוססים על צבעי קרח בהירים ומודרניים
        'glacier-bright-1': '#B5F9FF',    // תכלת קרח בהיר
        'glacier-bright-2': '#C9FFEE',    // ירוק-תכלת קרח
        'glacier-bright-3': '#E2FFE0',    // ירוק קרח בהיר
        'glacier-bright-4': '#FEFFD6',    // צהוב קרח בהיר
        'glacier-bright-5': '#FFF1CC',    // קרם קרח
        
        // Adaptive Glacier Colors - גרסאות מותאמות לשימושים שונים
        'glacier-primary': '#B5F9FF',        // Primary action color
        'glacier-primary-light': '#D4FCFF',  // Lighter version
        'glacier-primary-dark': '#96E6F3',   // Darker version
        
        'glacier-secondary': '#C9FFEE',      // Secondary actions
        'glacier-secondary-light': '#E0FFF5', // Lighter secondary
        'glacier-secondary-dark': '#B3F5E0', // Darker secondary
        
        'glacier-accent': '#E2FFE0',         // Accent highlights
        'glacier-accent-light': '#F0FFF0',   // Light accent
        'glacier-accent-dark': '#D1F7CE',    // Dark accent
        
        'glacier-success': '#E2FFE0',        // Success states
        'glacier-success-light': '#F0FFF0',  // Light success
        'glacier-success-dark': '#C8F2C4',   // Dark success
        
        'glacier-warning': '#FEFFD6',        // Warning states
        'glacier-warning-light': '#FFFFE8',  // Light warning
        'glacier-warning-dark': '#F5F3B8',   // Dark warning
        
        'glacier-info': '#B5F9FF',           // Info states
        'glacier-info-light': '#D4FCFF',     // Light info
        'glacier-info-dark': '#96E6F3',      // Dark info
        
        // Glass/Background Colors - צבעי רקע וזכוכית מותאמים לגליישר
        'glass-white': '#FEFEFE',         // לבן זכוכית
        'glass-light': '#FAFCFC',         // אפור זכוכית בהיר (מעט תכלת)
        'glass-medium': '#F0F6F6',        // אפור זכוכית בינוני
        'glass-dark': '#6C7B7D',          // אפור זכוכית כהה
        'glass-night': '#2D3748',         // כהה עמוק לדארק מוד
        
        // Modern Neutral Palette - עבור טקסט ובורדרים
        'neutral-50': '#F9FAFB',
        'neutral-100': '#F3F4F6', 
        'neutral-200': '#E5E7EB',
        'neutral-300': '#D1D5DB',
        'neutral-400': '#9CA3AF',
        'neutral-500': '#6B7280',
        'neutral-600': '#4B5563',
        'neutral-700': '#374151',
        'neutral-800': '#1F2937',
        'neutral-900': '#111827',
        
        // Shadcn compatibility עם Coachee Glacier theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#B5F9FF", // glacier-primary
          foreground: "#1F2937", // neutral-800
          light: "#D4FCFF",
          dark: "#96E6F3",
        },
        secondary: {
          DEFAULT: "#C9FFEE", // glacier-secondary
          foreground: "#1F2937", // neutral-800
          light: "#E0FFF5",
          dark: "#B3F5E0",
        },
        accent: {
          DEFAULT: "#E2FFE0", // glacier-accent
          foreground: "#1F2937", // neutral-800
          light: "#F0FFF0",
          dark: "#D1F7CE",
        },
        destructive: {
          DEFAULT: "#FF8B94", // Modern coral for danger
          foreground: "#FEFEFE", // glass-white
          light: "#FFA8B0",
          dark: "#FF6B75",
        },
        muted: {
          DEFAULT: "#F0F6F6", // glass-medium
          foreground: "#6B7280", // neutral-500
        },
        popover: {
          DEFAULT: "#FEFEFE", // glass-white
          foreground: "#1F2937", // neutral-800
        },
        card: {
          DEFAULT: "#FEFEFE", // glass-white
          foreground: "#1F2937", // neutral-800
          secondary: "#FAFCFC", // glass-light
        },
        success: {
          DEFAULT: "#E2FFE0", // glacier-success
          foreground: "#1F2937", // neutral-800
          light: "#F0FFF0",
          dark: "#C8F2C4",
        },
        warning: {
          DEFAULT: "#FEFFD6", // glacier-warning
          foreground: "#1F2937", // neutral-800
          light: "#FFFFE8",
          dark: "#F5F3B8",
        },
        
        // Legacy support (להחלפה הדרגתית)
        'indigo-night': '#2D3748', // glass-night
        'lemon-mint': '#90C695',   // clay-success
        'cream-sand': '#F8F9FA',   // glass-light
        'electric-coral': '#EC7063', // clay-danger
        'ice-gray': '#E5E7EB',     // neutral-200
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'clay': '1.5rem',    // פינות עגולות לחימר
        'glass': '1.25rem',  // פינות עגולות לזכוכית
        'soft': '1rem',      // פינות רכות כלליות
      },
      boxShadow: {
        // Glacier Shadows - צללים מודרניים לאפקט קרח
        'glacier-raised': `
          8px 8px 16px rgba(181, 249, 255, 0.15),
          -8px -8px 16px rgba(255, 255, 255, 0.7),
          inset 2px 2px 4px rgba(181, 249, 255, 0.1)
        `,
        'glacier-pressed': `
          inset 8px 8px 16px rgba(181, 249, 255, 0.2),
          inset -8px -8px 16px rgba(255, 255, 255, 0.8)
        `,
        'glacier-soft': `
          4px 4px 8px rgba(181, 249, 255, 0.1),
          -4px -4px 8px rgba(255, 255, 255, 0.6)
        `,
        'glacier-hover': `
          12px 12px 24px rgba(181, 249, 255, 0.18),
          -12px -12px 24px rgba(255, 255, 255, 0.8),
          inset 1px 1px 2px rgba(181, 249, 255, 0.05)
        `,
        
        // Glassmorphism Shadows - צללים לזכוכית עם גוונים קרירים
        'glass-soft': '0 8px 32px 0 rgba(181, 249, 255, 0.25)',
        'glass-medium': '0 8px 32px 0 rgba(181, 249, 255, 0.35)',
        'glass-strong': '0 8px 32px 0 rgba(181, 249, 255, 0.45)',
        'glass-glow': '0 0 40px rgba(181, 249, 255, 0.3)',
        
        // Legacy shadows (עדכון הדרגתי)
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
        'replayme': '0 4px 20px rgba(139, 95, 191, 0.15)', // clay-primary glow
        'coral': '0 4px 20px rgba(236, 112, 99, 0.15)', // clay-danger glow  
        'soft': '0 2px 8px rgba(45, 55, 72, 0.08)', // glass-night shadow
      },
      backdropBlur: {
        'glass-light': '8px',
        'glass-medium': '16px', 
        'glass-strong': '24px',
        'glass-intense': '40px',
      },
      keyframes: {
        // אנימציות קיימות
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        
        // Glacier אנימציות מודרניות
        "glacier-press": {
          '0%': { 
            transform: 'scale(1)',
            boxShadow: `
              8px 8px 16px rgba(181, 249, 255, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7)
            `
          },
          '50%': { 
            transform: 'scale(0.98)',
            boxShadow: `
              inset 4px 4px 8px rgba(181, 249, 255, 0.2),
              inset -4px -4px 8px rgba(255, 255, 255, 0.8)
            `
          },
          '100%': { 
            transform: 'scale(1)',
            boxShadow: `
              8px 8px 16px rgba(181, 249, 255, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7)
            `
          },
        },
        "glacier-float": {
          '0%, 100%': { 
            transform: 'translateY(0px) scale(1)',
            boxShadow: `
              8px 8px 16px rgba(181, 249, 255, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7)
            `
          },
          '50%': { 
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: `
              12px 12px 24px rgba(181, 249, 255, 0.2),
              -12px -12px 24px rgba(255, 255, 255, 0.8)
            `
          },
        },
        
        // Glassmorphism אנימציות  
        "glass-shimmer": {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: '0.1'
          },
          '50%': { 
            opacity: '0.3'
          },
          '100%': { 
            transform: 'translateX(100%)',
            opacity: '0.1'
          },
        },
        "glass-breathe": {
          '0%, 100%': { 
            backdropFilter: 'blur(16px)',
            backgroundColor: 'rgba(248, 249, 250, 0.8)'
          },
          '50%': { 
            backdropFilter: 'blur(20px)',
            backgroundColor: 'rgba(248, 249, 250, 0.9)'
          },
        },
        
        // אנימציות UX משופרות
        "fade-in": {
          '0%': { 
            opacity: '0',
          },
          '100%': { 
            opacity: '1',
          },
        },
        "fade-in-up": {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        "scale-in": {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        "slide-in-right": {
          '0%': { 
            opacity: '0',
            transform: 'translateX(20px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        
        // Legacy אנימציות (עדכון הדרגתי)
        "lemon-pulse": {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(144, 198, 149, 0.4)'
          },
          '50%': { 
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 8px rgba(144, 198, 149, 0)'
          },
        },
        "coral-pulse": {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(236, 112, 99, 0.4)'
          },
          '50%': { 
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 8px rgba(236, 112, 99, 0)'
          },
        },
        "score-bounce": {
          '0%': { 
            transform: 'scale(0.8) rotate(-5deg)',
            opacity: '0'
          },
          '50%': {
            transform: 'scale(1.1) rotate(2deg)',
          },
          '100%': { 
            transform: 'scale(1) rotate(0deg)',
            opacity: '1'
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        
        // Claymorphism אנימציות
        "clay-press": "clay-press 0.3s ease-in-out",
        "clay-float": "clay-float 3s ease-in-out infinite",
        
        // Glassmorphism אנימציות
        "glass-shimmer": "glass-shimmer 2s ease-in-out infinite",
        "glass-breathe": "glass-breathe 4s ease-in-out infinite",
        
        // אנימציות כלליות משופרות
        "fade-in": "fade-in 0.6s ease-out",
        "fade-in-up": "fade-in-up 0.8s ease-out",
        "scale-in": "scale-in 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.6s ease-out",
        
        // Legacy אנימציות
        "lemon-pulse": "lemon-pulse 2s infinite",
        "coral-pulse": "coral-pulse 2s infinite", 
        "score-bounce": "score-bounce 0.8s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 