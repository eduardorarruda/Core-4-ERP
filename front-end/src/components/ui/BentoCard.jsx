import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import SkeletonCard from './SkeletonCard';

/**
 * Cartão de painel do Core 4 (`.c4-card`: borda em degradê por máscara + brilho de 1px no topo).
 * Título em Sora, subtítulo explicativo, ações no canto, selo de variação opcional.
 * Também exportado como `Card` (components/ui/Card.jsx).
 *
 * Props:
 * - title, subtitle (ou description), eyebrow (rótulo pequeno acima do título)
 * - icon: ícone lucide ao lado do título (componente ou elemento)
 * - headerAction (ou actions): nós no canto direito do cabeçalho
 * - footer: rodapé separado por linha fina (links "Ver tudo", totais)
 * - children, className, bodyClassName
 * - padding: 'none' | 'sm' | 'md' (padrão) | 'lg'
 * - loading: mostra o esqueleto no lugar do conteúdo
 * - accentChip:  texto do selo de variação ("▲ 12%", "+R$ 300") — ▲/+ → cor de entrada; senão saída
 * - accentColor: fio de cor na borda esquerda ('primary' | 'income' | 'expense' | 'invest' | 'secondary' | 'warning' | cor CSS)
 * - destaque: gradientes radiais esmeralda/prata (o cartão principal da tela)
 * - interactive: hover que eleva (use com onClick ou envolvendo um Link)
 * - onClick: torna o cartão clicável (vira <button> semântico se `as` não for informado)
 * - as: elemento raiz ('section' padrão; 'article', 'div', 'li'…)
 */
const ACENTOS = {
  primary: 'var(--color-primary)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
  invest: 'var(--color-invest)',
  secondary: 'var(--color-secondary)',
  warning: 'var(--color-warning)',
};

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

function chipPositivo(chip) {
  const texto = String(chip).trim();
  return texto.startsWith('▲') || texto.startsWith('+');
}

function IconeTitulo({ icon }) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return <span aria-hidden="true" className="grid place-items-center w-8 h-8 rounded-lg bg-primary/[0.1] text-primary border border-primary/20 shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>;
  }
  const Icone = icon;
  return (
    <span aria-hidden="true" className="grid place-items-center w-8 h-8 rounded-lg bg-primary/[0.1] text-primary border border-primary/20 shrink-0">
      <Icone className="w-4 h-4" />
    </span>
  );
}

export default function BentoCard({
  children,
  className,
  bodyClassName,
  title,
  subtitle,
  description,
  eyebrow,
  icon,
  headerAction,
  actions,
  footer,
  padding = 'md',
  loading,
  accentColor,
  accentChip,
  destaque = false,
  interactive = false,
  onClick,
  as,
}) {
  const tituloId = useId();
  if (loading) {
    return <SkeletonCard className={className} />;
  }

  const acento = accentColor ? (ACENTOS[accentColor] ?? accentColor) : null;
  const acoes = headerAction ?? actions;
  const apoio = subtitle ?? description;
  const clicavel = Boolean(onClick);
  const Raiz = as ?? (clicavel ? 'button' : 'section');
  const pad = PADDINGS[padding] ?? PADDINGS.md;
  const Titulo = Raiz === 'button' ? 'span' : 'h2';

  return (
    <Raiz
      aria-labelledby={title && Raiz !== 'button' ? tituloId : undefined}
      type={Raiz === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'c4-card flex flex-col text-left min-w-0',
        pad,
        destaque && 'c4-card--destaque',
        (interactive || clicavel) && 'c4-card--interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      {acento && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-[var(--c4-acento)] shadow-[0_0_14px_var(--c4-acento)]"
          style={{ '--c4-acento': acento }}
        />
      )}
      {(title || acoes || accentChip || eyebrow) && (
        <div className={cn('flex justify-between items-start gap-4', padding === 'none' ? 'p-5 pb-0 mb-4' : 'mb-5')}>
          <div className="flex items-start gap-3 min-w-0">
            <IconeTitulo icon={icon} />
            <div className="min-w-0">
              {eyebrow && <p className="c4-eyebrow mb-1">{eyebrow}</p>}
              {title && (
                <Titulo id={tituloId} className="block text-base sm:text-[1.0625rem] font-semibold tracking-tight text-text-primary font-display leading-snug">
                  {title}
                </Titulo>
              )}
              {apoio && (
                <p className="mt-0.5 text-sm text-text-primary/60 leading-snug text-pretty">{apoio}</p>
              )}
            </div>
          </div>
          {(accentChip || acoes) && (
            <div className="flex items-center gap-2 shrink-0">
              {accentChip && (
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  chipPositivo(accentChip) ? 'text-income bg-income/[0.12]' : 'text-expense bg-expense/[0.12]'
                )}>
                  {accentChip}
                </span>
              )}
              {acoes}
            </div>
          )}
        </div>
      )}
      <div className={cn('flex-1 min-h-0', bodyClassName)}>
        {children}
      </div>
      {footer && (
        <div className={cn('mt-5 pt-4 border-t border-border text-sm', padding === 'none' && 'px-5 pb-4')}>
          {footer}
        </div>
      )}
    </Raiz>
  );
}

export { BentoCard };
