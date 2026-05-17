import React, { useState } from 'react';
import { Link2, Plus, EyeOff, Unlink, Loader2 } from 'lucide-react';
import { conciliacaoCartao as api } from '../../lib/api';
import { brl, formatDate } from '../../lib/formatters';
import Badge from '../ui/Badge';
import { cn } from '../../lib/utils';
import VincularLancamentoModal from './VincularLancamentoModal';
import FormularioNovoLancamentoInline from './FormularioNovoLancamentoInline';

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

export default function ConciliacaoCartaoItemRow({ item: initialItem, conciliacaoId, cartaoId, onUpdate }) {
  const [item, setItem] = useState(initialItem);
  const [salvando, setSalvando] = useState(false);
  const [showVincular, setShowVincular] = useState(false);
  const [showNovoLanc, setShowNovoLanc] = useState(false);

  async function acao(fn) {
    setSalvando(true);
    try {
      const atualizado = await fn();
      setItem(atualizado);
      onUpdate?.(atualizado);
    } catch {
      // erro tratado pelo componente pai
    } finally {
      setSalvando(false);
    }
  }

  async function vincular(lancamento) {
    setShowVincular(false);
    await acao(() => api.vincularItem(conciliacaoId, item.id, { lancamentoId: lancamento.id }));
  }

  async function criarLancamento(dto) {
    await acao(() => api.criarLancamento(conciliacaoId, item.id, dto));
    setShowNovoLanc(false);
  }

  async function ignorar() {
    await acao(() => api.ignorarItem(conciliacaoId, item.id));
  }

  async function desvincular() {
    await acao(() => api.desvincularItem(conciliacaoId, item.id));
  }

  const badge = scoreBadge(item.scoreVinculacao);
  const valorPositivo = item.ofxValor > 0;
  const podeEditar = item.statusItem !== 'BAIXADO';
  const isCredito = item.ofxTipo === 'CREDIT';

  return (
    <>
      <div className={cn(
        'grid grid-cols-[90px_1fr_110px_1fr_auto] gap-3 items-start px-4 py-3 rounded-xl transition-colors',
        item.statusItem === 'IGNORADO' ? 'opacity-40' : 'hover:bg-surface-medium/50'
      )}>
        {/* Data */}
        <div className="text-sm text-text-primary/60">{item.ofxData ? formatDate(item.ofxData) : '—'}</div>

        {/* Descrição OFX */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{item.ofxMemo || '—'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-text-primary/40">{item.ofxTipo}</p>
            {isCredito && (
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">Crédito</span>
            )}
          </div>
        </div>

        {/* Valor */}
        <div className={cn('text-sm font-bold text-right', valorPositivo ? 'text-primary' : 'text-error')}>
          {valorPositivo ? '+' : ''}R$ {brl(item.ofxValor)}
        </div>

        {/* Lançamento vinculado */}
        <div className="min-w-0">
          {item.lancamentoId ? (
            <div>
              <p className={cn('text-sm font-medium truncate', statusColor(item.statusItem, item.scoreVinculacao))}>
                {item.lancamentoDescricao}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={item.statusItem === 'SUGERIDO' ? (item.scoreVinculacao >= 70 ? 'success' : 'warning') : 'info'} size="sm">
                  {item.statusItem === 'SUGERIDO' ? 'Sugerido' : 'Manual'}
                </Badge>
                {badge && <Badge variant={badge.variant} size="sm">{badge.label}</Badge>}
              </div>
            </div>
          ) : item.statusItem === 'IGNORADO' ? (
            <span className="text-sm text-text-primary/30">Ignorado</span>
          ) : (
            <span className="text-sm text-error">Não identificado</span>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1">
          {salvando && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          {!salvando && podeEditar && !isCredito && (
            <>
              {(item.statusItem === 'NAO_IDENTIFICADO' || item.statusItem === 'IGNORADO') && (
                <>
                  <button
                    onClick={() => setShowVincular(true)}
                    title="Vincular a lançamento existente"
                    className="p-1.5 rounded-lg text-text-primary/40 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowNovoLanc((v) => !v)}
                    title="Criar novo lançamento"
                    className="p-1.5 rounded-lg text-text-primary/40 hover:text-secondary hover:bg-secondary/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </>
              )}
              {(item.statusItem === 'SUGERIDO' || item.statusItem === 'VINCULADO_MANUALMENTE') && (
                <button
                  onClick={desvincular}
                  title="Desvincular"
                  className="p-1.5 rounded-lg text-text-primary/40 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              )}
              {item.statusItem !== 'IGNORADO' && (
                <button
                  onClick={ignorar}
                  title="Ignorar transação"
                  className="p-1.5 rounded-lg text-text-primary/40 hover:text-text-primary/70 hover:bg-surface-medium transition-colors"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          {!salvando && podeEditar && isCredito && item.statusItem !== 'IGNORADO' && (
            <button
              onClick={ignorar}
              title="Ignorar estorno/crédito"
              className="p-1.5 rounded-lg text-text-primary/40 hover:text-text-primary/70 hover:bg-surface-medium transition-colors"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showNovoLanc && (
        <div className="px-4 pb-3">
          <FormularioNovoLancamentoInline
            item={item}
            onConfirm={criarLancamento}
            onCancel={() => setShowNovoLanc(false)}
          />
        </div>
      )}

      {showVincular && (
        <VincularLancamentoModal
          item={item}
          cartaoId={cartaoId}
          onConfirm={vincular}
          onClose={() => setShowVincular(false)}
        />
      )}
    </>
  );
}
