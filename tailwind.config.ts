/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1f2937',
        secondary: '#374151',
        accent: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        gold: {
          DEFAULT: '#cbb26b',
          light: '#e0d5a0',
          dark: '#b89b4a',
        },
        navy: {
          DEFAULT: '#0b141b',
          light: '#141e2a',
          dark: '#070b0f',
          blue: '#2d4152',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      spacing: {
        gutter: 'var(--gutter)',
        'safe-max': '1200px',
      },
    },
  },
  plugins: [],
};
