import React from 'react';
import { BarChart3, FileText, PieChart, TrendingUp, Download, Filter, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import BentoCard from '../components/ui/BentoCard';

const reports = [
  { id: '1', title: 'DRE Gerencial', description: 'Demonstrativo de Resultados do Exercício detalhado por centro de custo.', icon: FileText, type: 'Financeiro' },
  { id: '2', title: 'Fluxo de Caixa Projetado', description: 'Previsão de entradas e saídas para os próximos 12 meses.', icon: TrendingUp, type: 'Financeiro' },
  { id: '3', title: 'Balanço Patrimonial', description: 'Visão estática da posição financeira da empresa.', icon: BarChart3, type: 'Contábil' },
  { id: '4', title: 'Análise de Margem', description: 'Detalhamento de rentabilidade por produto e serviço.', icon: PieChart, type: 'Vendas' },
];

export default function Reports() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">Relatórios Estratégicos</h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">Análises profundas para tomada de decisão baseada em dados.</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface-medium text-zinc-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2">
            <Calendar className="w-3 h-3" /> Período
          </button>
          <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface-medium text-zinc-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2">
            <Filter className="w-3 h-3" /> Filtrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Relatórios Gerados', value: '124', color: 'primary' },
          { label: 'Exportações (Mês)', value: '45', color: 'secondary' },
          { label: 'Agendados', value: '08', color: 'amber-400' },
          { label: 'Favoritos', value: '12', color: 'primary' },
        ].map((stat, i) => (
          <div key={i}>
            <BentoCard className="relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={cn("text-3xl font-bold", `text-${stat.color}`)}>{stat.value}</p>
            </BentoCard>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id}>
            <BentoCard className="group hover:border-primary/30 transition-all cursor-pointer" title={report.title}>
              <div className="flex gap-6 mt-4">
                <div className="w-12 h-12 rounded-xl bg-surface-low flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
                  <report.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{report.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-1 rounded bg-surface-highest text-[10px] font-bold text-zinc-500 uppercase">
                      {report.type}
                    </span>
                    <button className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:underline">
                      <Download className="w-3 h-3" /> Gerar PDF
                    </button>
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        ))}
      </div>
    </div>
  );
}
