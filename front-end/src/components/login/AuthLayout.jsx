import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import BrandLogo from '../ui/BrandLogo';
import LinksLegais from '../legal/LinksLegais';
import FundoVivo from '../layout/FundoVivo';
import AuthHero from './AuthHero';
import BotaoAcessibilidade from '../acessibilidade/BotaoAcessibilidade';

/**
 * Moldura das telas públicas de acesso: coluna do formulário (logo, conteúdo, rodapé legal)
 * + painel da marca à direita no desktop. No celular, só a coluna do formulário (mobile-first).
 *
 * Props: children, heroTitulo, heroSubtitulo (textos do painel), larguraForm (classe max-w).
 */
export default function AuthLayout({ children, heroTitulo, heroSubtitulo, larguraForm = 'max-w-[400px]' }) {
  return (
    <div className="relative min-h-dvh flex bg-surface text-text-primary">
      <div className="lg:hidden"><FundoVivo /></div>

      <div className="relative z-[1] w-full lg:w-[min(46%,600px)] lg:shrink-0 min-h-dvh flex flex-col px-5 sm:px-10 lg:px-14 pt-safe pb-safe">
        <header className="flex flex-wrap items-center justify-between gap-3 py-6 sm:py-8">
          <Link to="/login" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <BrandLogo size="sm" as="span" />
            <span className="sr-only">, ir para o login</span>
          </Link>
          {/* Acessibilidade disponível antes do login (Alt+A) */}
          <BotaoAcessibilidade variante="rotulo" />
        </header>

        <main id="main-content" tabIndex={-1} className={cn('outline-none w-full mx-auto flex-1 flex flex-col justify-center py-6', larguraForm)}>
          {children}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 py-6 text-xs text-text-primary/60">
          <span>© 2026 Core 4</span>
          <LinksLegais />
        </footer>
      </div>

      <aside aria-label="Sobre o Core 4" data-decorativo="" className="hidden lg:block flex-1 min-w-0 sticky top-0 h-dvh border-l border-border">
        <AuthHero titulo={heroTitulo} subtitulo={heroSubtitulo} />
      </aside>
    </div>
  );
}
