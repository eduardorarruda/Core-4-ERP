import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';

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
        <div role="alert" className="min-h-dvh flex items-center justify-center bg-surface p-8">
          <div className="text-center space-y-4 max-w-md">
            <span aria-hidden="true" className="mx-auto grid place-items-center w-16 h-16 rounded-2xl border border-warning/25 bg-warning/10 text-warning">
              <TriangleAlert className="w-7 h-7" />
            </span>
            <h1 className="text-xl font-semibold font-display text-text-primary">Algo deu errado</h1>
            <p className="text-sm text-text-primary/60">
              Algo deu errado ao exibir esta tela. Tente recarregar a página.
            </p>
            <button
              type="button"
              className="mt-4 min-h-11 px-5 rounded-xl bg-gradient-primary text-on-primary text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
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
