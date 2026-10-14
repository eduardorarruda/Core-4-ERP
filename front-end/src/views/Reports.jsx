import React from 'react';
import { TrendingUp, FileText, BookOpen, BarChart2, PieChart, CreditCard, Wallet, Repeat, FileBarChart, CalendarRange } from 'lucide-react';
import { relatorios, categorias, parceiros, cartoes, contasCorrentes, investimentos } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import ReportCard from '../components/reports/ReportCard';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import EmptyState from '../components/ui/EmptyState';
import PeriodoSelector from '../components/ui/PeriodoSelector';
import { Stagger, StaggerItem } from '../components/motion/Movimento';
import { usePeriodoUrl } from '../hooks/usePeriodoUrl';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/formatters';

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
  { value: 'RECEBER', label: 'Só entradas (a receber)' },
  { value: 'PAGAR', label: 'Só saídas (a pagar)' },
];

const STATUS_OPTS = [
  { value: 'PENDENTE', label: 'Só em aberto' },
  { value: 'ATRASADO', label: 'Só atrasadas' },
];

const TIPO_TRANSACAO_OPTS = [
  { value: 'APORTE', label: 'Aportes' },
  { value: 'RESGATE', label: 'Resgates' },
  { value: 'RENDIMENTO', label: 'Rendimentos' },
];

const REPORT_CARDS = [
  {
    id: 'R00',
    grupo: 'caixa',
    title: 'Posição financeira completa',
    description: 'Entradas, saídas, aportes, resgates e projeções no período.',
    icon: Wallet,
    onGetData: relatorios.dados.posicaoFinanceira,
    onDownloadXlsx: relatorios.posicaoFinanceira,
    filterConfig: [],
    visualizarPermissao: 'RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR',
    exportarPermissao:   'RELATORIO_POSICAO_FINANCEIRA_EXPORTAR',
  },
  {
    id: 'R01',
    grupo: 'caixa',
    title: 'Fluxo de caixa realizado',
    description: 'Entradas recebidas e saídas pagas, mês a mês.',
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
    grupo: 'contas',
    title: 'Contas a pagar e receber',
    description: 'Contas em aberto e atrasadas com vencimento no período.',
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
    grupo: 'caixa',
    title: 'Extrato por conta bancária',
    description: 'Baixas e transferências de cada conta bancária no período.',
    icon: BookOpen,
    onGetData: relatorios.dados.extrato,
    onDownloadXlsx: relatorios.extrato,
    filterConfig: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTS },
      { key: 'contaCorrenteId', label: 'Conta bancária', type: 'async-select', fetchFn: fetchContasCorrentes },
      { key: 'categoriaId', label: 'Categoria', type: 'async-select', fetchFn: fetchCategorias },
    ],
    visualizarPermissao: 'RELATORIO_EXTRATO_VISUALIZAR',
    exportarPermissao:   'RELATORIO_EXTRATO_EXPORTAR',
  },
  {
    id: 'R04',
    grupo: 'resultado',
    title: 'DRE simplificado',
    description: 'Receitas e despesas por categoria no período, ordenadas pelo resultado.',
    icon: BarChart2,
    onGetData: relatorios.dados.dre,
    onDownloadXlsx: relatorios.dre,
    filterConfig: [
      {
        key: 'tipo', label: 'Exibir', type: 'select', options: [
          { value: 'RECEBER', label: 'Só receitas' },
          { value: 'PAGAR', label: 'Só despesas' },
        ],
      },
    ],
    visualizarPermissao: 'RELATORIO_DRE_VISUALIZAR',
    exportarPermissao:   'RELATORIO_DRE_EXPORTAR',
  },
  {
    id: 'R05',
    grupo: 'outros',
    title: 'Investimentos',
    description: 'Aportes, resgates e rendimentos por carteira no período.',
    icon: PieChart,
    onGetData: relatorios.dados.investimentos,
    onDownloadXlsx: relatorios.investimentos,
    filterConfig: [
      { key: 'tipoTransacao', label: 'Tipo de movimento', type: 'select', options: TIPO_TRANSACAO_OPTS },
      { key: 'contaInvestimentoId', label: 'Carteira', type: 'async-select', fetchFn: fetchCarteiraInvestimento },
    ],
    visualizarPermissao: 'RELATORIO_INVESTIMENTOS_VISUALIZAR',
    exportarPermissao:   'RELATORIO_INVESTIMENTOS_EXPORTAR',
  },
  {
    id: 'R06',
    grupo: 'outros',
    title: 'Cartões de crédito',
    description: 'Lançamentos do cartão por fatura, agrupados por mês e categoria.',
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
    grupo: 'outros',
    semPeriodo: true,
    title: 'Assinaturas',
    description: 'Todas as assinaturas com custo mensal e anual.',
    icon: Repeat,
    onGetData: (_i, _f, params) => relatorios.dados.assinaturas(params?.ativas),
    onDownloadXlsx: (_i, _f, params) => relatorios.assinaturas(params?.ativas),
    filterConfig: [
      {
        // Todas = parâmetro omitido; true = só ativas; false = só inativas
        key: 'ativas', label: 'Situação', type: 'select', rotuloTodos: 'Todas', options: [
          { value: 'true', label: 'Ativas' },
          { value: 'false', label: 'Inativas' },
        ],
      },
    ],
    visualizarPermissao: 'RELATORIO_ASSINATURAS_VISUALIZAR',
    exportarPermissao:   'RELATORIO_ASSINATURAS_EXPORTAR',
  },
];

