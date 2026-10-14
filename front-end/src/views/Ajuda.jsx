import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Accessibility, ArrowRight, BarChart3, CalendarDays, ChevronDown, CreditCard, ExternalLink, FileText, Gavel,
  GitCompareArrows, Keyboard, Landmark, LayoutDashboard, LifeBuoy, Lightbulb, Lock, ReceiptText, Repeat, Search,
  MessageSquareText, Settings, ShieldCheck, Smartphone, Sparkles, Tag, Target, TrendingUp, UserCog, Users, Wallet, X,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import { Revelar, Stagger, StaggerItem } from '../components/motion/Movimento';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAcessibilidade } from '../hooks/useAcessibilidade';
import ListaAtalhos from '../components/configuracoes/ListaAtalhos';
import { ATALHOS } from '../components/acessibilidade/textos';
import { AJUDA_GRUPOS, AJUDA_SECOES } from '../content/ajudaContent';
import { cn } from '../lib/utils';

// Nome do ícone (string no conteúdo) → componente lucide. Fallback: FileText.
const ICONES = {
  Sparkles, LayoutDashboard, FileText, Landmark, CalendarDays, CreditCard, ReceiptText, GitCompareArrows, Users, Tag,
  TrendingUp, Repeat, BarChart3, Gavel, UserCog, ShieldCheck, Settings, Smartphone, Lightbulb, Target, Wallet, Accessibility, MessageSquareText,
};
function Icone({ nome, className }) {
  const Cmp = ICONES[nome] ?? FileText;
  return <Cmp className={className} aria-hidden="true" />;
}

const PERGUNTAS_RAPIDAS = [
  { rotulo: 'Como baixo uma conta?', ancora: 'lancamentos' },
  { rotulo: 'Como concilio o extrato?', ancora: 'conciliacao' },
  { rotulo: 'Como a Áurea confirma ações?', ancora: 'aurea' },
  { rotulo: 'Como convido alguém?', ancora: 'operadores' },
  { rotulo: 'Atalhos de teclado', ancora: 'atalhos' },
];

const normalizar = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function combina(secao, termo) {
  if (!termo) return true;
  const alvo = normalizar([
    secao.titulo, secao.resumo, ...(secao.comoUsar ?? []), ...(secao.dicas ?? []),
    ...(secao.faq ?? []).flatMap((f) => [f.p, f.r]), ...(secao.palavras ?? []),
  ].join(' '));
  return normalizar(termo).split(/\s+/).every((p) => alvo.includes(p));
}

/** Destaca o termo buscado (ignora acentos e caixa). */
function Destaque({ texto, termo }) {
  if (!termo || !texto) return texto;
  const alvo = normalizar(texto);
  const t = normalizar(termo.trim().split(/\s+/)[0]);
  const i = t ? alvo.indexOf(t) : -1;
  if (i < 0) return texto;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="rounded px-0.5 bg-primary/25 text-text-primary">{texto.slice(i, i + t.length)}</mark>
      {texto.slice(i + t.length)}
    </>
  );
}

