import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CreditCard, Layers, LineChart, PieChart, Plus, Receipt, Store, Wallet,
} from 'lucide-react';
import { cartoes as cartoesApi, contasCorrentes as contasApi } from '../lib/api';
import { useCarga } from '../hooks/useCarga';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import { usePeriodoUrl } from '../hooks/usePeriodoUrl';
import { paraMesAno, rotuloPeriodo } from '../lib/periodo';
import { formatarMoeda, formatarNumero } from '../lib/formatters';
import PageHeader from '../components/ui/PageHeader';
import PeriodoSelector from '../components/ui/PeriodoSelector';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import DonutChart from '../components/ui/DonutChart';
import { PageSkeleton } from '../components/ui/Skeleton';
import { ProgressBar } from '../components/ui/Progress';
import CartoesTabs from '../components/cartoes/CartoesTabs';
import CartaoFormModal from '../components/cartoes/CartaoFormModal';
import ParcelamentosLista from '../components/cartoes/ParcelamentosLista';
import ProximasFaturas from '../components/cartoes/ProximasFaturas';
import { Comprometimento, EvolucaoFatura, GastosPorCategoria, Ranking } from '../components/cartoes/GraficosCartao';
import { tomLimite } from '../components/cartoes/faturas';

/*
 * Cartões → Visão geral (/cartoes/dashboard, CARTAO_VISUALIZAR).
 * UM controle de período (PeriodoSelector + URL) para TODOS os painéis, inclusive categorias.
 * Hierarquia: KPIs → evolução + próximas faturas → categorias + parceiros → parcelamentos
 * → assinaturas x avulsos. Sem cartões: só o estado vazio (o BI nem é chamado).
 */

const ATALHOS = ['mes', '3m', '6m', '12m'];
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null)).toString();


