import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1d648f',
        'primary-container': '#cae6ff',
        'on-primary': '#ffffff',
        'on-primary-container': '#001e2f',
        surface: '#f5f8fa',
        'on-surface': '#1a1c1e',
        'on-surface-variant': '#42474e',
        outline: '#72777f',
        'outline-variant': '#c2c7cf',
        error: '#ba1a1a',
        'surface-container-low': '#f0f3f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#ebeef2',
        'surface-container-highest': '#e5e8ec',
      },
      borderRadius: {
        xl: '1.5rem',
        glass: '2rem',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
