import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css'; // Import global styles first
import App from './App.tsx';
import { loadInitialData } from './services/dataLoader';

// Attempt to load initial data on startup (non-blocking)
loadInitialData().catch(e => console.error('Data load failed', e));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
