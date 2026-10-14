import React from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Brotar, FadeIn } from '../motion/Movimento';
import Button from './Button';

/**
 * Estado vazio "que ensina": ilustração (ícone em ladrilho com anéis concêntricos e brilho),
 * título curto, uma frase dizendo QUANDO o dado aparece e O QUE fazer, até 2 ações e uma dica.
 *
 * Regra: se o cabeçalho da tela já tem o botão "Novo", não repita a ação aqui — escreva a
 * frase apontando para ele, ou esconda o do cabeçalho enquanto a lista estiver vazia.
 *
 * Props:
 * - icon: componente lucide (ex.: `icon={Users}`) ou elemento já pronto
 * - title, description
 * - action:          { label, onClick, icon? }  → botão principal
 * - secondaryAction: { label, onClick, icon? }  → botão secundário (opcional)
 * - dica: texto curto com lâmpada abaixo das ações (ex.: "Dica: importe o OFX do seu banco")
 * - tom: 'primary' (padrão) | 'neutro' | 'income' | 'expense' | 'invest' — cor da ilustração
 * - compact: menos respiro vertical (dentro de cartões pequenos)
 * - children: conteúdo extra abaixo do texto (opcional)
 */
const TONS = {
  primary: 'text-primary border-primary/25 from-primary/[0.16] to-primary/[0.03]',
  neutro: 'text-text-primary/70 border-border-strong from-text-primary/[0.08] to-transparent',
  income: 'text-income border-income/25 from-income/[0.16] to-income/[0.03]',
  expense: 'text-expense border-expense/25 from-expense/[0.16] to-expense/[0.03]',
  invest: 'text-invest border-invest/25 from-invest/[0.16] to-invest/[0.03]',
};

function renderIcone(icon, compact) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Icone = icon;
  return <Icone className={compact ? 'w-6 h-6' : 'w-7 h-7'} strokeWidth={1.75} aria-hidden="true" />;
}

function AcaoBotao({ acao, variant }) {
  if (!acao) return null;
  const IconeAcao = acao.icon;
  return (
    <Button
      variant={variant}
      onClick={acao.onClick}
      leftIcon={IconeAcao ? <IconeAcao className="w-4 h-4" aria-hidden="true" /> : null}
    >
      {acao.label}
    </Button>
  );
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  dica,
  tom = 'primary',
  compact = false,
  children,
  className,
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center px-6',
      compact ? 'py-8' : 'py-14 sm:py-16',
      className
    )}>
      {icon && (
        <Brotar className={cn('relative grid place-items-center', compact ? 'mb-4 w-20 h-20' : 'mb-6 w-28 h-28')}>
          {/* Anéis concêntricos (eco dos fios da logo) + halo */}
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-text-primary/10" />
          <span aria-hidden="true" className="absolute inset-[14%] rounded-full border border-text-primary/[0.07]" />
          <span aria-hidden="true" className="absolute inset-[22%] rounded-full bg-primary/[0.10] blur-2xl" />
          <span
            className={cn(
              'relative grid place-items-center rounded-2xl border bg-gradient-to-br shadow-[var(--shadow-card)]',
              compact ? 'w-12 h-12' : 'w-16 h-16',
              TONS[tom] ?? TONS.primary
            )}
          >
            {renderIcone(icon, compact)}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </span>
        </Brotar>
      )}
      <FadeIn delay={0.06} y={6}>
        {title && (
          <h3 className="text-base sm:text-lg font-semibold text-text-primary font-display tracking-tight">{title}</h3>
        )}
        {description && (
          <p className="mt-1.5 mx-auto text-sm text-text-primary/70 max-w-sm leading-relaxed text-pretty">{description}</p>
        )}
      </FadeIn>
      {children}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
          <AcaoBotao acao={secondaryAction} variant="secondary" />
          <AcaoBotao acao={action} variant="primary" />
        </div>
      )}
      {dica && (
        <p className="mt-5 inline-flex items-start gap-2 max-w-sm text-left text-xs text-text-primary/60 leading-relaxed">
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-invest" aria-hidden="true" />
          <span>{dica}</span>
        </p>
      )}
    </div>
  );
}
