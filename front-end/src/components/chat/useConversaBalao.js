import { useCallback, useEffect, useRef, useState } from 'react';
import { chat } from '../../lib/api';
import { mensagensDoHistorico, novoIdMensagem, perguntarAurea } from './streamAurea';

const CANAL = 'BALAO';

/**
 * Conversa do painel flutuante da Áurea (canal BALAO — separada da tela /assistente).
 * Uma conversa só por canal: o backend usa a mais recente; "limpar" apaga as do canal.
 * Mesmo pipeline de streaming e de erros amigáveis da tela cheia (streamAurea).
 */
export function useConversaBalao() {
  const [mensagens, setMensagens] = useState(null); // null = carregando o histórico
  const [ocupado, setOcupado] = useState(false);
  const [escrevendoId, setEscrevendoId] = useState(null);
  const abortRef = useRef(null);

  const atualizarMsg = useCallback((id, patch) => {
    setMensagens((lista) => (lista ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  useEffect(() => {
    let vigente = true;
    chat.historico(CANAL)
      .then((h) => { if (vigente) setMensagens(Array.isArray(h) ? mensagensDoHistorico(h) : []); })
      .catch(() => { if (vigente) setMensagens([]); });
    return () => { vigente = false; abortRef.current?.abort(); };
  }, []);

  async function responder(pergunta, respostaId) {
    const controller = new AbortController();
    abortRef.current = controller;
    setOcupado(true);
    setEscrevendoId(respostaId);
    try {
      const r = await perguntarAurea({
        pergunta, canal: CANAL, signal: controller.signal,
        aoReceber: (t) => atualizarMsg(respostaId, { text: t }),
      });
      if (r.interrompido) atualizarMsg(respostaId, { text: r.texto || '_Resposta interrompida._' });
      else if (r.erro) atualizarMsg(respostaId, { text: '', erro: r.erro, pergunta });
    } finally {
      abortRef.current = null;
      setOcupado(false);
      setEscrevendoId(null);
    }
  }

  async function enviarTexto(texto) {
    const msg = (texto || '').trim();
    if (!msg || ocupado) return;
    const respostaId = novoIdMensagem();
    setMensagens((m) => [...(m ?? []), { id: novoIdMensagem(), role: 'user', text: msg }, { id: respostaId, role: 'assistant', text: '' }]);
    await responder(msg, respostaId);
  }

  async function tentarNovamente(respostaId, pergunta) {
    if (ocupado || !pergunta) return;
    atualizarMsg(respostaId, { text: '', erro: null, pergunta: undefined });
    await responder(pergunta, respostaId);
  }

  const parar = () => abortRef.current?.abort();

  /** Apaga a conversa do painel no servidor. Lança erro se falhar (quem chama avisa). */
  async function limpar() {
    abortRef.current?.abort();
    await chat.limparHistorico(CANAL);
    setMensagens([]);
  }

  return { mensagens, carregando: mensagens === null, ocupado, escrevendoId, enviarTexto, tentarNovamente, parar, limpar };
}

export default useConversaBalao;
