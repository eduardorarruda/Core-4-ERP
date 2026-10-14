import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, ChevronDown, ExternalLink, Lightbulb, Lock,
  // ícones das seções (resolvidos por nome via ICON_MAP)
  Sparkles, LayoutDashboard, FileText, Landmark, CalendarDays,
  CreditCard, ReceiptText, GitCompareArrows, ArrowLeftRight, Users, Tag,
  TrendingUp, Repeat, BarChart3, Gavel, UserCog, ShieldCheck, Settings, Smartphone,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { AJUDA_GRUPOS, AJUDA_SECOES } from '../content/ajudaContent';

// Mapa nome-do-ícone (string no conteúdo) → componente lucide. Fallback: FileText.
const ICON_MAP = {
  Sparkles, LayoutDashboard, FileText, Landmark, CalendarDays,
  CreditCard, ReceiptText, GitCompareArrows, ArrowLeftRight, Users, Tag,
  TrendingUp, Repeat, BarChart3, Gavel, UserCog, ShieldCheck, Settings, Smartphone,
};
function Icone({ nome, className }) {
  const Cmp = ICON_MAP[nome] ?? FileText;
  return <Cmp className={className} aria-hidden="true" />;
}

function combina(secao, termo) {
  if (!termo) return true;
  const t = termo.toLowerCase();
  const alvo = [
    secao.titulo,
    secao.resumo,
    ...(secao.comoUsar ?? []),
    ...(secao.dicas ?? []),
    ...(secao.faq ?? []).flatMap((f) => [f.p, f.r]),
  ].join(' ').toLowerCase();
  return alvo.includes(t);
}

