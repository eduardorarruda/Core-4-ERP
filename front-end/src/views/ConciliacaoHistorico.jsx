import React from 'react';
import ConciliacaoWorkspace from '../components/conciliacao/ConciliacaoWorkspace';

/** /conciliacao/historico — a mesma tela da conciliação, com o foco na lista de importações. */
export default function ConciliacaoHistorico() {
  return <ConciliacaoWorkspace modo="banco" foco="sessoes" />;
}
