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
        // Choacee Claymorphism + Glassmorphism Color Palette
        // Primary Clay Colors - מבוססים על צבעי חימר רכים ונגישים
        'clay-primary': '#8B5FBF',        // סגול חימר עמוק
        'clay-primary-light': '#A78ED1',  // סגול חימר בהיר
        'clay-primary-dark': '#6B4896',   // סגול חימר כהה
        
        'clay-secondary': '#E8A87C',      // כתום חימר רך
        'clay-secondary-light': '#F2C2A3', // כתום חימר בהיר
        'clay-secondary-dark': '#D1956A', // כתום חימר כהה
        
        'clay-accent': '#7EC8E3',         // כחול חימר רך
        'clay-accent-light': '#A8D8EC',   // כחול חימר בהיר  
        'clay-accent-dark': '#5DB3D1',    // כחול חימר כהה
        
        'clay-success': '#90C695',        // ירוק חימר רך
        'clay-success-light': '#B2D6B5',  // ירוק חימר בהיר
        'clay-success-dark': '#7BB27F',   // ירוק חימר כהה
        
        'clay-warning': '#F4D03F',        // צהוב חימר רך
        'clay-warning-light': '#F7DC6F',  // צהוב חימר בהיר
        'clay-warning-dark': '#E8C547',   // צהוב חימר כהה
        
        'clay-danger': '#EC7063',         // אדום חימר רך
        'clay-danger-light': '#F1948A',   // אדום חימר בהיר
        'clay-danger-dark': '#E55039',    // אדום חימר כהה
        
        // Glass/Background Colors - צבעי רקע וזכוכית
        'glass-white': '#FEFEFE',         // לבן זכוכית
        'glass-light': '#F8F9FA',         // אפור זכוכית בהיר
        'glass-medium': '#E9ECEF',        // אפור זכוכית בינוני
        'glass-dark': '#6C757D',          // אפור זכוכית כהה
        'glass-night': '#2D3748',         // כהה עמוק לדארק מוד
        
        // Neutral Palette - עבור טקסט ובורדרים
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
        
        // Shadcn compatibility עם Choacee theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#8B5FBF", // clay-primary
          foreground: "#FEFEFE", // glass-white
          light: "#A78ED1",
          dark: "#6B4896",
        },
        secondary: {
          DEFAULT: "#E8A87C", // clay-secondary
          foreground: "#1F2937", // neutral-800
          light: "#F2C2A3",
          dark: "#D1956A",
        },
        accent: {
          DEFAULT: "#7EC8E3", // clay-accent
          foreground: "#1F2937", // neutral-800
          light: "#A8D8EC",
          dark: "#5DB3D1",
        },
        destructive: {
          DEFAULT: "#EC7063", // clay-danger
          foreground: "#FEFEFE", // glass-white
          light: "#F1948A",
          dark: "#E55039",
        },
        muted: {
          DEFAULT: "#F3F4F6", // neutral-100
          foreground: "#6B7280", // neutral-500
        },
        popover: {
          DEFAULT: "#FEFEFE", // glass-white
          foreground: "#1F2937", // neutral-800
        },
        card: {
          DEFAULT: "#FEFEFE", // glass-white
          foreground: "#1F2937", // neutral-800
          secondary: "#F8F9FA", // glass-light
        },
        success: {
          DEFAULT: "#90C695", // clay-success
          foreground: "#FEFEFE", // glass-white
          light: "#B2D6B5",
          dark: "#7BB27F",
        },
        warning: {
          DEFAULT: "#F4D03F", // clay-warning
          foreground: "#1F2937", // neutral-800
          light: "#F7DC6F",
          dark: "#E8C547",
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
        // Claymorphism Shadows - צללים כפולים לאפקט חימר
        'clay-raised': `
          8px 8px 16px rgba(139, 95, 191, 0.15),
          -8px -8px 16px rgba(255, 255, 255, 0.7),
          inset 2px 2px 4px rgba(139, 95, 191, 0.1)
        `,
        'clay-pressed': `
          inset 8px 8px 16px rgba(139, 95, 191, 0.2),
          inset -8px -8px 16px rgba(255, 255, 255, 0.8)
        `,
        'clay-soft': `
          4px 4px 8px rgba(139, 95, 191, 0.1),
          -4px -4px 8px rgba(255, 255, 255, 0.6)
        `,
        'clay-hover': `
          12px 12px 24px rgba(139, 95, 191, 0.18),
          -12px -12px 24px rgba(255, 255, 255, 0.8),
          inset 1px 1px 2px rgba(139, 95, 191, 0.05)
        `,
        
        // Glassmorphism Shadows - צללים לזכוכית
        'glass-soft': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-medium': '0 8px 32px 0 rgba(31, 38, 135, 0.5)',
        'glass-strong': '0 8px 32px 0 rgba(31, 38, 135, 0.7)',
        'glass-glow': '0 0 40px rgba(126, 200, 227, 0.3)',
        
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
        
        // Claymorphism אנימציות חדשות
        "clay-press": {
          '0%': { 
            transform: 'scale(1)',
            boxShadow: `
              8px 8px 16px rgba(139, 95, 191, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7)
            `
          },
          '50%': { 
            transform: 'scale(0.98)',
            boxShadow: `
              inset 4px 4px 8px rgba(139, 95, 191, 0.2),
              inset -4px -4px 8px rgba(255, 255, 255, 0.8)
            `
          },
          '100%': { 
            transform: 'scale(1)',
            boxShadow: `
              8px 8px 16px rgba(139, 95, 191, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7)
            `
          },
        },
        "clay-float": {
          '0%, 100%': { 
            transform: 'translateY(0px) scale(1)',
            boxShadow: `
              8px 8px 16px rgba(139, 95, 191, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7)
            `
          },
          '50%': { 
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: `
              12px 12px 24px rgba(139, 95, 191, 0.2),
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