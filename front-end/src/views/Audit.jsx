import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Info, Search, Filter, User, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { auditoria } from '../lib/api';

const TAMANHO_PAGINA = 20;

const ACAO_SEV = {
  CRIAR:    'info',
  ATUALIZAR:'info',
  DELETAR:  'warning',
  LOGIN:    'info',
  LOGOUT:   'info',
  ACESSO_NEGADO: 'critical',
  EXPORTAR: 'info',
};

// Severidade → variante do Badge de UI.
const SEV_BADGE = {
  critical: { variant: 'error',   label: 'Crítico' },
  warning:  { variant: 'warning', label: 'Alerta' },
  info:     { variant: 'info',    label: 'Info' },
};

function fmtData(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString('pt-BR');
}

function acaoLabel(acao) {
  const map = {
    CRIAR: 'Criação', ATUALIZAR: 'Atualização', EDITAR: 'Atualização', DELETAR: 'Exclusão',
    BAIXAR: 'Baixa', ESTORNAR: 'Estorno', TRANSFERIR: 'Transferência', FECHAR_FATURA: 'Fechamento de Fatura',
    LOGIN: 'Login', LOGOUT: 'Logout', ACESSO_NEGADO: 'Acesso Negado', EXPORTAR: 'Exportação',
  };
  return map[acao] ?? acao;
}

// Rótulo amigável para o usuário — a API só devolve o id numérico.
function usuarioLabel(id) {
  return id == null ? 'Sistema' : `Usuário #${id}`;
}

