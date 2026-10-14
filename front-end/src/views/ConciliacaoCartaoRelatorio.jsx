import React from 'react';
import { useParams } from 'react-router-dom';
import ConciliacaoRelatorioView from '../components/conciliacao/ConciliacaoRelatorioView';

/** /cartoes/conciliacao/:id/relatorio */
export default function ConciliacaoCartaoRelatorio() {
  const { id } = useParams();
  return <ConciliacaoRelatorioView modo="cartao" id={id} />;
}
