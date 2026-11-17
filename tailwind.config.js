/** @type {import('tailwindcss').Config} */
export const theme = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    colors: {
      'dark': '#1fb6ff',
      'medium': '#424242',
      'lighter': '#7D82B8',
      'light': '#B7E3CC',
      'yellow': '#ffc82c',
      'gray-dark': '#273444',
      'gray': '#8492a6',
      'gray-light': '#d3dce6',
    },
    fontFamily: {
    },
    extend: {
      spacing: {
        '8xl': '96rem',
        '9xl': '128rem',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    }
  },
}
