import React from 'react';
import { useParams } from 'react-router-dom';
import ConciliacaoWorkspace from '../components/conciliacao/ConciliacaoWorkspace';

/** /conciliacao e /conciliacao/:id — conciliação bancária (CONCILIACAO_VISUALIZAR). */
export default function Conciliacao() {
  const { id } = useParams();
  return <ConciliacaoWorkspace modo="banco" sessaoId={id} />;
}
