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
        // New Purple & Green Color Palette - Modern 2025 Design
        // Primary Purple Colors
        'brand-primary': '#472DA6',         // Dark purple - main primary
        'brand-primary-light': '#5336BF',   // Medium purple - lighter primary
        'brand-primary-dark': '#3A2485',    // Darker purple for depth
        
        // Secondary Green Colors  
        'brand-secondary': '#3DA61F',       // Green - secondary actions
        'brand-secondary-light': '#CFF2CE', // Light green - subtle backgrounds
        'brand-secondary-dark': '#2E7D18',  // Dark green for depth
        
        // Accent and State Colors
        'brand-accent': '#CFF2CE',          // Light green accent
        'brand-accent-light': '#E7F9E6',    // Very light green
        'brand-accent-dark': '#B8E6B5',     // Medium light green
        
        'brand-success': '#3DA61F',         // Green for success states
        'brand-success-light': '#CFF2CE',   // Light green for success
        'brand-success-dark': '#2E7D18',    // Dark green for success
        
        'brand-warning': '#F59E0B',         // Orange for warnings (complementary)
        'brand-warning-light': '#FEF3C7',   // Light orange
        'brand-warning-dark': '#D97706',    // Dark orange
        
        'brand-info': '#5336BF',            // Purple for info states
        'brand-info-light': '#E0D9FF',      // Light purple
        'brand-info-dark': '#472DA6',       // Dark purple for info
        
        // Background Colors
        'brand-bg': '#F2F2F0',              // Off-white background
        'brand-bg-light': '#FAFAF9',        // Lighter background
        'brand-bg-medium': '#EEEEEC',       // Medium background
        'brand-bg-dark': '#E5E5E3',         // Darker background shade
        
        // Glass/Background Colors - adapted to new theme
        'glass-white': '#FEFEFE',         // Pure white glass
        'glass-light': '#F8F8F7',         // Light glass with subtle warmth
        'glass-medium': '#F0F0EE',        // Medium glass
        'glass-dark': '#6C7B7D',          // Dark glass (unchanged - neutral)
        'glass-night': '#2D3748',         // Dark mode (unchanged)
        
        // Modern Neutral Palette - unchanged as these are universal
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
        
        // Legacy glacier colors mapped to new brand colors for backward compatibility
        'glacier-primary': '#472DA6',        // Maps to brand-primary
        'glacier-primary-light': '#5336BF',  // Maps to brand-primary-light  
        'glacier-primary-dark': '#3A2485',   // Maps to brand-primary-dark
        
        'glacier-secondary': '#3DA61F',      // Maps to brand-secondary
        'glacier-secondary-light': '#CFF2CE', // Maps to brand-secondary-light
        'glacier-secondary-dark': '#2E7D18', // Maps to brand-secondary-dark
        
        'glacier-accent': '#CFF2CE',         // Maps to brand-accent
        'glacier-accent-light': '#E7F9E6',   // Maps to brand-accent-light
        'glacier-accent-dark': '#B8E6B5',    // Maps to brand-accent-dark
        
        'glacier-success': '#3DA61F',        // Maps to brand-success
        'glacier-success-light': '#CFF2CE',  // Maps to brand-success-light
        'glacier-success-dark': '#2E7D18',   // Maps to brand-success-dark
        
        'glacier-warning': '#F59E0B',        // Maps to brand-warning
        'glacier-warning-light': '#FEF3C7',  // Maps to brand-warning-light
        'glacier-warning-dark': '#D97706',   // Maps to brand-warning-dark
        
        'glacier-info': '#5336BF',           // Maps to brand-info
        'glacier-info-light': '#E0D9FF',     // Maps to brand-info-light
        'glacier-info-dark': '#472DA6',      // Maps to brand-info-dark
        
        // Bright colors adapted to new theme
        'glacier-bright-1': '#E0D9FF',       // Light purple (was teal)
        'glacier-bright-2': '#CFF2CE',       // Light green (was green-teal)
        'glacier-bright-3': '#E7F9E6',       // Very light green 
        'glacier-bright-4': '#F2F2F0',       // Off-white background
        'glacier-bright-5': '#FAFAF9',       // Lightest background
        
        // Shadcn compatibility with new brand theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#472DA6", // brand-primary
          foreground: "#FEFEFE", // white text on purple
          light: "#5336BF",
          dark: "#3A2485",
        },
        secondary: {
          DEFAULT: "#3DA61F", // brand-secondary
          foreground: "#FEFEFE", // white text on green
          light: "#CFF2CE",
          dark: "#2E7D18",
        },
        accent: {
          DEFAULT: "#CFF2CE", // brand-accent
          foreground: "#1F2937", // dark text on light green
          light: "#E7F9E6",
          dark: "#B8E6B5",
        },
        destructive: {
          DEFAULT: "#DC2626", // Red for danger (unchanged)
          foreground: "#FEFEFE", // white text
          light: "#FCA5A5",
          dark: "#B91C1C",
        },
        muted: {
          DEFAULT: "#F2F2F0", // brand-bg
          foreground: "#6B7280", // neutral-500
        },
        popover: {
          DEFAULT: "#FEFEFE", // white
          foreground: "#1F2937", // neutral-800
        },
        card: {
          DEFAULT: "#FEFEFE", // white
          foreground: "#1F2937", // neutral-800
        },
      },
      boxShadow: {
        // Updated shadows to work with new color scheme
        'brand-soft': '0 4px 25px rgba(71, 45, 166, 0.08)',
        'brand-hover': '0 8px 40px rgba(71, 45, 166, 0.12)',
        'brand-strong': '0 12px 50px rgba(71, 45, 166, 0.16)',
        
        // Legacy glacier shadows mapped to new brand
        'glacier-soft': '0 4px 25px rgba(71, 45, 166, 0.08)',
        'glacier-hover': '0 8px 40px rgba(71, 45, 166, 0.12)',
        'glacier-strong': '0 12px 50px rgba(71, 45, 166, 0.16)',
      },
      animation: {
        // Brand-specific animations
        'brand-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'brand-bounce': 'bounce 1s infinite',
        'brand-fade-in': 'fadeIn 0.5s ease-in-out',
        
        // Legacy glacier animations
        'glacier-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glacier-bounce': 'bounce 1s infinite',
        'glacier-fade-in': 'fadeIn 0.5s ease-in-out',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #472DA6 0%, #5336BF 50%, #3DA61F 100%)',
        'brand-primary-gradient': 'linear-gradient(135deg, #472DA6 0%, #5336BF 100%)',
        'brand-secondary-gradient': 'linear-gradient(135deg, #3DA61F 0%, #CFF2CE 100%)',
        
        // Legacy glacier gradients
        'glacier-gradient': 'linear-gradient(135deg, #472DA6 0%, #5336BF 50%, #3DA61F 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 