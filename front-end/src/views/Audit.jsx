import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Info, Search, Filter, Calendar, User, Loader2, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { auditoria } from '../lib/api';

const ACAO_SEV = {
  CRIAR:    'info',
  ATUALIZAR:'info',
  DELETAR:  'warning',
  LOGIN:    'info',
  LOGOUT:   'info',
  ACESSO_NEGADO: 'critical',
  EXPORTAR: 'info',
};

const SEVERITY = {
  critical: { label: 'Crítico',  color: '#FFB4AB', bg: 'rgba(255,180,171,.1)',  border: 'rgba(255,180,171,.2)' },
  warning:  { label: 'Alerta',   color: '#FFD37A', bg: 'rgba(255,211,122,.1)',  border: 'rgba(255,211,122,.2)' },
  info:     { label: 'Info',     color: '#6EFFC0', bg: 'rgba(110,255,192,.1)',  border: 'rgba(110,255,192,.2)' },
};

function fmtData(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString('pt-BR');
}

function acaoLabel(acao) {
  const map = {
    CRIAR: 'Criação', ATUALIZAR: 'Atualização', DELETAR: 'Exclusão',
    LOGIN: 'Login', LOGOUT: 'Logout', ACESSO_NEGADO: 'Acesso Negado', EXPORTAR: 'Exportação',
  };
  return map[acao] ?? acao;
}

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    auditoria.listar({
      acao: filtroAcao || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      size: 50,
      sort: 'timestamp,desc',
    }).then((page) => {
      setLogs(page?.content ?? []);
      setTotal(page?.totalElements ?? 0);
    }).catch((err) => setErro(err?.message || 'Erro ao carregar auditoria.'))
      .finally(() => setLoading(false));
  }, [filtroAcao, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtered = search.trim()
    ? logs.filter((l) =>
        String(l.entidade ?? '').toLowerCase().includes(search.toLowerCase()) ||
        String(l.acao ?? '').toLowerCase().includes(search.toLowerCase()) ||
        String(l.usuarioId ?? '').includes(search)
      )
    : logs;

  const criticos  = filtered.filter((l) => ACAO_SEV[l.acao] === 'critical').length;
  const alertas   = filtered.filter((l) => ACAO_SEV[l.acao] === 'warning').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Rastreabilidade total e logs de segurança em tempo real"
        actions={
          <button onClick={carregar} className="flex items-center gap-2 border border-text-primary/10 text-text-primary/70 font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-surface-medium transition-colors font-mono">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        }
      />

      {erro && (
        <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13 }}>
          {erro}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Eventos',   value: total,    icon: Info,          color: '#6EFFC0' },
          { label: 'Eventos Críticos',   value: criticos, icon: AlertTriangle, color: '#FFB4AB' },
          { label: 'Exibindo',           value: filtered.length, icon: User,   color: '#ACC7FF', live: true },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`anim-in d${i + 1} rounded-[18px] p-5 flex flex-col gap-3 relative overflow-hidden`}
            style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.08)', backdropFilter: 'blur(8px)' }}
          >
            <div className="absolute -right-3 -top-3 opacity-[0.06]" aria-hidden>
              <stat.icon className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-2">
              {stat.live && <span className="live-dot" style={{ width: 5, height: 5 }} />}
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 font-mono">{stat.label}</span>
            </div>
            <p className="text-4xl font-bold font-display leading-none" style={{ color: stat.color }}>
              {loading ? '—' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div
        className="rounded-[18px] overflow-hidden"
        style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)' }}
      >
        {/* Toolbar */}
        <div className="p-5 border-b border-text-primary/5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por entidade, ação ou usuário ID..."
              className="w-full bg-surface-medium border border-text-primary/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-text-primary/30"
            />
          </div>
          <button
            onClick={() => setShowFiltros((v) => !v)}
            className="px-3 py-2 bg-surface-medium border border-text-primary/8 text-text-primary/60 text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-2 hover:border-primary/20 hover:text-primary transition-all font-mono"
          >
            <Filter className="w-3 h-3" /> Filtros
          </button>
        </div>

        {showFiltros && (
          <div className="p-4 border-b border-text-primary/5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-primary/40 mb-1">Ação</label>
              <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}
                className="bg-surface-medium border border-text-primary/10 rounded-xl px-3 py-2 text-sm text-text-primary outline-none">
                <option value="">Todas</option>
                {['CRIAR','ATUALIZAR','DELETAR','LOGIN','LOGOUT','ACESSO_NEGADO','EXPORTAR'].map((a) => (
                  <option key={a} value={a}>{acaoLabel(a)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-primary/40 mb-1">Data início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                className="bg-surface-medium border border-text-primary/10 rounded-xl px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-primary/40 mb-1">Data fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                className="bg-surface-medium border border-text-primary/10 rounded-xl px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <button onClick={() => { setFiltroAcao(''); setDataInicio(''); setDataFim(''); }}
              className="px-3 py-2 text-text-primary/40 text-[10px] font-mono uppercase tracking-widest hover:text-text-primary transition-colors">
              Limpar
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-text-primary/5">
                  {['Timestamp', 'Usuário ID', 'Entidade', 'ID', 'Ação', 'Severidade', 'IP'].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-bold text-text-primary/40 uppercase tracking-widest font-mono whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-text-primary/5">
                {filtered.map((log, i) => {
                  const sevKey = ACAO_SEV[log.acao] ?? 'info';
                  const sev = SEVERITY[sevKey];
                  return (
                    <tr key={log.id ?? i} className="hover:bg-surface-medium/30 transition-colors">
                      <td className="px-5 py-4 text-[11px] font-mono text-text-primary/40 whitespace-nowrap">{fmtData(log.timestamp)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-text-primary font-display">{log.usuarioId ?? '—'}</td>
                      <td className="px-5 py-4 text-sm text-text-primary/80">{log.entidade ?? '—'}</td>
                      <td className="px-5 py-4 text-[11px] font-mono text-text-primary/40">{log.entidadeId ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-mono" style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(250,250,250,.5)' }}>
                          {acaoLabel(log.acao)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest font-mono px-2.5 py-1 rounded-full"
                          style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sev.color }} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-mono text-text-primary/35">{log.ipAddress ?? '—'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-text-primary/30 text-sm">Nenhum evento registrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
