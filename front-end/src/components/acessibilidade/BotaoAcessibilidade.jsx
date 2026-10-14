import React from 'react';
import { Accessibility } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAcessibilidade } from '../../hooks/useAcessibilidade';
import Tooltip from '../ui/Tooltip';

/**
 * Botão que abre o painel de acessibilidade (ícone universal de acesso). Sempre visível,
 * no mesmo lugar em todas as telas (WCAG 3.2.6 — ajuda consistente).
 *
 * Props: variante 'icone' (barra superior) | 'rotulo' (telas públicas: ícone + texto), className.
 */
export default function BotaoAcessibilidade({ variante = 'icone', className }) {
  const { abrirPainel, painelAberto, preferencias } = useAcessibilidade();
  const comRotulo = variante === 'rotulo';
  const botao = (
    <button
      type="button"
      onClick={abrirPainel}
      aria-haspopup="dialog"
      aria-expanded={painelAberto}
      aria-keyshortcuts={preferencias.atalhos ? 'Alt+A' : undefined}
      aria-label={comRotulo ? undefined : 'Acessibilidade: tamanho do texto, contraste, movimento e cores (Alt+A)'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl transition-colors',
        'text-text-primary/75 hover:text-text-primary hover:bg-text-primary/[0.06]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        comRotulo ? 'min-h-11 px-3 text-sm font-medium border border-border-strong' : 'w-11 h-11',
        className
      )}
    >
      <Accessibility className="w-5 h-5 shrink-0" aria-hidden="true" />
      {comRotulo && <span>Acessibilidade</span>}
    </button>
  );
  return comRotulo ? botao : <Tooltip conteudo="Acessibilidade (Alt+A)" lado="bottom">{botao}</Tooltip>;
}
