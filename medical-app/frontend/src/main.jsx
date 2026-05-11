import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Dismiss the initial HTML loader once React takes over
const loader = document.getElementById('app-initial-loader');
if (loader) {
  loader.classList.add('fade-out');
  setTimeout(() => loader.remove(), 400);
}
