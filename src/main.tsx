import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App, { ErrorBoundary } from './App.tsx';
import './index.css';
import './services/i18nService';

// Suppress benign WebSocket errors in the preview environment (HMR is disabled by AI Studio)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string' && event.reason.message.includes('WebSocket')) {
    event.preventDefault();
  }
});

const initNativeLoginScreenCleanup = () => {
  if (!Capacitor.isNativePlatform()) return;

  const hiddenTexts = [
    'Alternativas de acesso',
    'Abrir no navegador externo',
    'Em dispositivos móveis, o login pode ser bloqueado pelo navegador'
  ];

  const cleanup = () => {
    document.body.classList.add('native-capacitor-app');

    const elements = Array.from(document.querySelectorAll('button, a, div, p, span')) as HTMLElement[];
    elements.forEach((element) => {
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      if (!hiddenTexts.some((hiddenText) => text.includes(hiddenText))) return;

      const block = element.closest('button, a') || element.closest('div');
      if (block instanceof HTMLElement) {
        block.style.display = 'none';
        block.setAttribute('aria-hidden', 'true');
      }
    });
  };

  cleanup();
  window.addEventListener('focus', cleanup);
  document.addEventListener('visibilitychange', cleanup);

  const observer = new MutationObserver(cleanup);
  observer.observe(document.body, { childList: true, subtree: true });
};

initNativeLoginScreenCleanup();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
