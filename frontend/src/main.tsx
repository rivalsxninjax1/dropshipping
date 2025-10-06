import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import { ToastProvider } from './components/Toast'
import { initSentry } from './sentry'
import { initAnalytics } from './analytics'
import { initFacebookPixel } from './pixel'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HelmetProvider>
  </React.StrictMode>
)

initSentry()
initAnalytics()
initFacebookPixel()
