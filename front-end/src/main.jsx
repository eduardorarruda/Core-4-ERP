import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { MotionConfig } from 'motion/react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      {/* reducedMotion="user": com "reduzir movimento" ligado no sistema, nada anima */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>,
)
