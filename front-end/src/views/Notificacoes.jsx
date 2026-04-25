import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { notificacoes as api } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { formatDateTime } from '../lib/formatters';
import { useToast } from '../hooks/useToast';

const TIPO_VARIANT = { VENCIMENTO: 'error', FATURA: 'warning' };
const TIPO_BORDER = { VENCIMENTO: 'border-l-4 border-l-error', FATURA: 'border-l-4 border-l-amber-500' };

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
        subtitle="Alertas de vencimentos e faturas"
        actions={
          <button
            onClick={sincronizar}
            disabled={carregando}
            className="flex items-center gap-2 border border-text-primary/10 text-text-primary/70 font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-surface-medium transition-colors disabled:opacity-50"
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
          {lista.map((n) => (
            <div
              key={n.id}
              className={`bg-surface-medium rounded-2xl p-5 flex items-start justify-between gap-4 hover:shadow-elevated transition-all ${TIPO_BORDER[n.tipo] || ''}`}
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-text-primary text-sm leading-relaxed">{n.mensagem}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-text-primary/40">{formatDateTime(n.dataCriacao)}</span>
                  <Badge variant={TIPO_VARIANT[n.tipo] ?? 'neutral'} size="sm">{n.tipo}</Badge>
                </div>
              </div>
              <button
                onClick={() => marcar(n.id)}
                title="Marcar como lida"
                aria-label="Marcar notificação como lida"
                className="p-1.5 text-text-primary/40 hover:text-green-400 rounded-lg hover:bg-green-400/10 transition-colors shrink-0"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
