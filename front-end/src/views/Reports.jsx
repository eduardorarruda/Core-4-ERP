import React, { useState } from 'react';
import { TrendingUp, FileText, BookOpen, BarChart2, PieChart, CreditCard } from 'lucide-react';
import { relatorios, categorias, parceiros, cartoes, contasCorrentes, investimentos } from '../lib/api';
import Toast from '../components/ui/Toast';
import ReportCard from '../components/reports/ReportCard';

// ── Helpers para buscar opções de filtros assíncronos ─────────────────────────
const fetchCategorias = () =>
  categorias.listar().then(cs => cs.map(c => ({ value: String(c.id), label: c.descricao })));

const fetchParceiros = () =>
  parceiros.listar().then(ps => ps.map(p => ({
    value: String(p.id),
    label: p.nomeFantasia?.trim() || p.razaoSocial,
  })));

const fetchContasCorrentes = () =>
  contasCorrentes.listar().then(cs => cs.map(c => ({ value: String(c.id), label: c.descricao })));

const fetchCartoes = () =>
  cartoes.listar().then(cs => cs.map(c => ({ value: String(c.id), label: c.nome })));

const fetchCarteiraInvestimento = () =>
  investimentos.listar().then(cs => cs.map(c => ({ value: String(c.id), label: c.nome })));

// ── Opções estáticas ──────────────────────────────────────────────────────────
const TIPO_OPTS = [
  { value: 'RECEBER', label: 'Somente Receitas / A Receber' },
  { value: 'PAGAR',   label: 'Somente Despesas / A Pagar'  },
];

const STATUS_OPTS = [
  { value: 'PENDENTE', label: 'Somente Pendentes' },
  { value: 'ATRASADO', label: 'Somente Atrasadas'  },
];

const TIPO_TRANSACAO_OPTS = [
  { value: 'APORTE',     label: 'Aportes'     },
  { value: 'RESGATE',    label: 'Resgates'    },
  { value: 'RENDIMENTO', label: 'Rendimentos' },
];

// ── Definição dos cards ───────────────────────────────────────────────────────
const REPORT_CARDS = [
  {
    id: 'R01',
    title: 'Fluxo de Caixa Realizado',
    description: 'Entradas recebidas vs. saídas pagas por período, agrupadas por mês.',
    icon: TrendingUp,
    onGetData: relatorios.dados.fluxoCaixa,
    onDownloadXlsx: relatorios.fluxoCaixa,
    filterConfig: [
      { key: 'tipo',        label: 'Tipo',      type: 'select',       options: TIPO_OPTS },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
      { key: 'parceiroId',  label: 'Parceiro',  type: 'async-select', fetchFn: fetchParceiros  },
    ],
  },
  {
    id: 'R02',
    title: 'Contas a Pagar/Receber',
    description: 'Posição atual de todas as contas com status Pendente e Atrasado.',
    icon: FileText,
    onGetData: relatorios.dados.contasAbertas,
    onDownloadXlsx: relatorios.contasAbertas,
    filterConfig: [
      { key: 'tipo',        label: 'Tipo',      type: 'select',       options: TIPO_OPTS   },
      { key: 'status',      label: 'Status',    type: 'select',       options: STATUS_OPTS },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
      { key: 'parceiroId',  label: 'Parceiro',  type: 'async-select', fetchFn: fetchParceiros  },
    ],
  },
  {
    id: 'R03',
    title: 'Extrato por Conta Corrente',
    description: 'Movimentações de conta corrente (baixas e transferências) no período.',
    icon: BookOpen,
    onGetData: relatorios.dados.extrato,
    onDownloadXlsx: relatorios.extrato,
    filterConfig: [
      { key: 'tipo',             label: 'Tipo',           type: 'select',       options: TIPO_OPTS },
      { key: 'contaCorrenteId',  label: 'Conta Corrente', type: 'async-select', fetchFn: fetchContasCorrentes },
      { key: 'categoriaId',      label: 'Categoria',      type: 'async-select', fetchFn: fetchCategorias },
    ],
  },
  {
    id: 'R04',
    title: 'DRE Simplificado',
    description: 'Receitas × Despesas por categoria no período, ordenado por resultado.',
    icon: BarChart2,
    onGetData: relatorios.dados.dre,
    onDownloadXlsx: relatorios.dre,
    filterConfig: [
      { key: 'tipo', label: 'Exibir', type: 'select', options: [
        { value: 'RECEBER', label: 'Somente Receitas'  },
        { value: 'PAGAR',   label: 'Somente Despesas'  },
      ]},
    ],
  },
  {
    id: 'R05',
    title: 'Investimentos',
    description: 'Aportes, resgates e rendimentos por carteira no período selecionado.',
    icon: PieChart,
    onGetData: relatorios.dados.investimentos,
    onDownloadXlsx: relatorios.investimentos,
    filterConfig: [
      { key: 'tipoTransacao',       label: 'Tipo de Transação', type: 'select',       options: TIPO_TRANSACAO_OPTS },
      { key: 'contaInvestimentoId', label: 'Carteira',          type: 'async-select', fetchFn: fetchCarteiraInvestimento },
    ],
  },
  {
    id: 'R06',
    title: 'Cartões de Crédito',
    description: 'Lançamentos de cartão por fatura, agrupados por mês e categoria.',
    icon: CreditCard,
    onGetData: relatorios.dados.cartoes,
    onDownloadXlsx: relatorios.cartoes,
    filterConfig: [
      { key: 'cartaoId',    label: 'Cartão',     type: 'async-select', fetchFn: fetchCartoes    },
      { key: 'categoriaId', label: 'Categoria',  type: 'async-select', fetchFn: fetchCategorias },
    ],
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
          Visualize online, exporte em PDF ou Excel para o período desejado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_CARDS.map(card => (
          <ReportCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onGetData={card.onGetData}
            onDownloadXlsx={card.onDownloadXlsx}
            filterConfig={card.filterConfig}
            onError={msg => setToast({ message: msg, type: 'error' })}
          />
        ))}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
