/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // New vibrant color palette based on the mood board
        primary: '#4f57d2', // Purple/blue from SKETCHY text
        secondary: '#22a7e5', // Blue from DRAW text
        accent: '#ffcc00', // Yellow from VOTE text
        green: '#7bc043', // Green from PLAY NOW button
        red: '#ff5a5a', // Red from FAST text
        pink: '#ff66c4', // Pink from cat illustration
        turquoise: '#40e0d0', // Turquoise from booster pack
        orange: '#ff7846', // Orange from booster pack
        purple: '#8a4fff', // Purple for partner badges
        
        // Background colors
        cream: '#f9f5eb', // Background color
        dark: {
          DEFAULT: '#2d2d2d', // Darker text
          gray: '#4a4a4a',
        },
        medium: {
          gray: '#6b6b6b',
        },
        light: {
          gray: '#c5c5c5',
        },
        'off-white': '#f9f5eb', // Same as cream for consistency

        // Semantic colors from design system
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        // Design system fonts
        montserrat: ['Montserrat', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        // Existing fonts
        heading: ['"Architects Daughter"', 'cursive'],
        body: ['"Patrick Hand"', 'cursive'],
        readable: ['Nunito', 'sans-serif'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v1H0zM0 0v100h1V0z' fill='%23000' fill-opacity='0.1'/%3E%3C/svg%3E")`,
      }
    },
  },
  plugins: [],
};