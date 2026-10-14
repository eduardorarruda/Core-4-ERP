import React from 'react';
import { useParams } from 'react-router-dom';
import ConciliacaoWorkspace from '../components/conciliacao/ConciliacaoWorkspace';

/** /cartoes/conciliacao e /cartoes/conciliacao/:id — conciliação de cartão (CARTAO_CONCILIACAO_VISUALIZAR). */
export default function ConciliacaoCartao() {
  const { id } = useParams();
  return <ConciliacaoWorkspace modo="cartao" sessaoId={id} />;
}
