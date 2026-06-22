import { SignIn, useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { App } from '../App';
import {
  refreshProviderAvailability,
  setBrokerTokenProvider,
  setProviderAvailability,
} from '../lib/broker';

interface Props {
  provider: 'auth0' | 'clerk';
}

export function AuthenticatedApp({ provider }: Props) {
  return provider === 'auth0' ? <Auth0App /> : <ClerkApp />;
}

function Auth0App() {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'signed-out'; error?: string }
    | { status: 'signed-in'; user: { name?: string; email?: string } }
  >({ status: 'loading' });

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const body = (await response.json()) as { logoutUrl?: string };
      window.location.assign(response.ok && body.logoutUrl ? body.logoutUrl : '/');
    } catch {
      window.location.assign('/');
    }
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthState = params.get('state');
    if (code && oauthState) {
      window.location.replace(
        `/api/auth/callback?${new URLSearchParams({ code, state: oauthState }).toString()}`,
      );
      return () => {
        active = false;
      };
    }
    const error =
      params.get('auth_error') ??
      params.get('error_description') ??
      params.get('error') ??
      undefined;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async (response) => {
        const body = (await response.json()) as {
          authenticated?: boolean;
          user?: { name?: string; email?: string };
        };
        if (!active) return;
        if (response.ok && body.authenticated && body.user) {
          setBrokerTokenProvider(async () => undefined);
          await refreshProviderAvailability();
          if (!active) return;
          setState({ status: 'signed-in', user: body.user });
        } else {
          setBrokerTokenProvider(null);
          setState({ status: 'signed-out', error });
        }
      })
      .catch(() => {
        if (active) setState({ status: 'signed-out', error: 'Session check failed.' });
      });
    return () => {
      active = false;
      setBrokerTokenProvider(null);
      setProviderAvailability([]);
    };
  }, []);

  if (state.status === 'loading') {
    return <main className="auth-shell">Loading secure workspace...</main>;
  }
  if (state.status === 'signed-out') {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <span className="header-logo">⬡</span>
          <h1>NEXUS</h1>
          <p>Sign in to access the managed agent control plane.</p>
          {state.error && <div className="auth-error">Sign-in failed: {state.error}</div>}
          <button
            className="btn btn-primary"
            onClick={() => window.location.assign('/api/auth/login')}
          >
            Sign in securely
          </button>
          <a className="btn btn-ghost" href="/?demo=1">
            Try credential-free demo
          </a>
        </div>
      </main>
    );
  }

  return (
    <App
      sessionControl={
        <button
          className="btn btn-ghost"
          title={state.user.email ?? state.user.name ?? 'Signed in'}
          onClick={() => void signOut()}
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
