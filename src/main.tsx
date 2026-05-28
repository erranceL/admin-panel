import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { debugLog } from './lib/api.ts'

// #region agent log
debugLog('H1,H5', 'src/main.tsx:bootstrap', 'app bundle booted', {
  buildMarker: 'debug-7c69db-20260528-2253',
  href: window.location.href,
  userAgent: window.navigator.userAgent,
})
// #endregion

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
