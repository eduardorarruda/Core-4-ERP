import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { formatarNumero } from '../../lib/formatters';
import { corSerie, usePadroesGrafico } from '../../lib/chartTheme';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import GraficoAcessivel from './GraficoAcessivel';

/**
 * Rosca de composição (portada do Fluxo — Rosca.tsx, sem d3): as fatias abrem em sequência;
 * ao passar o mouse (ou focar a legenda) a fatia cresce, as outras esmaecem e o centro
 * passa a contar a história dela. Já vem com resumo acessível + tabela sr-only.
 *
 *   <DonutChart titulo="Despesas por categoria" fatias={[
 *     { id: 'mercado', nome: 'Mercado', valor: 1200 },        // cor opcional; padrão = paleta
 *     { id: 'casa', nome: 'Casa', valor: 900, cor: 'var(--color-chart-2)' },
 *   ]} rotuloCentro="Total do mês" />
 *
 * Props: fatias, titulo (vira o resumo acessível), rotuloCentro ('Total'), tamanho (px, 200),
 *        formato ('currency' | 'number' | (n) => string), legenda (true), className,
 *        mostrarZeradas (false — true mantém na legenda e na tabela as fatias com valor 0,
 *        para comparações do tipo "A vs B" em que o zero também é informação).
 */
export default function DonutChart({
  fatias = [],
  titulo = 'Composição',
  rotuloCentro = 'Total',
  tamanho = 200,
  formato = 'currency',
  legenda = true,
  mostrarZeradas = false,
  className,
}) {
  const reduzir = useMovimentoReduzido();
  const [foco, setFoco] = useState(null);
  const formatar = typeof formato === 'function' ? formato : (v) => formatarNumero(v, formato);
  const base = fatias.map((f, i) => ({ ...f, valor: Number(f.valor) || 0, cor: f.cor ?? corSerie(i), indice: i }));
  const dados = base.filter((f) => f.valor > 0); // só as fatias com valor desenham arco
  const listadas = mostrarZeradas ? base : dados; // legenda e tabela
  const total = dados.reduce((s, f) => s + f.valor, 0);
  const focada = dados.find((f) => f.id === foco);
  const parte = (v) => (total > 0 ? (v / total) * 100 : 0);
  // Modo daltonismo / "padrões nos gráficos": cada fatia ganha textura além da cor (WCAG 1.4.1)
  const padroes = usePadroesGrafico(base.length ? base.map((f) => f.cor) : undefined);

  const espessura = tamanho * 0.13;
  const r = tamanho / 2 - espessura / 2 - 4;
  const circ = 2 * Math.PI * r;
  const folga = dados.length > 1 ? Math.min(6, circ * 0.012) : 0; // respiro entre fatias
  const inicios = dados.reduce((lista, f, i) => {
    const anterior = i === 0 ? 0 : lista[i - 1] + (Number(dados[i - 1].valor) / total) * circ;
    return [...lista, anterior];
  }, []);

  const resumo = total > 0
    ? `${titulo}: ${listadas.map((f) => `${f.nome} ${formatar(f.valor)} (${formatarNumero(parte(f.valor), 'percent', { casas: 0 })})`).join('; ')}. Total ${formatar(total)}.`
    : `${titulo}: sem dados no período.`;

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-5 sm:gap-6', className)}>
      <GraficoAcessivel
        resumo={resumo}
        tabela={{ titulo, colunas: ['Item', 'Valor', 'Parte do total'], linhas: listadas.map((f) => [f.nome, formatar(f.valor), formatarNumero(parte(f.valor), 'percent', { casas: 1 })]) }}
        className="relative shrink-0"
      >
        <div style={{ width: tamanho, height: tamanho }} className="relative">
          <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="-rotate-90">
            {padroes.defs && <defs>{padroes.defs}</defs>}
            <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="color-mix(in srgb, var(--color-text-primary) 6%, transparent)" strokeWidth={espessura} />
            {dados.map((f, i) => {
              const comprimento = (Number(f.valor) / total) * circ;
              const inicio = inicios[i];
              const ativo = foco === f.id;
              const visivel = Math.max(0.5, comprimento - folga);
              return (
                <motion.circle
                  key={f.id}
                  cx={tamanho / 2}
                  cy={tamanho / 2}
                  r={r}
                  fill="none"
                  stroke={padroes.preencher(f.indice)}
                  strokeLinecap="butt"
                  strokeDasharray={`${visivel} ${circ - visivel}`}
                  strokeDashoffset={-inicio}
                  initial={reduzir ? false : { opacity: 0, strokeWidth: espessura * 0.4 }}
                  animate={{
                    opacity: foco && !ativo ? 0.3 : 1,
                    strokeWidth: ativo ? espessura * 1.3 : espessura,
                  }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: reduzir ? 0 : i * 0.06 }}
                  onPointerEnter={() => setFoco(f.id)}
                  onPointerLeave={() => setFoco(null)}
                  style={{ cursor: 'pointer', filter: ativo ? `drop-shadow(0 0 10px ${f.cor})` : undefined }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center pointer-events-none" aria-hidden="true">
            <div className="max-w-[62%]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={focada?.id ?? 'total'}
                  initial={reduzir ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <p className="text-xs text-text-primary/60 truncate">{focada ? focada.nome : rotuloCentro}</p>
                  <p className="font-display font-semibold tabular-nums leading-tight valor-privado" style={{ fontSize: `min(1.125rem, ${Math.round(tamanho * 0.095)}px)` }}>{formatar(focada ? focada.valor : total)}</p>
                  {focada && total > 0 && (
                    <p className="text-xs text-text-primary/60 tabular-nums">{formatarNumero((focada.valor / total) * 100, 'percent', { casas: 0 })} do total</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </GraficoAcessivel>

      {legenda && listadas.length > 0 && (
        <ul className="w-full min-w-0 space-y-1" aria-hidden="true">
          {listadas.map((f) => (
            <li
              key={f.id}
              onPointerEnter={() => setFoco(f.id)}
              onPointerLeave={() => setFoco(null)}
              className={cn(
                'flex flex-wrap items-center gap-x-2.5 gap-y-0.5 px-2 py-1.5 rounded-lg text-sm transition-opacity',
                foco && foco !== f.id && 'opacity-40',
                foco === f.id && 'bg-text-primary/[0.05]'
              )}
            >
              <span className={cn('shrink-0', padroes.ativo ? 'w-3.5 h-3.5 rounded-[3px] ring-1 ring-text-primary/30' : 'w-2.5 h-2.5 rounded-full')} style={padroes.estiloAmostra(f.indice)} />
              <span className="flex-1 basis-[6rem] min-w-0 truncate text-text-primary/80">{f.nome}</span>
              <span className="ml-auto tabular-nums font-medium valor-privado">{formatar(f.valor)}</span>
              <span className="w-10 text-right tabular-nums text-xs text-text-primary/70">
                {formatarNumero(parte(f.valor), 'percent', { casas: 0 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
