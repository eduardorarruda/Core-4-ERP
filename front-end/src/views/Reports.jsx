import React, { useState } from 'react';
import { TrendingUp, FileText, BookOpen, BarChart2 } from 'lucide-react';
import { relatorios } from '../lib/api';
import Toast from '../components/ui/Toast';
import ReportCard from '../components/reports/ReportCard';

const REPORT_CARDS = [
  {
    id: 'R01',
    title: 'Fluxo de Caixa Realizado',
    description: 'Entradas recebidas vs. saídas pagas por período, agrupadas por mês.',
    icon: TrendingUp,
    onGenerate: relatorios.fluxoCaixa,
  },
  {
    id: 'R02',
    title: 'Contas a Pagar/Receber',
    description: 'Posição atual de todas as contas com status Pendente e Atrasado.',
    icon: FileText,
    onGenerate: relatorios.contasAbertas,
  },
  {
    id: 'R03',
    title: 'Extrato por Conta Corrente',
    description: 'Movimentações de conta corrente (baixas e transferências) no período.',
    icon: BookOpen,
    onGenerate: relatorios.extrato,
  },
  {
    id: 'R04',
    title: 'DRE Simplificado',
    description: 'Receitas × Despesas por categoria no período, ordenado por resultado.',
    icon: BarChart2,
    onGenerate: relatorios.dre,
  },
];

export default function Reports() {
  const [toast, setToast] = useState(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
          Relatórios Financeiros
        </h1>
        <p className="text-zinc-500 text-xs sm:text-sm font-medium">
          Gere e exporte relatórios em Excel para o período desejado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_CARDS.map(card => (
          <ReportCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onGenerate={card.onGenerate}
            onError={msg => setToast({ message: msg, type: 'error' })}
          />
        ))}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