export default function Audit() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    auditoria.listar({
      acao: filtroAcao || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      page,
      size: TAMANHO_PAGINA,
    }).then((resp) => {
      setLogs(resp?.content ?? []);
      setTotalPages(resp?.totalPages ?? 0);
      setTotalElements(resp?.totalElements ?? 0);
    }).catch((err) => {
      setLogs([]);
      toast.error(err?.message || 'Não foi possível carregar os registros de auditoria. Tente novamente.');
    }).finally(() => setLoading(false));
  }, [filtroAcao, dataInicio, dataFim, page, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  // Ao mudar um filtro server-side, volta para a primeira página.
  const aplicarFiltro = (setter) => (valor) => {
    setPage(0);
    setter(valor);
  };

  const limparFiltros = () => {
    setPage(0);
    setFiltroAcao('');
    setDataInicio('');
    setDataFim('');
  };

  // Busca textual é apenas local (a API não oferece busca por texto) — filtra
  // somente os itens já carregados nesta página.
  const filtered = search.trim()
    ? logs.filter((l) =>
        String(l.entidade ?? '').toLowerCase().includes(search.toLowerCase()) ||
        String(l.acao ?? '').toLowerCase().includes(search.toLowerCase()) ||
        String(l.usuarioId ?? '').includes(search)
      )
    : logs;

  const criticosPagina = filtered.filter((l) => ACAO_SEV[l.acao] === 'critical').length;

  const stats = [
    { label: 'Total de eventos', hint: 'Todos os registros', value: totalElements, icon: Info, color: 'text-primary' },
    { label: 'Eventos críticos', hint: 'Nesta página', value: criticosPagina, icon: AlertTriangle, color: 'text-error' },
    { label: 'Exibindo', hint: 'Após busca local', value: filtered.length, icon: User, color: 'text-secondary', live: true },
  ];

  const columns = [
    {
      key: 'timestamp',
      label: 'Data e hora',
      render: (v) => <span className="text-[11px] font-mono text-text-primary/50 whitespace-nowrap">{fmtData(v)}</span>,
    },
    {
      key: 'usuarioId',
      label: 'Usuário',
      render: (v, row) => (
        <span className="inline-flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary font-display">{usuarioLabel(v)}</span>
          {row.aiAction && (
            <span
              role="img"
              aria-label={`Ação executada pela assistente de IA (Áurea) a pedido do ${usuarioLabel(v)}`}
              className="inline-flex items-center rounded-full font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 bg-secondary/15 text-secondary border border-secondary/20"
            >
              <span aria-hidden="true">IA</span>
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'entidade',
      label: 'Entidade',
      render: (v) => <span className="text-sm text-text-primary/80">{v ?? '—'}</span>,
    },
    {
      key: 'entidadeId',
      label: 'Registro',
      render: (v) => <span className="text-[11px] font-mono text-text-primary/40">{v ?? '—'}</span>,
    },
    {
      key: 'acao',
      label: 'Ação',
      render: (v) => <Badge variant="neutral" size="sm">{acaoLabel(v)}</Badge>,
    },
    {
      key: 'severidade',
      label: 'Severidade',
      render: (_v, row) => {
        const sev = SEV_BADGE[ACAO_SEV[row.acao] ?? 'info'];
        return <Badge variant={sev.variant} size="sm" dot>{sev.label}</Badge>;
      },
    },
    {
      key: 'ipAddress',
      label: 'IP',
      render: (v) => <span className="text-[11px] font-mono text-text-primary/35">{v ?? '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Rastreabilidade total e logs de segurança em tempo real"
        icon={<Shield />}
        actions={
          <Button
            variant="ghost"
            size="md"
            className="border border-text-primary/10 text-text-primary/70 font-bold text-xs uppercase tracking-widest font-mono"
            leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
            onClick={carregar}
            loading={loading}
          >
            Atualizar
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`anim-in d${i + 1} rounded-[18px] p-5 flex flex-col gap-3 relative overflow-hidden bg-surface-medium border border-text-primary/8`}
          >
            <div className="absolute -right-3 -top-3 opacity-[0.06] text-text-primary" aria-hidden="true">
              <stat.icon className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-2">
              {stat.live && <span className="live-dot" style={{ width: 5, height: 5 }} />}
              <span className="text-xs font-bold uppercase tracking-widest text-text-primary/50 font-mono">{stat.label}</span>
            </div>
            <p className={`text-4xl font-bold font-display leading-none ${stat.color}`}>
              {loading ? '—' : stat.value}
            </p>
            <span className="text-[10px] uppercase tracking-widest text-text-primary/30 font-mono">{stat.hint}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-[18px] overflow-hidden bg-surface-medium border border-text-primary/8">
        <div className="p-5 border-b border-text-primary/5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar nesta página por entidade, ação ou usuário..."
              aria-label="Filtrar registros exibidos nesta página"
              className="w-full bg-surface-high border border-text-primary/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-text-primary/30"
            />
          </div>
          <Button
            variant="ghost"
            size="md"
            className="border border-text-primary/8 text-text-primary/60 text-xs font-bold uppercase tracking-widest font-mono hover:text-primary"
            leftIcon={<Filter className="w-3 h-3" aria-hidden="true" />}
            onClick={() => setShowFiltros((v) => !v)}
            aria-expanded={showFiltros}
          >
            Filtros
          </Button>
        </div>

        {showFiltros && (
          <div className="p-4 border-b border-text-primary/5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-text-primary/40 mb-1">Ação</label>
              <select
                value={filtroAcao}
                onChange={(e) => aplicarFiltro(setFiltroAcao)(e.target.value)}
                className="bg-surface-high border border-text-primary/10 rounded-xl px-3 py-2 text-sm text-text-primary outline-none"
              >
                <option value="">Todas</option>
                {['CRIAR', 'ATUALIZAR', 'DELETAR', 'LOGIN', 'LOGOUT', 'ACESSO_NEGADO', 'EXPORTAR'].map((a) => (
                  <option key={a} value={a}>{acaoLabel(a)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-text-primary/40 mb-1">Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => aplicarFiltro(setDataInicio)(e.target.value)}
                className="bg-surface-high border border-text-primary/10 rounded-xl px-3 py-2 text-sm text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-text-primary/40 mb-1">Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => aplicarFiltro(setDataFim)(e.target.value)}
                className="bg-surface-high border border-text-primary/10 rounded-xl px-3 py-2 text-sm text-text-primary outline-none"
              />
            </div>
            <button
              onClick={limparFiltros}
              className="px-3 py-2 text-text-primary/40 text-xs font-mono uppercase tracking-widest hover:text-text-primary transition-colors"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Tabela (desktop) + cards (mobile), paginação real server-side */}
        <div className="p-4 space-y-4">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            serverSort
            keyExtractor={(r) => r.id}
            emptyState={
              <div className="py-12 text-center text-text-primary/40 text-sm">
                Nenhum evento de auditoria encontrado para os filtros selecionados.
              </div>
            }
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
