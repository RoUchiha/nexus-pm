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
const auth0Enabled = import.meta.env.VITE_AUTH0_ENABLED === 'true';

const application = auth0Enabled ? (
  <AuthenticatedApp provider="auth0" />
) : publishableKey ? (
  <ClerkProvider publishableKey={publishableKey}>
    <AuthenticatedApp provider="clerk" />
  </ClerkProvider>
) : (
  <App />
);

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>{application}</ErrorBoundary>
  </StrictMode>,
);
