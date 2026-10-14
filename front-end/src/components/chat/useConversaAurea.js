import { useCallback, useEffect, useRef, useState } from 'react';
import { chat } from '../../lib/api';
import { mensagemErroChat } from './aureaUtils';
import { mensagensDoHistorico, novoIdMensagem as novoId, perguntarAurea } from './streamAurea';

const CANAL = 'ASSISTENTE';

/**
 * Estado e ações da conversa da tela /assistente (canal ASSISTENTE): lista de conversas,
 * mensagens, envio com streaming, anexo, parar, tentar de novo, renomear e excluir.
 * Erros viram mensagens amigáveis na própria conversa (ver aureaUtils.mensagemErroChat).
 */
export function useConversaAurea({ onErro }) {
  const [conversas, setConversas] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [ativa, setAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [escrevendoId, setEscrevendoId] = useState(null);
  const [processandoArquivo, setProcessandoArquivo] = useState(null);
  const abortRef = useRef(null);
  const onErroRef = useRef(onErro);
  useEffect(() => { onErroRef.current = onErro; });

  const avisar = (msg) => onErroRef.current?.(msg);

  const atualizarMsg = useCallback((id, patch) => {
    setMensagens((lista) => lista.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const refreshConversas = useCallback(() => {
    chat.conversas(CANAL).then((l) => setConversas(l || [])).catch(() => { /* lista atual continua válida */ });
  }, []);

  const selecionar = useCallback(async (id) => {
    setAtiva(id);
    setCarregandoMsgs(true);
    try {
      const msgs = await chat.mensagensConversa(id);
      setMensagens(mensagensDoHistorico(msgs));
    } catch {
      setMensagens([]);
      onErroRef.current?.('Não foi possível abrir esta conversa. Tente novamente.');
    } finally {
      setCarregandoMsgs(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    chat.conversas(CANAL)
      .then((lista) => {
        if (!vigente) return;
        setConversas(lista || []);
        if (lista?.length) selecionar(lista[0].id);
      })
      .catch(() => onErroRef.current?.('Não foi possível carregar suas conversas. Recarregue a página.'))
      .finally(() => { if (vigente) setCarregandoLista(false); });
    return () => { vigente = false; abortRef.current?.abort(); };
  }, [selecionar]);

  async function garantirConversa() {
    if (ativa) return ativa;
    const c = await chat.criarConversa(CANAL);
    setConversas((prev) => [c, ...prev]);
    setAtiva(c.id);
    return c.id;
  }

  async function novaConversa() {
    abortRef.current?.abort();
    try {
      const c = await chat.criarConversa(CANAL);
      setConversas((prev) => [c, ...prev]);
      setAtiva(c.id);
      setMensagens([]);
      return c.id;
    } catch {
      avisar('Não foi possível iniciar uma nova conversa. Tente novamente.');
      return null;
    }
  }

  async function executarStream(pergunta, cid, respostaId) {
    const controller = new AbortController();
    abortRef.current = controller;
    setOcupado(true);
    setEscrevendoId(respostaId);
    try {
      const r = await perguntarAurea({
        pergunta, canal: CANAL, conversaId: cid, signal: controller.signal,
        aoReceber: (t) => atualizarMsg(respostaId, { text: t }),
      });
      if (r.interrompido) atualizarMsg(respostaId, { text: r.texto || '_Resposta interrompida._' });
      else if (r.erro) atualizarMsg(respostaId, { text: '', erro: r.erro, pergunta });
    } finally {
      abortRef.current = null;
      setOcupado(false);
      setEscrevendoId(null);
      refreshConversas();
    }
  }

  async function enviarTexto(texto) {
    const msg = (texto || '').trim();
    if (!msg || ocupado) return;
    let cid;
    try { cid = await garantirConversa(); } catch { avisar('Não foi possível iniciar a conversa. Tente novamente.'); return; }
    const respostaId = novoId();
    setMensagens((m) => [...m, { id: novoId(), role: 'user', text: msg }, { id: respostaId, role: 'assistant', text: '' }]);
    await executarStream(msg, cid, respostaId);
  }

  async function enviarComArquivo(texto, arquivo) {
    if (ocupado) return;
    let cid;
    try { cid = await garantirConversa(); } catch { avisar('Não foi possível iniciar a conversa. Tente novamente.'); return; }
    const respostaId = novoId();
    setMensagens((m) => [...m, { id: novoId(), role: 'user', text: texto, arquivo: arquivo.name }, { id: respostaId, role: 'assistant', text: '' }]);
    setOcupado(true);
    setEscrevendoId(respostaId);
    setProcessandoArquivo(arquivo.name);
    try {
      const resp = await chat.enviarAnexo(arquivo, texto, cid);
      atualizarMsg(respostaId, { text: resp?.resposta || 'Arquivo recebido.' });
    } catch (e) {
      atualizarMsg(respostaId, { erro: mensagemErroChat(e?.status, e?.message) });
    } finally {
      setOcupado(false);
      setEscrevendoId(null);
      setProcessandoArquivo(null);
      refreshConversas();
    }
  }

  async function tentarNovamente(respostaId, pergunta) {
    if (ocupado || !pergunta) return;
    const cid = ativa ?? (await garantirConversa());
    atualizarMsg(respostaId, { text: '', erro: null, pergunta: undefined });
    await executarStream(pergunta, cid, respostaId);
  }

  const parar = () => abortRef.current?.abort();

  async function excluir(id) {
    const anterior = conversas;
    const eraAtiva = id === ativa;
    setConversas((prev) => prev.filter((c) => c.id !== id));
    if (eraAtiva) { setAtiva(null); setMensagens([]); }
    try {
      await chat.excluirConversa(id);
      return true;
    } catch {
      setConversas(anterior);
      if (eraAtiva) selecionar(id);
      avisar('Não foi possível excluir a conversa. Tente novamente.');
      return false;
    }
  }

  async function renomear(id, titulo) {
    const t = (titulo || '').trim();
    if (!t) return;
    try {
      const c = await chat.renomearConversa(id, t);
      setConversas((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    } catch {
      avisar('Não foi possível renomear a conversa. Tente novamente.');
    }
  }

  return {
    conversas, carregandoLista, ativa, mensagens, carregandoMsgs, ocupado, escrevendoId, processandoArquivo,
    selecionar, novaConversa, enviarTexto, enviarComArquivo, tentarNovamente, parar, excluir, renomear,
  };
}

export default useConversaAurea;
