import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, PlayCircle, FileText, CalendarRange, Hourglass, CircleCheckBig, CircleSlash } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import AlertaErro from '../ui/AlertaErro';
import SkeletonCard from '../ui/SkeletonCard';
import { Stagger, StaggerItem } from '../motion/Movimento';
import { formatDate } from '../../lib/formatters';
import { STATUS_SESSAO } from './modos';

const ICONE_STATUS = { PENDENTE: Hourglass, FINALIZADA: CircleCheckBig, CANCELADA: CircleSlash };

function periodo(s) {
  if (!s.dataInicioOfx || !s.dataFimOfx) return null;
  return `${formatDate(s.dataInicioOfx)} a ${formatDate(s.dataFimOfx)}`;
}

function LinhaSessao({ s, cfg }) {
  const navigate = useNavigate();
  const st = STATUS_SESSAO[s.status] ?? STATUS_SESSAO.CANCELADA;
  const IconeStatus = ICONE_STATUS[s.status] ?? CircleSlash;
  const pendente = s.status === 'PENDENTE';
  const destino = pendente ? `${cfg.rotaBase}/${s.id}` : `${cfg.rotaBase}/${s.id}/relatorio`;
  const p = periodo(s);
  const tituloId = `sessao-${cfg.id}-${s.id}`;

  return (
    <article
      aria-labelledby={tituloId}
      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-surface-low px-4 py-3"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 id={tituloId} className="font-medium text-text-primary break-words">{cfg.tituloSessao(s)}</h4>
          <Badge variant={st.variant} size="sm">
            <IconeStatus className="w-3.5 h-3.5 inline -mt-px mr-1" aria-hidden="true" />
            {st.label}
          </Badge>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-primary/65">
          {p && (
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Período do extrato: </span>{p}
            </span>
          )}
          <span className="tabular-nums">
            {s.totalTransacoes ?? 0} {s.totalTransacoes === 1 ? 'movimento' : 'movimentos'}
            {pendente && s.totalNaoIdentificados > 0 && ` · ${s.totalNaoIdentificados} sem correspondência`}
            {!pendente && s.status === 'FINALIZADA' && ` · ${s.totalConciliados ?? 0} conciliados`}
          </span>
          {s.dataConciliacao && (
            <span>
              {pendente ? 'Importado em ' : 'Em '}{formatDate(String(s.dataConciliacao).split('T')[0])}
            </span>
          )}
        </p>
      </div>
      <Button
        variant={pendente ? 'primary' : 'secondary'}
        className="shrink-0 self-start sm:self-center"
        leftIcon={pendente ? <PlayCircle className="w-4 h-4" aria-hidden="true" /> : <FileText className="w-4 h-4" aria-hidden="true" />}
        onClick={() => navigate(destino)}
        aria-describedby={tituloId}
      >
        {pendente ? 'Retomar' : 'Ver relatório'}
      </Button>
    </article>
  );
}

/**
 * Lista de sessões de conciliação (o antigo "Histórico"): em andamento primeiro, com
 * "Retomar"; depois as concluídas, com "Ver relatório".
 *
 * Props: cfg, sessoes, carregando, erro, onTentarNovamente. `ref` vai para o título (foco
 * quando a rota é …/historico).
 */
const ConciliacaoSessoesLista = forwardRef(function ConciliacaoSessoesLista(
  { cfg, sessoes, carregando, erro, onTentarNovamente },
  tituloRef,
) {
  const lista = sessoes ?? [];
  const emAndamento = lista.filter((s) => s.status === 'PENDENTE');
  const concluidas = lista
    .filter((s) => s.status !== 'PENDENTE')
    .sort((a, b) => String(b.dataConciliacao ?? '').localeCompare(String(a.dataConciliacao ?? '')));

  return (
    <section aria-labelledby={`sessoes-${cfg.id}`} className="space-y-4 scroll-mt-24" id="sessoes">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-text-primary/60" aria-hidden="true" />
        <h2 id={`sessoes-${cfg.id}`} ref={tituloRef} tabIndex={-1} className="font-display text-lg font-semibold text-text-primary focus:outline-none">
          Importações
        </h2>
      </div>

      {carregando && !sessoes && <SkeletonCard rows={3} />}
      {erro && <AlertaErro mensagem={erro.message} onTentarNovamente={onTentarNovamente} />}

      {!erro && sessoes && lista.length === 0 && (
        <EmptyState
          compact
          tom="neutro"
          icon={History}
          title="Nenhum extrato importado ainda"
          description="Cada arquivo que você enviar aparece aqui. Uma importação em andamento pode ser retomada depois."
        />
      )}

      {emAndamento.length > 0 && (
        <div className="space-y-2">
          <h3 className="c4-eyebrow text-warning">Em andamento</h3>
          <Stagger as="ul" className="space-y-2">
            {emAndamento.map((s) => (
              <StaggerItem as="li" key={s.id}><LinhaSessao s={s} cfg={cfg} /></StaggerItem>
            ))}
          </Stagger>
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-2">
          <h3 className="c4-eyebrow">Concluídas</h3>
          <Stagger as="ul" className="space-y-2">
            {concluidas.map((s) => (
              <StaggerItem as="li" key={s.id}><LinhaSessao s={s} cfg={cfg} /></StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
    </section>
  );
});

export default ConciliacaoSessoesLista;