function ConteudoSecao({ secao, temAcesso, termo }) {
  return (
    <div className="space-y-5">
      {secao.comoUsar?.length > 0 && (
        <div>
          <h4 className="c4-eyebrow mb-2.5">Como funciona</h4>
          <ol className="space-y-2">
            {secao.comoUsar.map((passo, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text-primary/85 leading-relaxed">
                <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-primary/12 text-primary text-xs font-semibold tabular-nums" aria-hidden="true">{i + 1}</span>
                <span className="pt-0.5"><Destaque texto={passo} termo={termo} /></span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {secao.dicas?.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3.5">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary mb-1.5">
            <Lightbulb className="w-4 h-4 text-primary" aria-hidden="true" /> Dicas
          </h4>
          <ul className="space-y-1 text-sm text-text-primary/80 list-disc pl-5 marker:text-primary/60">
            {secao.dicas.map((d, i) => <li key={i} className="leading-relaxed"><Destaque texto={d} termo={termo} /></li>)}
          </ul>
        </div>
      )}

      {secao.faq?.length > 0 && (
        <div>
          <h4 className="c4-eyebrow mb-2">Perguntas frequentes</h4>
          <div className="space-y-2">
            {secao.faq.map((f, i) => (
              <details key={i} className="group rounded-xl border border-border bg-surface overflow-hidden" open={Boolean(termo) && combina({ titulo: f.p, resumo: f.r }, termo)}>
                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none min-h-11 px-3.5 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-medium/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                  <span><Destaque texto={f.p} termo={termo} /></span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-text-primary/50 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-3.5 pb-3.5 text-sm text-text-primary/75 leading-relaxed"><Destaque texto={f.r} termo={termo} /></p>
              </details>
            ))}
          </div>
        </div>
      )}

      {secao.rota && temAcesso && (
        <Link
          to={secao.rota}
          className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary rounded-lg hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Abrir {secao.titulo.split(',')[0]} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Um tópico: aberto no desktop; no celular vira um item de acordeão. */
function Artigo({ secao, temAcesso, termo, recolhivel, aberto, onAlternar }) {
  const corpoId = `ajuda-corpo-${secao.id}`;
  const cabecalho = (
    <>
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shrink-0">
        <Icone nome={secao.icone} className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block break-words hyphens-auto text-base font-semibold text-text-primary font-display"><Destaque texto={secao.titulo} termo={termo} /></span>
        <span className="block break-words hyphens-auto text-sm text-text-primary/70 leading-relaxed mt-0.5"><Destaque texto={secao.resumo} termo={termo} /></span>
      </span>
    </>
  );
  return (
    <article id={secao.id} className="scroll-mt-24 c4-card p-4 sm:p-5">
      {recolhivel ? (
        <h3>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={aberto}
            // O corpo só existe no DOM aberto (Revelar): aria-controls apontaria para um id inexistente
            aria-controls={aberto ? corpoId : undefined}
            className="w-full flex items-start gap-3 rounded-xl -m-1 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {cabecalho}
            <ChevronDown className={cn('w-5 h-5 mt-2.5 shrink-0 text-text-primary/50 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
          </button>
        </h3>
      ) : (
        <h3 className="flex items-start gap-3">{cabecalho}</h3>
      )}
      {recolhivel ? (
        <Revelar aberto={aberto} id={corpoId}>
          <div className="pt-4"><ConteudoSecao secao={secao} temAcesso={temAcesso} termo={termo} /></div>
        </Revelar>
      ) : (
        <div className="pt-4 sm:pl-[3.25rem]"><ConteudoSecao secao={secao} temAcesso={temAcesso} termo={termo} /></div>
      )}
    </article>
  );
}

function SecaoAtalhos() {
  const { abrirPainel } = useAcessibilidade();
  return (
    <section id="atalhos" aria-labelledby="titulo-atalhos" className="scroll-mt-24 c4-card p-4 sm:p-5">
      <h2 id="titulo-atalhos" className="flex items-center gap-3 min-w-0 break-words hyphens-auto text-lg font-semibold text-text-primary font-display">
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20" aria-hidden="true">
          <Keyboard className="w-5 h-5" />
        </span>
        <span className="min-w-0">Atalhos de teclado e acessibilidade</span>
      </h2>
      <p className="mt-2 text-sm text-text-primary/70 leading-relaxed">
        Todos os atalhos usam uma tecla junto (Alt ou Ctrl), para não dispararem sem querer. Dá para desligar os atalhos com Alt no painel de acessibilidade.
      </p>
      <div className="mt-4"><ListaAtalhos atalhos={ATALHOS} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={abrirPainel} leftIcon={<Accessibility className="w-4 h-4" aria-hidden="true" />}>
          Abrir opções de acessibilidade
        </Button>
        <Link to="/acessibilidade" className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium text-primary rounded-lg hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Declaração de acessibilidade <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function OutrosRecursos({ secoes }) {
  return (
    <details className="group c4-card overflow-hidden">
      <summary className="flex items-center gap-3 cursor-pointer list-none min-h-11 p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-surface-medium shrink-0">
          <Lock className="w-5 h-5 text-text-primary/60" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold text-text-primary">Telas que seu perfil não abre</span>
          <span className="block text-sm text-text-primary/70">Existem no Core 4, mas pedem um acesso que você não tem.</span>
        </span>
        <ChevronDown className="w-5 h-5 shrink-0 text-text-primary/50 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-4 sm:px-5 pb-5 space-y-3">
        <p className="text-sm text-text-primary/70 leading-relaxed">Se precisar de alguma, fale com o administrador da sua empresa.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {secoes.map((s) => (
            <li key={s.id} className="rounded-xl bg-surface-medium/70 p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Icone nome={s.icone} className="w-4 h-4 text-text-primary/60" /> {s.titulo}
              </p>
              <p className="text-sm text-text-primary/70 leading-relaxed mt-1">{s.resumo}</p>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function Ajuda() {
  const { temPermissao } = useAuth();
  const { hash } = useLocation();
  const largo = useMediaQuery('(min-width: 1024px)');
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState(() => new Set());
  const ancora = decodeURIComponent(hash.slice(1));
  const termo = busca.trim();

  const temAcesso = (s) => {
    if (s.permissoesAlguma) return s.permissoesAlguma.some((p) => temPermissao(p));
    return s.permissao == null || temPermissao(s.permissao);
  };

  const filtradas = useMemo(() => AJUDA_SECOES.filter((s) => combina(s, termo)), [termo]);
  const acessiveis = filtradas.filter(temAcesso);
  const semAcesso = filtradas.filter((s) => !temAcesso(s));
  const grupos = AJUDA_GRUPOS
    .map((g) => ({ ...g, secoes: acessiveis.filter((s) => s.grupo === g.id) }))
    .filter((g) => g.secoes.length > 0);
  const atalhosCombina = !termo || combina({ titulo: 'Atalhos de teclado acessibilidade', palavras: ['atalho', 'teclado', 'alt', 'ctrl'] }, termo);

  // Link com âncora (ex.: /ajuda#aurea, vindo da busca Ctrl+K): rola até o tópico
  useEffect(() => {
    if (!ancora) return;
    const el = document.getElementById(ancora);
    el?.scrollIntoView({ block: 'start' });
  }, [ancora]);

  const alternar = (id) => setAbertos((atual) => {
    const prox = new Set(atual);
    if (prox.has(id)) prox.delete(id); else prox.add(id);
    return prox;
  });
  // No celular, com busca ativa ou âncora, o tópico já abre
  const estaAberto = (id) => abertos.has(id) || id === ancora || (termo && filtradas.length <= 3);

  const total = filtradas.length + (termo && atalhosCombina ? 1 : 0);

  return (
    <div className="space-y-8 pb-16">
      <PageHeader title="Central de Ajuda" subtitle="Como cada tela funciona, em poucas linhas." icon={LifeBuoy} />

      <section aria-label="Buscar na ajuda" className="c4-card c4-card--destaque p-5 sm:p-7">
        <h2 className="text-lg sm:text-xl font-semibold text-text-primary font-display">Em que podemos ajudar?</h2>
        <div role="search" className="relative mt-4 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-primary/50 pointer-events-none" aria-hidden="true" />
          <label htmlFor="busca-ajuda" className="sr-only">Buscar na Central de Ajuda</label>
          <input
            id="busca-ajuda"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex.: baixar conta, fatura, convidar, contraste"
            className="w-full min-h-13 rounded-2xl bg-surface border border-border-strong pl-12 pr-12 text-base text-text-primary placeholder:text-text-primary/50 outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/50"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-xl text-text-primary/60 hover:text-text-primary hover:bg-surface-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p aria-live="polite" className={cn('mt-3 text-sm text-text-primary/70', !termo && 'sr-only')}>
          {termo ? `${total} ${total === 1 ? 'tópico encontrado' : 'tópicos encontrados'} para “${termo}”.` : ''}
        </p>
        {!termo && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Perguntas comuns">
            {PERGUNTAS_RAPIDAS.map((p) => (
              <li key={p.ancora}>
                <a href={`#${p.ancora}`} className="inline-flex items-center min-h-11 px-3.5 rounded-full border border-border-strong bg-surface/70 text-sm text-text-primary/85 hover:border-primary/50 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {p.rotulo}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!termo && (
        <nav aria-label="Assuntos da ajuda">
          <h2 className="c4-eyebrow mb-3">Navegue por assunto</h2>
          <Stagger as="ul" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
            {AJUDA_GRUPOS.filter((g) => grupos.some((x) => x.id === g.id)).map((g) => (
              <StaggerItem as="li" key={g.id}>
                <a href={`#grupo-${g.id}`} className="c4-card c4-card--interativo h-full flex flex-col gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Icone nome={g.icone} className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-text-primary">{g.titulo}</span>
                  <span className="text-xs text-text-primary/65 leading-snug">{g.descricao}</span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </nav>
      )}

      {total === 0 && (
        <div className="c4-card p-8 text-center">
          <p className="text-base font-semibold text-text-primary">Nada encontrado para “{termo}”.</p>
          <p className="mt-1 text-sm text-text-primary/70">Tente outra palavra, ou pergunte à Áurea: ela conhece as telas do Core 4.</p>
          <Link to="/assistente" className="mt-4 inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline underline-offset-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Sparkles className="w-4 h-4" aria-hidden="true" /> Perguntar à Áurea
          </Link>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-8 lg:items-start">
        {largo && (
          <nav aria-label="Índice da ajuda" className="sticky top-4 space-y-4 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2 no-scrollbar">
            {grupos.map((g) => (
              <div key={g.id}>
                <p className="c4-eyebrow mb-1.5">{g.titulo}</p>
                <ul className="space-y-0.5">
                  {g.secoes.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className={cn('flex items-center gap-2 rounded-lg px-2 min-h-9 text-sm transition-colors hover:bg-surface-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', ancora === s.id ? 'text-primary font-medium' : 'text-text-primary/75 hover:text-text-primary')}>
                        <span className="truncate">{s.titulo}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {atalhosCombina && <a href="#atalhos" className="block rounded-lg px-2 py-1.5 text-sm text-text-primary/75 hover:bg-surface-medium hover:text-text-primary">Atalhos de teclado</a>}
          </nav>
        )}

        <div className="space-y-10 min-w-0">
          {grupos.map((g) => (
            <section key={g.id} id={`grupo-${g.id}`} aria-labelledby={`titulo-grupo-${g.id}`} className="scroll-mt-24 space-y-3">
              <h2 id={`titulo-grupo-${g.id}`} className="flex items-center gap-2 text-xl font-semibold text-text-primary font-display">{g.titulo}</h2>
              {g.secoes.map((s) => (
                <Artigo
                  key={s.id}
                  secao={s}
                  temAcesso
                  termo={termo}
                  recolhivel={!largo}
                  aberto={estaAberto(s.id)}
                  onAlternar={() => alternar(s.id)}
                />
              ))}
            </section>
          ))}

          {atalhosCombina && <SecaoAtalhos />}

          {semAcesso.length > 0 && <OutrosRecursos secoes={semAcesso} />}
        </div>
      </div>
    </div>
  );
}
