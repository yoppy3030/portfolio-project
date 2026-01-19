import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './style/index.css';
import App from './components/App';
import './i18n'; // i18nの初期化

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback="loading...">
      <App />
    </Suspense>
  </React.StrictMode>
);
