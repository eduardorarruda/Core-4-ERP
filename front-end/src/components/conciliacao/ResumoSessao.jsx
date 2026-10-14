import React from 'react';
import { CheckCheck, XCircle, CalendarRange } from 'lucide-react';
import Button from '../ui/Button';
import { ProgressRing } from '../ui/Progress';
import { formatDate } from '../../lib/formatters';

/**
 * Cabeçalho da sessão em revisão: de onde veio o extrato, o anel "k de n conciliados" e as
 * ações da sessão (Finalizar · Cancelar importação). Os números por estado ficam nas abas de
 * filtro logo abaixo — aqui não se repetem.
 */
export default function ResumoSessao({
  cfg, sessao, contagem, podeVincular, sessaoAberta, finalizando, cancelando, onFinalizar, onCancelar,
}) {
  const fracao = contagem.total ? contagem.resolvidos / contagem.total : 0;
  const Icone = cfg.icone;
  const detalhe = cfg.detalheSessao(sessao);
  const periodo = sessao.dataInicioOfx && sessao.dataFimOfx
    ? `${formatDate(sessao.dataInicioOfx)} a ${formatDate(sessao.dataFimOfx)}`
    : null;
  const tudoResolvido = contagem.total > 0 && contagem.aRevisar === 0;

  return (
    <section aria-labelledby="sessao-titulo" className="c4-card c4-card--destaque p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <ProgressRing
            valor={fracao}
            tamanho={76}
            espessura={8}
            tom={tudoResolvido ? 'income' : 'primary'}
            label={`${contagem.resolvidos} de ${contagem.total} movimentos conciliados`}
          >
            <span className="font-display text-base">{contagem.resolvidos}<span className="text-text-primary/50">/{contagem.total}</span></span>
          </ProgressRing>
          <div className="min-w-0 space-y-1">
            <p className="c4-eyebrow flex items-center gap-1.5">
              <Icone className="w-3.5 h-3.5" aria-hidden="true" /> {cfg.abaLabel}
            </p>
            <h2 id="sessao-titulo" className="font-display text-lg sm:text-xl font-semibold text-text-primary break-words">
              {cfg.tituloSessao(sessao)}
            </h2>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-text-primary/65">
              {periodo && (
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">Período do extrato: </span>{periodo}
                </span>
              )}
              {detalhe && <span>{detalhe}</span>}
            </p>
            <p className="text-sm text-text-primary/80" aria-live="polite">
              <strong className="font-semibold tabular-nums">{contagem.resolvidos} de {contagem.total}</strong> conciliados
              {contagem.aRevisar > 0
                ? <> · <span className="tabular-nums">{contagem.aRevisar}</span> para revisar</>
                : contagem.total > 0 && ' · tudo revisado'}
            </p>
          </div>
        </div>

        {sessaoAberta && podeVincular && (
          <div className="flex flex-col-reverse sm:flex-row gap-2 shrink-0">
            <Button
              variant="danger-ghost"
              loading={cancelando}
              onClick={onCancelar}
              leftIcon={<XCircle className="w-4 h-4" aria-hidden="true" />}
            >
              Cancelar importação
            </Button>
            <Button
              loading={finalizando}
              onClick={onFinalizar}
              leftIcon={<CheckCheck className="w-4 h-4" aria-hidden="true" />}
            >
              Finalizar conciliação
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
