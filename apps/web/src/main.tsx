/**
 * Entry point for the BizzNex application.
 * Mounts the React tree and loads the Aurora design system.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/aurora.scss'
import './styles/onboarding.scss'
import './styles/landing.scss'
import './styles/settings.scss'
import './styles/transitions.scss'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
