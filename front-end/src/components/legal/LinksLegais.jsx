import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

const LINK = 'underline-offset-2 hover:underline hover:text-text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Linha de links "Política de Privacidade · Termos de Uso" para rodapés e formulários. */
export default function LinksLegais({ className, novaAba = false }) {
  const extra = novaAba ? { target: '_blank', rel: 'noopener' } : {};
  return (
    <nav aria-label="Documentos legais" className={cn('text-xs text-text-primary/70', className)}>
      <Link to="/privacidade" className={LINK} {...extra}>Política de Privacidade</Link>
      <span aria-hidden="true" className="mx-2">·</span>
      <Link to="/termos" className={LINK} {...extra}>Termos de Uso</Link>
    </nav>
  );
}
