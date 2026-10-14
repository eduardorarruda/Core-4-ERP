import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Plus, Search, X } from 'lucide-react';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { TRANSICAO_BASE } from '../motion/presets';
import { cn } from '../../lib/utils';

/** Agrupa conversas por data (Hoje / Ontem / Últimos 7 dias / Anteriores). */
function agrupar(lista) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  const semana = new Date(hoje); semana.setDate(semana.getDate() - 7);
  const grupos = [['Hoje', []], ['Ontem', []], ['Últimos 7 dias', []], ['Anteriores', []]];
  lista.forEach((c) => {
    const d = new Date(c.atualizadoEm);
    if (d >= hoje) grupos[0][1].push(c);
    else if (d >= ontem) grupos[1][1].push(c);
    else if (d >= semana) grupos[2][1].push(c);
    else grupos[3][1].push(c);
  });
  return grupos.filter(([, itens]) => itens.length);
}

/**
 * Lista de conversas da Áurea (coluna esquerda da tela cheia; gaveta no celular).
 * Props: conversas, ativa, carregando, busca, onBusca, onSelecionar(id), onNova, onFechar (só celular).
 */
export default function ListaConversas({ conversas, ativa, carregando, busca, onBusca, onSelecionar, onNova, onFechar }) {
  const reduzir = useMovimentoReduzido();
  const termo = busca.trim().toLowerCase();
  const filtradas = termo ? conversas.filter((c) => (c.titulo || '').toLowerCase().includes(termo)) : conversas;
  const grupos = agrupar(filtradas);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3">
        <Button onClick={onNova} fullWidth leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
          Nova conversa
        </Button>
        {onFechar && (
          <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar lista de conversas" className="md:hidden shrink-0">
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="px-3 pb-2" role="search">
        <label className="flex items-center gap-2 px-3 min-h-11 rounded-xl border border-border-strong bg-surface text-text-primary/70 focus-within:ring-2 focus-within:ring-primary">
          <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Buscar conversa</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar conversa"
            className="bg-transparent outline-none text-sm w-full placeholder:text-text-primary/50 text-text-primary"
          />
        </label>
      </div>

      <nav aria-label="Conversas com a Áurea" className="flex-1 overflow-y-auto no-scrollbar px-2 pb-3 space-y-4">
        {carregando && (
          <div className="space-y-2 px-1 pt-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        )}
        {!carregando && conversas.length === 0 && (
          <p className="text-sm text-text-primary/65 text-center mt-6 px-4 leading-relaxed">
            Nenhuma conversa ainda. Faça uma pergunta para começar.
          </p>
        )}
        {!carregando && conversas.length > 0 && filtradas.length === 0 && (
          <p className="text-sm text-text-primary/65 text-center mt-6 px-4">Nenhuma conversa com “{busca}”.</p>
        )}
        {grupos.map(([rotulo, itens]) => (
          <div key={rotulo}>
            <h2 className="c4-eyebrow px-3 mb-1.5">{rotulo}</h2>
            <ul className="space-y-0.5">
              <AnimatePresence initial={false}>
                {itens.map((c) => {
                  const atual = c.id === ativa;
                  return (
                    <motion.li
                      key={c.id}
                      layout={!reduzir}
                      initial={reduzir ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduzir ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: -6 }}
                      transition={TRANSICAO_BASE}
                    >
                      <button
                        type="button"
                        onClick={() => onSelecionar(c.id)}
                        aria-current={atual ? 'page' : undefined}
                        className={cn(
                          'relative w-full flex items-center gap-2.5 pl-3 pr-2 min-h-11 text-left rounded-lg transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          atual ? 'bg-primary/10 text-text-primary' : 'text-text-primary/75 hover:bg-surface-medium hover:text-text-primary',
                        )}
                      >
                        {atual && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />}
                        <MessageSquare className={cn('w-4 h-4 shrink-0', atual ? 'text-primary' : 'text-text-primary/50')} aria-hidden="true" />
                        <span className="flex-1 text-sm truncate">{c.titulo || 'Nova conversa'}</span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
