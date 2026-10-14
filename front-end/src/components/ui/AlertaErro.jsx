import React from 'react';
import { CircleAlert, RotateCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

/**
 * Bloco de erro com ação de tentar de novo. Use quando uma carga falha (no lugar do conteúdo).
 *
 *   {erro && <AlertaErro mensagem={erro} onTentarNovamente={carregar} />}
 *
 * Props: titulo ('Não deu para carregar'), mensagem, onTentarNovamente, compacto, className.
 * Anunciado ao leitor de tela (role="alert").
 */
export default function AlertaErro({ titulo = 'Não deu para carregar', mensagem, onTentarNovamente, compacto = false, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-error-border bg-error-surface/60 text-error-text',
        compacto ? 'p-3' : 'p-4 sm:p-5',
        className
      )}
    >
      <CircleAlert className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{titulo}</p>
        {mensagem && <p className="mt-0.5 text-sm opacity-90 break-words">{mensagem}</p>}
      </div>
      {onTentarNovamente && (
        <Button variant="secondary" size="sm" onClick={onTentarNovamente} leftIcon={<RotateCw className="w-3.5 h-3.5" aria-hidden="true" />}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
