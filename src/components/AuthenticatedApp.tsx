import { SignIn, useAuth } from '@clerk/react';
import { useEffect } from 'react';
import { App } from '../App';
import { setBrokerTokenProvider } from '../lib/broker';

export function AuthenticatedApp() {
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