const GRUPOS = [
  { id: 'caixa', titulo: 'Caixa', desc: 'O que entrou e saiu das contas.' },
  { id: 'resultado', titulo: 'Resultado', desc: 'Receitas e despesas por categoria.' },
  { id: 'contas', titulo: 'Contas', desc: 'O que está em aberto.' },
  { id: 'outros', titulo: 'Cartões, investimentos e assinaturas', desc: '' },
];

const ATALHOS = ['mes', 'mes-passado', '3m', '6m', '12m', 'ano'];

export default function Reports() {
  const { temPermissao } = useAuth();
  const [periodo, setPeriodo] = usePeriodoUrl('mes');

  const visiveis = REPORT_CARDS.filter((card) => temPermissao(card.visualizarPermissao));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileBarChart}
        title="Relatórios"
        subtitle="Veja na tela ou baixe em PDF e Excel. O período escolhido vale para todos."
      />

      {visiveis.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum relatório disponível"
          description="Você ainda não tem acesso a relatórios. Peça a permissão ao administrador da empresa."
        />
      ) : (
        <>
          <div className="c4-card c4-glass p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 lg:sticky lg:top-4 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <span aria-hidden="true" className="grid place-items-center w-10 h-10 rounded-xl bg-primary/[0.12] text-primary shrink-0">
                <CalendarRange className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Período dos relatórios</p>
                <p className="text-xs text-text-primary/60 truncate">{formatDate(periodo.inicio)} a {formatDate(periodo.fim)} · Assinaturas mostram a situação de hoje</p>
              </div>
            </div>
            <div className="sm:ml-auto">
              <PeriodoSelector value={periodo} onChange={setPeriodo} granularidade="dia" atalhos={ATALHOS} label="Período dos relatórios" align="end" />
            </div>
          </div>

          {GRUPOS.map((g) => {
            const cards = visiveis.filter((c) => c.grupo === g.id);
            if (cards.length === 0) return null;
            return (
              <section key={g.id} aria-labelledby={`grupo-rel-${g.id}`} className="space-y-3">
                <div>
                  <h2 id={`grupo-rel-${g.id}`} className="font-display text-lg font-semibold">{g.titulo}</h2>
                  {g.desc && <p className="text-sm text-text-primary/60">{g.desc}</p>}
                </div>
                <Stagger aoRolar className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {cards.map((card) => (
                    <StaggerItem key={card.id} className="min-w-0">
                      <PermissaoGuard permissao={card.visualizarPermissao}>
                        <ReportCard
                          title={card.title}
                          description={card.description}
                          icon={card.icon}
                          periodo={periodo}
                          semPeriodo={card.semPeriodo}
                          onGetData={card.onGetData}
                          onDownloadXlsx={card.onDownloadXlsx}
                          filterConfig={card.filterConfig}
                          canExport={temPermissao(card.exportarPermissao)}
                        />
                      </PermissaoGuard>
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
