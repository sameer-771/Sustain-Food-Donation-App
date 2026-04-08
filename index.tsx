
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import { configureLeafletDefaultIcons } from './utils/leaflet';

configureLeafletDefaultIcons();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker only for production builds.
// In development, stale SW caches can hide frontend changes.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] Service worker registration failed:', error);
        });
    });
  } else {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  }
}
