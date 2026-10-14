import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { STATUS, aRevisar } from './modos';

/*
 * Estado e ações da revisão de uma sessão de conciliação.
 *
 * "Ignorar" é adiado: o item some da fila na hora, mas o pedido ao servidor só sai quando o
 * aviso "Desfazer" fecha (ou antes de finalizar / ao sair da tela). Assim o Desfazer devolve o
 * item exatamente como estava — inclusive a sugestão, que o backend apaga ao ignorar.
 */

const ordenar = (a, b) => String(a.ofxData ?? '').localeCompare(String(b.ofxData ?? '')) || a.id - b.id;

export function useRevisaoConciliacao({ cfg, sessao, setSessao }) {
  const toast = useToast();
  const [salvando, setSalvando] = useState(() => new Set());
  const [ignorandoLote, setIgnorandoLote] = useState(null); // { id, itens: Map<id, item> } — ainda não enviado
  const [emLote, setEmLote] = useState(false);

  const sessaoId = sessao.id;
  const itensServidor = sessao.itens;

  // Itens como a pessoa vê: com os ignorados ainda não enviados já marcados.
  const itens = useMemo(() => {
    const lista = (itensServidor ?? []).map((i) => (ignorandoLote?.itens.has(i.id) ? { ...i, statusItem: STATUS.IGNORADO, _ignorandoLocal: true } : i));
    return lista.sort(ordenar);
  }, [itensServidor, ignorandoLote]);

  const aplicar = useCallback((atualizado) => {
    setSessao((s) => ({ ...s, itens: s.itens.map((i) => (i.id === atualizado.id ? atualizado : i)) }));
  }, [setSessao]);

  const marcarSalvando = useCallback((id, ligado) => {
    setSalvando((atual) => {
      const novo = new Set(atual);
      if (ligado) novo.add(id); else novo.delete(id);
      return novo;
    });
  }, []);

  /** Executa uma ação de item no servidor; devolve true se deu certo. */
  const executar = useCallback(async (item, chamada) => {
    marcarSalvando(item.id, true);
    try {
      const atualizado = await chamada();
      aplicar(atualizado);
      return true;
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar. Tente de novo.');
      return false;
    } finally {
      marcarSalvando(item.id, false);
    }
  }, [aplicar, marcarSalvando, toast]);

  // ── Ignorar adiado ─────────────────────────────────────────────────────────
  const loteRef = useRef(null);
  useEffect(() => { loteRef.current = ignorandoLote; }, [ignorandoLote]);

  const enviarIgnorados = useCallback(async (lote) => {
    if (!lote || lote.itens.size === 0) return;
    const ids = [...lote.itens.keys()];
    const resultados = await Promise.allSettled(ids.map((id) => cfg.acoes.ignorar(sessaoId, id)));
    const falhas = [];
    resultados.forEach((r, k) => {
      if (r.status === 'fulfilled') aplicar(r.value);
      else falhas.push(lote.itens.get(ids[k]));
    });
    if (falhas.length) {
      toast.error(falhas.length === 1
        ? 'Um item não pôde ser ignorado e voltou para a lista.'
        : `${falhas.length} itens não puderam ser ignorados e voltaram para a lista.`);
    }
  }, [aplicar, cfg, sessaoId, toast]);

  const confirmarIgnorados = useCallback(async () => {
    const lote = loteRef.current;
    loteRef.current = null;
    setIgnorandoLote(null);
    await enviarIgnorados(lote);
  }, [enviarIgnorados]);

  const ignorar = useCallback((lista) => {
    if (!lista.length) return;
    setIgnorandoLote((atual) => {
      const mapa = new Map(atual?.itens ?? []);
      lista.forEach((i) => mapa.set(i.id, i));
      return { id: Date.now(), itens: mapa };
    });
  }, []);

  const desfazerIgnorar = useCallback(() => {
    loteRef.current = null;
    setIgnorandoLote(null);
  }, []);

  // Ao sair da tela, o que estava esperando o "Desfazer" é enviado.
  const enviarRef = useRef(enviarIgnorados);
  useEffect(() => { enviarRef.current = enviarIgnorados; });
  useEffect(() => () => {
    const pendente = loteRef.current;
    if (pendente) enviarRef.current(pendente);
  }, []);

  // ── Ações ──────────────────────────────────────────────────────────────────
  const confirmarSugestao = useCallback(
    (item) => executar(item, () => cfg.acoes.vincular(sessaoId, item.id, { id: cfg.vinculoDe(item).id })),
    [cfg, executar, sessaoId],
  );
  const vincular = useCallback(
    (item, alvo) => executar(item, () => cfg.acoes.vincular(sessaoId, item.id, alvo)),
    [cfg, executar, sessaoId],
  );
  const desvincular = useCallback(
    (item) => executar(item, () => cfg.acoes.desvincular(sessaoId, item.id)),
    [cfg, executar, sessaoId],
  );
  const reabrir = useCallback((item) => {
    if (!item._ignorandoLocal) return executar(item, () => cfg.acoes.desfazerIgnorar(sessaoId, item.id));
    setIgnorandoLote((atual) => {
      if (!atual) return null;
      const mapa = new Map(atual.itens);
      mapa.delete(item.id);
      return mapa.size ? { ...atual, itens: mapa } : null;
    });
    return Promise.resolve(true);
  }, [cfg, executar, sessaoId]);

  const confirmarVarias = useCallback(async (lista) => {
    setEmLote(true);
    let ok = 0;
    for (const item of lista) {
      if (await confirmarSugestao(item)) ok += 1;
    }
    setEmLote(false);
    if (ok) toast.success(ok === 1 ? '1 sugestão confirmada.' : `${ok} sugestões confirmadas.`);
  }, [confirmarSugestao, toast]);

  // ── Números ────────────────────────────────────────────────────────────────
  const contagem = useMemo(() => {
    const c = { total: itens.length, SUGERIDO: 0, NAO_IDENTIFICADO: 0, VINCULADO_MANUALMENTE: 0, IGNORADO: 0, BAIXADO: 0 };
    itens.forEach((i) => { c[i.statusItem] = (c[i.statusItem] ?? 0) + 1; });
    c.aRevisar = c.SUGERIDO + c.NAO_IDENTIFICADO;
    c.resolvidos = c.total - c.aRevisar;
    c.vinculados = c.VINCULADO_MANUALMENTE + c.BAIXADO;
    c.sugestoesAltas = itens.filter((i) => i.statusItem === STATUS.SUGERIDO && (i.scoreVinculacao ?? 0) >= 70);
    return c;
  }, [itens]);

  return {
    itens,
    pendentes: itens.filter(aRevisar),
    resolvidos: itens.filter((i) => !aRevisar(i)),
    contagem,
    salvando,
    emLote,
    aplicar,
    aviso: ignorandoLote ? { id: ignorandoLote.id, quantidade: ignorandoLote.itens.size, primeiro: ignorandoLote.itens.values().next().value } : null,
    acoes: { confirmarSugestao, vincular, desvincular, reabrir, ignorar, confirmarVarias },
    confirmarIgnorados,
    desfazerIgnorar,
  };
}

export default useRevisaoConciliacao;
