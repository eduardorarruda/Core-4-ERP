import React from 'react';
import { useParams } from 'react-router-dom';
import ConciliacaoRelatorioView from '../components/conciliacao/ConciliacaoRelatorioView';

/** /conciliacao/:id/relatorio */
export default function ConciliacaoRelatorio() {
  const { id } = useParams();
  return <ConciliacaoRelatorioView modo="banco" id={id} />;
}
