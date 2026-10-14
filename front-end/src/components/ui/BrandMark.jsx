import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Ícone da marca Core 4: grade 2x2 (dois quadrados cheios, dois vazados).
 * Fonte única do desenho — usado no login, na sidebar e como base do favicon.
 */
export function BrandIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" focusable="false" className={className}>
      <rect x="1" y="1" width="9" height="9" rx="2" fill="var(--color-primary)" />
      <rect x="12" y="1" width="9" height="9" rx="2" stroke="var(--color-primary)" strokeWidth="1.6" />
      <rect x="1" y="12" width="9" height="9" rx="2" stroke="var(--color-primary)" strokeWidth="1.6" />
      <rect x="12" y="12" width="9" height="9" rx="2" fill="var(--color-primary)" opacity=".4" />
    </svg>
  );
}

/** Quadro do ícone com fundo e brilho no tom primário do tema. */
export function BrandTile({ size = 40, iconSize = 20, className }) {
  return (
    <div
      className={cn('relative grid place-items-center overflow-hidden shrink-0 bg-primary/10 border border-primary/20', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size / 4) }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{ background: 'radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--color-primary) 40%, transparent), transparent 60%)' }}
      />
      <BrandIcon size={iconSize} className="relative z-[1]" />
    </div>
  );
}

/** Marca completa (ícone + nome). `subtitulo` é opcional. */
export default function BrandMark({ subtitulo = 'Gestão financeira', className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandTile />
      <div>
        <div className="font-display font-bold tracking-tight text-base text-text-primary">
          Core <span className="text-primary">4</span> ERP
        </div>
        {subtitulo && (
          <div className="font-mono text-xs text-text-primary/60 tracking-wider">
            {subtitulo}
          </div>
        )}
      </div>
    </div>
  );
}
