import React, { useState } from 'react';
import { Link2, Plus, EyeOff, Unlink, Loader2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import { brl, formatDate } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';

/**
 * Base compartilhada das linhas de conciliação (bancária e cartão).
 *
 * Responsivo:
 * - Desktop (md+): layout em colunas (grid), ações como ícones.
 * - Mobile (< md): empilha em CARD — data + valor, descrição, vínculo,
 *   e ações como botões com rótulo e alvo de toque de 44px.
 *
 * Trata erros de forma amigável (toast) e nunca fecha modal/formulário
 * em caso de falha, preservando o que o usuário digitou.
 *
 * Props de configuração (parametrizam as diferenças bancária × cartão):
 * - api: { vincular(itemId, registro), criar(itemId, dto), ignorar(itemId), desvincular(itemId) }
 * - vinculo: { idKey, descricaoKey }  → campos do item que descrevem o vínculo
 * - descricaoOfx(item) → texto principal da transação
 * - badgeExtra(item)   → nó opcional (ex.: badge "Crédito") ou null
 * - somenteIgnorar(item) → quando true, só permite ignorar (ex.: crédito no cartão)
 * - vincularLabel / criarLabel → rótulos das ações
 * - renderModal({ item, onConfirm, onClose, salvando })
 * - renderForm({ item, onConfirm, onCancel })
 */

const TONE_ICON = {
  primary: 'text-text-primary/40 hover:text-primary hover:bg-primary/10',
  secondary: 'text-text-primary/40 hover:text-secondary hover:bg-secondary/10',
  warning: 'text-text-primary/40 hover:text-amber-400 hover:bg-amber-400/10',
  neutral: 'text-text-primary/40 hover:text-text-primary/70 hover:bg-surface-medium',
};

const TONE_TEXT = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  warning: 'text-amber-400',
  neutral: 'text-text-primary/70',
};

function scoreBadge(score) {
  if (score == null) return null;
  if (score >= 70) return { variant: 'success', label: `${score}pts` };
  if (score >= 50) return { variant: 'warning', label: `${score}pts` };
  return { variant: 'neutral', label: `${score}pts` };
}

function statusColor(statusItem, score) {
  if (statusItem === 'SUGERIDO') return score >= 70 ? 'text-primary' : 'text-amber-400';
  if (statusItem === 'VINCULADO_MANUALMENTE') return 'text-secondary';
  if (statusItem === 'BAIXADO') return 'text-primary';
  if (statusItem === 'IGNORADO') return 'text-text-primary/30';
  return 'text-error';
}

