import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { usePwa } from '../../hooks/usePwa';

/**
 * Faixas de estado do PWA:
 *  - Offline: dado financeiro nunca é cacheado (regra de segurança), então avisamos que os
 *    dados voltam quando a conexão retornar.
 *  - Nova versão disponível: o usuário decide atualizar (não recarregamos no meio de um lançamento).
 */
export default function PwaStatus() {
  const { online, precisaAtualizar, atualizar } = usePwa();

  if (!online) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 bg-warning/12 text-warning text-xs font-medium py-1.5 px-4 border-b border-warning/20">
        <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
        Você está offline — os dados aparecem quando a conexão voltar.
      </div>
    );
  }

  if (precisaAtualizar) {
    return (
      <div role="status" className="flex items-center justify-center gap-3 bg-primary/12 text-primary text-xs font-medium py-1.5 px-4 border-b border-primary/20">
        <span>Uma nova versão está disponível.</span>
        <button
          type="button"
          onClick={atualizar}
          className="inline-flex items-center gap-1 min-h-8 font-bold underline hover:no-underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Atualizar agora
        </button>
      </div>
    );
  }

  return null;
}
