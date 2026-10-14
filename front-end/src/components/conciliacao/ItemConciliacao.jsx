import React from 'react';
import { Check, Link2, Plus, EyeOff, Unlink, Undo2, Replace, LoaderCircle } from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import { formatDate, formatarMoeda } from '../../lib/formatters';
import { STATUS, aRevisar } from './modos';
import { ConfiancaSelo, StatusItemSelo, ValorOfx } from './ItemPartes';

/*
 * Uma linha do extrato na revisão. Substitui o antigo _ItemRowBase (que criava componentes
 * durante o render). Tudo aqui é componente de módulo e recebe props.
 *
 * Atalhos (só quando o FOCO está na própria linha — WCAG 2.1.4): ↑/↓ muda de linha,
 * C confirma a sugestão, V vincula, N cria novo, I ignora, D desvincula, U desfaz o ignorar,
 * Espaço marca para ações em lote.
 */

const DEF_ACAO = {
  confirmar: { label: 'Confirmar', Icone: Check, tecla: 'C', variant: 'primary' },
  vincular: { label: 'Vincular', Icone: Link2, tecla: 'V', variant: 'secondary' },
  criar: { label: 'Criar novo', Icone: Plus, tecla: 'N', variant: 'secondary' },
  ignorar: { label: 'Ignorar', Icone: EyeOff, tecla: 'I', variant: 'ghost' },
  desvincular: { label: 'Desvincular', Icone: Unlink, tecla: 'D', variant: 'ghost' },
  desfazerIgnorar: { label: 'Reabrir', Icone: Undo2, tecla: 'U', variant: 'ghost' },
};

/** Tecla (event.code) → ação. */
const TECLAS = { KeyC: 'confirmar', KeyV: 'vincular', KeyN: 'criar', KeyI: 'ignorar', KeyD: 'desvincular', KeyU: 'desfazerIgnorar' };

function rotuloAcao(acao, item) {
  // Numa sugestão, "Vincular" significa escolher outro registro.
  if (acao === 'vincular' && item.statusItem === STATUS.SUGERIDO) return { ...DEF_ACAO.vincular, label: 'Trocar', Icone: Replace };
  return DEF_ACAO[acao];
}

function Vinculo({ item, cfg }) {
  const v = cfg.vinculoDe(item);
  if (v.id) {
    return (
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-text-primary break-words">
          <span className="sr-only">Vinculado a: </span>{v.descricao}
          {v.valor != null && (
            <span className="ml-1.5 text-text-primary/60 tabular-nums valor-privado">{formatarMoeda(v.valor)}</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <StatusItemSelo statusItem={item.statusItem} cfg={cfg} />
          {item.statusItem === STATUS.SUGERIDO && <ConfiancaSelo score={item.scoreVinculacao} />}
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-1">
      <StatusItemSelo statusItem={item.statusItem} cfg={cfg} />
      {item.statusItem === STATUS.NAO_IDENTIFICADO && (
        <p className="text-xs text-text-primary/60">
          {cfg.somenteIgnorar(item) ? 'Crédito ou estorno: não vira lançamento.' : `Nenhum${cfg.vinculo.artigo === 'a' ? 'a' : ''} ${cfg.vinculo.singular} parecid${cfg.vinculo.artigo} encontrad${cfg.vinculo.artigo}.`}
        </p>
      )}
    </div>
  );
}

function BotoesAcao({ item, acoes, onAcao, salvando, descricaoId }) {
  if (salvando) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-primary min-h-11" role="status">
        <LoaderCircle className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> Salvando…
      </span>
    );
  }
  if (acoes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 md:justify-end">
      {acoes.map((acao) => {
        const { label, Icone, variant } = rotuloAcao(acao, item);
        return (
          <Button
            key={acao}
            variant={variant}
            size="sm"
            onClick={() => onAcao(acao, item)}
            aria-describedby={descricaoId}
            className="min-h-11 md:min-h-9 grow md:grow-0"
            leftIcon={<Icone className="w-4 h-4" aria-hidden="true" />}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Props:
 * - item, cfg
 * - acoes: lista de ações (de `acoesDoItem`)
 * - selecionavel, selecionado, onAlternarSelecao(item)
 * - salvando: ação em andamento neste item
 * - onAcao(acao, item)
 * - onNavegar(direcao: 1 | -1, item): ↑/↓ entre linhas
 * - children: formulário "Criar novo" aberto logo abaixo da linha
 */
export default function ItemConciliacao({
  item, cfg, acoes, selecionavel, selecionado, onAlternarSelecao, salvando, onAcao, onNavegar, children,
}) {
  const descricaoId = `item-desc-${item.id}`;
  const descricao = cfg.descricaoOfx(item) || 'Sem descrição no extrato';
  const pendente = aRevisar(item);

  function aoTeclar(e) {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      onNavegar?.(e.key === 'ArrowDown' ? 1 : -1, item);
      return;
    }
    if (e.code === 'Space' && selecionavel) {
      e.preventDefault();
      onAlternarSelecao?.(item);
      return;
    }
    const acao = TECLAS[e.code];
    if (acao && acoes.includes(acao) && !salvando) {
      e.preventDefault();
      onAcao(acao, item);
    }
  }

  const atalhos = acoes.map((a) => `${rotuloAcao(a, item).tecla} ${rotuloAcao(a, item).label.toLowerCase()}`).join(', ');

  return (
    <div
      role="group"
      tabIndex={0}
      data-item-id={item.id}
      onKeyDown={aoTeclar}
      aria-labelledby={descricaoId}
      aria-describedby={atalhos ? `${descricaoId}-atalhos` : undefined}
      className={cn(
        'group rounded-2xl border px-3 py-3 sm:px-4 transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        selecionado ? 'border-primary/40 bg-primary/[0.06]' : 'border-border bg-surface-low',
        !pendente && 'bg-surface-low/60'
      )}
    >
      <div className="flex gap-3">
        {selecionavel && (
          <label className="grid place-items-center w-11 h-11 -my-2 -ml-2 shrink-0 cursor-pointer rounded-xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
            <input
              type="checkbox"
              checked={selecionado}
              onChange={() => onAlternarSelecao(item)}
              aria-label={`Selecionar: ${descricao}`}
              className="w-5 h-5 accent-[var(--color-primary)] cursor-pointer focus:outline-none"
            />
          </label>
        )}
        <div className="min-w-0 flex-1 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto] md:items-start">
          {/* Movimento do extrato */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <p id={descricaoId} className="text-sm font-medium text-text-primary break-words">{descricao}</p>
              <ValorOfx valor={item.ofxValor} className="text-sm md:hidden" />
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-primary/60">
              {item.ofxData && <span>{formatDate(item.ofxData)}</span>}
              <ValorOfx valor={item.ofxValor} className="hidden md:inline-flex text-sm" />
              {cfg.somenteIgnorar(item) && <span className="text-secondary">Crédito</span>}
            </p>
          </div>

          {/* Correspondência */}
          <Vinculo item={item} cfg={cfg} />

          {/* Ações */}
          <BotoesAcao item={item} acoes={acoes} onAcao={onAcao} salvando={salvando} descricaoId={descricaoId} />
        </div>
      </div>
      {atalhos && <span id={`${descricaoId}-atalhos`} className="sr-only">Atalhos com a linha em foco: {atalhos}.</span>}
      {children}
    </div>
  );
}
