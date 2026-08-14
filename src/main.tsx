import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { applyTheme } from './store/useThemeStore'
import { prepareServiceWorker } from './pwa/update'
import { isInstalledApp } from './pwa/runtimeContext'
import './pwa/install'

void prepareServiceWorker()
if (isInstalledApp() && navigator.storage) {
  void navigator.storage.persist().catch((error) => {
    console.warn('Could not request persistent app storage', error)
  })
}

// Always apply classic/default theme on initial load (for main menu)
applyTheme('default')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
