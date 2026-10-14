import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitMerge, Upload, Link2, CircleCheckBig, FileText, ArrowLeft } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import AlertaErro from '../ui/AlertaErro';
import ComoFunciona from '../ui/ComoFunciona';
import { PageSkeleton } from '../ui/Skeleton';
import { useCarga } from '../../hooks/useCarga';
import { usePermissao } from '../../hooks/usePermissao';
import { modoDe } from './modos';
import ConciliacaoTabs from './ConciliacaoTabs';
import UploadOfx from './UploadOfx';
import ConciliacaoSessoesLista from './ConciliacaoSessoesLista';
import RevisaoSessao from './RevisaoSessao';

function passos(cfg) {
  return [
    { icon: Upload, texto: cfg.id === 'cartao' ? 'Exporte o OFX da fatura no app do banco e envie aqui.' : 'Exporte o extrato OFX no app do banco e envie aqui.' },
    { icon: Link2, texto: `Confira as sugestões e vincule cada movimento a ${cfg.vinculo.artigo === 'a' ? 'uma' : 'um'} ${cfg.vinculo.singular} — ou crie na hora.` },
    { icon: CircleCheckBig, texto: cfg.id === 'cartao' ? 'Ao finalizar, os lançamentos vinculados ficam confirmados.' : 'Ao finalizar, as contas vinculadas são baixadas na conta bancária.' },
  ];
}

/** Tela inicial: envio do OFX + lista de importações (o antigo "Histórico" vive aqui). */
function Inicio({ cfg, foco }) {
  const navigate = useNavigate();
  const pode = usePermissao();
  const tituloSessoesRef = useRef(null);
  const sessoes = useCarga(() => cfg.api.listar(), [cfg.id]);

  // /…/historico abre a mesma tela com o foco na lista de importações.
  const listaPronta = Boolean(sessoes.dados);
  useEffect(() => {
    if (foco !== 'sessoes' || !listaPronta) return;
    const el = tituloSessoesRef.current;
    el?.scrollIntoView({ block: 'start' });
    el?.focus({ preventScroll: true });
  }, [foco, listaPronta]);

  return (
    <div className="space-y-6">
      <PageHeader title="Conciliação" subtitle={cfg.subtitulo} icon={GitMerge}>
        <ConciliacaoTabs />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <section aria-labelledby={`enviar-${cfg.id}`} className="lg:col-span-3 space-y-4">
          <div className="c4-card p-4 sm:p-5 space-y-4">
            <h2 id={`enviar-${cfg.id}`} className="font-display text-lg font-semibold text-text-primary">
              {cfg.id === 'cartao' ? 'Enviar OFX do cartão' : 'Enviar extrato do banco'}
            </h2>
            <UploadOfx
              cfg={cfg}
              desabilitado={!pode(cfg.permissoes.importar)}
              onSessaoCriada={(s) => navigate(`${cfg.rotaBase}/${s.id}`)}
            />
          </div>
          <ComoFunciona titulo="Como funciona" recolhivel chave={`conciliacao-${cfg.id}`} itens={passos(cfg)} />
        </section>

        <div className="lg:col-span-2">
          <ConciliacaoSessoesLista
            ref={tituloSessoesRef}
            cfg={cfg}
            sessoes={sessoes.dados}
            carregando={sessoes.carregando}
            erro={sessoes.erro}
            onTentarNovamente={sessoes.recarregar}
          />
        </div>
      </div>
    </div>
  );
}

/** Revisão de uma importação (/conciliacao/:id e /cartoes/conciliacao/:id). */
function Sessao({ cfg, sessaoId }) {
  const navigate = useNavigate();
  const pode = usePermissao();
  const { dados: sessao, erro, carregandoInicial, recarregar, setDados } = useCarga(
    () => cfg.api.buscar(sessaoId),
    [cfg.id, sessaoId],
  );
  const trilha = [{ label: 'Conciliação', to: cfg.rotaBase }, 'Revisão'];

  if (carregandoInicial) return <PageSkeleton kpis={0} />;

  if (erro || !sessao) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revisar importação" breadcrumb={trilha} icon={GitMerge} />
        <AlertaErro
          titulo="Não deu para abrir esta importação"
          mensagem={erro?.message || 'Ela pode ter sido cancelada ou removida.'}
          onTentarNovamente={recarregar}
        />
        <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />} onClick={() => navigate(cfg.rotaBase)}>
          Voltar para a conciliação
        </Button>
      </div>
    );
  }

  const aberta = sessao.status === 'PENDENTE';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisar importação"
        subtitle={aberta
          ? 'Confirme as sugestões, vincule o que falta e ignore o que não deve entrar. Depois, finalize.'
          : 'Esta importação já foi encerrada e não pode mais ser alterada.'}
        breadcrumb={trilha}
        icon={GitMerge}
        actions={!aberta && sessao.status === 'FINALIZADA' && (
          <Button leftIcon={<FileText className="w-4 h-4" aria-hidden="true" />} onClick={() => navigate(`${cfg.rotaBase}/${sessao.id}/relatorio`)}>
            Ver relatório
          </Button>
        )}
      />
      <RevisaoSessao
        cfg={cfg}
        sessao={sessao}
        setSessao={setDados}
        podeVincular={pode(cfg.permissoes.vincular)}
        onFinalizada={(s) => navigate(`${cfg.rotaBase}/${s.id}/relatorio`, { replace: true })}
        onCancelada={() => navigate(cfg.rotaBase, { replace: true })}
      />
    </div>
  );
}

/**
 * Conciliação (bancária e de cartão) — UM componente para os dois modos.
 *
 *   <ConciliacaoWorkspace modo="banco" />                       → envio + importações
 *   <ConciliacaoWorkspace modo="cartao" sessaoId={id} />        → revisão da importação
 *   <ConciliacaoWorkspace modo="banco" foco="sessoes" />        → /historico (mesma tela, foco na lista)
 *
 * O relatório fica em ConciliacaoRelatorioView. Diferenças entre os modos: ./modos.js.
 */
export default function ConciliacaoWorkspace({ modo = 'banco', sessaoId, foco }) {
  const cfg = modoDe(modo);
  if (sessaoId) return <Sessao key={`${cfg.id}-${sessaoId}`} cfg={cfg} sessaoId={sessaoId} />;
  return <Inicio key={cfg.id} cfg={cfg} foco={foco} />;
}