export default function ItemRowBase({
  item: initialItem,
  onUpdate,
  api,
  vinculo,
  descricaoOfx,
  badgeExtra,
  somenteIgnorar,
  vincularLabel,
  criarLabel,
  renderModal,
  renderForm,
}) {
  const toast = useToast();
  const [item, setItem] = useState(initialItem);
  const [salvando, setSalvando] = useState(false);
  const [showVincular, setShowVincular] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function acao(fn) {
    setSalvando(true);
    try {
      const atualizado = await fn();
      setItem(atualizado);
      onUpdate?.(atualizado);
      return true;
    } catch (e) {
      toast.error(e?.message || 'Não foi possível concluir a ação. Tente novamente.');
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function vincular(registro) {
    const ok = await acao(() => api.vincular(item.id, registro));
    if (ok) setShowVincular(false);
  }

  async function criar(dto) {
    const ok = await acao(() => api.criar(item.id, dto));
    if (ok) setShowForm(false);
  }

  async function ignorar() {
    await acao(() => api.ignorar(item.id));
  }

  async function desvincular() {
    await acao(() => api.desvincular(item.id));
  }

  const badge = scoreBadge(item.scoreVinculacao);
  const valorPositivo = item.ofxValor > 0;
  const ignorado = item.statusItem === 'IGNORADO';
  const podeEditar = item.statusItem !== 'BAIXADO';
  const soIgnorar = !!somenteIgnorar?.(item);

  const naoIdentificado = item.statusItem === 'NAO_IDENTIFICADO' || item.statusItem === 'IGNORADO';
  const vinculadoManual = item.statusItem === 'SUGERIDO' || item.statusItem === 'VINCULADO_MANUALMENTE';

  // ── Descritores das ações (renderizados como ícone no desktop, rótulo no mobile)
  const acoes = [];
  if (podeEditar) {
    if (soIgnorar) {
      if (!ignorado) acoes.push({ key: 'ignorar', label: 'Ignorar', icon: EyeOff, onClick: ignorar, tone: 'neutral' });
    } else {
      if (naoIdentificado) {
        acoes.push({ key: 'vincular', label: 'Vincular', icon: Link2, onClick: () => setShowVincular(true), tone: 'primary', title: vincularLabel });
        acoes.push({ key: 'criar', label: criarLabel, icon: Plus, onClick: () => setShowForm((v) => !v), tone: 'secondary', title: criarLabel });
      }
      if (vinculadoManual) {
        acoes.push({ key: 'desvincular', label: 'Desvincular', icon: Unlink, onClick: desvincular, tone: 'warning' });
      }
      if (!ignorado) {
        acoes.push({ key: 'ignorar', label: 'Ignorar', icon: EyeOff, onClick: ignorar, tone: 'neutral' });
      }
    }
  }

  const dataTexto = item.ofxData ? formatDate(item.ofxData) : '—';

  function Descricao({ mobile }) {
    return (
      <div className={mobile ? '' : 'min-w-0'}>
        <p className={cn('text-sm font-medium text-text-primary', mobile ? 'break-words' : 'truncate')}>
          {descricaoOfx(item) || '—'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.ofxTipo && <span className="text-xs text-text-primary/40">{item.ofxTipo}</span>}
          {badgeExtra?.(item)}
        </div>
      </div>
    );
  }

  function Valor() {
    return (
      <span className={cn('text-sm font-bold', valorPositivo ? 'text-primary' : 'text-error')}>
        {valorPositivo ? '+' : ''}R$ {brl(item.ofxValor)}
      </span>
    );
  }

  function Vinculado({ mobile }) {
    const idVal = item[vinculo.idKey];
    const descVal = item[vinculo.descricaoKey];
    if (idVal) {
      return (
        <div className={mobile ? '' : 'min-w-0'}>
          <p className={cn('text-sm font-medium', mobile ? 'break-words' : 'truncate', statusColor(item.statusItem, item.scoreVinculacao))}>
            {descVal}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <Badge variant={item.statusItem === 'SUGERIDO' ? (item.scoreVinculacao >= 70 ? 'success' : 'warning') : 'info'} size="sm">
              {item.statusItem === 'SUGERIDO' ? 'Sugerido' : 'Manual'}
            </Badge>
            {badge && <Badge variant={badge.variant} size="sm">{badge.label}</Badge>}
          </div>
        </div>
      );
    }
    if (ignorado) return <span className="text-sm text-text-primary/30">Ignorado</span>;
    return <span className="text-sm text-error">Não identificado</span>;
  }

  return (
    <>
      <div className={cn(
        'px-4 py-3 rounded-xl transition-colors',
        ignorado ? 'opacity-50' : 'hover:bg-surface-medium/50',
        'flex flex-col gap-2.5 md:grid md:grid-cols-[90px_1fr_110px_1fr_auto] md:gap-3 md:items-start'
      )}>
        {/* ───────────── Mobile: card ───────────── */}
        <div className="md:hidden flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-text-primary/60">{dataTexto}</span>
            <Valor />
          </div>
          <Descricao mobile />
          <Vinculado mobile />
          {salvando ? (
            <div className="flex items-center gap-2 text-primary text-sm py-1">
              <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
            </div>
          ) : acoes.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {acoes.map((a) => (
                <Button
                  key={a.key}
                  variant="secondary"
                  size="sm"
                  onClick={a.onClick}
                  aria-label={a.title || a.label}
                  className={cn('grow min-h-11 basis-[calc(50%-0.375rem)]', TONE_TEXT[a.tone])}
                >
                  <a.icon className="w-4 h-4" /> {a.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ───────────── Desktop: colunas ───────────── */}
        <div className="hidden md:contents">
          <div className="text-sm text-text-primary/60">{dataTexto}</div>
          <Descricao mobile={false} />
          <div className="text-right"><Valor /></div>
          <Vinculado mobile={false} />
          <div className="flex items-center justify-end gap-1">
            {salvando && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            {!salvando && acoes.map((a) => (
              <Button
                key={a.key}
                variant="ghost"
                size="icon"
                onClick={a.onClick}
                aria-label={a.title || a.label}
                title={a.title || a.label}
                className={cn('w-9 h-9', TONE_ICON[a.tone])}
              >
                <a.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="px-4 pb-3">
          {renderForm({ item, onConfirm: criar, onCancel: () => setShowForm(false) })}
        </div>
      )}

      {showVincular && renderModal({
        item,
        salvando,
        onConfirm: vincular,
        onClose: () => setShowVincular(false),
      })}
    </>
  );
}
