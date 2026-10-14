import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Stagger, StaggerItem } from '../motion/Movimento';

/**
 * Faixa de alertas do Início (portada do Fluxo): o que pede ação agora, do mais grave ao mais leve.
 * Cada alerta é um link para a tela onde se resolve. Some quando não há nada.
 *
 * alertas: [{ id, gravidade: 'critico' | 'atencao' | 'info', titulo, detalhe, to, icon }]
 */
const ESTILO = {
  critico: { caixa: 'border-error/35 bg-error/[0.08] hover:bg-error/[0.13]', icone: 'text-error bg-error/15', rotulo: 'Urgente' },
  atencao: { caixa: 'border-warning/35 bg-warning/[0.07] hover:bg-warning/[0.12]', icone: 'text-warning bg-warning/15', rotulo: 'Atenção' },
  info: { caixa: 'border-info/30 bg-info/[0.06] hover:bg-info/[0.11]', icone: 'text-info bg-info/15', rotulo: 'Aviso' },
};

const ORDEM = { critico: 0, atencao: 1, info: 2 };


export default function FaixaAlertas({ alertas = [] }) {
  const reduzir = useReducedMotion();
  const ordenados = [...alertas].sort((a, b) => ORDEM[a.gravidade] - ORDEM[b.gravidade]);
  if (ordenados.length === 0) return null;
  const temCritico = ordenados.some((a) => a.gravidade === 'critico');

  return (
    <section aria-labelledby="alertas-titulo">
      <h2 id="alertas-titulo" className="sr-only">Alertas que pedem ação</h2>
      <Stagger as="ul" className="grid gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {ordenados.map((a, i) => {
          const e = ESTILO[a.gravidade] ?? ESTILO.info;
          const Icone = a.icon ?? AlertTriangle;
          return (
            <StaggerItem as="li" key={a.id} className="min-w-0">
              <Link
                to={a.to}
                className={cn(
                  'group flex items-center gap-3 min-h-14 rounded-2xl border px-3.5 py-2.5 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  e.caixa,
                )}
              >
                <motion.span
                  aria-hidden="true"
                  className={cn('grid place-items-center w-9 h-9 rounded-xl shrink-0', e.icone)}
                  animate={!reduzir && temCritico && i === 0 ? { rotate: [0, -12, 10, -6, 4, 0] } : undefined}
                  transition={{ duration: 0.9, repeat: 2, repeatDelay: 5 }}
                >
                  <Icone className="w-[1.125rem] h-[1.125rem]" />
                </motion.span>
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{e.rotulo}: </span>
                  <span className="block text-sm font-semibold text-text-primary truncate">{a.titulo}</span>
                  {a.detalhe && <span className="block text-xs text-text-primary/65 truncate">{a.detalhe}</span>}
                </span>
                <ChevronRight className="w-4 h-4 text-text-primary/45 group-hover:translate-x-0.5 transition-transform shrink-0" aria-hidden="true" />
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
