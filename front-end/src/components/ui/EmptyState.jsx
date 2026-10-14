import React from 'react';
import { cn } from '../../lib/utils';
import { Brotar } from '../motion/Movimento';
import Button from './Button';

/**
 * Estado vazio "que ensina": ícone que brota, título curto, uma frase explicando o que
 * aparece aqui e como começar, e até 2 ações (principal + secundária).
 *
 * Regra §7.3 do guia: se o cabeçalho da tela já tem o botão "Novo", não repita a mesma ação
 * aqui — escreva a frase apontando para ele, ou esconda o do cabeçalho enquanto vazio.
 *
 * Props:
 * - icon: componente lucide (ex.: `icon={Users}`) ou elemento já pronto
 * - title, description
 * - action:          { label, onClick, icon? }  → botão principal
 * - secondaryAction: { label, onClick, icon? }  → botão secundário (opcional)
 * - compact: menos respiro vertical (dentro de cartões pequenos)
 * - children: conteúdo extra abaixo do texto (opcional)
 */
function renderIcone(icon) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Icone = icon;
  return <Icone className="w-7 h-7" strokeWidth={1.75} aria-hidden="true" />;
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
        <Brotar className="relative mb-5">
          {/* Halo esmeralda difuso atrás do ladrilho */}
          <span aria-hidden="true" className="absolute inset-0 -m-3 rounded-full bg-primary/[0.08] blur-xl" />
          <span className="relative grid place-items-center w-16 h-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] to-primary/[0.03] text-primary">
            {renderIcone(icon)}
          </span>
        </Brotar>
      )}
      {title && (
        <h3 className="text-base sm:text-lg font-semibold text-text-primary font-display tracking-tight">{title}</h3>
      )}
      {description && (
        <p className="mt-1.5 text-sm text-text-primary/70 max-w-sm leading-relaxed text-pretty">{description}</p>
      )}
      {children}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
          <AcaoBotao acao={secondaryAction} variant="secondary" />
          <AcaoBotao acao={action} variant="primary" />
        </div>
      )}
    </div>
  );
}
