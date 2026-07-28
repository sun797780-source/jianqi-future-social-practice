import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './kindergarten-overrides.css'
import './school-investigation.css'
import './community-action.css'
import './community-observation.css'
import './community-survey.css'
import './light-theme.css'
import './design-tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
