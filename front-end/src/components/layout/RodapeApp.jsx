import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import LinksLegais from '../legal/LinksLegais';

/**
 * Rodapé da área logada (landmark contentinfo). Ajuda, acessibilidade e documentos ficam
 * sempre no mesmo lugar em todas as telas (WCAG 3.2.6 — ajuda consistente).
 */
export default function RodapeApp({ className }) {
  return (
    <footer className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 border-t border-border', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-primary/70">
        <Link
          to="/ajuda"
          className="inline-flex items-center gap-1.5 min-h-6 rounded underline-offset-2 hover:underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Precisa de ajuda? Central de Ajuda
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <LinksLegais />
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>© 2026 Core 4</span>
        </div>
      </div>
    </footer>
  );
}
