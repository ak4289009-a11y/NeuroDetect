import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker for offline capability & PWA installability
serviceWorkerRegistration.register({
  onSuccess: () => console.log('[PWA] Service worker registered successfully.'),
  onUpdate: () => console.log('[PWA] New update available.')
});
