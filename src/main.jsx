import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'

(function setPwaMetaForRoute() {
  const routeConfig = {
    '/hostessview': { title: 'LM Hostess', manifest: '/manifest-hostess.json' },
    '/managerview': { title: 'LM Manager', manifest: '/manifest-manager.json' },
  }[window.location.pathname];
  if (!routeConfig) return;
  document.title = routeConfig.title;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', routeConfig.title);
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', routeConfig.manifest);
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