export default function CartaoDashboard() {
  const toast = useToast();
  const pode = usePermissao();
  const [periodo, setPeriodo] = usePeriodoUrl('3m');
  const [novoCartao, setNovoCartao] = useState(false);
  const mesAno = paraMesAno(periodo);
  const chavePeriodo = [periodo.inicio, periodo.fim];

  const cargaCartoes = useCarga(() => cartoesApi.listar(), ['cartoes']);
  const cartoes = useMemo(() => cargaCartoes.dados ?? [], [cargaCartoes.dados]);
  const temCartoes = cartoes.length > 0;

  // O BI e o resumo só rodam com cartões (sem eles o BI falhava e gerava toasts duplicados)
  const cargaBi = useCarga(() => cartoesApi.dashboardBI(qs(mesAno)), chavePeriodo, { ativo: temCartoes });
  const cargaResumo = useCarga(() => cartoesApi.dashboard(qs(mesAno)), chavePeriodo, { ativo: temCartoes, inicial: [] });
  const cargaParcelas = useCarga(() => cartoesApi.parcelamentos(), ['parcelamentos'], { ativo: temCartoes, inicial: [] });
  const cargaContas = useCarga(() => contasApi.listar(), ['contas'], { ativo: novoCartao, inicial: [] });

  const bi = cargaBi.dados;
  const limite = cartoes.reduce((s, c) => s + (Number(c.limite) || 0), 0);
  const usado = cartoes.reduce((s, c) => s + (Number(c.limiteUsado) || 0), 0);
  const fracaoUso = limite > 0 ? usado / limite : 0;
  const emAberto = (bi?.proximasFaturas ?? []).reduce((s, f) => s + (Number(f.valorAcumulado) || 0), 0);
  const parceiros = (bi?.gastosPorParceiro ?? []).slice(0, 6).map((p) => ({ nome: p.nomeParceiro, valor: Number(p.total) || 0 }));
  const assinaturas = Number(bi?.assinaturasVsAvulsos?.totalAssinaturas) || 0;
  const avulsos = Number(bi?.assinaturasVsAvulsos?.totalAvulsos) || 0;
  const rotulo = rotuloPeriodo(periodo, { ids: ATALHOS, granularidade: 'mes' });

  const cabecalho = (
    <PageHeader
      title="Cartões"
      subtitle="Quanto está nas faturas, quanto do limite sobra e para onde vai o gasto."
      icon={CreditCard}
      actions={temCartoes && pode('CARTAO_LANCAR') ? (
        <Link to="/cartoes?novo=lancamento" className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-sm font-semibold text-on-primary bg-gradient-primary shadow-[var(--shadow-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
          <Plus className="w-4 h-4" aria-hidden="true" /> Novo lançamento
        </Link>
      ) : undefined}
    >
      <CartoesTabs />
    </PageHeader>
  );

  if (cargaCartoes.carregandoInicial) {
    return <div className="space-y-6">{cabecalho}<PageSkeleton kpis={3} /></div>;
  }

  if (cargaCartoes.erro && !temCartoes) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <AlertaErro mensagem={cargaCartoes.erro.message} onTentarNovamente={cargaCartoes.recarregar} />
      </div>
    );
  }

  if (!temCartoes) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <EmptyState
          icon={CreditCard}
          title="Você ainda não tem cartões"
          description="Cadastre um cartão para ver aqui o total das faturas, o uso do limite, as compras parceladas e para onde vai o gasto."
          action={pode('CARTAO_CRIAR') ? { label: 'Cadastrar cartão', onClick: () => setNovoCartao(true), icon: Plus } : undefined}
          dica={pode('CARTAO_CRIAR') ? undefined : 'Peça a quem administra a empresa para cadastrar os cartões.'}
        />
        <CartaoFormModal
          open={novoCartao}
          contas={cargaContas.dados ?? []}
          onFechar={() => setNovoCartao(false)}
          onSalvo={() => { toast.success('Cartão adicionado.'); setNovoCartao(false); cargaCartoes.recarregar(); }}
        />
      </div>
    );
  }

  const biCarregando = cargaBi.carregando && !bi;
  const erroBi = cargaBi.erro ? (
    <AlertaErro
      compacto
      titulo="Não deu para carregar as análises deste período"
      mensagem="Os demais painéis continuam valendo. Tente de novo em instantes."
      onTentarNovamente={cargaBi.recarregar}
    />
  ) : null;

  return (
    <div className="space-y-6">
      {cabecalho}

      <FilterBar
        periodo={<PeriodoSelector value={periodo} onChange={setPeriodo} granularidade="mes" atalhos={ATALHOS} label="Período das análises" />}
        acoes={<p className="text-xs text-text-primary/60 hidden sm:block" aria-live="polite">Mostrando {rotulo.toLowerCase()}</p>}
      />

      {bi?.alertasFechamento?.length > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-text-primary/85">
            <span className="font-semibold text-warning">Fatura fechando: </span>
            {bi.alertasFechamento.map((a) => `${a.nomeCartao} ${a.diasRestantes === 0 ? 'fecha hoje' : `fecha em ${a.diasRestantes} dia${a.diasRestantes === 1 ? '' : 's'}`}`).join(' · ')}.
            {' '}Compras depois disso vão para a fatura seguinte.
          </p>
        </div>
      )}

      {/* Primário: 3 números. O limite aparece só aqui (uma vez). */}
      <KpiGrid cols={3}>
        <KpiCard
          label="Próximas faturas"
          valor={emAberto}
          icon={Receipt}
          tom="primary"
          destaque
          loading={biCarregando}
          ajuda="Soma da próxima fatura de cada cartão, com o que já foi lançado até agora."
        />
        <KpiCard
          label="Limite usado"
          valor={usado}
          icon={CreditCard}
          tom={tomLimite(fracaoUso) === 'expense' ? 'expense' : 'neutro'}
          ajuda="Compras ainda não pagas, incluindo parcelas futuras, somadas em todos os cartões."
        >
          <span className="flex items-center gap-2">
            <ProgressBar valor={fracaoUso} tom={tomLimite(fracaoUso)} altura={6} label="Uso do limite total" className="w-20 sm:w-24 shrink-0" />
            <span className="tabular-nums">{formatarNumero(fracaoUso * 100, 'percent', { casas: 0 })} de {formatarMoeda(limite, { casas: 0 })}</span>
          </span>
        </KpiCard>
        <KpiCard label="Limite disponível" valor={limite - usado} icon={Wallet} tom="income" ajuda="Quanto ainda dá para gastar somando todos os cartões." />
      </KpiGrid>

      {/* Secundário: evolução + próximas faturas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <Card className="lg:col-span-8" icon={LineChart} title="Evolução das faturas" subtitle={`Total de cada fatura · ${rotulo.toLowerCase()}`} loading={biCarregando}>
          <div>
            {erroBi ?? (bi?.evolucaoMensal?.length
              ? <EvolucaoFatura dados={bi.evolucaoMensal} />
              : <p className="text-sm text-text-primary/65">Sem faturas no período.</p>)}
          </div>
        </Card>
        <Card className="lg:col-span-4" icon={CalendarClock} title="Próximas faturas" subtitle="O que vence primeiro" loading={biCarregando}>
          {erroBi ? null : <ProximasFaturas itens={bi?.proximasFaturas ?? []} alertas={bi?.alertasFechamento ?? []} />}
          {erroBi && <p className="text-sm text-text-primary/65">Indisponível no momento.</p>}
        </Card>
      </div>

      {/* Detalhe: categorias (respeita o período) + parceiros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <Card className="lg:col-span-8" icon={PieChart} title="Gastos por categoria" subtitle={`Por mês da fatura · ${rotulo.toLowerCase()}`} loading={cargaResumo.carregandoInicial}>
          {cargaResumo.erro ? (
            <AlertaErro compacto mensagem={cargaResumo.erro.message} onTentarNovamente={cargaResumo.recarregar} />
          ) : (cargaResumo.dados ?? []).length ? (
            <GastosPorCategoria resumo={cargaResumo.dados} />
          ) : (
            <p className="text-sm text-text-primary/65">Sem gastos no período.</p>
          )}
        </Card>
        <Card className="lg:col-span-4" icon={Store} title="Onde mais gastou" subtitle="Parceiros com maior gasto no período" loading={biCarregando}>
          {erroBi ? <p className="text-sm text-text-primary/65">Indisponível no momento.</p>
            : parceiros.length ? <Ranking itens={parceiros} rotulo="Parceiros com maior gasto" />
              : <p className="text-sm text-text-primary/65">Sem gastos no período.</p>}
        </Card>
      </div>

      {/* Parcelamentos + assinaturas x avulsos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <Card className="lg:col-span-7" icon={Layers} title="Compras parceladas" subtitle="Parcelas pagas, quanto falta e quando termina" loading={cargaParcelas.carregandoInicial}>
          {bi?.impactoParcelamentos?.length > 0 && (
            <div className="mb-5">
              <p className="c4-eyebrow mb-2">Já comprometido nos próximos meses</p>
              <Comprometimento dados={bi.impactoParcelamentos} />
            </div>
          )}
          {cargaParcelas.erro
            ? <AlertaErro compacto mensagem={cargaParcelas.erro.message} onTentarNovamente={cargaParcelas.recarregar} />
            : <ParcelamentosLista itens={cargaParcelas.dados ?? []} />}
        </Card>
        <Card className="lg:col-span-5" icon={Receipt} title="Assinaturas e compras avulsas" subtitle="Quanto do gasto no período é recorrente" loading={biCarregando}>
          {erroBi ? <p className="text-sm text-text-primary/65">Indisponível no momento.</p>
            : assinaturas + avulsos > 0 ? (
              <DonutChart
                titulo="Assinaturas e compras avulsas no período"
                rotuloCentro="Total no período"
                tamanho={170}
                className="lg:flex-col lg:items-stretch [&>div:first-child]:self-center"
                fatias={[
                  { id: 'assinaturas', nome: 'Assinaturas', valor: assinaturas, cor: 'var(--color-chart-2)' },
                  { id: 'avulsos', nome: 'Compras avulsas', valor: avulsos, cor: 'var(--color-chart-1)' },
                ]}
              />
            ) : <p className="text-sm text-text-primary/65">Sem gastos no período.</p>}
        </Card>
      </div>
    </div>
  );
}
