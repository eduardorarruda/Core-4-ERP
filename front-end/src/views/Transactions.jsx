import React, { useState, useRef } from 'react';
import { Filter, Plus, Download, MoreVertical, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import BentoCard from '../components/ui/BentoCard';
import { useTransactions } from '../context/TransactionContext';

export default function Transactions() {
  const { transactions, addTransaction, deleteTransaction, totalIncome, totalExpense, balance } = useTransactions();

  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Realizado');
  const [category, setCategory] = useState('Outros');
  const [account, setAccount] = useState('Itaú Corp.');

  const formRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const handleAddTransaction = () => {
    if (!description || !amount || !date) return;
    const normalizedAmount = amount.replace(',', '.');
    const parsedAmount = parseFloat(normalizedAmount);
    if (isNaN(parsedAmount)) return;
    addTransaction({ date, description, category, account, status, amount: parsedAmount, type });
    handleClear();
  };

  const handleClear = () => {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('Realizado');
    setCategory('Outros');
    setAccount('Itaú Corp.');
    setType('expense');
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
    descriptionInputRef.current?.focus();
  };

  const formatDate = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${day} ${months[parseInt(month) - 1]}, ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">Lançamentos Financeiros</h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">Gerencie seu fluxo de caixa com precisão arquitetural.</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface-medium text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-surface-highest transition-colors flex items-center justify-center gap-2">
            <Filter className="w-3 h-3" /> Filtros
          </button>
          <button
            onClick={scrollToForm}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-primary text-on-primary text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(110,255,192,0.15)]"
          >
            <Plus className="w-4 h-4" /> Novo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Entry Form */}
        <div ref={formRef} className="col-span-12 lg:col-span-8 bg-surface-low rounded-xl overflow-hidden shadow-2xl flex flex-col border border-white/5">
          <div className="flex flex-col sm:flex-row border-b border-white/5 bg-surface-medium/30">
            <button className="px-4 sm:px-8 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary border-b-2 border-primary flex items-center justify-center sm:justify-start gap-2">
              Novo Lançamento
            </button>
            <button className="px-4 sm:px-8 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors flex items-center justify-center sm:justify-start gap-2">
              Transferência
            </button>
          </div>

          <div className="p-4 sm:p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="col-span-2 flex items-center gap-2 sm:gap-4 bg-surface-medium p-1 rounded-full w-full sm:w-fit">
                <button
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    type === 'expense' ? "bg-error text-on-primary shadow-lg shadow-error/20" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <ArrowDown className="w-3 h-3" /> Despesa
                </button>
                <button
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    type === 'income' ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <ArrowUp className="w-3 h-3" /> Receita
                </button>
              </div>

              <div className="col-span-2 md:col-span-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Descrição</label>
                <input
                  ref={descriptionInputRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-medium border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-white"
                  placeholder="Ex: Servidores Cloud Mensal"
                  type="text"
                />
              </div>

              <div className="col-span-2 md:col-span-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Valor (BRL)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">R$</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface-medium border border-white/5 rounded-lg p-3 pl-10 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono outline-none text-white"
                    placeholder="0,00"
                    type="text"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-medium border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none appearance-none text-white"
                >
                  <option value="Infra">Infraestrutura</option>
                  <option value="Vendas">Vendas / Receita</option>
                  <option value="Fixos">Custos Fixos</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="col-span-2 md:col-span-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Conta / Banco</label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full bg-surface-medium border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none appearance-none text-white"
                >
                  <option value="Itaú Corp.">Itaú Corp.</option>
                  <option value="BTG Pactual">BTG Pactual</option>
                  <option value="Nubank Business">Nubank Business</option>
                  <option value="Caixa Geral">Caixa Geral</option>
                </select>
              </div>

              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data do Lançamento</label>
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-medium border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-white"
                  type="date"
                />
              </div>

              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-medium border border-white/5 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none appearance-none text-white"
                >
                  <option value="Realizado">Realizado</option>
                  <option value="Previsto">Previsto</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button onClick={handleClear} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                Limpar Campos
              </button>
              <button
                onClick={handleAddTransaction}
                className={cn(
                  "px-8 py-3 text-on-primary text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg transition-all",
                  type === 'expense' ? "bg-error hover:shadow-error/20" : "bg-primary hover:shadow-primary/20"
                )}
              >
                Confirmar {type === 'expense' ? 'Despesa' : 'Receita'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-xl border border-primary/20">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Partida Dobrada</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              O Core 4 utiliza o princípio contábil da <span className="text-primary">partida dobrada</span>. Cada transferência gera automaticamente um débito na conta de origem e um crédito na conta de destino.
            </p>
          </div>

          <BentoCard title="Saldo Consolidado" subtitle="Disponível em Caixa">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className={cn("text-xl font-bold", balance >= 0 ? "text-white" : "text-error")}>
                  R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", balance >= 0 ? "bg-primary" : "bg-error")} style={{ width: '100%' }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[9px] font-bold text-secondary uppercase">Entradas</p>
                  <p className="text-sm font-bold text-white">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-error uppercase">Saídas</p>
                  <p className="text-sm font-bold text-white">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Table */}
        <div className="col-span-12 bg-surface-low rounded-xl border border-white/5 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-medium/20">
            <h2 className="text-[10px] font-bold text-white uppercase tracking-widest">Últimos Lançamentos</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-surface-medium px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Período:</span>
                <span className="text-[10px] font-bold text-white uppercase">Últimos 30 dias</span>
              </div>
              <button className="text-zinc-500 hover:text-white transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-surface-medium/10">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Conta</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Valor</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm italic">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-medium/40 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-400">{formatDate(tx.date)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">{tx.description}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-highest text-[10px] font-bold text-zinc-300 uppercase">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-zinc-500">{tx.account}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase",
                          tx.status === 'Realizado' ? "text-primary" : "text-zinc-500"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", tx.status === 'Realizado' ? "bg-primary" : "bg-zinc-700")}></span>
                          {tx.status}
                        </span>
                      </td>
                      <td className={cn("px-6 py-4 text-sm font-bold text-right", tx.type === 'expense' ? "text-error" : "text-primary")}>
                        {tx.type === 'expense' ? '-' : '+'} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-1.5 text-zinc-600 hover:text-error transition-colors rounded-md hover:bg-error/10"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-zinc-600 hover:text-zinc-200 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-white/5 bg-surface-medium/10 flex justify-between items-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Exibindo {transactions.length} registros</p>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center text-xs font-bold">1</button>
              <button className="w-8 h-8 rounded border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-xs font-bold">2</button>
              <button className="w-8 h-8 rounded border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
