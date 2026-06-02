import React from 'react';
import { TrendingUp, FileText, BookOpen, BarChart2, PieChart, CreditCard, Wallet, Repeat } from 'lucide-react';
import { relatorios, categorias, parceiros, cartoes, contasCorrentes, investimentos } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import ReportCard from '../components/reports/ReportCard';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

const fetchCategorias = () =>
  categorias.listar().then((cs) => cs.map((c) => ({ value: String(c.id), label: c.descricao })));

const fetchParceiros = () =>
  parceiros.listar().then((ps) => ps.map((p) => ({
    value: String(p.id),
    label: p.nomeFantasia?.trim() || p.razaoSocial,
  })));

const fetchContasCorrentes = () =>
  contasCorrentes.listar().then((cs) => cs.map((c) => ({ value: String(c.id), label: c.descricao })));

const fetchCartoes = () =>
  cartoes.listar().then((cs) => cs.map((c) => ({ value: String(c.id), label: c.nome })));

const fetchCarteiraInvestimento = () =>
  investimentos.listar().then((cs) => cs.map((c) => ({ value: String(c.id), label: c.nome })));

const TIPO_OPTS = [
  { value: 'RECEBER', label: 'Somente Receitas / A Receber' },
  { value: 'PAGAR', label: 'Somente Despesas / A Pagar' },
];

const STATUS_OPTS = [
  { value: 'PENDENTE', label: 'Somente Pendentes' },
  { value: 'ATRASADO', label: 'Somente Atrasadas' },
];

const TIPO_TRANSACAO_OPTS = [
  { value: 'APORTE', label: 'Aportes' },
  { value: 'RESGATE', label: 'Resgates' },
  { value: 'RENDIMENTO', label: 'Rendimentos' },
];

