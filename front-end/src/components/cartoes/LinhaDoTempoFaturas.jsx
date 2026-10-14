import React, { useEffect, useRef } from 'react';
import { CalendarClock, CircleDot, Lock } from 'lucide-react';
import { IndicatorGroup, LayoutIndicator } from '../motion/Movimento';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { rotuloFatura } from './faturas';

/*
 * Linha do tempo horizontal das faturas (fechadas → aberta → futuras), com scroll-snap.
 * Escolher uma fatura É o filtro de período da lista de lançamentos.
 * Status sempre com texto + ícone (não só cor).
 *
 * Props: faturas (de agruparFaturas), valor (chave selecionada), onChange(chave).
 */

const SITUACAO = {
  fechada: { rotulo: 'Fechada', icon: Lock, classe: 'text-text-primary/60' },
  aberta: { rotulo: 'Aberta', icon: CircleDot, classe: 'text-primary' },
  futura: { rotulo: 'Próxima', icon: CalendarClock, classe: 'text-info' },
};

export default function LinhaDoTempoFaturas({ faturas = [], valor, onChange }) {
  const listaRef = useRef(null);

  // Traz a fatura selecionada para a vista (só rola o próprio trilho, nunca a página)
  useEffect(() => {
    const trilho = listaRef.current;
    const alvo = trilho?.querySelector('[aria-pressed="true"]');
    if (!trilho || !alvo) return;
    const esquerda = alvo.offsetLeft - trilho.clientWidth / 2 + alvo.clientWidth / 2;
    trilho.scrollTo({ left: Math.max(0, esquerda) });
  }, [valor, faturas.length]);

  return (
    <IndicatorGroup id="faturas">
      <ul
        ref={listaRef}
        aria-label="Faturas do cartão"
        className="relative flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 no-scrollbar"
      >
        {faturas.map((f) => {
          const s = SITUACAO[f.situacao];
          const Icone = s.icon;
          const ativa = f.chave === valor;
          return (
            <li key={f.chave} className="snap-start shrink-0">
              <button
                type="button"
                aria-pressed={ativa}
                onClick={() => onChange(f.chave)}
                className={cn(
                  'relative isolate w-36 min-h-[5.5rem] text-left rounded-2xl border px-3.5 py-3 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  ativa ? 'border-primary/60' : 'border-border hover:border-border-strong',
                  f.situacao === 'futura' && !ativa && 'bg-[repeating-linear-gradient(-45deg,transparent_0_6px,color-mix(in_srgb,var(--color-text-primary)_4%,transparent)_6px_12px)]',
                )}
              >
                {ativa && (
                  <LayoutIndicator
                    layoutId="fatura-ativa"
                    className="rounded-2xl bg-primary/[0.1] shadow-[0_0_24px_-8px_var(--color-primary)] -z-10"
                  />
                )}
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-text-primary capitalize">{rotuloFatura(f.ano, f.mes)}</span>
                  <span className={cn('inline-flex items-center gap-1 text-[0.6875rem] font-medium', s.classe)}>
                    <Icone className="w-3 h-3" aria-hidden="true" />{s.rotulo}
                  </span>
                </span>
                <span className="block mt-1.5 tabular-nums text-sm font-semibold text-text-primary valor-privado">{formatarMoeda(f.total)}</span>
                <span className="block text-[0.6875rem] text-text-primary/60">{f.qtd} lançamento{f.qtd === 1 ? '' : 's'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </IndicatorGroup>
  );
}
