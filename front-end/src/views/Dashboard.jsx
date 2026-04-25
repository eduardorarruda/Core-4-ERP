import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, PieChart as PieIcon, Repeat, RefreshCw } from 'lucide-react';
import BentoCard from '../components/ui/BentoCard';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import SaldoDetalhadoPanel from '../components/dashboard/SaldoDetalhadoPanel';
import { dashboard, investimentos, assinaturas as assinaturasApi } from '../lib/api';
import { brl } from '../lib/formatters';
import { cn } from '../lib/utils';
import { ThemeContext } from '../context/ThemeContext';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLORS_DARK = ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFD8A8', '#D8A8FF', '#A8FFD8'];
const COLORS_LIGHT = ['#059669', '#2563EB', '#DC2626', '#D97706', '#7C3AED', '#0891B2'];

const TIPO_LABEL = { RENDA_FIXA: 'Renda Fixa', RENDA_VARIAVEL: 'Renda Variável', FUNDOS: 'Fundos', CRIPTO: 'Cripto', OUTROS: 'Outros' };
const TIPO_COLOR = { RENDA_FIXA: 'text-secondary', RENDA_VARIAVEL: 'text-primary', FUNDOS: 'text-amber-400', CRIPTO: 'text-purple-400', OUTROS: 'text-text-primary/60' };

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

  useEffect(() => { fetchAll(); }, []);

  const isDark = theme === 'dark';
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  const gridColor = isDark ? '#353534' : '#E4E4E7';
  const axisColor = isDark ? '#52525b' : '#71717a';
  const tooltipBg = isDark ? '#1C1B1B' : '#FFFFFF';
  const tooltipTextColor = isDark ? '#FAFAFA' : '#18181B';
  const emptyPieColor = isDark ? '#353534' : '#D4D4D8';
  const colorEntradas = isDark ? '#6EFFC0' : '#059669';
  const colorSaidas   = isDark ? '#FFB4AB' : '#DC2626';
  const colorIncome   = isDark ? '#ACC7FF' : '#2563EB';
  const colorExpense  = isDark ? '#FFB4AB' : '#DC2626';

  const fluxoMensal = dados?.fluxoMensal ?? [];

  const cashFlowData = useMemo(() => fluxoMensal.map((m) => ({
    name: MESES[m.mes - 1],
    entradas: Number(m.totalRecebido),
    saidas: Number(m.totalPago),
  })), [fluxoMensal]);

  const resultsData = useMemo(() => fluxoMensal.map((m) => ({
    name: MESES[m.mes - 1],
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

  const patrimonioTotal = carteira.reduce((s, c) => s + Number(c.saldoAtual ?? 0), 0);

  const assinaturasAtivas = assinaturasLista.filter((a) => a.ativa)
    .sort((a, b) => Number(b.valor) - Number(a.valor));
  const totalMensalAssin = assinaturasAtivas.reduce((s, a) => s + Number(a.valor), 0);
  const assinPorCat = assinaturasAtivas.reduce((acc, a) => {
    acc[a.categoriaDescricao] = (acc[a.categoriaDescricao] || 0) + Number(a.valor);
    return acc;
  }, {});
  const pieAssinaturas = Object.entries(assinPorCat).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length],
  }));

  const mediaEntradas = cashFlowData.length > 0
    ? cashFlowData.reduce((s, m) => s + m.entradas, 0) / cashFlowData.length
    : 0;

  const tooltipStyle = { backgroundColor: tooltipBg, border: 'none', borderRadius: '8px', fontSize: '12px', color: tooltipTextColor };

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

      {/* Alertas */}
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
        {/* Fluxo de Caixa */}
        <BentoCard
          className="col-span-12 lg:col-span-8 animate-fade-in-up animate-stagger-1"
          loading={carregando}
          title="Fluxo de Caixa — Últimos 6 Meses"
          headerAction={
            <div className="flex gap-2">
              <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-primary">ENTRADAS</span>
              <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-text-primary/60">SAÍDAS</span>
            </div>
          }
        >
          <div className="w-full mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorEntradas} stopOpacity={isDark ? 0.3 : 0.2}/>
                    <stop offset="95%" stopColor={colorEntradas} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorSaidas} stopOpacity={isDark ? 0.3 : 0.15}/>
                    <stop offset="95%" stopColor={colorSaidas} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
                {mediaEntradas > 0 && (
                  <ReferenceLine y={mediaEntradas} stroke={colorEntradas} strokeDasharray="4 4" strokeOpacity={0.4} />
                )}
                <Area type="monotone" dataKey="entradas" stroke={colorEntradas} fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
                <Area type="monotone" dataKey="saidas" stroke={colorSaidas} fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-text-primary/5">
            <div className="bg-surface-low rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Entradas</span>
              </div>
              <p className="text-base font-bold text-primary">R$ {brl(totalEntradas6m)}</p>
              <p className="text-[10px] text-text-primary/40">acumulado 6 meses</p>
            </div>
            <div className="bg-surface-low rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-error" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Saídas</span>
              </div>
              <p className="text-base font-bold text-error">R$ {brl(totalSaidas6m)}</p>
              <p className="text-[10px] text-text-primary/40">acumulado 6 meses</p>
            </div>
            <div className={cn('bg-surface-low rounded-xl p-4 space-y-1', resultado6m < 0 && 'border border-error/20')}>
              <div className="flex items-center gap-1.5">
                {resultado6m >= 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                  : <TrendingDown className="w-3.5 h-3.5 text-error" />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Resultado</span>
              </div>
              <p className={cn('text-base font-bold', resultado6m >= 0 ? 'text-secondary' : 'text-error')}>
                {resultado6m >= 0 ? '+' : ''}R$ {brl(resultado6m)}
              </p>
              <p className="text-[10px] text-text-primary/40">saldo do período</p>
            </div>
          </div>
        </BentoCard>

        {/* Posição Financeira */}
        <div className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-2">
          <SaldoDetalhadoPanel />
        </div>

        {/* Resultados de Caixa */}
        <BentoCard
          className="col-span-12 lg:col-span-6 animate-fade-in-up animate-stagger-2"
          loading={carregando}
          title="Resultados de Caixa"
        >
          <div className="w-full mt-4">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={resultsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
                <Bar dataKey="income" name="Receitas" fill={colorIncome} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill={colorExpense} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4 text-[10px] font-bold uppercase tracking-widest text-text-primary/50">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-secondary rounded-full"></span> Receitas</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-error rounded-full"></span> Despesas</div>
          </div>
        </BentoCard>

        {/* Resultado do Mês */}
        <BentoCard
          className="col-span-12 lg:col-span-6 animate-fade-in-up animate-stagger-3"
          loading={carregando}
          title="Resultado do Mês Atual"
        >
          <div className="space-y-8 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
                <span>Receitas Recebidas</span>
                <span className="text-secondary">R$ {brl(receitasMes)}</span>
              </div>
              <div className="h-3 w-full bg-surface-low rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((receitasMes / (receitasMes + despesasMes || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
                <span>Despesas Pagas</span>
                <span className="text-error">R$ {brl(despesasMes)}</span>
              </div>
              <div className="h-3 w-full bg-surface-low rounded-full overflow-hidden">
                <div
                  className="h-full bg-error rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((despesasMes / (receitasMes + despesasMes || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-text-primary/5">
              <p className="text-[10px] text-text-primary/50 uppercase font-bold tracking-widest">Saldo Total (Contas Correntes)</p>
              <p className={cn('text-3xl font-bold font-display', saldo >= 0 ? 'text-primary' : 'text-error')}>
                R$ {brl(saldo)}
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Despesas por Categoria */}
        <BentoCard
          className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center animate-fade-in-up animate-stagger-3"
          loading={carregando}
          title="Despesas por Categoria"
        >
          <div className="relative w-48 h-48 mt-4">
            <ResponsiveContainer width={192} height={192}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-primary font-display">R$ {brl(totalDespesasCat)}</span>
              <span className="text-[10px] text-text-primary/50 uppercase font-bold tracking-tighter">Mês Atual</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-8">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-text-primary/60 uppercase font-bold truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Carteira de Investimentos */}
        <BentoCard
          className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-4"
          loading={carregando}
          title="Carteira de Investimentos"
          headerAction={
            <Link to="/investimentos" className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 hover:text-primary transition-colors">
              Ver tudo →
            </Link>
          }
        >
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Patrimônio Total</p>
              <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(patrimonioTotal)}</p>
            </div>
            <PieIcon className="w-8 h-8 text-primary opacity-40" />
          </div>

          {carteira.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-text-primary/50">Nenhuma carteira cadastrada</p>
              <Link to="/investimentos" className="text-xs text-primary hover:underline mt-1 block">Cadastrar investimento</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {carteira.map((c) => {
                const pct = patrimonioTotal > 0 ? (Number(c.saldoAtual) / patrimonioTotal) * 100 : 0;
                const color = TIPO_COLOR[c.tipo] ?? 'text-text-primary/60';
                return (
                  <div key={c.id} className="bg-surface-low rounded-lg px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest shrink-0', color)}>
                          {TIPO_LABEL[c.tipo] ?? c.tipo}
                        </span>
                        <span className="text-xs text-text-primary/80 truncate font-medium">{c.nome}</span>
                      </div>
                      <span className="text-xs font-bold text-text-primary shrink-0 ml-2">R$ {brl(c.saldoAtual)}</span>
                    </div>
                    <div className="h-1 w-full bg-surface-medium rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full transition-all duration-700" style={{ width: `${pct.toFixed(1)}%` }} />
                    </div>
                    <p className="text-[10px] text-text-primary/40 text-right">{pct.toFixed(1)}% do total</p>
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>

        {/* Assinaturas Recorrentes */}
        <BentoCard
          className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-5"
          loading={carregando}
          title="Assinaturas Recorrentes"
          headerAction={
            <Link to="/assinaturas" className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 hover:text-primary transition-colors">
              Gerenciar →
            </Link>
          }
        >
          <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 flex items-center justify-between mb-4 mt-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-error mb-0.5">Custo Mensal</p>
              <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(totalMensalAssin)}</p>
              <p className="text-[10px] text-text-primary/50 mt-0.5">Anual: R$ {brl(totalMensalAssin * 12)}</p>
            </div>
            <Repeat className="w-8 h-8 text-error opacity-40" />
          </div>

          {pieAssinaturas.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieAssinaturas} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                  {pieAssinaturas.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="space-y-2 mt-2">
            {assinaturasAtivas.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-surface-low rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{a.descricao}</p>
                  <p className="text-[10px] text-text-primary/50">dia {a.diaVencimento}</p>
                </div>
                <span className="text-xs font-bold text-error shrink-0 ml-2">R$ {brl(a.valor)}</span>
              </div>
            ))}
            {assinaturasAtivas.length > 4 && (
              <p className="text-[10px] text-text-primary/40 text-center">+{assinaturasAtivas.length - 4} assinatura(s)</p>
            )}
            {assinaturasAtivas.length === 0 && (
              <p className="text-sm text-text-primary/50 text-center py-4">Nenhuma assinatura ativa</p>
            )}
          </div>
        </BentoCard>

        {/* Acesso Rápido */}
        <BentoCard
          className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-6"
          loading={carregando}
          title="Acesso Rápido"
        >
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: 'Lançamentos', path: '/contas', color: 'text-secondary', count: atrasadas > 0 ? `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : null },
              { label: 'Cartões', path: '/cartoes', color: 'text-primary' },
              { label: 'Investimentos', path: '/investimentos', color: 'text-primary' },
              { label: 'Parceiros', path: '/parceiros', color: 'text-text-primary/80' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="p-4 bg-surface-low rounded-xl hover:bg-surface-medium transition-colors group"
              >
                <span className={`text-xs font-bold uppercase tracking-widest ${item.color}`}>{item.label}</span>
                {item.count && (
                  <p className="text-[10px] text-error mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse-dot" />
                    {item.count}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
