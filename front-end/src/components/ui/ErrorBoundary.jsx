import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-8">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-4xl">⚠️</p>
            <h1 className="text-xl font-bold text-on-surface">Algo deu errado</h1>
            <p className="text-sm text-on-surface/60">
              {this.state.error?.message ?? 'Erro inesperado na aplicação.'}
            </p>
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard'; }}
            >
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
