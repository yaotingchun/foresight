/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        page: '#F8FAFC',
        card: '#FFFFFF',
        muted: '#F1F5F9',
        line: {
          DEFAULT: '#E5E7EB',
          subtle: '#F1F5F9',
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#475569',
          faint: '#94A3B8',
        },
        status: {
          green: { DEFAULT: '#22C55E', tint: '#DCFCE7' },
          orange: { DEFAULT: '#F59E0B', tint: '#FEF3C7' },
          red: { DEFAULT: '#EF4444', tint: '#FEE2E2' },
          purple: { DEFAULT: '#8B5CF6', tint: '#EDE9FE' },
          blue: { DEFAULT: '#3B82F6', tint: '#DBEAFE' },
          indigo: { DEFAULT: '#4F46E5', tint: '#EEF2FF' },
          gray: { DEFAULT: '#94A3B8', tint: '#F1F5F9' },
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.05)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
