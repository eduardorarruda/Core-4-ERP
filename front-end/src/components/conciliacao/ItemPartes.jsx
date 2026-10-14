import React from 'react';
import {
  ArrowDownLeft, ArrowUpRight, ShieldCheck, ShieldQuestion, ShieldAlert,
  CircleHelp, Link2, EyeOff, CircleCheckBig, Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatarMoeda } from '../../lib/formatters';
import { nivelConfianca, rotuloStatus } from './modos';

/*
 * Peças pequenas das linhas e do relatório de conciliação. Todas definidas no nível do
 * módulo (nunca dentro de render) e sem depender só de cor: texto + ícone sempre.
 */

const CONFIANCA = {
  alta: { texto: 'Confiança alta', Icone: ShieldCheck, cls: 'text-primary bg-primary/[0.10] border-primary/25' },
  media: { texto: 'Confiança média', Icone: ShieldQuestion, cls: 'text-warning bg-warning/[0.10] border-warning/25' },
  baixa: { texto: 'Confiança baixa', Icone: ShieldAlert, cls: 'text-text-primary/75 bg-text-primary/[0.06] border-border-strong' },
};

/** Selo da confiança da sugestão: "Confiança alta · 85 de 100". */
export function ConfiancaSelo({ score, compacto = false, className }) {
  const nivel = nivelConfianca(score);
  if (!nivel) return null;
  const { texto, Icone, cls } = CONFIANCA[nivel];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', cls, className)}>
      <Icone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {texto}
      {!compacto && <span className="tabular-nums opacity-80">· {score} de 100</span>}
    </span>
  );
}

const STATUS_VISUAL = {
  SUGERIDO: { Icone: Sparkles, cls: 'text-warning bg-warning/[0.10] border-warning/25' },
  VINCULADO_MANUALMENTE: { Icone: Link2, cls: 'text-secondary bg-secondary/[0.10] border-secondary/25' },
  NAO_IDENTIFICADO: { Icone: CircleHelp, cls: 'text-error bg-error/[0.10] border-error/25' },
  IGNORADO: { Icone: EyeOff, cls: 'text-text-primary/70 bg-text-primary/[0.06] border-border-strong' },
  BAIXADO: { Icone: CircleCheckBig, cls: 'text-primary bg-primary/[0.10] border-primary/25' },
};

/** Selo do estado do item (texto + ícone). */
export function StatusItemSelo({ statusItem, cfg, className }) {
  const v = STATUS_VISUAL[statusItem] ?? STATUS_VISUAL.IGNORADO;
  const { Icone } = v;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', v.cls, className)}>
      <Icone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {rotuloStatus(statusItem, cfg)}
    </span>
  );
}

/** Valor do extrato com sinal, ícone e cor de entrada/saída. */
export function ValorOfx({ valor, className }) {
  const n = Number(valor) || 0;
  const entrada = n > 0;
  const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold tabular-nums whitespace-nowrap valor-privado', entrada ? 'text-income' : 'text-expense', className)}>
      <Icone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{entrada ? 'Entrada de ' : 'Saída de '}</span>
      {formatarMoeda(n, { sinal: 'sempre' })}
    </span>
  );
}