const REPORT_CARDS = [
  {
    id: 'R00',
    title: 'Posição Financeira Completa',
    description: 'Detalhamento de entradas, saídas, aportes, resgates e projeções por período.',
    icon: Wallet,
    onGetData: relatorios.dados.posicaoFinanceira,
    onDownloadXlsx: relatorios.posicaoFinanceira,
    filterConfig: [],
    visualizarPermissao: 'RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR',
    exportarPermissao:   'RELATORIO_POSICAO_FINANCEIRA_EXPORTAR',
  },
  {
    id: 'R01',
    title: 'Fluxo de Caixa Realizado',
    description: 'Entradas recebidas vs. saídas pagas por período, agrupadas por mês.',
    icon: TrendingUp,
    onGetData: relatorios.dados.fluxoCaixa,
    onDownloadXlsx: relatorios.fluxoCaixa,
    filterConfig: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTS },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
      { key: 'parceiroId', label: 'Parceiro', type: 'async-select', fetchFn: fetchParceiros },
    ],
    visualizarPermissao: 'RELATORIO_FLUXO_CAIXA_VISUALIZAR',
    exportarPermissao:   'RELATORIO_FLUXO_CAIXA_EXPORTAR',
  },
  {
    id: 'R02',
    title: 'Contas a Pagar/Receber',
    description: 'Posição atual de todas as contas com status Pendente e Atrasado.',
    icon: FileText,
    onGetData: relatorios.dados.contasAbertas,
    onDownloadXlsx: relatorios.contasAbertas,
    filterConfig: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTS },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
      { key: 'parceiroId', label: 'Parceiro', type: 'async-select', fetchFn: fetchParceiros },
    ],
    visualizarPermissao: 'RELATORIO_CONTAS_ABERTAS_VISUALIZAR',
    exportarPermissao:   'RELATORIO_CONTAS_ABERTAS_EXPORTAR',
  },
  {
    id: 'R03',
    title: 'Extrato por Conta Corrente',
    description: 'Movimentações de conta corrente (baixas e transferências) no período.',
    icon: BookOpen,
    onGetData: relatorios.dados.extrato,
    onDownloadXlsx: relatorios.extrato,
    filterConfig: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTS },
      { key: 'contaCorrenteId', label: 'Conta Corrente', type: 'async-select', fetchFn: fetchContasCorrentes },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
    ],
    visualizarPermissao: 'RELATORIO_EXTRATO_VISUALIZAR',
    exportarPermissao:   'RELATORIO_EXTRATO_EXPORTAR',
  },
  {
    id: 'R04',
    title: 'DRE Simplificado',
    description: 'Receitas × Despesas por categoria no período, ordenado por resultado.',
    icon: BarChart2,
    onGetData: relatorios.dados.dre,
    onDownloadXlsx: relatorios.dre,
    filterConfig: [
      {
        key: 'tipo', label: 'Exibir', type: 'select', options: [
          { value: 'RECEBER', label: 'Somente Receitas' },
          { value: 'PAGAR', label: 'Somente Despesas' },
        ],
      },
    ],
    visualizarPermissao: 'RELATORIO_DRE_VISUALIZAR',
    exportarPermissao:   'RELATORIO_DRE_EXPORTAR',
  },
  {
    id: 'R05',
    title: 'Investimentos',
    description: 'Aportes, resgates e rendimentos por carteira no período selecionado.',
    icon: PieChart,
    onGetData: relatorios.dados.investimentos,
    onDownloadXlsx: relatorios.investimentos,
    filterConfig: [
      { key: 'tipoTransacao', label: 'Tipo de Transação', type: 'select', options: TIPO_TRANSACAO_OPTS },
      { key: 'contaInvestimentoId', label: 'Carteira', type: 'async-select', fetchFn: fetchCarteiraInvestimento },
    ],
    visualizarPermissao: 'RELATORIO_INVESTIMENTOS_VISUALIZAR',
    exportarPermissao:   'RELATORIO_INVESTIMENTOS_EXPORTAR',
  },
  {
    id: 'R06',
    title: 'Cartões de Crédito',
    description: 'Lançamentos de cartão por fatura, agrupados por mês e categoria.',
    icon: CreditCard,
    onGetData: relatorios.dados.cartoes,
    onDownloadXlsx: relatorios.cartoes,
    filterConfig: [
      { key: 'cartaoId', label: 'Cartão', type: 'async-select', fetchFn: fetchCartoes },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
    ],
    visualizarPermissao: 'RELATORIO_CARTOES_VISUALIZAR',
    exportarPermissao:   'RELATORIO_CARTOES_EXPORTAR',
  },
  {
    id: 'R07',
    title: 'Assinaturas Recorrentes',
    description: 'Listagem de todas as assinaturas com custo mensal e anual projetado.',
    icon: Repeat,
    onGetData: (_i, _f, params) => relatorios.dados.assinaturas(params?.ativas),
    onDownloadXlsx: (_i, _f, params) => relatorios.assinaturas(params?.ativas),
    filterConfig: [
      {
        key: 'ativas', label: 'Status', type: 'select', options: [
          { value: 'true', label: 'Somente Ativas' },
          { value: 'false', label: 'Somente Inativas' },
        ],
      },
    ],
    visualizarPermissao: 'RELATORIO_ASSINATURAS_VISUALIZAR',
    exportarPermissao:   'RELATORIO_ASSINATURAS_EXPORTAR',
  },
];

export default function Reports() {
  const toast = useToast();
  const { temPermissao } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios Financeiros"
        subtitle="Visualize online, exporte em PDF ou Excel para o período desejado."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_CARDS.map((card) => (
          <PermissaoGuard key={card.id} permissao={card.visualizarPermissao}>
            <ReportCard
              title={card.title}
              description={card.description}
              icon={card.icon}
              onGetData={card.onGetData}
              onDownloadXlsx={card.onDownloadXlsx}
              filterConfig={card.filterConfig}
              canExport={temPermissao(card.exportarPermissao)}
              onError={(msg) => toast.error(msg)}
            />
          </PermissaoGuard>
        ))}
      </div>
    </div>
  );
}
