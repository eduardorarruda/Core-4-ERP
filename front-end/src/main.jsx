import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AcessibilidadeProvider } from './context/AcessibilidadeContext.jsx'
import { aplicarPreferenciasSalvas } from './components/acessibilidade/preferencias'

// Modo de acessibilidade: aplica as preferências salvas no <html> ANTES do 1º render
// (sem "piscar" no padrão). Feito aqui, e não num <script> inline, para não mexer na CSP.
aplicarPreferenciasSalvas()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      {/* Inclui o MotionConfig da raiz: "reduzir movimento" do sistema OU do painel → nada desliza */}
      <AcessibilidadeProvider>
        <App />
      </AcessibilidadeProvider>
    </ThemeProvider>
  </StrictMode>,
)
