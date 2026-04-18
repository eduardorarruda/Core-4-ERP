import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Wallet, Receipt, AlertTriangle, Target, Bolt, CreditCard } from 'lucide-react';
import BentoCard from '../components/ui/BentoCard';
import { dashboard } from '../lib/api';
import { cn } from '../lib/utils';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLORS = ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFD8A8', '#D8A8FF', '#A8FFD8'];
const brl = (v) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    dashboard.resumo()
      .then(setDados)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const fluxoMensal = dados?.fluxoMensal ?? [];
  const cashFlowData = fluxoMensal.map((m) => ({
    name: MESES[m.mes - 1],
    entradas: Number(m.totalRecebido),
    saidas: Number(m.totalPago),
  }));

  const resultsData = fluxoMensal.map((m) => ({
    name: MESES[m.mes - 1],
    income: Number(m.totalRecebido),
    expense: Number(m.totalPago),
  }));

  const despesas = dados?.despesasPorCategoria ?? [];
  const pieData = despesas.length > 0
    ? despesas.map((d, i) => ({ name: d.categoria, value: Number(d.total), color: COLORS[i % COLORS.length] }))
    : [{ name: 'Sem Despesas', value: 1, color: '#353534' }];

  const mesAtual = fluxoMensal[fluxoMensal.length - 1];
  const receitasMes = Number(mesAtual?.totalRecebido ?? 0);
  const despesasMes = Number(mesAtual?.totalPago ?? 0);
  const totalDespesasCat = despesas.reduce((acc, d) => acc + Number(d.total), 0);

  const saldo = Number(dados?.saldoTotalContasCorrentes ?? 0);
  const aReceber = Number(dados?.totalAReceber ?? 0);
  const aPagar = Number(dados?.totalAPagar ?? 0);
  const patrimonio = Number(dados?.patrimonioInvestimentos ?? 0);
  const limiteDisp = Number(dados?.limiteTotalCartoes ?? 0) - Number(dados?.limiteUsadoTotalCartoes ?? 0);
  const vencendoHoje = dados?.contasVencendoHoje ?? 0;
  const atrasadas = dados?.contasAtrasadas ?? 0;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 text-sm animate-pulse">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Dashboard Principal</h1>
        <p className="text-zinc-500 text-xs sm:text-sm">Visão Geral do seu ecossistema financeiro</p>
      </div>

      {/* Alertas */}
      {(vencendoHoje > 0 || atrasadas > 0) && (
        <div className="flex flex-wrap gap-3">
          {atrasadas > 0 && (
            <Link to="/contas" className="flex items-center gap-2 px-4 py-2 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold hover:bg-red-950/80 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              {atrasadas} conta{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}
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
          className="col-span-12 lg:col-span-8 relative"
          title="Fluxo de Caixa — Últimos 6 Meses"
          headerAction={
            <div className="flex gap-2">
              <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-primary">ENTRADAS</span>
              <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-zinc-400">SAÍDAS</span>
            </div>
          }
        >
          <div className="h-[200px] sm:h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EFFC0" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6EFFC0" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB4AB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFB4AB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#353534" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1B1B', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `R$ ${brl(value)}`}
                />
                <Area type="monotone" dataKey="entradas" stroke="#6EFFC0" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
                <Area type="monotone" dataKey="saidas" stroke="#FFB4AB" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Saldos */}
        <BentoCard className="col-span-12 lg:col-span-4" title="Saldos de Caixa">
          <div className="space-y-3 mt-4">
            {[
              { label: 'Contas Correntes', value: saldo, icon: Wallet, color: saldo >= 0 ? 'primary' : 'error' },
              { label: 'A Receber', value: aReceber, icon: TrendingUp, color: 'secondary' },
              { label: 'A Pagar', value: aPagar, icon: Receipt, color: 'error' },
              { label: 'Investimentos', value: patrimonio, icon: TrendingUp, color: 'primary' },
              { label: 'Limite Disponível (Cartões)', value: limiteDisp, icon: CreditCard, color: limiteDisp >= 0 ? 'primary' : 'error' },
            ].map((item, i) => (
              <div key={i} className={`p-3 bg-surface-low rounded-lg flex justify-between items-center ${item.color === 'error' ? 'border-l-4 border-error/50' : item.color === 'secondary' ? 'border-l-4 border-secondary/50' : ''}`}>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{item.label}</p>
                <p className={`text-sm font-bold ${item.color === 'error' ? 'text-error' : item.color === 'secondary' ? 'text-secondary' : 'text-primary'}`}>
                  R$ {brl(item.value)}
                </p>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Resultados de Caixa */}
        <BentoCard className="col-span-12 lg:col-span-6" title="Resultados de Caixa">
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resultsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#353534" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1B1B', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `R$ ${brl(value)}`}
                />
                <Bar dataKey="income" name="Receitas" fill="#ACC7FF" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#FFB4AB" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-secondary rounded-full"></span> Receitas</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-error rounded-full"></span> Despesas</div>
          </div>
        </BentoCard>

        {/* Resultado do Mês */}
        <BentoCard className="col-span-12 lg:col-span-6" title="Resultado do Mês Atual">
          <div className="space-y-8 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Saldo Total (Contas Correntes)</p>
              <p className={cn('text-3xl font-bold', saldo >= 0 ? 'text-primary' : 'text-error')}>
                R$ {brl(saldo)}
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Despesas por Categoria */}
        <BentoCard className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center" title="Despesas por Categoria">
          <div className="relative w-48 h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1B1B', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `R$ ${brl(value)}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-primary">R$ {brl(totalDespesasCat)}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Mês Atual</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-8">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-zinc-400 uppercase font-bold truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Metas */}
        <BentoCard className="col-span-12 lg:col-span-4 flex flex-col justify-between group overflow-hidden relative" title="Metas e Performance">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="py-8 text-center space-y-3">
            <Target className="w-12 h-12 text-zinc-700 mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">Recurso não configurado</p>
          </div>
          <button className="w-full bg-primary text-on-primary py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all flex items-center justify-center gap-2">
            <Bolt className="w-4 h-4" />
            Configurar Metas
          </button>
        </BentoCard>

        {/* Acesso Rápido */}
        <BentoCard className="col-span-12 lg:col-span-4" title="Acesso Rápido">
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: 'Lançamentos', path: '/contas', color: 'text-secondary' },
              { label: 'Cartões', path: '/cartoes', color: 'text-primary' },
              { label: 'Investimentos', path: '/investimentos', color: 'text-primary' },
              { label: 'Parceiros', path: '/parceiros', color: 'text-zinc-300' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="p-4 bg-surface-low rounded-xl hover:bg-surface-medium transition-colors"
              >
                <span className={`text-xs font-bold uppercase tracking-widest ${item.color}`}>{item.label}</span>
              </Link>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
