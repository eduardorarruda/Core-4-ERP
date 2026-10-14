import React from 'react';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { safeUrl, isExternalUrl } from '../../lib/safeUrl';
import { cn } from '../../lib/utils';
import { ehCaminhoRelatorio } from './aureaUtils';

/*
 * Markdown da Áurea — o MESMO render na tela cheia e no painel flutuante.
 * Cobre o que o modelo usa: parágrafos, títulos, listas, **negrito**, *itálico*, `código`,
 * [links](url), tabelas simples e linhas. Tudo vira elemento React (o texto é escapado);
 * links passam por safeUrl e o link de relatório (.xlsx) vira botão de download relativo à
 * origem — nunca o domínio que o modelo escreveu.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)\s]*\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function Link({ href, children }) {
  const rel = href.match(/\/api\/chat\/relatorios\/[^\s)"']+\.xlsx/);
  if (rel && ehCaminhoRelatorio(rel[0])) {
    return (
      <a
        href={rel[0]}
        download
        className="inline-flex items-center gap-2 my-1 px-3.5 min-h-11 rounded-xl bg-primary/12 border border-primary/30 text-primary font-semibold no-underline hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Download className="w-4 h-4" aria-hidden="true" /> Baixar relatório (.xlsx)
      </a>
    );
  }
  const seguro = safeUrl(href);
  if (!seguro) return <span>{children}</span>;
  const externo = isExternalUrl(seguro);
  return (
    <a
      href={seguro}
      {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
      {externo && <span className="sr-only"> (abre em nova aba)</span>}
    </a>
  );
}

function inline(texto, chave = 'i') {
  return texto.split(INLINE).map((parte, i) => {
    const k = `${chave}-${i}`;
    if (!parte) return null;
    if ((parte.startsWith('**') && parte.endsWith('**')) || (parte.startsWith('__') && parte.endsWith('__'))) {
      return <strong key={k} className="font-semibold text-text-primary">{inline(parte.slice(2, -2), k)}</strong>;
    }
    if (parte.startsWith('`') && parte.endsWith('`')) {
      return <code key={k} className="font-mono text-[0.85em] px-1.5 py-0.5 rounded-md bg-surface-high border border-border">{parte.slice(1, -1)}</code>;
    }
    const link = parte.match(/^\[([^\]]+)\]\(([^)\s]*)\)$/);
    if (link) return <Link key={k} href={link[2]}>{link[1]}</Link>;
    if (parte.length > 2 && ((parte.startsWith('*') && parte.endsWith('*')) || (parte.startsWith('_') && parte.endsWith('_')))) {
      return <em key={k}>{parte.slice(1, -1)}</em>;
    }
    return <React.Fragment key={k}>{parte}</React.Fragment>;
  });
}

const celulas = (linha) => linha.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const ehSeparadorTabela = (linha) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(linha);

/** Converte o texto em blocos (lista de { tipo, ... }). */
function blocos(texto) {
  const linhas = (texto || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i += 1; continue; }

    const titulo = l.match(/^(#{1,4})\s+(.*)$/);
    if (titulo) { out.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] }); i += 1; continue; }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { out.push({ tipo: 'linha' }); i += 1; continue; }

    if (l.includes('|') && i + 1 < linhas.length && ehSeparadorTabela(linhas[i + 1])) {
      const cabecalho = celulas(l);
      const corpo = [];
      i += 2;
      while (i < linhas.length && linhas[i].includes('|') && linhas[i].trim()) { corpo.push(celulas(linhas[i])); i += 1; }
      out.push({ tipo: 'tabela', cabecalho, corpo });
      continue;
    }

    const marcador = /^\s*([-*•]|\d+[.)])\s+(.*)$/;
    if (marcador.test(l)) {
      const ordenada = /^\s*\d+[.)]/.test(l);
      const itens = [];
      while (i < linhas.length && marcador.test(linhas[i])) { itens.push(linhas[i].match(marcador)[2]); i += 1; }
      out.push({ tipo: 'lista', ordenada, itens });
      continue;
    }

    const paragrafo = [];
    while (i < linhas.length && linhas[i].trim() && !marcador.test(linhas[i]) && !/^#{1,4}\s/.test(linhas[i])) {
      paragrafo.push(linhas[i]);
      i += 1;
    }
    out.push({ tipo: 'paragrafo', linhas: paragrafo });
  }
  return out;
}

function Bloco({ b, k }) {
  switch (b.tipo) {
    case 'titulo': {
      // Títulos da resposta não entram na hierarquia da página (são parte de uma mensagem)
      return <p className={cn('font-display font-semibold text-text-primary', b.nivel <= 2 ? 'text-base' : 'text-[0.95rem]')}>{inline(b.texto, k)}</p>;
    }
    case 'linha':
      return <hr className="border-border" />;
    case 'lista': {
      const Tag = b.ordenada ? 'ol' : 'ul';
      return (
        <Tag className={cn('pl-5 space-y-1', b.ordenada ? 'list-decimal marker:text-primary marker:font-semibold' : 'list-disc marker:text-primary/70')}>
          {b.itens.map((it, j) => <li key={j} className="pl-0.5">{inline(it, `${k}-${j}`)}</li>)}
        </Tag>
      );
    }
    case 'tabela':
      return (
        <div className="overflow-x-auto rounded-xl border border-border max-w-full">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-surface-high/60">
              <tr>{b.cabecalho.map((c, j) => <th key={j} scope="col" className="text-left font-semibold px-3 py-2 whitespace-nowrap">{inline(c, `${k}-h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {b.corpo.map((linha, r) => (
                <tr key={r} className="border-t border-border">
                  {linha.map((c, j) => <td key={j} className="px-3 py-2 align-top">{inline(c, `${k}-${r}-${j}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <p>
          {b.linhas.map((l, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {inline(l, `${k}-${j}`)}
            </React.Fragment>
          ))}
        </p>
      );
  }
}

/** Cursor que pisca no fim do texto enquanto a resposta chega (parado com movimento reduzido). */
function CursorDigitacao() {
  const reduzir = useMovimentoReduzido();
  return (
    <motion.span
      aria-hidden="true"
      className="inline-block w-[0.5em] h-[1.05em] -mb-[0.15em] ml-0.5 rounded-sm bg-primary/80 align-baseline"
      animate={reduzir ? undefined : { opacity: [1, 0.15, 1] }}
      transition={reduzir ? undefined : { duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/**
 * Props: texto (markdown), className, cursor (true = mostra o cursor de digitação no fim).
 */
export default function MarkdownAurea({ texto, className, cursor = false }) {
  const conteudo = texto ?? '';
  return (
    <div className={cn('space-y-2.5 text-[0.9375rem] leading-relaxed text-text-primary/90 break-words', className)}>
      {blocos(conteudo).map((b, i) => <Bloco key={i} b={b} k={String(i)} />)}
      {cursor && <CursorDigitacao />}
    </div>
  );
}
