import React from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import IconeCategoria from './IconeCategoria';
import BarraOrcamento, { StatusOrcamento } from './BarraOrcamento';
import { formatarMoeda } from '../../lib/formatters';

/**
 * Resumo do orçamento do mês no Início: as 3 categorias mais usadas (a API já ordena por %).
 * Só aparece com ORCAMENTO_VISUALIZAR (o Dashboard decide).
 *
 * Props: orcamento (OrcamentoMesResponseDto | null), carregando, className.
 */
export default function OrcamentosResumo({ orcamento, carregando = false, className }) {
  const itens = orcamento?.itens ?? [];
  const top = itens.slice(0, 3);
  const pct = Number(orcamento?.percentualTotal ?? 0);

  return (
    <Card
      className={className}
      loading={carregando && !orcamento}
      icon={Target}
      title="Orçamento do mês"
      subtitle={itens.length ? `${formatarMoeda(orcamento.totalGasto)} de ${formatarMoeda(orcamento.totalLimite)} (${Math.round(pct)}%)` : 'Limites de gasto por categoria'}
      actions={
        <Link to="/orcamentos" className="text-sm font-medium text-primary hover:underline underline-offset-4 min-h-11 inline-flex items-center">
          {itens.length ? 'Ver todos' : 'Criar'}
        </Link>
      }
    >
      {top.length === 0 ? (
        <EmptyState compact icon={Target} title="Sem orçamento definido" description="Defina um limite por categoria em Orçamentos e acompanhe aqui se o gasto está no ritmo." />
      ) : (
        <ul className="space-y-4">
          {top.map((o, i) => (
            <li key={o.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <IconeCategoria nome={o.categoria?.icone} tamanho="sm" cor={`var(--color-chart-${(i % 5) + 2})`} />
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{o.categoria?.descricao}</span>
                <StatusOrcamento status={o.status} />
              </div>
              <BarraOrcamento item={o} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
