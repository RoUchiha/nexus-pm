import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { ClerkProvider } from '@clerk/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN.replace(/^https?:\/\//, '').replace(
  /\/$/,
  '',
);
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

const application =
  auth0Domain && auth0ClientId ? (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{ redirect_uri: window.location.origin }}
      cacheLocation="memory"
      useRefreshTokens
    >
      <AuthenticatedApp provider="auth0" />
    </Auth0Provider>
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
