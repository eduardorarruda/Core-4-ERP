import { clearAuth, getEmpresaAtivaId } from '../../lib/api';
import { ERRO_CONEXAO, ehRespostaDeErro, mensagemDaRespostaDeErro, mensagemErroChat } from './aureaUtils';

/*
 * Envio de pergunta à Áurea com resposta em streaming (SSE). Fonte única usada pela tela
 * /assistente (canal ASSISTENTE) e pelo painel flutuante (canal BALAO).
 *
 * O `request` de lib/api.js lê a resposta inteira de uma vez; aqui precisamos ler o corpo aos
 * poucos, então o fetch fica neste módulo — com os mesmos cabeçalhos (cookie JWT + empresa ativa).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

function irParaLogin() {
  clearAuth();
  window.location.assign('/login');
}

/** Lê o stream SSE (`data: {"t":"..."}`) e chama `aoReceber(textoAcumulado)` a cada trecho. */
async function lerStream(resp, aoReceber) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let acc = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const linhas = buf.split('\n');
    buf = linhas.pop();
    for (const linha of linhas) {
      if (!linha.startsWith('data:')) continue;
      const p = linha.slice(5).trim();
      if (!p) continue;
      let delta;
      // Cada delta vem como JSON numa linha só (markdown com quebras não quebra o SSE); texto cru = formato antigo
      try { delta = JSON.parse(p).t ?? ''; } catch { delta = p; }
      acc += delta;
      aoReceber(acc);
    }
  }
  return acc;
}

/**
 * Pergunta à Áurea e acompanha a resposta.
 * @param {{ pergunta: string, canal: 'ASSISTENTE'|'BALAO', conversaId?: number|null,
 *           signal?: AbortSignal, aoReceber: (texto: string) => void }} opcoes
 * @returns {Promise<{ texto?: string, erro?: string, interrompido?: boolean, sessaoEncerrada?: boolean }>}
 *   `erro` já vem em linguagem simples; `interrompido` = a pessoa parou (traz o texto parcial).
 */
export async function perguntarAurea({ pergunta, canal, conversaId = null, signal, aoReceber }) {
  let acc = '';
  try {
    const empresaId = getEmpresaAtivaId();
    const resp = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(empresaId ? { 'X-Empresa-Id': String(empresaId) } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ mensagem: pergunta, canal, ...(conversaId != null ? { conversaId } : {}) }),
      signal,
    });
    if (resp.status === 401) { irParaLogin(); return { sessaoEncerrada: true }; }
    if (!resp.ok) {
      const corpo = await resp.json().catch(() => ({}));
      return { erro: mensagemErroChat(resp.status, corpo.mensagem) };
    }
    acc = await lerStream(resp, (t) => { acc = t; aoReceber(t); });
    if (!acc.trim()) return { erro: mensagemErroChat(503) };
    if (ehRespostaDeErro(acc)) return { erro: mensagemDaRespostaDeErro(acc) };
    return { texto: acc };
  } catch (e) {
    if (e?.name === 'AbortError') return { interrompido: true, texto: acc };
    return { erro: ERRO_CONEXAO };
  }
}

let sequencia = 0;
/** Id local de mensagem (chave de lista). */
export const novoIdMensagem = () => `m${Date.now().toString(36)}${(sequencia += 1)}`;

/**
 * Mensagens salvas no servidor → formato da tela. Resposta que é marcador de falha vira estado de
 * erro, com a pergunta anterior guardada para o "Tentar novamente".
 */
export function mensagensDoHistorico(lista) {
  return (lista || []).map((m, i) => {
    if (m.role === 'assistant' && (m.falha || ehRespostaDeErro(m.texto))) {
      const anterior = lista[i - 1];
      return {
        id: novoIdMensagem(), role: m.role, text: '', erro: mensagemDaRespostaDeErro(m.texto),
        pergunta: anterior?.role === 'user' ? anterior.texto : undefined,
      };
    }
    return { id: novoIdMensagem(), role: m.role, text: m.texto };
  });
}
