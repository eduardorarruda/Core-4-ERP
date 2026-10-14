import React from 'react';
import ConciliacaoWorkspace from '../components/conciliacao/ConciliacaoWorkspace';

/** /cartoes/conciliacao/historico — a mesma tela, com o foco na lista de importações. */
export default function ConciliacaoCartaoHistorico() {
  return <ConciliacaoWorkspace modo="cartao" foco="sessoes" />;
}
