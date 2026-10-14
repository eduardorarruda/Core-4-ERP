import React, { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import {
  CheckCheck, EyeOff, ListChecks, CircleCheckBig, Sparkles, CircleHelp, Link2, Keyboard, X, PartyPopper,
} from 'lucide-react';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { MOLA } from '../motion/presets';
import { STATUS, aRevisar, acoesDoItem } from './modos';
import { useRevisaoConciliacao } from './useRevisaoConciliacao';
import ResumoSessao from './ResumoSessao';
import ItemConciliacao from './ItemConciliacao';
import VincularItemModal from './VincularItemModal';
import NovoItemForm from './NovoItemForm';
import DesfazerAviso from './DesfazerAviso';

const ID_ABAS = 'conc-filtro';

function itensDoFiltro(itens, filtro) {
  if (filtro === 'todos') return itens;
  return itens.filter((i) => i.statusItem === filtro);
}

function abasFiltro(contagem) {
  const abas = [
    { value: 'todos', label: 'Todos', badge: contagem.total },
    { value: STATUS.SUGERIDO, label: 'Sugeridos', icon: Sparkles, badge: contagem.SUGERIDO },
    { value: STATUS.NAO_IDENTIFICADO, label: 'Não identificados', icon: CircleHelp, badge: contagem.NAO_IDENTIFICADO },
    { value: STATUS.VINCULADO, label: 'Vinculados', icon: Link2, badge: contagem.VINCULADO_MANUALMENTE },
    { value: STATUS.IGNORADO, label: 'Ignorados', icon: EyeOff, badge: contagem.IGNORADO },
  ];
  if (contagem.BAIXADO > 0) abas.push({ value: STATUS.BAIXADO, label: 'Baixados', icon: CircleCheckBig, badge: contagem.BAIXADO });
  return abas;
}

function Atalhos() {
  return (
    <details className="hidden md:block group rounded-xl border border-border bg-surface-low/60 text-sm">
      <summary className="flex items-center gap-2 min-h-11 px-3 cursor-pointer list-none rounded-xl text-text-primary/75 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Keyboard className="w-4 h-4" aria-hidden="true" /> Atalhos de teclado
      </summary>
      <div className="px-3 pb-3 space-y-2 text-text-primary/75">
        <p>Com uma linha em foco (use Tab para chegar nela):</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {[['↑ ↓', 'ir para a linha de cima ou de baixo'], ['C', 'confirmar a sugestão'], ['V', 'vincular ou trocar'], ['N', 'criar novo'],
            ['I', 'ignorar'], ['D', 'desvincular'], ['U', 'reabrir item ignorado'], ['Espaço', 'marcar para ações em lote']].map(([k, t]) => (
              <li key={k} className="flex items-center gap-2"><kbd className="c4-kbd">{k}</kbd> {t}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function BarraLote({ selecionados, sugestoesAltas, emLote, onConfirmar, onIgnorar, onLimpar, onConfirmarAltas, todosMarcados, algumMarcado, onMarcarTodos, totalPendentes }) {
  const sugeridos = selecionados.filter((i) => i.statusItem === STATUS.SUGERIDO);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-low px-2 py-1.5">
      <label className="inline-flex items-center gap-2 min-h-11 px-2 rounded-xl cursor-pointer text-sm text-text-primary/80 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
        <input
          type="checkbox"
          className="w-5 h-5 accent-[var(--color-primary)] focus:outline-none"
          checked={todosMarcados}
          ref={(el) => { if (el) el.indeterminate = algumMarcado && !todosMarcados; }}
          onChange={onMarcarTodos}
          disabled={totalPendentes === 0}
        />
        {selecionados.length > 0 ? <span><strong className="tabular-nums">{selecionados.length}</strong> selecionado{selecionados.length > 1 ? 's' : ''}</span> : 'Selecionar todos para revisar'}
      </label>
      <div className="flex flex-wrap items-center gap-2 ml-auto">
        {selecionados.length > 0 ? (
          <>
            <Button size="sm" className="min-h-11 md:min-h-9" disabled={!sugeridos.length || emLote} loading={emLote} onClick={() => onConfirmar(sugeridos)} leftIcon={<CheckCheck className="w-4 h-4" aria-hidden="true" />}>
              Confirmar sugestões ({sugeridos.length})
            </Button>
            <Button size="sm" variant="secondary" className="min-h-11 md:min-h-9" disabled={emLote} onClick={() => onIgnorar(selecionados)} leftIcon={<EyeOff className="w-4 h-4" aria-hidden="true" />}>
              Ignorar ({selecionados.length})
            </Button>
            <Button size="sm" variant="ghost" className="min-h-11 md:min-h-9" onClick={onLimpar} leftIcon={<X className="w-4 h-4" aria-hidden="true" />}>
              Limpar seleção
            </Button>
          </>
        ) : sugestoesAltas.length > 0 && (
          <Button size="sm" variant="secondary" className="min-h-11 md:min-h-9" loading={emLote} onClick={() => onConfirmarAltas(sugestoesAltas)} leftIcon={<ListChecks className="w-4 h-4" aria-hidden="true" />}>
            Confirmar as {sugestoesAltas.length} de confiança alta
          </Button>
        )}
      </div>
    </div>
  );
}

function ListaGrupo({ titulo, id, itens, vazio, renderItem }) {
  const reduzir = useReducedMotion();
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="c4-eyebrow flex items-center gap-2">
        {titulo} <span className="tabular-nums text-text-primary/50">({itens.length})</span>
      </h3>
      {itens.length === 0 && vazio}
      <ul className="space-y-2">
        {itens.map((item) => (
          // Mesmo layoutId nos dois grupos: ao mudar de grupo, o item desliza até o novo lugar.
          // Sem AnimatePresence — uma cópia "saindo" com o mesmo layoutId ficava duplicada na tela.
          <motion.li
            key={item.id}
            layout={reduzir ? false : 'position'}
            layoutId={reduzir ? undefined : `conc-item-${item.id}`}
            transition={MOLA.suave}
          >
            {renderItem(item)}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Revisão de uma sessão: resumo com progresso, filtro único por estado, ações em lote e a
 * lista em dois grupos ("Para revisar" e "Conciliados"). Um item resolvido desliza do
 * primeiro grupo para o segundo (layout animation, desligada com "reduzir movimento").
 *
 * Props: cfg, sessao, setSessao, podeVincular, onFinalizar(sessaoFinal), onCancelar().
 */
export default function RevisaoSessao({ cfg, sessao, setSessao, podeVincular, onFinalizada, onCancelada }) {
  const toast = useToast();
  const confirm = useConfirm();
  const r = useRevisaoConciliacao({ cfg, sessao, setSessao });
  const [filtro, setFiltro] = useState('todos');
  const [selecionadosIds, setSelecionadosIds] = useState(() => new Set());
  const [vinculando, setVinculando] = useState(null);
  const [criandoId, setCriandoId] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const focoDepois = useRef(null);

  const sessaoAberta = sessao.status === 'PENDENTE';
  const selecionavel = sessaoAberta && podeVincular;
  const visiveis = itensDoFiltro(r.itens, filtro);
  const pendentesVisiveis = visiveis.filter(aRevisar);
  const resolvidosVisiveis = visiveis.filter((i) => !aRevisar(i));
  // Seleção só vale para itens que ainda estão para revisar.
  const selecionados = r.pendentes.filter((i) => selecionadosIds.has(i.id));

  // Depois que um item sai da fila pelo teclado, o foco vai para o próximo da fila.
  useEffect(() => {
    const id = focoDepois.current;
    if (id == null) return;
    const el = document.querySelector(`[data-item-id="${id}"]`);
    if (el) {
      el.focus();
      focoDepois.current = null;
    }
  }, [r.itens]);

  function lembrarProximo(item) {
    const ativo = document.activeElement?.closest?.('[data-item-id]');
    if (!ativo || Number(ativo.dataset.itemId) !== item.id) return;
    const lista = pendentesVisiveis;
    const k = lista.findIndex((i) => i.id === item.id);
    const proximo = lista[k + 1] ?? lista[k - 1];
    focoDepois.current = proximo?.id ?? null;
  }

  function alternarSelecao(item) {
    setSelecionadosIds((atual) => {
      const novo = new Set(atual);
      if (novo.has(item.id)) novo.delete(item.id); else novo.add(item.id);
      return novo;
    });
  }

  function navegar(direcao, item) {
    const k = visiveis.findIndex((i) => i.id === item.id);
    // Ordem visual: primeiro os para revisar, depois os conciliados.
    const ordem = [...pendentesVisiveis, ...resolvidosVisiveis];
    const pos = ordem.findIndex((i) => i.id === item.id);
    const alvo = ordem[(pos === -1 ? k : pos) + direcao];
    if (alvo) document.querySelector(`[data-item-id="${alvo.id}"]`)?.focus();
  }

  function onAcao(acao, item) {
    switch (acao) {
      case 'confirmar':
        lembrarProximo(item);
        r.acoes.confirmarSugestao(item);
        break;
      case 'vincular':
        setVinculando(item);
        break;
      case 'criar':
        setCriandoId((atual) => (atual === item.id ? null : item.id));
        break;
      case 'ignorar':
        lembrarProximo(item);
        r.acoes.ignorar([item]);
        break;
      case 'desvincular':
        r.acoes.desvincular(item);
        break;
      case 'desfazerIgnorar':
        r.acoes.reabrir(item);
        break;
      default:
    }
  }

  async function confirmarVinculo(alvo) {
    const item = vinculando;
    const ok = await r.acoes.vincular(item, alvo);
    if (ok) {
      setVinculando(null);
      focoDepois.current = r.pendentes.find((i) => i.id !== item.id)?.id ?? null;
    }
  }

  function aoCriar(atualizado) {
    r.aplicar(atualizado);
    setCriandoId(null);
    toast.success(cfg.id === 'cartao' ? 'Lançamento criado e vinculado.' : 'Conta criada e vinculada.');
  }

  function ignorarSelecionados(lista) {
    r.acoes.ignorar(lista);
    setSelecionadosIds(new Set());
  }

  async function confirmarSelecionados(lista) {
    await r.acoes.confirmarVarias(lista);
    setSelecionadosIds(new Set());
  }

  function marcarTodos() {
    const ids = r.pendentes.map((i) => i.id);
    const todos = ids.length > 0 && ids.every((id) => selecionadosIds.has(id));
    setSelecionadosIds(todos ? new Set() : new Set(ids));
  }

  async function finalizar() {
    const c = r.contagem;
    const baixar = c.SUGERIDO + c.VINCULADO_MANUALMENTE;
    const ok = await confirm({
      title: 'Finalizar conciliação?',
      message: (
        <span className="block space-y-2 text-sm">
          <span className="flex items-start gap-2"><CircleCheckBig className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />{cfg.textoBaixa(baixar)}.</span>
          {c.SUGERIDO > 0 && (
            <span className="flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 text-warning shrink-0" aria-hidden="true" />
              {c.SUGERIDO === 1 ? '1 sugestão ainda não confirmada também entra.' : `${c.SUGERIDO} sugestões ainda não confirmadas também entram.`}
            </span>
          )}
          {c.IGNORADO > 0 && (
            <span className="flex items-start gap-2"><EyeOff className="w-4 h-4 mt-0.5 text-text-primary/60 shrink-0" aria-hidden="true" />
              {c.IGNORADO === 1 ? '1 movimento ignorado fica de fora.' : `${c.IGNORADO} movimentos ignorados ficam de fora.`}
            </span>
          )}
          {c.NAO_IDENTIFICADO > 0 && (
            <span className="flex items-start gap-2"><CircleHelp className="w-4 h-4 mt-0.5 text-error shrink-0" aria-hidden="true" />
              {c.NAO_IDENTIFICADO === 1 ? '1 movimento sem correspondência não será lançado.' : `${c.NAO_IDENTIFICADO} movimentos sem correspondência não serão lançados.`}
            </span>
          )}
          <span className="block text-text-primary/65">Depois de finalizar, a importação não pode mais ser alterada.</span>
        </span>
      ),
      confirmLabel: 'Finalizar',
      variant: 'default',
    });
    if (!ok) return;
    setFinalizando(true);
    try {
      await r.confirmarIgnorados();
      const final = await cfg.api.finalizar(sessao.id, {});
      toast.success('Conciliação finalizada.');
      onFinalizada(final);
    } catch (e) {
      toast.error(e?.message || 'Não foi possível finalizar. Tente de novo.');
    } finally {
      setFinalizando(false);
    }
  }

  async function cancelar() {
    const ok = await confirm({
      title: 'Cancelar esta importação?',
      message: 'Nada do que foi vinculado aqui será lançado. Para conciliar este extrato depois, será preciso importar o arquivo de novo.',
      confirmLabel: 'Cancelar importação',
      cancelLabel: 'Voltar',
      variant: 'error',
    });
    if (!ok) return;
    setCancelando(true);
    try {
      r.desfazerIgnorar();
      await cfg.api.cancelar(sessao.id);
      toast.success('Importação cancelada.');
      onCancelada();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível cancelar. Tente de novo.');
    } finally {
      setCancelando(false);
    }
  }

  function renderItem(item) {
    const acoes = acoesDoItem(item, { cfg, podeVincular, sessaoAberta });
    return (
      <ItemConciliacao
        item={item}
        cfg={cfg}
        acoes={acoes}
        selecionavel={selecionavel && aRevisar(item)}
        selecionado={selecionadosIds.has(item.id)}
        onAlternarSelecao={alternarSelecao}
        salvando={r.salvando.has(item.id)}
        onAcao={onAcao}
        onNavegar={navegar}
      >
        {criandoId === item.id && (
          <div className="mt-3">
            <NovoItemForm cfg={cfg} sessaoId={sessao.id} item={item} onCriado={aoCriar} onCancelar={() => setCriandoId(null)} />
          </div>
        )}
      </ItemConciliacao>
    );
  }

  const nomeAviso = r.aviso
    ? (r.aviso.quantidade === 1
      ? `"${cfg.descricaoOfx(r.aviso.primeiro) || 'Movimento'}" foi ignorado.`
      : `${r.aviso.quantidade} movimentos ignorados.`)
    : '';
  const tudoRevisado = r.contagem.total > 0 && r.contagem.aRevisar === 0;
  const todosMarcados = r.pendentes.length > 0 && r.pendentes.every((i) => selecionadosIds.has(i.id));

  return (
    <div className="space-y-5">
      <ResumoSessao
        cfg={cfg}
        sessao={sessao}
        contagem={r.contagem}
        podeVincular={podeVincular}
        sessaoAberta={sessaoAberta}
        finalizando={finalizando}
        cancelando={cancelando}
        onFinalizar={finalizar}
        onCancelar={cancelar}
      />

      {!podeVincular && sessaoAberta && (
        <p className="text-sm text-text-primary/70">Você pode acompanhar esta importação, mas não tem permissão para vincular itens.</p>
      )}

      <div className="space-y-3">
        <Tabs value={filtro} onChange={setFiltro} label="Filtrar movimentos por situação" idBase={ID_ABAS} items={abasFiltro(r.contagem)} className="[&>button]:shrink-0" />
        <div className="flex flex-col gap-3">
          {selecionavel && (
            <BarraLote
              selecionados={selecionados}
              sugestoesAltas={r.contagem.sugestoesAltas}
              emLote={r.emLote}
              onConfirmar={confirmarSelecionados}
              onIgnorar={ignorarSelecionados}
              onLimpar={() => setSelecionadosIds(new Set())}
              onConfirmarAltas={r.acoes.confirmarVarias}
              todosMarcados={todosMarcados}
              algumMarcado={selecionados.length > 0}
              onMarcarTodos={marcarTodos}
              totalPendentes={r.pendentes.length}
            />
          )}
          {selecionavel && <Atalhos />}
        </div>
      </div>

      <div role="tabpanel" id={Tabs.painelId(ID_ABAS, filtro)} aria-labelledby={Tabs.abaId(ID_ABAS, filtro)} className="space-y-6">
        <LayoutGroup id={`conc-${cfg.id}-${sessao.id}`}>
          {(filtro === 'todos' || pendentesVisiveis.length > 0) && (
            <ListaGrupo
              id="grupo-revisar"
              titulo="Para revisar"
              itens={pendentesVisiveis}
              renderItem={renderItem}
              vazio={tudoRevisado ? (
                <EmptyState
                  compact
                  tom="income"
                  icon={PartyPopper}
                  title="Tudo revisado"
                  description={sessaoAberta && podeVincular ? 'Confira os conciliados abaixo e finalize para lançar as baixas.' : 'Nenhum movimento pendente nesta importação.'}
                />
              ) : null}
            />
          )}
          {resolvidosVisiveis.length > 0 && (
            <ListaGrupo id="grupo-conciliados" titulo="Conciliados" itens={resolvidosVisiveis} renderItem={renderItem} />
          )}
          {visiveis.length === 0 && filtro !== 'todos' && (
            <p className="text-center text-sm text-text-primary/65 py-10">Nenhum movimento nesta situação.</p>
          )}
        </LayoutGroup>
      </div>

      {vinculando && (
        <VincularItemModal
          cfg={cfg}
          sessao={sessao}
          item={vinculando}
          salvando={r.salvando.has(vinculando.id)}
          onConfirmar={confirmarVinculo}
          onFechar={() => setVinculando(null)}
        />
      )}

      <DesfazerAviso
        aviso={r.aviso ? { id: r.aviso.id, mensagem: nomeAviso } : null}
        onDesfazer={r.desfazerIgnorar}
        onFechar={r.confirmarIgnorados}
      />
    </div>
  );
}
