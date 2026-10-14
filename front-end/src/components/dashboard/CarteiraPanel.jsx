import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';
import Card from '../ui/Card';
import DonutChart from '../ui/DonutChart';
import EmptyState from '../ui/EmptyState';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Patrimônio: rosca do que está investido por tipo (o `tipoNome` que a API devolve — tipos
 * customizados) e, no rodapé, o patrimônio líquido (contas + investimentos − limite usado nos
 * cartões). Só aparece com INVESTIMENTO_VISUALIZAR (o Dashboard decide).
 *
 * Props: carteiras (ContaInvestimento[]), saldoContas, dividaCartoes (limite usado), carregando, className.
 */
const CORES_TIPO = ['var(--color-invest)', 'var(--color-chart-2)', 'var(--color-chart-5)', 'var(--color-chart-1)', 'var(--color-chart-4)', 'var(--color-chart-6)'];

export default function CarteiraPanel({ carteiras = [], saldoContas = 0, dividaCartoes = 0, carregando = false, className }) {
  const fatias = useMemo(() => {
    const porTipo = carteiras.reduce((acc, c) => {
      const tipo = c.tipoNome?.trim() || 'Sem tipo';
      return { ...acc, [tipo]: (acc[tipo] ?? 0) + Number(c.saldoAtual ?? 0) };
    }, {});
    return Object.entries(porTipo)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, valor], i) => ({ id: nome, nome, valor, cor: CORES_TIPO[i % CORES_TIPO.length] }));
  }, [carteiras]);

  const investido = fatias.reduce((s, f) => s + f.valor, 0);
  const liquido = Number(saldoContas) + investido - Number(dividaCartoes);

  return (
    <Card
      className={className}
      loading={carregando}
      icon={PiggyBank}
      title="Patrimônio investido"
      subtitle={`${carteiras.length} ${carteiras.length === 1 ? 'carteira' : 'carteiras'}, por tipo de investimento`}
      actions={
        <Link to="/investimentos" className="text-sm font-medium text-primary hover:underline underline-offset-4 min-h-11 inline-flex items-center">
          Ver carteiras
        </Link>
      }
      footer={investido > 0 ? (
        <p className="text-sm text-text-primary/70 leading-relaxed">
          Somando o saldo das contas e descontando o que já foi usado dos cartões, seu patrimônio líquido é{' '}
          <strong className={cn('tabular-nums valor-privado', liquido < 0 ? 'text-expense' : 'text-text-primary')}>{formatarMoeda(liquido)}</strong>.
        </p>
      ) : null}
    >
      {investido <= 0 ? (
        <EmptyState compact tom="invest" icon={PiggyBank} title="Nenhum investimento ainda" description="Cadastre uma carteira em Investimentos para acompanhar quanto você tem guardado." />
      ) : (
        <DonutChart titulo="Patrimônio investido por tipo" fatias={fatias} rotuloCentro="Investido" tamanho={168} className="sm:flex-col" />
      )}
    </Card>
  );
}
