/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Indigo admin rail
        indigo: {
          DEFAULT: '#1e2152',
          lift: '#2a2f6b',
          deep: '#171a3f',
          glow: '#3d44a0',
        },
        // Content ground
        greige: '#f5f2ec',
        milk: '#fdfbf7',
        // Text
        ink: '#1a1a2e',
        chalk: '#8a8578',
        // Accents
        zari: '#c9a96e',
        madder: '#b8423a',
        jade: '#4a7c59',
        sky: '#5b8db8',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        data: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      borderRadius: {
        '2px': '2px',
      },
      fontSize: {
        '13px': ['13px', '1.4'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
