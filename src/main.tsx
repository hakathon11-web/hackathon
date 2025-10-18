
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config.ts'
import './utils/productionConsole.ts'

// No logging needed for normal startup

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  root.render(
    // <React.StrictMode> // DISABLED: Testing if strict mode double effects cause scroll issues
      <App />
    // </React.StrictMode>,
  );
  
} catch (error) {
  console.error('Critical: Error in main.tsx');
  
  // Show error on page
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Application Error</h1>
        <p>There was an error starting the application:</p>
        <pre style="background: #f0f0f0; padding: 10px; border-radius: 4px;">${error}</pre>
        <p>Please check the console for more details.</p>
      </div>
    `;
  }
}
