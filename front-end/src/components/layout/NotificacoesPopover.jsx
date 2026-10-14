import React, { useEffect, useRef, useState, useId } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCheck, RefreshCw, AlertCircle, CreditCard, Clock, UserPlus, BellOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { notificacoes as api } from '../../lib/api';
import { formatDateTime } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { PopPresence } from '../motion/Movimento';

// Cores por tipo via tokens do tema (funcionam no claro e no escuro)
const TIPO_META = {
  VENCIMENTO: { label: 'Vencimento', classes: 'text-expense bg-expense/10 border-expense/25', ponto: 'bg-expense', icon: AlertCircle, grave: true },
  FATURA: { label: 'Fatura', classes: 'text-warning bg-warning/10 border-warning/25', ponto: 'bg-warning', icon: CreditCard },
  MEMBRO_ADICIONADO: { label: 'Empresa', classes: 'text-primary bg-primary/10 border-primary/25', ponto: 'bg-primary', icon: UserPlus },
};
const DEFAULT_META = { label: 'Alerta', classes: 'text-info bg-info/10 border-info/25', ponto: 'bg-info', icon: Bell };

const POLL_MS = 60000;

/**
 * Sino de notificações. Badge com a contagem de não lidas; o sino BALANÇA (a cada ~7s) só
 * quando há alerta grave (vencimento) — portado do Fluxo. Com "reduzir movimento" fica parado
 * (MotionConfig do app). O polling pausa com a aba em segundo plano e atualiza ao voltar.
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

  // Busca (setState só no retorno da promessa). Falha silenciosa: o próximo ciclo tenta de novo.
  const buscar = () => api.listar().then(
    (dados) => setLista(Array.isArray(dados) ? dados : []),
    (err) => { if (import.meta.env.DEV) console.warn('Falha ao carregar notificações:', err); },
  );

  // Carga inicial + polling leve. Com senha provisória o backend recusa, então nem tentamos.
  useEffect(() => {
    if (senhaProvisoria) return undefined;
    let id = null;
    const carregar = () => api.listar().then(
      (dados) => setLista(Array.isArray(dados) ? dados : []),
      () => {},
    );
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
  }, [senhaProvisoria]);

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
    if (proximo) buscar();
  }

  async function marcar(id) {
    try {
      await api.marcarLida(id);
      setLista((l) => l.filter((n) => n.id !== id));
    } catch (e) { toast.error(e.message); }
  }

  async function marcarTodas() {
    const ids = lista.map((n) => n.id);
    try {
      await Promise.all(ids.map((id) => api.marcarLida(id)));
      setLista([]);
    } catch (e) {
      toast.error(e.message);
      buscar();
    }
  }

  async function sincronizar() {
    setCarregando(true);
    try {
      await api.sincronizar();
      await buscar();
      toast.success('Notificações atualizadas.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const naoLidas = lista.length;
  const graves = lista.filter((n) => (TIPO_META[n.tipo] ?? DEFAULT_META).grave).length;

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={abrir}
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? painelId : undefined}
        title="Notificações"
        animate={graves && !open ? { rotate: [0, -14, 12, -8, 5, 0] } : { rotate: 0 }}
        transition={graves && !open ? { duration: 0.9, repeat: Infinity, repeatDelay: 6 } : { duration: 0.2 }}
        style={{ transformOrigin: '50% 20%' }}
        className="relative w-11 h-11 grid place-items-center rounded-xl transition-colors text-text-primary/65 hover:text-text-primary hover:bg-text-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[0.625rem] leading-none font-bold tabular-nums ring-2 ring-surface-low',
              graves ? 'bg-expense text-white' : 'bg-primary text-on-primary'
            )}
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </motion.button>

      <PopPresence
        aberto={open}
        origem="top right"
        id={painelId}
        role="dialog"
        aria-label="Notificações"
        className="absolute -right-12 sm:right-0 mt-2 w-[min(380px,calc(100vw-1.5rem))] rounded-2xl border border-border-strong shadow-elevated overflow-hidden z-50 bg-surface-low/95 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-2 pl-4 pr-2 py-2.5 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-text-primary">Notificações</p>
            <p className="text-xs text-text-primary/60 tabular-nums">
              {naoLidas ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}` : 'Tudo em dia'}
            </p>
          </div>
          <div className="flex items-center">
            {naoLidas > 1 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="min-h-11 px-2.5 rounded-lg text-xs font-medium text-text-primary/70 hover:text-primary hover:bg-primary/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Marcar todas
              </button>
            )}
            <button
              type="button"
              onClick={sincronizar}
              disabled={carregando}
              aria-label="Buscar novas notificações"
              title="Buscar novas"
              className="w-11 h-11 grid place-items-center rounded-lg text-text-primary/60 hover:text-primary hover:bg-primary/[0.08] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className={cn('w-4 h-4', carregando && 'animate-spin')} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[min(70vh,440px)] overflow-y-auto overscroll-contain">
          {naoLidas === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <span aria-hidden="true" className="grid place-items-center w-12 h-12 rounded-2xl bg-primary/[0.08] text-primary border border-primary/15">
                <BellOff className="w-5 h-5" />
              </span>
              <p className="text-sm font-medium text-text-primary/85">Nenhuma notificação nova</p>
              <p className="text-xs text-text-primary/60">Avisamos aqui quando uma conta vencer ou uma fatura fechar.</p>
            </div>
          ) : (
            <ul className="p-1.5 space-y-0.5">
              {lista.map((n) => {
                const meta = TIPO_META[n.tipo] ?? DEFAULT_META;
                const Icon = meta.icon;
                return (
                  <li key={n.id} className="group flex items-start gap-3 pl-2.5 pr-1 py-2.5 rounded-xl hover:bg-text-primary/[0.04] transition-colors">
                    <div className={cn('relative shrink-0 w-9 h-9 rounded-xl grid place-items-center mt-0.5 border', meta.classes)}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">{meta.label}:</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                      <p className="text-sm text-text-primary/90 leading-snug">{n.mensagem}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-text-primary/70 tabular-nums">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatDateTime(n.dataCriacao)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => marcar(n.id)}
                      title="Marcar como lida"
                      aria-label="Marcar como lida"
                      className="shrink-0 w-11 h-11 grid place-items-center rounded-lg text-text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <CheckCheck className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopPresence>
    </div>
  );
}
