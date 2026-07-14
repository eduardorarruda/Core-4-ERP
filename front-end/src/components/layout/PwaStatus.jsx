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
      <div className="flex items-center justify-center gap-2 bg-amber-500/15 text-amber-300 text-xs font-medium py-1.5 px-4 border-b border-amber-500/20">
        <WifiOff className="w-3.5 h-3.5" />
        Você está offline — os dados aparecem quando a conexão voltar.
      </div>
    );
  }

  if (precisaAtualizar) {
    return (
      <div className="flex items-center justify-center gap-3 bg-primary/15 text-primary text-xs font-medium py-1.5 px-4 border-b border-primary/20">
        <span>Uma nova versão está disponível.</span>
        <button
          type="button"
          onClick={atualizar}
          className="inline-flex items-center gap-1 font-bold underline hover:no-underline"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar agora
        </button>
      </div>
    );
  }

  return null;
}
