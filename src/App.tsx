import React, { useState, Component, ReactNode } from 'react';
import { Layout } from './components/Layout';
import { MatchController, Teams, TalentView, Assets, Overlay, Tournament, Settings } from './views';
import { AppProvider } from './store/AppContext';
import './styles/globals.css';

type ViewId = 'match' | 'teams' | 'talent' | 'assets' | 'overlay' | 'tournament' | 'settings';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#fff', background: '#1a1a1a', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af' }}>{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewId>('match');

  const renderView = () => {
    switch (activeView) {
      case 'match':
        return <MatchController />;
      case 'teams':
        return <Teams />;
      case 'talent':
        return <TalentView />;
      case 'assets':
        return <Assets />;
      case 'overlay':
        return <Overlay />;
      case 'tournament':
        return <Tournament />;
      case 'settings':
        return <Settings />;
      default:
        return <MatchController />;
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={(id) => setActiveView(id as ViewId)}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
