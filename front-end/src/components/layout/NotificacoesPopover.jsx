import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import { Bell, CheckCheck, RefreshCw, AlertCircle, CreditCard, Clock, UserPlus } from 'lucide-react';
import { notificacoes as api } from '../../lib/api';
import { formatDateTime } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

// Cores por tipo via tokens do tema (funcionam no claro e no escuro)
const TIPO_META = {
  VENCIMENTO: { label: 'Vencimento', classes: 'text-error bg-error/10 border-error/25', icon: AlertCircle },
  FATURA: { label: 'Fatura', classes: 'text-warning bg-warning/10 border-warning/25', icon: CreditCard },
  MEMBRO_ADICIONADO: { label: 'Empresa', classes: 'text-primary bg-primary/10 border-primary/25', icon: UserPlus },
};
const DEFAULT_META = { label: 'Alerta', classes: 'text-secondary bg-secondary/10 border-secondary/25', icon: Bell };

const POLL_MS = 60000;

/**
 * Sino de notificações no cabeçalho. Substitui a antiga tela dedicada /notificacoes.
 * Mostra badge com a contagem de não lidas e um popover com a lista + ações.
 * O polling pausa com a aba em segundo plano e atualiza ao voltar.
 */
export default function NotificacoesPopover() {
  const toast = useToast();
  const { senhaProvisoria } = useAuth();
  const [lista, setLista] = useState([]);
  const [open, setOpen] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const wrapperRef = useRef(null);
  const botaoRef = useRef(null);
  const painelId = useId();

  const carregar = useCallback(async () => {
    try {
      setLista(await api.listar());
    } catch (err) {
      // Sino não deve poluir a UI com erros de rede; o próximo ciclo tenta de novo
      if (import.meta.env.DEV) console.warn('Falha ao carregar notificações:', err);
    }
  }, []);

  // Carga inicial + polling leve para manter o badge atualizado. Com senha provisória o
  // backend recusa a chamada, então nem tentamos até a troca de senha.
  useEffect(() => {
    if (senhaProvisoria) return undefined;
    let id = null;
    const iniciar = () => { if (!id) id = setInterval(carregar, POLL_MS); };
    const parar = () => { if (id) { clearInterval(id); id = null; } };
    const onVisibilidade = () => {
      if (document.hidden) { parar(); return; }
      carregar();
      iniciar();
    };
    carregar();
    if (!document.hidden) iniciar();
    document.addEventListener('visibilitychange', onVisibilidade);
    return () => {
      parar();
      document.removeEventListener('visibilitychange', onVisibilidade);
    };
  }, [carregar, senhaProvisoria]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      botaoRef.current?.focus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

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
      toast.success('Notificações atualizadas.');
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
        ref={botaoRef}
        type="button"
        onClick={abrir}
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? painelId : undefined}
        title="Notificações"
        className="relative min-w-11 min-h-11 grid place-items-center rounded-lg transition-colors text-text-primary/70 hover:text-text-primary hover:bg-surface-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-xs leading-none font-bold font-mono bg-primary text-on-primary"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div
          id={painelId}
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-text-primary/10 shadow-elevated overflow-hidden z-50 animate-scale-in bg-surface-low/95 backdrop-blur-md"
        >
          <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-text-primary/10">
            <div>
              <p className="text-xs font-bold text-text-primary">Notificações</p>
              <p className="text-xs text-text-primary/70 font-mono">
                {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={sincronizar}
              disabled={carregando}
              aria-label="Buscar novas notificações"
              className="flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-xs font-bold uppercase tracking-wider text-text-primary/70 hover:text-primary transition-colors disabled:opacity-50 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} aria-hidden="true" />
              Atualizar
            </button>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {naoLidas === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-text-primary/20" aria-hidden="true" />
                <p className="text-xs text-text-primary/70">Sem notificações não lidas.</p>
              </div>
            ) : (
              <ul className="divide-y divide-text-primary/5">
                {lista.map((n) => {
                  const meta = TIPO_META[n.tipo] ?? DEFAULT_META;
                  const Icon = meta.icon;
                  return (
                    <li key={n.id} className="flex items-start gap-3 pl-4 pr-2 py-3 hover:bg-surface-high/40 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 border ${meta.classes}`}>
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">{meta.label}:</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs text-text-primary leading-snug">{n.mensagem}</p>
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-text-primary/60">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatDateTime(n.dataCriacao)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => marcar(n.id)}
                        title="Marcar como lida"
                        aria-label="Marcar como lida"
                        className="shrink-0 min-w-11 min-h-11 grid place-items-center rounded-lg text-text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <CheckCheck className="w-4 h-4" aria-hidden="true" />
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
