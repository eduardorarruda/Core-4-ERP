import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw, AlertCircle, CreditCard, Clock } from 'lucide-react';
import { notificacoes as api } from '../../lib/api';
import { formatDateTime } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';

const TIPO_META = {
  VENCIMENTO: { label: 'Vencimento', color: '#FFB4AB', bg: 'rgba(255,180,171,.08)', border: 'rgba(255,180,171,.2)', icon: AlertCircle },
  FATURA: { label: 'Fatura', color: '#FFD37A', bg: 'rgba(255,211,122,.08)', border: 'rgba(255,211,122,.2)', icon: CreditCard },
};
const DEFAULT_META = { label: 'Alerta', color: '#ACC7FF', bg: 'rgba(172,199,255,.08)', border: 'rgba(172,199,255,.2)', icon: Bell };

const POLL_MS = 60000;

/**
 * Sino de notificações no cabeçalho. Substitui a antiga tela dedicada /notificacoes.
 * Mostra badge com a contagem de não lidas e um popover com a lista + ações.
 */
export default function NotificacoesPopover() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [open, setOpen] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const wrapperRef = useRef(null);

  const carregar = useCallback(async () => {
    try { setLista(await api.listar()); }
    catch { /* silencioso — sino não deve poluir a UI com erros de rede */ }
  }, []);

  // Carga inicial + polling leve para manter o badge atualizado.
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, POLL_MS);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function abrir() {
    const proximo = !open;
    setOpen(proximo);
    if (proximo) carregar();
  }

  async function marcar(id) {
    try {
      await api.marcarLida(id);
      setLista((l) => l.filter((n) => n.id !== id));
    } catch (e) { toast.error(e.message); }
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

  const naoLidas = lista.length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={abrir}
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ''}`}
        title="Notificações"
        className="relative hover:bg-surface-medium p-2 rounded-lg transition-colors text-text-primary/60 hover:text-text-primary"
      >
        <Bell className="w-5 h-5" />
        {naoLidas > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-black font-mono"
            style={{ background: '#6EFFC0' }}
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-text-primary/10 shadow-elevated overflow-hidden z-50 animate-scale-in"
          style={{ background: 'rgba(28,27,27,.97)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-text-primary/10">
            <div>
              <p className="text-xs font-bold text-text-primary">Notificações</p>
              <p className="text-[10px] text-text-primary/50 font-mono">
                {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={sincronizar}
              disabled={carregando}
              title="Sincronizar"
              aria-label="Sincronizar notificações"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-primary/60 hover:text-primary transition-colors disabled:opacity-50 font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {naoLidas === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-text-primary/20" />
                <p className="text-xs text-text-primary/50">Sem notificações não lidas.</p>
              </div>
            ) : (
              <ul className="divide-y divide-text-primary/5">
                {lista.map((n) => {
                  const meta = TIPO_META[n.tipo] ?? DEFAULT_META;
                  const Icon = meta.icon;
                  return (
                    <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-high/40 transition-colors">
                      <div
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs text-text-primary leading-snug">{n.mensagem}</p>
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] text-text-primary/40">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(n.dataCriacao)}
                        </span>
                      </div>
                      <button
                        onClick={() => marcar(n.id)}
                        title="Marcar como lida"
                        aria-label="Marcar como lida"
                        className="shrink-0 p-1.5 rounded-lg text-text-primary/30 hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