// Cartão de uma seção — conteúdo compartilhado entre desktop e mobile.
function ConteudoSecao({ secao, temAcesso }) {
  return (
    <>
      <p className="text-sm text-text-primary/70 leading-relaxed">{secao.resumo}</p>

      {secao.comoUsar?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary/50 mb-2">Como usar</h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-text-primary/80 marker:text-primary marker:font-bold">
            {secao.comoUsar.map((passo, i) => <li key={i} className="leading-relaxed">{passo}</li>)}
          </ol>
        </div>
      )}

      {secao.dicas?.length > 0 && (
        <div className="mt-4 rounded-xl bg-surface-medium p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> Dicas
          </h4>
          <ul className="space-y-1 text-sm text-text-primary/75">
            {secao.dicas.map((d, i) => <li key={i} className="leading-relaxed">{d}</li>)}
          </ul>
        </div>
      )}

      {secao.faq?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary/50 mb-2">Perguntas frequentes</h4>
          <div className="space-y-2">
            {secao.faq.map((f, i) => (
              <details key={i} className="group rounded-xl bg-surface-medium overflow-hidden">
                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none min-h-11 px-3 py-2 text-sm font-medium text-text-primary">
                  <span>{f.p}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-text-primary/40 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-3 pb-3 text-sm text-text-primary/70 leading-relaxed">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {secao.rota && temAcesso && (
        <Link
          to={secao.rota}
          className="mt-4 inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" /> Abrir esta tela
        </Link>
      )}
    </>
  );
}

export default function Ajuda() {
  const { temPermissao } = useAuth();
  const [busca, setBusca] = useState('');
  const [abertoMobile, setAbertoMobile] = useState(null); // id da seção aberta no accordion mobile

  const temAcesso = (secao) => secao.permissao == null || temPermissao(secao.permissao);

  // Seções filtradas pela busca.
  const filtradas = useMemo(
    () => AJUDA_SECOES.filter((s) => combina(s, busca.trim())),
    [busca]
  );

  // Separa em acessíveis (agrupadas) e sem-acesso (bloco final).
  const acessiveis = filtradas.filter(temAcesso);
  const semAcesso = filtradas.filter((s) => !temAcesso(s));

  // Grupos que têm ao menos uma seção acessível após a busca.
  const gruposVisiveis = AJUDA_GRUPOS
    .map((g) => ({ ...g, secoes: acessiveis.filter((s) => s.grupo === g.id) }))
    .filter((g) => g.secoes.length > 0);

  const total = filtradas.length;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title="Central de Ajuda" subtitle="Aprenda a usar cada tela do Core 4 ERP" />

      {/* Busca */}
      <div role="search" className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-primary/40 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar na ajuda (ex.: baixar conta, cartão, convidar)..."
          aria-label="Buscar na Central de Ajuda"
          className="w-full min-h-11 rounded-xl bg-surface-low border border-text-primary/10 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-primary/40 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-lg text-text-primary/40 hover:text-text-primary hover:bg-surface-medium"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{total} tópicos encontrados</p>
      {busca && (
        <p className="text-sm text-text-primary/50 -mt-3">{total} {total === 1 ? 'tópico encontrado' : 'tópicos encontrados'}</p>
      )}

      {total === 0 && (
        <div className="rounded-2xl bg-surface-low p-8 text-center">
          <p className="text-sm text-text-primary/60">Nenhum tópico encontrado para “{busca}”. Tente outras palavras.</p>
        </div>
      )}

      {/* ───────── DESKTOP: TOC + conteúdo ───────── */}
      <div className="hidden lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:items-start">
        {/* TOC */}
        <nav aria-label="Índice da ajuda" className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          {gruposVisiveis.map((g) => (
            <div key={g.id}>
              <p className="text-xs font-bold uppercase tracking-wider text-text-primary/40 mb-1.5">{g.titulo}</p>
              <ul className="space-y-0.5">
                {g.secoes.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-primary/70 hover:bg-surface-medium hover:text-text-primary transition-colors"
                    >
                      <Icone nome={s.icone} className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{s.titulo}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {semAcesso.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-primary/40 mb-1.5">Outros recursos</p>
              <a href="#outros-recursos" className="block rounded-lg px-2 py-1.5 text-sm text-text-primary/50 hover:bg-surface-medium">
                Telas sem acesso no seu perfil
              </a>
            </div>
          )}
        </nav>

        {/* Conteúdo */}
        <div className="space-y-8 min-w-0">
          {gruposVisiveis.map((g) => (
            <section key={g.id} aria-labelledby={`grupo-${g.id}`}>
              <h2 id={`grupo-${g.id}`} className="text-lg font-bold text-text-primary mb-3">{g.titulo}</h2>
              <div className="space-y-4">
                {g.secoes.map((s) => (
                  <article key={s.id} id={s.id} className="scroll-mt-24 bg-surface-low rounded-2xl p-5">
                    <h3 className="flex items-center gap-2.5 text-base font-bold text-text-primary mb-3">
                      <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface-medium shrink-0">
                        <Icone nome={s.icone} className="w-5 h-5 text-primary" />
                      </span>
                      {s.titulo}
                    </h3>
                    <ConteudoSecao secao={s} temAcesso={temAcesso(s)} />
                  </article>
                ))}
              </div>
            </section>
          ))}

          {semAcesso.length > 0 && (
            <BlocoOutrosRecursos secoes={semAcesso} anchorId="outros-recursos" />
          )}
        </div>
      </div>

      {/* ───────── MOBILE: accordion único ───────── */}
      <div className="lg:hidden space-y-6">
        {gruposVisiveis.map((g) => (
          <section key={g.id} aria-labelledby={`m-grupo-${g.id}`}>
            <h2 id={`m-grupo-${g.id}`} className="text-base font-bold text-text-primary mb-2">{g.titulo}</h2>
            <div className="space-y-2">
              {g.secoes.map((s) => {
                const aberto = abertoMobile === s.id;
                return (
                  <div key={s.id} className="bg-surface-low rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAbertoMobile(aberto ? null : s.id)}
                      aria-expanded={aberto}
                      className="w-full min-h-11 flex items-center gap-2.5 px-4 py-3 text-left"
                    >
                      <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface-medium shrink-0">
                        <Icone nome={s.icone} className="w-5 h-5 text-primary" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-text-primary">{s.titulo}</span>
                        <span className="block text-xs text-text-primary/50 truncate">{s.resumo}</span>
                      </span>
                      <ChevronDown className={`w-5 h-5 shrink-0 text-text-primary/40 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4">
                        <ConteudoSecao secao={s} temAcesso={temAcesso(s)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {semAcesso.length > 0 && (
          <BlocoOutrosRecursos secoes={semAcesso} />
        )}
      </div>
    </div>
  );
}

// Bloco final "Outros recursos" — telas sem acesso, colapsado por padrão.
// `anchorId` só é passado na árvore desktop (alvo da âncora do índice), evitando id duplicado.
function BlocoOutrosRecursos({ secoes, anchorId }) {
  return (
    <section id={anchorId} className="scroll-mt-24">
      <details className="group bg-surface-low rounded-2xl overflow-hidden">
        <summary className="flex items-center gap-2.5 cursor-pointer list-none min-h-11 px-5 py-4">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface-medium shrink-0">
            <Lock className="w-5 h-5 text-text-primary/50" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-bold text-text-primary">Outros recursos do sistema</span>
            <span className="block text-xs text-text-primary/50">Telas que seu perfil ainda não acessa</span>
          </span>
          <ChevronDown className="w-5 h-5 shrink-0 text-text-primary/40 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-5 pb-5">
          <p className="text-sm text-text-primary/60 leading-relaxed mb-4">
            Estas telas existem no sistema, mas seu perfil atual não tem acesso a elas.
            Fale com o administrador da sua empresa se precisar usá-las.
          </p>
          <div className="space-y-3">
            {secoes.map((s) => (
              <div key={s.id} className="rounded-xl bg-surface-medium p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-1">
                  <Icone nome={s.icone} className="w-4 h-4 text-text-primary/50" />
                  {s.titulo}
                </h3>
                <p className="text-sm text-text-primary/60 leading-relaxed">{s.resumo}</p>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
