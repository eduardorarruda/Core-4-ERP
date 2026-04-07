import React from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { Plus, TrendingUp, Receipt, Wallet, Target, Bolt, ArrowUp, ArrowDown } from 'lucide-react';
import BentoCard from '../components/ui/BentoCard';
import { useTransactions } from '../context/TransactionContext';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { transactions, totalIncome, totalExpense, balance } = useTransactions();

  const cashFlowData = [
    { name: 'Jan', projected: 4000, actual: 2400 },
    { name: 'Feb', projected: 3000, actual: 1398 },
    { name: 'Mar', projected: 2000, actual: 9800 },
    { name: 'Apr', projected: 2780, actual: 3908 },
    { name: 'May', projected: 1890, actual: 4800 },
    { name: 'Jun', projected: 2390, actual: 3800 },
    { name: 'Jul', projected: 3490, actual: 4300 },
  ];

  const resultsData = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
  ];

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const COLORS = ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFD8A8', '#D8A8FF', '#A8FFD8'];

  const pieData = Object.entries(expenseByCategory).length > 0
    ? Object.entries(expenseByCategory).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
    : [{ name: 'Sem Despesas', value: 1, color: '#353534' }];

  const lastTransactions = transactions.slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Dashboard Principal</h1>
        <p className="text-zinc-500 text-xs sm:text-sm">Visão Geral do seu ecossistema financeiro</p>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        {/* Fluxo de Caixa */}
        <BentoCard
          className="col-span-12 lg:col-span-8 relative"
          title="Fluxo de Caixa"
          headerAction={
            <div className="flex gap-2">
              <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-primary">PROJETADO</span>
              <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-zinc-400">REALIZADO</span>
            </div>
          }
        >
          <div className="h-[200px] sm:h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EFFC0" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6EFFC0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#353534" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1B1B', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#6EFFC0' }}
                />
                <Area type="monotone" dataKey="projected" stroke="#6EFFC0" fillOpacity={1} fill="url(#colorProj)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Link to="/transactions" className="absolute bottom-6 right-6 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-[0px_0px_20px_rgba(110,255,192,0.2)] hover:scale-105 active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </Link>
        </BentoCard>

        {/* Saldos de Caixa */}
        <BentoCard className="col-span-12 lg:col-span-4" title="Saldos de Caixa">
          <div className="space-y-3 mt-4">
            {[
              { label: 'Conta Corrente', value: `R$ ${balance.toLocaleString('pt-BR')}`, proj: 'R$ 52.100,00', color: balance >= 0 ? 'primary' : 'error' },
              { label: 'Caixa Geral', value: '- R$ 1.420,00', proj: 'R$ 800,00', color: 'error' },
              { label: 'Investimento Curto', value: 'R$ 128.000,00', proj: 'R$ 130.500,00', color: 'primary' },
            ].map((item, i) => (
              <div key={i} className={`p-4 bg-surface-low rounded-lg flex justify-between items-center ${item.color === 'error' ? 'border-l-4 border-error/50' : ''}`}>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color === 'error' ? 'text-error' : 'text-primary'}`}>{item.value}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-zinc-600 uppercase font-bold">Projetado</p>
                  <p className="text-sm font-semibold text-zinc-300">{item.proj}</p>
                </div>
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
                />
                <Bar dataKey="income" fill="#ACC7FF" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" fill="#FFB4AB" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-secondary rounded-full"></span> Receitas</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-error rounded-full"></span> Despesas</div>
          </div>
        </BentoCard>

        {/* Últimos Lançamentos */}
        <BentoCard className="col-span-12 lg:col-span-6 flex flex-col" title="Últimos Lançamentos">
          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-surface-low flex items-center justify-center mb-2">
                <Receipt className="w-8 h-8 text-zinc-600" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Últimos Lançamentos</h2>
              <p className="text-sm text-zinc-500 max-w-xs mb-4">Você ainda não possui movimentações recentes registradas no sistema.</p>
              <div className="flex gap-3">
                <Link to="/transactions" className="bg-primary text-on-primary px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">Fazer lançamento</Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 flex-1">
              {lastTransactions.map((tx) => (
                <div key={tx.id} className="p-3 bg-surface-low rounded-lg flex items-center justify-between group hover:bg-surface-medium transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      tx.type === 'income' ? "bg-primary/10 text-primary" : "bg-error/10 text-error"
                    )}>
                      {tx.type === 'income' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{tx.description}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{tx.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      tx.type === 'income' ? "text-primary" : "text-error"
                    )}>
                      {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[9px] text-zinc-600 font-bold">{tx.date}</p>
                  </div>
                </div>
              ))}
              <div className="pt-4 flex justify-center">
                <Link to="/transactions" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Ver todas as movimentações</Link>
              </div>
            </div>
          )}
        </BentoCard>

        {/* Resultado do Mês */}
        <BentoCard className="col-span-12 lg:col-span-4" title="Resultado do Mês">
          <div className="space-y-8 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <span>Receitas</span>
                <span className="text-secondary">R$ {totalIncome.toLocaleString('pt-BR')}</span>
              </div>
              <div className="h-3 w-full bg-surface-low rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((totalIncome / (totalIncome + totalExpense || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <span>Despesas</span>
                <span className="text-error">R$ {totalExpense.toLocaleString('pt-BR')}</span>
              </div>
              <div className="h-3 w-full bg-surface-low rounded-full overflow-hidden">
                <div
                  className="h-full bg-error rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((totalExpense / (totalIncome + totalExpense || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Saldo Operacional</p>
              <p className={cn(
                "text-3xl font-bold",
                balance >= 0 ? "text-primary" : "text-error"
              )}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-primary">R$ {totalExpense.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Total Despesas</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-8">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-[10px] text-zinc-400 uppercase font-bold truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Metas */}
        <BentoCard className="col-span-12 lg:col-span-4 flex flex-col justify-between group overflow-hidden relative" title="Metas e Performance" subtitle="Expenses, Revenues, Savings, Investments">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="py-8 text-center space-y-3">
            <Target className="w-12 h-12 text-zinc-700 mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">Resource not configured</p>
          </div>
          <button className="w-full bg-primary text-on-primary py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all flex items-center justify-center gap-2">
            <Bolt className="w-4 h-4" />
            Configurar Metas
          </button>
        </BentoCard>
      </div>
    </div>
  );
}
