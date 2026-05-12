import React, { useState } from 'react';
import { Shield, AlertTriangle, Info, Search, Filter, Calendar, User, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import BentoCard from '../components/ui/BentoCard';
import PageHeader from '../components/ui/PageHeader';

const auditLogs = [
  { id: '1', timestamp: '29 Mar 2024, 10:45:22', user: 'penicula80@gmail.com', action: 'Login no Sistema', module: 'Auth', severity: 'info', ip: '189.122.45.10' },
  { id: '2', timestamp: '29 Mar 2024, 10:50:15', user: 'penicula80@gmail.com', action: 'Exclusão de Lançamento #882', module: 'Financeiro', severity: 'warning', ip: '189.122.45.10' },
  { id: '3', timestamp: '29 Mar 2024, 11:12:05', user: 'admin@core4.com', action: 'Alteração de Permissões de Grupo', module: 'Configurações', severity: 'critical', ip: '45.10.22.189' },
  { id: '4', timestamp: '29 Mar 2024, 11:15:00', user: 'penicula80@gmail.com', action: 'Exportação de Relatório DRE', module: 'Relatórios', severity: 'info', ip: '189.122.45.10' },
];

const SEVERITY = {
  critical: { label: 'Crítico',    color: '#FFB4AB', bg: 'rgba(255,180,171,.1)',  border: 'rgba(255,180,171,.2)' },
  warning:  { label: 'Alerta',     color: '#FFD37A', bg: 'rgba(255,211,122,.1)',  border: 'rgba(255,211,122,.2)' },
  info:     { label: 'Info',       color: '#6EFFC0', bg: 'rgba(110,255,192,.1)',  border: 'rgba(110,255,192,.2)' },
};

export default function Audit() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? auditLogs.filter((l) =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.user.toLowerCase().includes(search.toLowerCase())
      )
    : auditLogs;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Rastreabilidade total e logs de segurança em tempo real"
        actions={
          <button className="flex items-center gap-2 border border-text-primary/10 text-text-primary/70 font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-surface-medium transition-colors font-mono">
            <Download className="w-4 h-4" /> Exportar Logs
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Eventos (24h)',    value: '1.240', icon: Info,          chipOk: true,  chip: '▲ +12%',  color: '#6EFFC0' },
          { label: 'Alertas Críticos', value: '03',    icon: AlertTriangle, chipOk: false, chip: '▼ Atenção', color: '#FFB4AB' },
          { label: 'Sessões Ativas',   value: '12',    icon: User,          chipOk: true,  chip: null,        color: '#ACC7FF', live: true },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`anim-in d${i + 1} rounded-[18px] p-5 flex flex-col gap-3 relative overflow-hidden`}
            style={{
              background: 'rgba(255,255,255,.025)',
              border: '1px solid rgba(250,250,250,.08)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 1px 3px rgba(0,0,0,.3), 0 8px 32px rgba(0,0,0,.2)',
            }}
          >
            <div className="absolute -right-3 -top-3 opacity-[0.06]" aria-hidden>
              <stat.icon className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stat.live && <span className="live-dot" style={{ width: 5, height: 5 }} />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 font-mono">
                  {stat.label}
                </span>
              </div>
              {stat.chip && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 4,
                  background: stat.chipOk ? 'rgba(110,255,192,.12)' : 'rgba(255,180,171,.12)',
                  color: stat.chipOk ? '#6EFFC0' : '#FFB4AB',
                  fontFamily: 'monospace', letterSpacing: '.05em',
                }}>{stat.chip}</span>
              )}
            </div>
            <p className="text-4xl font-bold font-display leading-none" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div
        className="rounded-[18px] overflow-hidden"
        style={{
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(250,250,250,.07)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 3px rgba(0,0,0,.3), 0 8px 32px rgba(0,0,0,.2)',
        }}
      >
        {/* Toolbar */}
        <div className="p-5 border-b border-text-primary/5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ação ou usuário..."
              className="w-full bg-surface-medium border border-text-primary/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-text-primary/30"
            />
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Período', icon: Calendar },
              { label: 'Módulo',  icon: Filter },
              { label: 'Nível',   icon: Shield },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="px-3 py-2 bg-surface-medium border border-text-primary/8 text-text-primary/60 text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-2 hover:border-primary/20 hover:text-primary transition-all font-mono"
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-text-primary/5">
                {['Timestamp', 'Usuário', 'Ação', 'Módulo', 'Severidade', 'IP'].map((h) => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold text-text-primary/40 uppercase tracking-widest font-mono whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-text-primary/5">
              {filtered.map((log, i) => {
                const sev = SEVERITY[log.severity] ?? SEVERITY.info;
                return (
                  <tr
                    key={log.id}
                    className={`hover:bg-surface-medium/30 transition-colors anim-in d${Math.min(i + 1, 6)}`}
                  >
                    <td className="px-5 py-4 text-[11px] font-mono text-text-primary/40 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-text-primary font-display whitespace-nowrap">
                      {log.user}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-primary/80">
                      {log.action}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-mono" style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(250,250,250,.5)' }}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest font-mono px-2.5 py-1 rounded-full"
                        style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sev.color }} />
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] font-mono text-text-primary/35 whitespace-nowrap">
                      {log.ip}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
