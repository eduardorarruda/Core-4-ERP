import React from 'react';
import { CloudUpload, CheckCircle2, Search, Filter, Download, GripVertical, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Reconciliation() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-primary mb-2 uppercase tracking-tighter">
            <span>FINANCEIRO</span>
            <span className="text-text-primary/50">/ CONCILIAÇÃO BANCÁRIA</span>
          </nav>
          <h2 className="text-4xl font-bold tracking-tight text-text-primary">Conciliação de Fluxo</h2>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2.5 bg-surface-medium text-text-primary text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-surface-highest transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar Relatório
          </button>
          <button className="px-6 py-2.5 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-[0px_0px_20px_rgba(110,255,192,0.2)]">
            Finalizar Lote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-x-1/2"></div>

        {/* Column 1: Bank Statement */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-3 text-text-primary">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              Extrato Bancário Importado
            </h3>
            <span className="text-[10px] px-2 py-1 bg-secondary/10 text-secondary rounded font-bold">4 PENDENTES</span>
          </div>

          <div className="group relative p-8 border-2 border-dashed border-text-primary/10 rounded-2xl bg-surface-low hover:bg-surface-medium transition-all flex flex-col items-center justify-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-text-primary font-semibold">Arraste seu arquivo OFX ou CSV</p>
              <p className="text-text-primary/50 text-sm mt-1">ou clique para selecionar do computador</p>
            </div>
            <button className="mt-2 px-4 py-1.5 bg-surface-highest text-text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">Select File</button>
          </div>

          <div className="space-y-3">
            {[
              { date: '12 OUT 2023', amount: 1250.00, desc: 'PGTO FORNECEDOR - TECH FLOW', suggested: true },
              { date: '14 OUT 2023', amount: 450.20, desc: 'REEMBOLSO DESPESAS VIAGEM', suggested: false },
              { date: '15 OUT 2023', amount: -89.90, desc: 'TARIFA BANCARIA MENSAL', suggested: false },
            ].map((item, i) => (
              <div key={i} className={cn(
                "group relative flex items-center gap-4 p-5 rounded-xl bg-surface-medium border-2 transition-all cursor-grab active:cursor-grabbing",
                item.suggested ? "border-primary/40 shadow-lg shadow-primary/5" : "border-transparent hover:border-text-primary/10"
              )}>
                <GripVertical className="w-5 h-5 text-text-primary/40" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-text-primary/50 uppercase">{item.date}</span>
                    <span className={cn("font-bold text-lg", item.amount < 0 ? "text-error" : "text-primary")}>
                      {item.amount < 0 ? '-' : ''} R$ {Math.abs(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-text-primary font-medium">{item.desc}</p>
                  {item.suggested && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[8px] px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold uppercase tracking-widest border border-primary/30">Match Sugerido</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Column 2: System Records */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-3 text-text-primary">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Lançamentos do Sistema
            </h3>
            <button className="p-1.5 rounded-lg bg-surface-medium text-text-primary/60 hover:text-text-primary">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/40" />
              <input className="w-full bg-surface-low border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary/20 transition-all outline-none" placeholder="Filtrar lançamentos..." type="text" />
            </div>
            <select className="bg-surface-low border-none rounded-xl text-[10px] font-bold text-text-primary/60 focus:ring-0 px-4 outline-none">
              <option>TODOS OS STATUS</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between transition-all">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">RECONCILIADO</p>
                  <p className="text-text-primary text-sm font-medium">Venda #4429 — Cliente: Solar Inc.</p>
                </div>
              </div>
              <span className="text-text-primary font-bold">R$ 2.400,00</span>
            </div>

            <div className="group p-5 rounded-xl bg-surface-medium border-2 border-primary/40 ring-4 ring-primary/5 transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-primary uppercase">12 OUT 2023 (SISTEMA)</span>
                <span className="text-text-primary font-bold text-lg">R$ 1.250,00</span>
              </div>
              <p className="text-text-primary font-medium">Contas a Pagar: NF-e 88291</p>
              <p className="text-[10px] text-text-primary/50 mt-1 uppercase font-bold">Fornecedor: Tech Flow Solutions Ltda.</p>
            </div>

            <div className="group p-5 rounded-xl bg-surface-medium border border-transparent hover:border-text-primary/10 transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-text-primary/50 uppercase">16 OUT 2023</span>
                <span className="text-text-primary font-bold text-lg">R$ 8.900,00</span>
              </div>
              <p className="text-text-primary font-medium">Recebimento: Lote de Vendas PDV</p>
              <p className="text-[10px] text-text-primary/50 mt-1 uppercase font-bold">Origem: Gateway de Pagamentos</p>
            </div>
          </div>
        </section>
      </div>

      {/* Analytics */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Importado', value: 'R$ 12.450,12', color: 'white' },
          { label: 'Reconciliado', value: 'R$ 8.200,00', color: 'primary', progress: 66 },
          { label: 'Divergências', value: 'R$ 45,90', color: 'error' },
          { label: 'Sugestões de IA', value: '03', color: 'secondary', icon: Sparkles },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-low p-6 rounded-2xl border border-text-primary/5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-text-primary/50 uppercase tracking-widest mb-2">{stat.label}</p>
              <div className="flex items-center justify-between">
                <p className={cn("text-3xl font-bold", `text-${stat.color}`)}>{stat.value}</p>
                {stat.icon && <stat.icon className="w-8 h-8 text-secondary opacity-50" />}
              </div>
            </div>
            {stat.progress && (
              <div className="w-full h-1 bg-surface-medium rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${stat.progress}%` }}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
