import React from 'react';
import { Lightbulb } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import BentoCard from '../components/ui/BentoCard';
import EmptyState from '../components/ui/EmptyState';

/**
 * Insights (rota /insights, permissão DASHBOARD_VISUALIZAR).
 * Esqueleto inicial — a Área A implementa a tela (frases com números sobre o mês,
 * MonthSelector + useMesUrl).
 */
export default function Insights() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Lightbulb}
        title="Insights"
        subtitle="O que mudou no seu dinheiro, explicado em frases curtas."
      />
      <BentoCard>
        <EmptyState
          icon={Lightbulb}
          title="Insights em breve"
          description="Quando houver movimentação suficiente no mês, mostramos aqui o que subiu, o que caiu e o que merece atenção."
        />
      </BentoCard>
    </div>
  );
}
