import { SignIn, useAuth } from '@clerk/react';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { App } from '../App';
import { setBrokerTokenProvider } from '../lib/broker';

interface Props {
  provider: 'auth0' | 'clerk';
}

export function AuthenticatedApp({ provider }: Props) {
  return provider === 'auth0' ? <Auth0App /> : <ClerkApp />;
}

function Auth0App() {
  const { getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, logout, user } =
    useAuth0();

  useEffect(() => {
    setBrokerTokenProvider(async () => {
      try {
        return await getAccessTokenSilently();
      } catch {
        return null;
      }
    });
    return () => setBrokerTokenProvider(null);
  }, [getAccessTokenSilently]);

  if (isLoading) return <main className="auth-shell">Loading secure workspace...</main>;
  if (!isAuthenticated) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <span className="header-logo">⬡</span>
          <h1>NEXUS</h1>
          <p>Sign in to access the managed agent control plane.</p>
          <button className="btn btn-primary" onClick={() => void loginWithRedirect()}>
            Sign in securely
          </button>
        </div>
      </main>
    );
  }

  return (
    <App
      sessionControl={
        <button
          className="btn btn-ghost"
          title={user?.email ?? user?.name ?? 'Signed in'}
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Sign out
        </button>
      }
    />
  );
}

function ClerkApp() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setBrokerTokenProvider(getToken);
    return () => setBrokerTokenProvider(null);
  }, [getToken]);

  if (!isLoaded) return <main className="auth-shell">Loading secure workspace...</main>;
  if (!isSignedIn) {
    return (
      <main className="auth-shell">
        <SignIn routing="hash" />
      </main>
    );
  }
  return <App />;
}
