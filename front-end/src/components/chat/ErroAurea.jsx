import React from 'react';
import { CloudOff, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Resposta que falhou (Áurea fora do ar, sem conexão, limite de mensagens…).
 * Mostra o motivo em linguagem simples e, quando dá, o botão "Tentar novamente".
 */
export default function ErroAurea({ mensagem, onTentarNovamente, desabilitado = false }) {
  return (
    <div role="alert" className="rounded-2xl border border-error/30 bg-error/[0.06] p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg bg-error/12 text-error" aria-hidden="true">
          <CloudOff className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">A resposta não chegou</p>
          <p className="text-sm text-text-primary/75 mt-0.5 leading-relaxed">{mensagem}</p>
        </div>
      </div>
      {onTentarNovamente && (
        <div className="mt-3 pl-11">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTentarNovamente}
            disabled={desabilitado}
            leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
