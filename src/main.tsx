import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const application = publishableKey ? (
  <ClerkProvider publishableKey={publishableKey}>
    <AuthenticatedApp />
  </ClerkProvider>
) : (
  <App />
);

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>{application}</ErrorBoundary>
  </StrictMode>,
);
