/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-background)',
        panel: {
          DEFAULT: 'var(--color-panel-solid)',
          translucent: 'var(--color-panel-translucent)'
        },
        overlay: 'var(--color-overlay)',
        accent: {
          1: 'var(--accent-1)',
          2: 'var(--accent-2)',
          3: 'var(--accent-3)',
          4: 'var(--accent-4)',
          5: 'var(--accent-5)',
          6: 'var(--accent-6)',
          7: 'var(--accent-7)',
          8: 'var(--accent-8)',
          9: 'var(--accent-9)',
          10: 'var(--accent-10)',
          11: 'var(--accent-11)',
          12: 'var(--accent-12)',
          contrast: 'var(--accent-contrast)',
          surface: 'var(--accent-surface)',
          indicator: 'var(--accent-indicator)',
          track: 'var(--accent-track)'
        },
        neutral: {
          1: 'var(--gray-1)',
          2: 'var(--gray-2)',
          3: 'var(--gray-3)',
          4: 'var(--gray-4)',
          5: 'var(--gray-5)',
          6: 'var(--gray-6)',
          7: 'var(--gray-7)',
          8: 'var(--gray-8)',
          9: 'var(--gray-9)',
          10: 'var(--gray-10)',
          11: 'var(--gray-11)',
          12: 'var(--gray-12)'
        }
      },
      borderColor: {
        DEFAULT: 'var(--gray-6)'
      }
    }
  },
  plugins: []
}
