/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Extend Tailwind with our design system theme color properties
        'bg-dark': 'var(--bg-dark)',
        'bg-card': 'var(--bg-card)',
        'primary': 'var(--primary)',
        'accent': 'var(--accent)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'danger': 'var(--danger)',
        'leaves': 'var(--leaves-xp)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
