import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Landmark, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SaldoDetalhadoPanel from '../components/dashboard/SaldoDetalhadoPanel';
import KpiCards from '../components/dashboard/KpiCards';
import FluxoCaixaChart from '../components/dashboard/FluxoCaixaChart';
import ResultadosCaixaChart from '../components/dashboard/ResultadosCaixaChart';
import ResultadoMesPanel from '../components/dashboard/ResultadoMesPanel';
import DespesasPanel from '../components/dashboard/DespesasPanel';
import CarteiraPanel from '../components/dashboard/CarteiraPanel';
import AssinaturasPanel from '../components/dashboard/AssinaturasPanel';
import AcessoRapidoPanel from '../components/dashboard/AcessoRapidoPanel';
import { dashboard, investimentos, assinaturas as assinaturasApi } from '../lib/api';
import { cn } from '../lib/utils';
import { ThemeContext } from '../context/ThemeContext';
import { MESES_ABREV } from '../lib/constants';

const COLORS_DARK  = ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFD8A8', '#D8A8FF', '#A8FFD8'];
const COLORS_LIGHT = ['#059669', '#2563EB', '#DC2626', '#D97706', '#7C3AED', '#0891B2'];

export default function Dashboard() {
  const { theme } = useContext(ThemeContext);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [carteira, setCarteira] = useState([]);
  const [assinaturasLista, setAssinaturasLista] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchAll = () => {
    setCarregando(true);
    Promise.all([
      dashboard.resumo().catch(() => null),
      investimentos.listar().catch(() => []),
      assinaturasApi.listar().catch(() => []),
    ]).then(([d, inv, assin]) => {
      if (d) setDados(d);
      setCarteira(inv ?? []);
      setAssinaturasLista(assin ?? []);
      setLastUpdate(new Date());
    }).finally(() => setCarregando(false));
  };

  useEffect(() => {
    let cancelled = false;
    setCarregando(true);
    Promise.all([
      dashboard.resumo().catch(() => null),
      investimentos.listar().catch(() => []),
      assinaturasApi.listar().catch(() => []),
    ]).then(([d, inv, assin]) => {
      if (cancelled) return;
      if (d) setDados(d);
      setCarteira(inv ?? []);
      setAssinaturasLista(assin ?? []);
      setLastUpdate(new Date());
    }).finally(() => { if (!cancelled) setCarregando(false); });
    return () => { cancelled = true; };
  }, []);

  const isDark = theme === 'dark';
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  const emptyPieColor = isDark ? '#353534' : '#D4D4D8';

  const fluxoMensal = dados?.fluxoMensal ?? [];

  const cashFlowData = useMemo(() => fluxoMensal.map((m) => ({
    name: MESES_ABREV[m.mes - 1],
    entradas: Number(m.totalRecebido),
    saidas: Number(m.totalPago),
  })), [fluxoMensal]);

  const resultsData = useMemo(() => fluxoMensal.map((m) => ({
    name: MESES_ABREV[m.mes - 1],
    income: Number(m.totalRecebido),
    expense: Number(m.totalPago),
  })), [fluxoMensal]);

  const despesas = dados?.despesasPorCategoria ?? [];
  const pieData = despesas.length > 0
    ? despesas.map((d, i) => ({ name: d.categoria, value: Number(d.total), color: COLORS[i % COLORS.length] }))
    : [{ name: 'Sem Despesas', value: 1, color: emptyPieColor }];

  const mesAtual = fluxoMensal[fluxoMensal.length - 1];
  const receitasMes = Number(mesAtual?.totalRecebido ?? 0);
  const despesasMes = Number(mesAtual?.totalPago ?? 0);
  const totalDespesasCat = despesas.reduce((acc, d) => acc + Number(d.total), 0);

  const saldo = Number(dados?.saldoTotalContasCorrentes ?? 0);
  const vencendoHoje = dados?.contasVencendoHoje ?? 0;
  const atrasadas = dados?.contasAtrasadas ?? 0;

  const totalEntradas6m = cashFlowData.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas6m   = cashFlowData.reduce((s, m) => s + m.saidas, 0);
  const resultado6m     = totalEntradas6m - totalSaidas6m;
  const mediaEntradas   = cashFlowData.length > 0 ? totalEntradas6m / cashFlowData.length : 0;

  const patrimonioTotal = carteira.reduce((s, c) => s + Number(c.saldoAtual ?? 0), 0);

  const assinaturasAtivas = assinaturasLista
    .filter((a) => a.ativa)
    .sort((a, b) => Number(b.valor) - Number(a.valor));
  const totalMensalAssin = assinaturasAtivas.reduce((s, a) => s + Number(a.valor), 0);
  const assinPorCat = assinaturasAtivas.reduce((acc, a) => {
    acc[a.categoriaDescricao] = (acc[a.categoriaDescricao] || 0) + Number(a.valor);
    return acc;
  }, {});
  const pieAssinaturas = Object.entries(assinPorCat).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length],
  }));

  const kpis = [
    { label: 'Saldo em Contas',    value: saldo,          chip: saldo >= 0 ? '▲ Positivo' : '▼ Negativo', chipOk: saldo >= 0,  icon: Landmark,       color: 'primary' },
    { label: 'Receitas do Mês',    value: receitasMes,    chip: '▲ Entradas',  chipOk: true,              icon: ArrowUpCircle,  color: 'primary' },
    { label: 'Despesas do Mês',    value: despesasMes,    chip: '▼ Saídas',    chipOk: false,             icon: ArrowDownCircle, color: 'error' },
    { label: 'Patrimônio Investido', value: patrimonioTotal, chip: '▲ Carteira', chipOk: true,            icon: Wallet,         color: 'secondary' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do seu ecossistema financeiro"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-primary/30 hidden sm:block">
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={fetchAll}
              disabled={carregando}
              aria-label="Atualizar dashboard"
              className="p-2 rounded-xl bg-surface-medium border border-text-primary/5 text-text-primary/60 hover:text-text-primary hover:border-text-primary/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', carregando && 'animate-spin')} />
            </button>
          </div>
        }
      />

      <KpiCards kpis={kpis} carregando={carregando} />

      {(vencendoHoje > 0 || atrasadas > 0) && (
        <div className="flex flex-wrap gap-3 animate-fade-in-up animate-stagger-1">
          {atrasadas > 0 && (
            <Link to="/contas" className="flex items-center gap-2 px-4 py-2 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold hover:bg-red-950/80 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse-dot" />
                {atrasadas} conta{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}
              </span>
            </Link>
          )}
          {vencendoHoje > 0 && (
            <Link to="/contas" className="flex items-center gap-2 px-4 py-2 bg-amber-950/60 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold hover:bg-amber-950/80 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              {vencendoHoje} conta{vencendoHoje > 1 ? 's' : ''} vencendo hoje
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <FluxoCaixaChart
          cashFlowData={cashFlowData}
          carregando={carregando}
          isDark={isDark}
          totalEntradas6m={totalEntradas6m}
          totalSaidas6m={totalSaidas6m}
          resultado6m={resultado6m}
          mediaEntradas={mediaEntradas}
        />

        <div className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-2">
          <SaldoDetalhadoPanel />
        </div>

        <ResultadosCaixaChart resultsData={resultsData} carregando={carregando} isDark={isDark} />

        <ResultadoMesPanel receitasMes={receitasMes} despesasMes={despesasMes} saldo={saldo} carregando={carregando} />

        <DespesasPanel pieData={pieData} totalDespesasCat={totalDespesasCat} carregando={carregando} isDark={isDark} />

        <CarteiraPanel carteira={carteira} patrimonioTotal={patrimonioTotal} carregando={carregando} />

        <AssinaturasPanel
          assinaturasAtivas={assinaturasAtivas}
          totalMensalAssin={totalMensalAssin}
          pieAssinaturas={pieAssinaturas}
          carregando={carregando}
          isDark={isDark}
        />

        <AcessoRapidoPanel atrasadas={atrasadas} carregando={carregando} />
      </div>
    </div>
  );
}
