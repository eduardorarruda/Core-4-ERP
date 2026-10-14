import React, { useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Controles do painel de acessibilidade — nativos por baixo (rádio e botão-interruptor),
 * para funcionar igual com teclado, leitor de tela, voz e acionador.
 */

/**
 * Grupo de opções exclusivas (radio). Setas mudam a escolha; Tab sai do grupo.
 * opcoes: [{ valor, rotulo, dica?, previa? (nó) }]
 */
export function GrupoOpcoes({ legenda, explicacao, valor, opcoes, onChange, colunas = 2 }) {
  const nome = useId();
  const explicacaoId = useId();
  return (
    <fieldset className="min-w-0" aria-describedby={explicacao ? explicacaoId : undefined}>
      <legend className="text-sm font-semibold text-text-primary">{legenda}</legend>
      {explicacao && <p id={explicacaoId} className="mt-1 text-sm text-text-primary/75 leading-relaxed">{explicacao}</p>}
      <div className={cn('mt-3 grid gap-2', colunas === 3 ? 'grid-cols-2 sm:grid-cols-3' : colunas === 1 ? 'grid-cols-1' : 'grid-cols-1 min-[360px]:grid-cols-2')}>
        {opcoes.map((op) => {
          const marcado = String(op.valor) === String(valor);
          const id = `${nome}-${String(op.valor).replace(/[^a-z0-9]/gi, '')}`;
          return (
            <div key={op.valor} className="relative min-w-0">
              <input
                type="radio"
                id={id}
                name={nome}
                value={op.valor}
                checked={marcado}
                onChange={() => onChange(op.valor)}
                aria-describedby={op.dica ? `${id}-dica` : undefined}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
              />
              <label
                htmlFor={id}
                className={cn(
                  'flex items-start gap-2.5 h-full min-h-12 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                  marcado
                    ? 'border-primary bg-primary/[0.1] text-text-primary'
                    : 'border-border-strong bg-surface hover:border-text-primary/40 text-text-primary'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid place-items-center w-4 h-4 shrink-0 rounded-full border-2',
                    marcado ? 'border-primary bg-primary text-on-primary' : 'border-text-primary/50'
                  )}
                >
                  {marcado && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{op.rotulo}</span>
                  {op.dica && <span id={`${id}-dica`} className="block mt-0.5 text-xs text-text-primary/70 leading-snug">{op.dica}</span>}
                  {op.previa && <span className="block mt-2" aria-hidden="true">{op.previa}</span>}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Interruptor liga/desliga com explicação em linguagem simples. */
export function Interruptor({ rotulo, explicacao, ligado, onChange, previa }) {
  const id = useId();
  const explicacaoId = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-semibold text-text-primary cursor-pointer">{rotulo}</label>
        {explicacao && <p id={explicacaoId} className="mt-0.5 text-sm text-text-primary/75 leading-relaxed">{explicacao}</p>}
        {previa && <div className="mt-2" aria-hidden="true">{previa}</div>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={ligado}
        aria-describedby={explicacao ? explicacaoId : undefined}
        onClick={() => onChange(!ligado)}
        className={cn(
          'relative shrink-0 inline-flex items-center w-14 h-8 min-h-8 rounded-full border-2 transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          ligado ? 'bg-primary border-primary' : 'bg-surface-high border-text-primary/50'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-full transition-[left] shadow-sm',
            ligado ? 'left-[calc(100%-1.625rem)] bg-on-primary text-primary' : 'left-0.5 bg-text-primary/80 text-transparent'
          )}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </span>
        <span className="sr-only">{ligado ? 'Ligado' : 'Desligado'}</span>
      </button>
    </div>
  );
}

/** Teclas de atalho legíveis (<kbd>). */
export function Teclas({ teclas }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {teclas.map((t, i) => (
        <React.Fragment key={t}>
          {i > 0 && <span aria-hidden="true" className="text-text-primary/60 text-xs">+</span>}
          <kbd className="c4-kbd">{t}</kbd>
        </React.Fragment>
      ))}
    </span>
  );
}
