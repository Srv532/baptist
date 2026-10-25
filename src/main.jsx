// App entry point. The Trusted Types policy MUST be installed before anything
// else runs, so it is the very first import.
import './security/install.js';
import './styles/main.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
