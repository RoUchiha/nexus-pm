import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-banner" style={{ margin: '40px 20px' }}>
          <span className="error-icon">⬡</span>
          <div>
            <div className="error-title">NEXUS Encountered a Fatal Error</div>
            <div className="error-msg">{this.state.error.message}</div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 12 }}
              onClick={() => this.setState({ error: null })}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
