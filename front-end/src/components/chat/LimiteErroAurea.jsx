import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import AureaAvatar from './AureaAvatar';

/**
 * Se o painel flutuante da Áurea quebrar (ex.: falha da biblioteca de chat), a falha fica
 * contida aqui: o resto da tela continua funcionando e a pessoa pode abrir a tela cheia.
 */
export default class LimiteErroAurea extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: false };
  }

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(error, info) {
    console.error('[Áurea] painel falhou', error, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    const { onClose } = this.props;
    return (
      <div role="alert" className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AureaAvatar size="lg" />
        <div>
          <p className="text-base font-semibold text-text-primary font-display">O painel da Áurea não abriu</p>
          <p className="mt-1 text-sm text-text-primary/70 leading-relaxed max-w-xs">
            A conversa continua disponível na tela da Áurea, com todo o histórico.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to="/assistente"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-gradient-primary text-on-primary text-sm font-semibold shadow-[var(--shadow-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" /> Abrir em tela cheia
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-border-strong text-sm font-medium text-text-primary hover:bg-surface-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" /> Fechar
          </button>
        </div>
      </div>
    );
  }
}
