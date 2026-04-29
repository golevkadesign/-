import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket HMR errors in the preview environment
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = typeof event.reason === 'string' ? event.reason : event.reason?.message || '';
  if (reasonStr.includes('WebSocket closed without opened') || 
      reasonStr.includes('[vite] failed to connect to websocket')) {
    event.preventDefault();
  }
});

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && 
     (args[0].includes('[vite] failed to connect to websocket') || 
      args[0].includes('WebSocket closed without opened'))) {
    return;
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
