import React from 'react';
import { CalendarDays, Lightbulb, ReceiptText, ShoppingBag, Wallet } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import { PageSkeleton } from '../components/ui/Skeleton';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import { MonthSelector } from '../components/ui/PeriodoSelector';
import { RitmoDoMes, GastoPorDiaDaSemana } from '../components/dashboard/InsightsGraficos';
import { FrasesInsight, ProjecaoMes, ForaDoNormal, MaioresGastos } from '../components/dashboard/InsightsListas';
import { insights as insightsApi } from '../lib/api';
import { useMesUrl } from '../hooks/usePeriodoUrl';
import { useCarga } from '../hooks/useCarga';
import { mesAtual } from '../lib/periodo';

/**
 * Insights (rota /insights, DASHBOARD_VISUALIZAR): o mês explicado em frases e gráficos —
 * ritmo vs. mês anterior, dia da semana, categorias fora do normal, maiores gastos e projeção.
 * Dados: GET /api/insights?mes=AAAA-MM. "Gasto" = contas a pagar (pelo vencimento) + cartão.
 */
export default function Insights() {
  const [anoMes, setAnoMes] = useMesUrl();
  const { dados: d, erro, carregandoInicial, carregando, recarregar } = useCarga(() => insightsApi.doMes(anoMes), [anoMes]);

  const futuro = anoMes > mesAtual();
  const semDados = d && Number(d.resumo?.quantidade ?? 0) === 0 && Number(d.projecao?.valorProjetado ?? 0) === 0;
  const variacao = d?.ritmo?.variacaoVsMesAnterior;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Lightbulb}
        title="Insights"
        subtitle="O que mudou no seu gasto, explicado em frases curtas e gráficos."
        actions={<MonthSelector value={anoMes} onChange={setAnoMes} label="Mês dos insights" />}
      />

      {carregandoInicial ? (
        <PageSkeleton />
      ) : erro && !d ? (
        <AlertaErro mensagem={erro.message || 'Não deu para carregar os insights.'} onTentarNovamente={recarregar} />
      ) : semDados ? (
        <Card>
          <EmptyState
            icon={Lightbulb}
            title={futuro ? 'Este mês ainda não começou' : 'Sem gastos neste mês'}
            description={futuro
              ? 'Os insights aparecem quando houver contas ou compras no cartão neste mês.'
              : 'Quando houver contas a pagar ou compras no cartão neste mês, mostramos aqui o ritmo, o que fugiu do normal e a projeção.'}
          />
        </Card>
      ) : (
        <div className={carregando ? 'opacity-70 transition-opacity' : 'transition-opacity'} aria-busy={carregando}>
          <div className="space-y-6">
            <FrasesInsight frases={d?.frases ?? []} />

            <section aria-labelledby="ins-kpis">
              <h2 id="ins-kpis" className="sr-only">Números do mês</h2>
              <KpiGrid cols={4}>
                <KpiCard
                  label={d?.diaReferencia ? `Gasto até o dia ${d.diaReferencia}` : 'Gasto no mês'}
                  valor={d?.resumo?.totalAteHoje}
                  tendencia={variacao == null ? undefined : Number(variacao)}
                  inverterDelta
                  contexto="vs. mesmo ponto do mês anterior"
                  icon={Wallet}
                  tom="expense"
                  destaque
                />
                <KpiCard label="Gastos registrados" valor={d?.resumo?.quantidade} formato="numero" icon={ShoppingBag} ajuda="Contas a pagar e compras no cartão até a data de referência." />
                <KpiCard label="Valor médio" valor={d?.resumo?.ticketMedio} icon={ReceiptText} ajuda="Gasto dividido pelo número de lançamentos." />
                <KpiCard label="Média por dia" valor={d?.resumo?.mediaDiaria} icon={CalendarDays} ajuda="Gasto dividido pelos dias já passados do mês." />
              </KpiGrid>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              <RitmoDoMes className="lg:col-span-12 xl:col-span-8" ritmo={d?.ritmo} diaReferencia={d?.diaReferencia} />
              <ProjecaoMes className="lg:col-span-12 xl:col-span-4" projecao={d?.projecao} diasNoMes={d?.diasNoMes} diaReferencia={d?.diaReferencia} />
              <GastoPorDiaDaSemana className="lg:col-span-6 xl:col-span-4" dias={d?.gastoPorDiaDaSemana ?? []} />
              <ForaDoNormal className="lg:col-span-6 xl:col-span-4" categorias={d?.categoriasForaDoNormal ?? []} />
              <MaioresGastos className="lg:col-span-12 xl:col-span-4" gastos={d?.maioresGastos ?? []} />
            </div>

            <p className="text-xs text-text-primary/55 max-w-3xl">
              Como contamos: gasto = contas a pagar pela data de vencimento (pagas ou não) + compras no cartão pela data
              da compra, cada parcela no seu mês. As contas geradas pelo fechamento da fatura não entram, para não contar o
              cartão duas vezes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
