import React from 'react';
import { Shield, AlertTriangle, Info, Search, Filter, Calendar, User, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import BentoCard from '../components/ui/BentoCard';

const auditLogs = [
  { id: '1', timestamp: '29 Mar 2024, 10:45:22', user: 'penicula80@gmail.com', action: 'Login no Sistema', module: 'Auth', severity: 'info', ip: '189.122.45.10' },
  { id: '2', timestamp: '29 Mar 2024, 10:50:15', user: 'penicula80@gmail.com', action: 'Exclusão de Lançamento #882', module: 'Financeiro', severity: 'warning', ip: '189.122.45.10' },
  { id: '3', timestamp: '29 Mar 2024, 11:12:05', user: 'admin@core4.com', action: 'Alteração de Permissões de Grupo', module: 'Configurações', severity: 'critical', ip: '45.10.22.189' },
  { id: '4', timestamp: '29 Mar 2024, 11:15:00', user: 'penicula80@gmail.com', action: 'Exportação de Relatório DRE', module: 'Relatórios', severity: 'info', ip: '189.122.45.10' },
];

export default function Audit() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">Auditoria de Sistema</h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">Rastreabilidade total e logs de segurança em tempo real.</p>
        </div>
        <button className="w-full sm:w-auto px-6 py-2.5 bg-surface-medium text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-surface-highest transition-all flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Exportar Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total de Eventos (24h)', value: '1.240', icon: Info, color: 'primary' },
          { label: 'Alertas Críticos', value: '03', icon: AlertTriangle, color: 'error' },
          { label: 'Sessões Ativas', value: '12', icon: User, color: 'secondary' },
        ].map((stat, i) => (
          <div key={i}>
            <BentoCard className="relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-10">
                <stat.icon className="w-24 h-24" />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={cn("text-4xl font-bold", `text-${stat.color}`)}>{stat.value}</p>
            </BentoCard>
          </div>
        ))}
      </div>

      <div className="bg-surface-low rounded-xl border border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-surface-medium/20 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input className="w-full bg-surface-medium border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary/20 transition-all outline-none" placeholder="Buscar por ação ou usuário..." type="text" />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-medium text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Período
            </button>
            <button className="px-4 py-2 bg-surface-medium text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
              <Filter className="w-3 h-3" /> Módulo
            </button>
            <button className="px-4 py-2 bg-surface-medium text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
              <Shield className="w-3 h-3" /> Severidade
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-surface-medium/10">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ação</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Módulo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Severidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-medium/40 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{log.user}</td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{log.action}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-surface-highest text-[10px] font-bold text-zinc-400 uppercase">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase",
                      log.severity === 'critical' ? "text-error" :
                      log.severity === 'warning' ? "text-amber-400" : "text-primary"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        log.severity === 'critical' ? "bg-error" :
                        log.severity === 'warning' ? "bg-amber-400" : "bg-primary"
                      )}></span>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-600">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
