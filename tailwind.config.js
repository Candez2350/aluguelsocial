/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // Cores Primárias (Confiança/Governo)
        gov: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6', // Azul Base
          700: '#1d4ed8', // Azul Royal
          900: '#1e3a8a', // Azul Naval Profundo
          950: '#172554',
        },
        // Cores Secundárias (Destaque/Ações)
        amber: {
          400: '#fbbf24',
          500: '#f59e0b', // Âmbar / Laranja Solar
          600: '#d97706',
        },
        // Fundos Neutros e Limpos
        surface: {
          50: '#f8fafc', // Fundo principal da aplicação
          100: '#f1f5f9', // Fundo de seções/cards secundários
          200: '#e2e8f0', // Bordas sutis
        },
        // Feedbacks (SLA / Status)
        status: {
          success: '#10b981', // Verde (Aprovado / Sucesso)
          warning: '#f59e0b', // Amarelo (Atenção / SLA Próximo)
          danger: '#ef4444',  // Vermelho Carmim (Perigo / SLA Crítico)
        }
      },
      fontFamily: {
        // Tipografia
        sans: ['Inter', 'sans-serif'], // Corpo do texto e tabelas
        display: ['Outfit', 'sans-serif'], // Títulos e Destaques
      },
      boxShadow: {
        // Sombras suaves para um aspecto Premium
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'float-slow': 'float-slow 22s ease-in-out infinite alternate',
        'float-slow-reverse': 'float-slow-reverse 26s ease-in-out infinite alternate',
        'pulse-slow': 'pulse-slow 18s ease-in-out infinite alternate',
      },
      keyframes: {
        'float-slow': {
          '0%': { transform: 'translateY(0px) translateX(0px) scale(1)' },
          '100%': { transform: 'translateY(50px) translateX(60px) scale(1.1)' },
        },
        'float-slow-reverse': {
          '0%': { transform: 'translateY(0px) translateX(0px) scale(1)' },
          '100%': { transform: 'translateY(-60px) translateX(-40px) scale(1.05)' },
        },
        'pulse-slow': {
          '0%': { opacity: '0.1', transform: 'scale(0.95)' },
          '100%': { opacity: '0.22', transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}
