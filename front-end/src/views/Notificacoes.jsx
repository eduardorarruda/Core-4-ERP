import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw, AlertCircle, CreditCard, Clock } from 'lucide-react';
import { notificacoes as api } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { formatDateTime } from '../lib/formatters';
import { useToast } from '../hooks/useToast';

const TIPO_META = {
  VENCIMENTO: { label: 'Vencimento', color: '#FFB4AB', bg: 'rgba(255,180,171,.08)', border: 'rgba(255,180,171,.2)', icon: AlertCircle },
  FATURA: { label: 'Fatura',     color: '#FFD37A', bg: 'rgba(255,211,122,.08)', border: 'rgba(255,211,122,.2)', icon: CreditCard },
};

const DEFAULT_META = { label: 'Alerta', color: '#ACC7FF', bg: 'rgba(172,199,255,.08)', border: 'rgba(172,199,255,.2)', icon: Bell };

export default function Notificacoes() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
  }

  async function marcar(id) {
    try {
      await api.marcarLida(id);
      setLista((l) => l.filter((n) => n.id !== id));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function sincronizar() {
    setCarregando(true);
    try {
      await api.sincronizar();
      await carregar();
      toast.success('Sincronização concluída!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        subtitle={`${lista.length} alerta${lista.length !== 1 ? 's' : ''} não lido${lista.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={sincronizar}
            disabled={carregando}
            className="flex items-center gap-2 border border-text-primary/10 text-text-primary/70 font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-surface-medium transition-colors disabled:opacity-50 font-mono"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            {carregando ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        }
      />

      {lista.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sem notificações"
          description="Você não tem notificações não lidas no momento."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((n, i) => {
            const meta = TIPO_META[n.tipo] ?? DEFAULT_META;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={`anim-in d${Math.min(i + 1, 6)} flex items-start justify-between gap-4 rounded-[18px] p-5 transition-all`}
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.border}`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,.25), 0 4px 16px rgba(0,0,0,.15)',
                }}
              >
                {/* Icon badge */}
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: meta.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-text-primary text-sm leading-relaxed">{n.mensagem}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-text-primary/40">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(n.dataCriacao)}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* Mark read */}
                <button
                  onClick={() => marcar(n.id)}
                  title="Marcar como lida"
                  aria-label="Marcar notificação como lida"
                  className="shrink-0 p-2 rounded-xl text-text-primary/30 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
