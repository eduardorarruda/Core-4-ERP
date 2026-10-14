import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

/**
 * Cabeçalho de tela do Core 4 — "explicativo por padrão".
 *
 * Props:
 * - title:      nome da tela (Sora, grande)
 * - subtitle:   UMA frase em texto normal dizendo para que a tela serve
 * - icon:       ícone em ladrilho esmeralda — elemento (`<CreditCard />`) ou componente (`CreditCard`)
 * - actions:    botões à direita (no celular quebram para baixo do título)
 * - breadcrumb: trilha acima do título — strings ou { label, to } (o último é a tela atual)
 * - className
 */
function renderIcone(icon) {
  if (React.isValidElement(icon)) return icon;
  const Icone = icon;
  return <Icone />;
}

function Trilha({ itens }) {
  return (
    <nav aria-label="Você está em" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-text-primary/60">
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          const label = typeof item === 'string' ? item : item.label;
          const to = typeof item === 'string' ? null : item.to;
          return (
            <li key={`${label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-primary/35" aria-hidden="true" />}
              {to && !ultimo ? (
                <Link to={to} className="rounded hover:text-primary transition-colors">{label}</Link>
              ) : (
                <span aria-current={ultimo ? 'page' : undefined} className={cn(ultimo && 'text-text-primary/80 font-medium')}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function PageHeader({ title, subtitle, actions, breadcrumb, icon, className }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className={cn('flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4', className)}
    >
      <div className="min-w-0">
        {breadcrumb?.length > 0 && <Trilha itens={breadcrumb} />}
        <div className="flex items-center gap-3.5">
          {icon && (
            <span
              aria-hidden="true"
              className={cn(
                'relative grid place-items-center w-11 h-11 shrink-0 rounded-[0.9rem] text-on-primary',
                'bg-gradient-primary shadow-[var(--shadow-primary)] ring-1 ring-inset ring-text-primary/10',
                '[&>svg]:w-5 [&>svg]:h-5',
              )}
            >
              {renderIcone(icon)}
            </span>
          )}
          <h1 className="min-w-0 text-2xl sm:text-3xl font-bold tracking-tight text-text-primary font-display leading-tight">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className={cn('mt-1.5 text-sm sm:text-[0.95rem] text-text-primary/65 leading-relaxed max-w-2xl text-pretty', icon && 'sm:pl-[3.6rem]')}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </motion.header>
  );
}
