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
        // ReplayMe Color Palette - Light Version
        'indigo-night': '#2A2D4A',
        'lemon-mint': '#C6F547',
        'cream-sand': '#F5F2EB',
        'electric-coral': '#FF6B6B',
        'ice-gray': '#E1E1E1',
        
        // Extended palette for better UX
        'lemon-mint-light': '#E8FA7A',
        'lemon-mint-dark': '#A8D12F',
        'electric-coral-light': '#FF8A8A',
        'electric-coral-dark': '#E53E3E',
        'cream-sand-light': '#FEFCF8',
        'cream-sand-dark': '#E8E2D6',
        
        // Shadcn compatibility with ReplayMe theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#C6F547", // lemon-mint
          foreground: "#1A1D2E", // dark text on bright background
          dark: "#A8D12F",
          light: "#E8FA7A",
        },
        secondary: {
          DEFAULT: "#F5F2EB", // cream-sand
          foreground: "#2A2D4A", // indigo-night text
          dark: "#E8E2D6",
          light: "#FEFCF8",
        },
        destructive: {
          DEFAULT: "#FF6B6B", // electric-coral
          foreground: "#FFFFFF",
          light: "#FF8A8A",
        },
        muted: {
          DEFAULT: "#F5F2EB", // cream-sand
          foreground: "#6B7280",
        },
        accent: {
          DEFAULT: "#2A2D4A", // indigo-night
          foreground: "#FFFFFF",
          light: "#4A4D6A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2A2D4A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2A2D4A",
          secondary: "#F5F2EB", // cream-sand cards
        },
        // Success and warning colors
        success: {
          DEFAULT: "#10B981", // emerald-500
          foreground: "#FFFFFF",
          light: "#34D399",
        },
        warning: {
          DEFAULT: "#F59E0B", // amber-500
          foreground: "#FFFFFF",
          light: "#FBBF24",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'replayme': '0 4px 20px rgba(198, 245, 71, 0.15)', // lemon-mint glow
        'coral': '0 4px 20px rgba(255, 107, 107, 0.15)', // coral glow
        'soft': '0 2px 8px rgba(42, 45, 74, 0.08)', // subtle indigo shadow
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
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
        // ReplayMe specific animations
        "lemon-pulse": {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(198, 245, 71, 0.4)'
          },
          '50%': { 
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 8px rgba(198, 245, 71, 0)'
          },
        },
        "coral-pulse": {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(255, 107, 107, 0.4)'
          },
          '50%': { 
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 8px rgba(255, 107, 107, 0)'
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
        "fade-in": "fade-in 0.6s ease-out",
        "fade-in-up": "fade-in-up 0.8s ease-out",
        "scale-in": "scale-in 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.6s ease-out",
        "lemon-pulse": "lemon-pulse 2s infinite",
        "coral-pulse": "coral-pulse 2s infinite",
        "score-bounce": "score-bounce 0.8s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 