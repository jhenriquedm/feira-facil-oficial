import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { APP_VERSION_INFO } from './version';

// Proactive cache invalidation when app version changes or upgrades
try {
  const currentVersionKey = `${APP_VERSION_INFO.version}_b${APP_VERSION_INFO.buildNumber}`;
  const storedVersionKey = localStorage.getItem('ff_installed_app_version');

  if (storedVersionKey !== currentVersionKey) {
    console.log(`[Version Sync] Updating app cache from '${storedVersionKey}' to '${currentVersionKey}'`);
    localStorage.setItem('ff_installed_app_version', currentVersionKey);

    // Clear CacheStorage (Service Worker Workbox / Web Cache)
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      }).catch(() => {});
    }

    // Unregister any stale Service Workers so fresh assets load
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      }).catch(() => {});
    }
  }
} catch (err) {
  console.warn('[Version Sync] Cache cleanup check error:', err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

