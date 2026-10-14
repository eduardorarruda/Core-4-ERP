import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
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
    <section id={id} aria-labelledby={tituloId} className="scroll-mt-24 pt-8 first:pt-0">
      <h2 id={tituloId} className="font-display text-lg sm:text-xl font-bold tracking-tight text-text-primary mb-3">
        {titulo}
      </h2>
      <div className={PROSA}>{children}</div>
    </section>
  );
}

function Sumario({ secoes }) {
  if (!secoes?.length) return null;
  return (
    <nav aria-label="Nesta página" className="mt-8 rounded-2xl bg-surface-low border border-text-primary/10 p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-text-primary/70 mb-3">Nesta página</p>
      <ol className="grid gap-1 sm:grid-cols-2 sm:gap-x-6 text-sm">
        {secoes.map((s, i) => (
          <li key={s.id} className="flex gap-2">
            <span className="font-mono text-xs text-text-primary/60 pt-0.5 w-5 shrink-0 text-right">{i + 1}.</span>
            <a href={`#${s.id}`} className={`text-text-primary/80 hover:text-primary transition-colors ${FOCO}`}>
              {s.titulo}
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
    <div className="min-h-dvh bg-surface text-text-primary overflow-x-hidden">
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-text-primary/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/login" aria-label="Core 4 ERP — ir para o login" className={FOCO}>
            <BrandMark />
          </Link>
          <BotaoVoltar />
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">{titulo}</h1>
        <p className="mt-2 text-xs sm:text-sm text-text-primary/70">
          Versão <span className="font-mono">{VERSAO_TERMOS}</span> · Vigente desde {VIGENCIA}
        </p>
        {resumo && <p className="mt-4 text-sm sm:text-base leading-relaxed text-text-primary/80">{resumo}</p>}

        <Sumario secoes={secoes} />

        <div className="mt-10">{children}</div>
      </main>

      <footer className="border-t border-text-primary/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm text-text-primary/70">
          <nav aria-label="Documentos legais" className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to="/privacidade" className={`hover:text-primary transition-colors ${FOCO}`}>Política de Privacidade</Link>
            <span aria-hidden="true">·</span>
            <Link to="/termos" className={`hover:text-primary transition-colors ${FOCO}`}>Termos de Uso</Link>
          </nav>
          <p>
            Versão <span className="font-mono">{VERSAO_TERMOS}</span> · Vigência: {VIGENCIA}
          </p>
        </div>
      </footer>
    </div>
  );
}
