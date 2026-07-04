import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { KcPage, type KcContext } from './kc.gen';

declare global {
  interface Window {
    kcContext?: KcContext;
  }
}

const App = lazy(() => import('./main.app'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.kcContext ? (
      <KcPage kcContext={window.kcContext} />
    ) : (
      <Suspense>
        <App />
      </Suspense>
    )}
  </StrictMode>,
);
