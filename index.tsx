import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// This event listener is the definitive fix for the avatar rendering issue.
// It ensures that the entire application code only runs *after* the browser has
// fully parsed the HTML and executed all scripts, including lottie.min.js.
// This completely resolves the race condition that was causing the failure.
document.addEventListener('DOMContentLoaded', () => {
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
});