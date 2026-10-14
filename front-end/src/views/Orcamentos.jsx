import React from 'react';
import { Target } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import BentoCard from '../components/ui/BentoCard';
import EmptyState from '../components/ui/EmptyState';

/**
 * Orçamentos (rota /orcamentos, permissão ORCAMENTO_VISUALIZAR).
 * Esqueleto inicial — a Área A implementa a tela (limites por categoria, ProgressBar com ritmo,
 * MonthSelector + useMesUrl).
 */
export default function Orcamentos() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Orçamentos"
        subtitle="Defina quanto quer gastar por categoria e acompanhe o uso ao longo do mês."
      />
      <BentoCard>
        <EmptyState
          icon={Target}
          title="Orçamentos em breve"
          description="Aqui você vai definir um limite por categoria e ver, dia a dia, se o gasto está dentro do ritmo."
        />
      </BentoCard>
    </div>
  );
}
