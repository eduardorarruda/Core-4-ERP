import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';
import FundoVivo from '../layout/FundoVivo';
import { FadeIn } from '../motion/Movimento';
import { VERSAO_TERMOS, VIGENCIA } from '../../content/legal';

const FOCO = 'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface';
const LINK_TEXTO = `text-primary font-medium underline underline-offset-2 hover:opacity-80 transition-opacity ${FOCO}`;

// Estilos de texto corrido aplicados a tudo que estiver dentro de uma seção.
// Mantém o corpo em /80 de opacidade no mínimo (contraste legível nos dois temas).
const PROSA = [
  'text-sm sm:text-base leading-relaxed text-text-primary/80',
  '[&_p]:mt-3 [&_p:first-child]:mt-0',
  '[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5',
  '[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5',
  '[&_li]:marker:text-primary',
  '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-primary',
  '[&_strong]:font-semibold [&_strong]:text-text-primary',
  '[&_a]:break-words',
].join(' ');

/** Link de texto padrão das páginas legais (interno via react-router). */
export function LegalLink({ to, children }) {
  return <Link to={to} className={LINK_TEXTO}>{children}</Link>;
}

/** Link de e-mail padrão das páginas legais. */
export function LegalEmail({ email }) {
  return <a href={`mailto:${email}`} className={`${LINK_TEXTO} font-mono text-[0.95em]`}>{email}</a>;
}

/** Seção com âncora: o `id` precisa bater com o item correspondente do sumário. */
export function LegalSection({ id, titulo, children }) {
  const tituloId = `${id}-titulo`;
  return (
    <section id={id} aria-labelledby={tituloId} className="scroll-mt-24 pt-8 mt-8 border-t border-border first:pt-0 first:mt-0 first:border-0">
      <h2 id={tituloId} className="font-display text-lg sm:text-xl font-semibold tracking-tight text-text-primary mb-3">
        {titulo}
      </h2>
      <div className={PROSA}>{children}</div>
    </section>
  );
}

function Sumario({ secoes }) {
  if (!secoes?.length) return null;
  return (
    <nav aria-label="Nesta página" className="c4-card p-4 sm:p-5 lg:sticky lg:top-24">
      <p className="c4-eyebrow mb-3">Nesta página</p>
      <ol className="grid gap-0.5 text-sm">
        {secoes.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={`flex gap-2.5 py-1.5 px-2 -mx-2 rounded-lg text-text-primary/75 hover:text-primary hover:bg-primary/[0.06] transition-colors ${FOCO}`}>
              <span className="tabular-nums text-xs text-text-primary/45 pt-0.5 w-4 shrink-0 text-right">{i + 1}</span>
              <span>{s.titulo}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function BotaoVoltar() {
  const navigate = useNavigate();
  // Volta para a página anterior quando houver histórico; senão, vai para o login.
  const voltar = (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      navigate(-1);
    }
  };
  return (
    <Link
      to="/login"
      onClick={voltar}
      className={`inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium text-text-primary/80 hover:text-primary transition-colors ${FOCO}`}
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Voltar
    </Link>
  );
}

/**
 * Casca pública (sem autenticação) das páginas legais.
 * Recebe o único <h1> da página em `titulo`; as seções usam <LegalSection> (h2/h3).
 */
export default function LegalLayout({ titulo, resumo, secoes, children }) {
  return (
    <div className="relative min-h-dvh bg-surface text-text-primary overflow-x-hidden">
      <FundoVivo />
      <header className="sticky top-0 z-20 c4-glass border-b pt-safe">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/login" aria-label="Core 4 — ir para o login" className={FOCO}>
            <BrandLogo size="sm" as="span" />
          </Link>
          <BotaoVoltar />
        </div>
      </header>

      <main id="main-content" className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <FadeIn className="max-w-3xl">
          <p className="c4-eyebrow mb-3">Documento legal</p>
          <h1 className="font-display text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.03em] leading-tight">{titulo}</h1>
          <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs sm:text-sm text-text-primary/65">
            <span className="rounded-full border border-border-strong px-2.5 py-0.5">Versão <span className="font-mono">{VERSAO_TERMOS}</span></span>
            <span>Vigente desde {VIGENCIA}</span>
          </p>
          {resumo && <p className="mt-5 text-base leading-relaxed text-text-primary/80 text-pretty">{resumo}</p>}
        </FadeIn>

        <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12 items-start">
          <Sumario secoes={secoes} />
          <article className="c4-card p-5 sm:p-8 min-w-0 max-w-3xl">{children}</article>
        </div>
      </main>

      <footer className="relative z-[1] border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm text-text-primary/65">
          <nav aria-label="Documentos legais" className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to="/privacidade" className={`hover:text-primary transition-colors ${FOCO}`}>Política de Privacidade</Link>
            <span aria-hidden="true">·</span>
            <Link to="/termos" className={`hover:text-primary transition-colors ${FOCO}`}>Termos de Uso</Link>
          </nav>
          <p>© 2026 Core 4 · Versão <span className="font-mono">{VERSAO_TERMOS}</span></p>
        </div>
      </footer>
    </div>
  );
}
