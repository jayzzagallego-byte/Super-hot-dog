import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// On fresh session (new tab/window), always start at home
const FIRST_LOAD_KEY = 'shd_first_load';
if (!sessionStorage.getItem(FIRST_LOAD_KEY)) {
  sessionStorage.setItem(FIRST_LOAD_KEY, '1');
  if (window.location.pathname !== '/login') {
    window.history.replaceState({}, '', '/');
  }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
