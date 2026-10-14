import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Send, Paperclip, Trash2, Download, FileSpreadsheet, Loader2, X,
  Plus, MessageSquare, Search, Pencil, Check, PanelLeft, Copy, Square, RotateCcw,
} from 'lucide-react';
import { chat, clearAuth } from '../lib/api';
import { useToast } from '../hooks/useToast';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const RELATORIO_PATH = /\/api\/chat\/relatorios\/[^\s)"']+\.xlsx/;
const TIPOS_ACEITOS = '.xlsx,.xls,.csv,.ofx,.pdf,.md';
const MAX_ANEXO_MB = 5;
const MAX_ANEXO_BYTES = MAX_ANEXO_MB * 1024 * 1024;
const CANAL = 'ASSISTENTE';

const SUGESTOES = [
  'Qual o meu saldo?',
  'Quais contas estão atrasadas?',
  'Onde eu mais gasto?',
  'Resumo das minhas finanças',
];

/** Markdown simples (negrito, listas, quebras) — seguro (React escapa o texto). */
function Markdown({ text }) {
  const linhas = (text || '').split('\n');
  const out = [];
  let bullets = null;
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  const flush = () => {
    if (bullets) { out.push(<ul key={`u${out.length}`} className="list-disc pl-5 space-y-0.5 my-1">{bullets}</ul>); bullets = null; }
  };
  linhas.forEach((l, idx) => {
    const m = l.match(/^\s*[-*]\s+(.*)$/);
    if (m) { bullets = bullets || []; bullets.push(<li key={idx}>{inline(m[1])}</li>); }
    else { flush(); if (l.trim() === '') out.push(<div key={idx} className="h-2" />); else out.push(<p key={idx} className="my-0.5">{inline(l)}</p>); }
  });
  flush();
  return <div className="text-[15px] leading-relaxed">{out}</div>;
}

function downloadDaResposta(texto) {
  const m = (texto || '').match(RELATORIO_PATH);
  return m ? m[0] : null;
}

/** Agrupa conversas por data (Hoje / Ontem / 7 dias / Anteriores). */
function agrupar(list) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  const semana = new Date(hoje); semana.setDate(semana.getDate() - 7);
  const grupos = [['Hoje', []], ['Ontem', []], ['Últimos 7 dias', []], ['Anteriores', []]];
  list.forEach((c) => {
    const d = new Date(c.atualizadoEm);
    if (d >= hoje) grupos[0][1].push(c);
    else if (d >= ontem) grupos[1][1].push(c);
    else if (d >= semana) grupos[2][1].push(c);
    else grupos[3][1].push(c);
  });
  return grupos.filter(([, items]) => items.length);
}

export default function Assistente() {
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [processandoArquivo, setProcessandoArquivo] = useState(null);
  const [arquivoAnexado, setArquivoAnexado] = useState(null);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(false);
  const [tituloEdit, setTituloEdit] = useState('');
  const [listaAberta, setListaAberta] = useState(false); // drawer no mobile
  const [copiado, setCopiado] = useState(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null); // id aguardando confirmação
  const [podeParar, setPodeParar] = useState(false); // true enquanto um stream abortável está ativo

  const toast = useToast();
  const fimRef = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null); // AbortController do stream em andamento

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens, ocupado]);

  // Auto-expande o textarea conforme o conteúdo (até max-h-40).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function copiar(texto, i) {
    try {
      await navigator.clipboard.writeText(texto || '');
      setCopiado(i);
      setTimeout(() => setCopiado((c) => (c === i ? null : c)), 1500);
    } catch {}
  }

  useEffect(() => {
    chat.conversas(CANAL)
      .then((list) => { setConversas(list || []); if (list?.length) selecionar(list[0].id); })
      .catch(() => {});
  }, []);

  function refreshConversas() {
    chat.conversas(CANAL).then((l) => setConversas(l || [])).catch(() => {});
  }

  async function selecionar(id) {
    setConversaAtiva(id); setListaAberta(false); setEditando(false); setConfirmandoExclusao(null);
    setCarregandoMsgs(true);
    try {
      const msgs = await chat.mensagensConversa(id);
      setMensagens((msgs || []).map((m) => ({ role: m.role, text: m.texto })));
    } catch {
      setMensagens([]);
      toast.error('Não foi possível abrir esta conversa. Tente novamente.');
    }
    finally { setCarregandoMsgs(false); }
  }

  async function novaConversa() {
    setEditando(false);
    try {
      const c = await chat.criarConversa(CANAL);
      setConversas((prev) => [c, ...prev]);
      setConversaAtiva(c.id); setMensagens([]); setListaAberta(false);
    } catch {
      toast.error('Não foi possível iniciar uma nova conversa. Tente novamente.');
    }
  }

  async function garantirConversa() {
    if (conversaAtiva) return conversaAtiva;
    const c = await chat.criarConversa(CANAL);
    setConversas((prev) => [c, ...prev]);
    setConversaAtiva(c.id);
    return c.id;
  }

  // Atualiza o texto da última mensagem do assistente. `patch` permite marcar/limpar
  // metadados (ex.: { erro: true, pergunta } para habilitar o botão "Tentar novamente").
  function atualizarUltima(text, patch = {}) {
    setMensagens((m) => {
      const c = [...m];
      for (let i = c.length - 1; i >= 0; i--) { if (c[i].role === 'assistant') { c[i] = { ...c[i], text, ...patch }; break; } }
      return c;
    });
  }

  // Executa o streaming SSE sobre o último balão do assistente (que já deve existir).
  // Encapsula fetch + abort aqui — exceção conhecida ao padrão lib/api.js.
  async function executarStream(msg, cid) {
    const controller = new AbortController();
    abortRef.current = controller;
    setOcupado(true); setPodeParar(true);
    let acc = '';
    try {
      const resp = await fetch(`${BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mensagem: msg, canal: CANAL, conversaId: cid }),
        signal: controller.signal,
      });
      if (resp.status === 401) { clearAuth(); window.location.href = '/login'; return; }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        atualizarUltima(err.mensagem || 'Não foi possível processar sua mensagem. Tente novamente.', { erro: true, pergunta: msg });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const p = line.slice(5).trim();
          if (!p) continue;
          let delta = '';
          try { delta = JSON.parse(p).t ?? ''; } catch { delta = p; }
          acc += delta;
          atualizarUltima(acc);
        }
      }
    } catch (e) {
      if (e?.name === 'AbortError') {
        // Interrompido pelo usuário: mantém o que já chegou; se nada chegou, avisa.
        if (!acc) atualizarUltima('Resposta interrompida.');
      } else {
        atualizarUltima('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', { erro: true, pergunta: msg });
      }
    } finally {
      abortRef.current = null;
      setOcupado(false); setPodeParar(false);
      refreshConversas();
    }
  }

  async function enviarTexto(texto) {
    const msg = (texto ?? input).trim();
    if (!msg || ocupado) return;
    setInput('');
    const cid = await garantirConversa();
    setMensagens((m) => [...m, { role: 'user', text: msg }, { role: 'assistant', text: '' }]);
    await executarStream(msg, cid);
  }

  // Reenvia a última pergunta que falhou, reaproveitando o balão do assistente com erro.
  async function retentar(pergunta) {
    if (ocupado || !pergunta) return;
    const cid = await garantirConversa();
    atualizarUltima('', { erro: false, pergunta: undefined });
    await executarStream(pergunta, cid);
  }

  function pararStream() {
    abortRef.current?.abort();
  }

  async function enviarComArquivo(texto, arquivo) {
    setInput(''); setArquivoAnexado(null);
    const cid = await garantirConversa();
    setMensagens((m) => [...m, { role: 'user', text: texto, arquivo: arquivo.name }, { role: 'assistant', text: '' }]);
    setOcupado(true); setProcessandoArquivo(arquivo.name);
    try {
      const resp = await chat.enviarAnexo(arquivo, texto, cid);
      atualizarUltima(resp?.resposta || 'Arquivo processado.');
    } catch (e) {
      atualizarUltima(e.message || 'Não foi possível processar o arquivo.');
    } finally {
      setOcupado(false); setProcessandoArquivo(null);
      refreshConversas();
    }
  }

  function enviar() {
    const texto = input.trim();
    if (ocupado || !texto) return;
    if (arquivoAnexado) enviarComArquivo(texto, arquivoAnexado);
    else enviarTexto(texto);
  }

  async function excluir(id) {
    setConfirmandoExclusao(null);
    // Remoção otimista: guarda o estado anterior para rollback caso a API falhe.
    const anterior = conversas;
    const eraAtiva = id === conversaAtiva;
    setConversas((prev) => prev.filter((c) => c.id !== id));
    if (eraAtiva) { setConversaAtiva(null); setMensagens([]); }
    try {
      await chat.excluirConversa(id);
    } catch {
      // Falhou: restaura a conversa na lista e a seleção, avisando o usuário.
      setConversas(anterior);
      if (eraAtiva) setConversaAtiva(id);
      toast.error('Não foi possível excluir a conversa. Tente novamente.');
    }
  }

  function iniciarEdicao() {
    const c = conversas.find((x) => x.id === conversaAtiva);
    setTituloEdit(c?.titulo ?? ''); setEditando(true);
  }
  async function salvarTitulo() {
    const t = tituloEdit.trim();
    if (!t || !conversaAtiva) { setEditando(false); return; }
    try {
      const c = await chat.renomearConversa(conversaAtiva, t);
      setConversas((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    } catch {
      toast.error('Não foi possível renomear a conversa. Tente novamente.');
    }
    setEditando(false);
  }

  const conversaObj = conversas.find((c) => c.id === conversaAtiva) || null;
  const filtradas = busca.trim()
    ? conversas.filter((c) => (c.titulo || '').toLowerCase().includes(busca.trim().toLowerCase()))
    : conversas;
  const grupos = agrupar(filtradas);
  const semConversa = conversaAtiva == null;
  const vazio = mensagens.length === 0;

  return (
    <div className="flex h-full w-full bg-surface overflow-hidden">
      {/* Overlay mobile */}
      {listaAberta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setListaAberta(false)} />
      )}

      {/* ── Barra lateral de conversas ── */}
      <aside className={`${listaAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 md:z-0 h-full w-72 shrink-0 bg-surface-low border-r border-text-primary/5 flex flex-col transition-transform duration-200`}>
        <div className="p-3">
          <button onClick={novaConversa}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Nova conversa
          </button>
        </div>
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-text-primary/10 text-text-primary/60 focus-within:border-primary/30">
            <Search className="w-4 h-4 shrink-0" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar conversa"
              className="bg-transparent outline-none text-sm w-full placeholder:text-text-primary/30 text-text-primary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-3 space-y-3">
          {conversas.length === 0 && (
            <p className="text-xs text-text-primary/40 text-center mt-6 px-4">Nenhuma conversa ainda. Comece uma nova.</p>
          )}
          {grupos.map(([label, items]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-widest text-text-primary/30 px-3 mb-1">{label}</p>
              <div className="space-y-0.5">
                {items.map((c) => (
                  <div key={c.id}
                    className={`group flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg cursor-pointer transition-colors ${
                      c.id === conversaAtiva ? 'bg-surface-medium' : 'hover:bg-surface-medium/50'}`}
                    onClick={() => selecionar(c.id)}>
                    <MessageSquare className={`w-4 h-4 shrink-0 ${c.id === conversaAtiva ? 'text-primary' : 'text-text-primary/40'}`} />
                    <span className="flex-1 text-sm text-text-primary/80 truncate">{c.titulo}</span>
                    {confirmandoExclusao === c.id ? (
                      <span className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-text-primary/50 mr-0.5">Excluir?</span>
                        <button onClick={(e) => { e.stopPropagation(); excluir(c.id); }} aria-label="Confirmar exclusão"
                          className="w-11 h-11 lg:w-8 lg:h-8 grid place-items-center rounded text-red-400 hover:bg-red-400/10"><Check className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmandoExclusao(null); }} aria-label="Cancelar exclusão"
                          className="w-11 h-11 lg:w-8 lg:h-8 grid place-items-center rounded text-text-primary/40 hover:bg-surface-medium"><X className="w-4 h-4" /></button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmandoExclusao(c.id); }}
                        aria-label="Excluir conversa"
                        className="w-11 h-11 lg:w-8 lg:h-8 grid place-items-center rounded text-text-primary/40 hover:text-red-400 transition-opacity shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Área da conversa ── */}
      <section className="flex-1 flex flex-col min-w-0 h-full">
        {/* Cabeçalho */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-text-primary/5 shrink-0">
          <button onClick={() => setListaAberta(true)} className="md:hidden p-1.5 rounded-lg text-text-primary/50 hover:bg-surface-medium" aria-label="Abrir conversas">
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          {editando ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input autoFocus value={tituloEdit} onChange={(e) => setTituloEdit(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') salvarTitulo(); if (e.key === 'Escape') setEditando(false); }}
                className="flex-1 min-w-0 bg-surface border border-primary/30 rounded-lg px-2 py-1 text-sm text-text-primary outline-none" />
              <button onClick={salvarTitulo} className="w-11 h-11 grid place-items-center rounded-lg text-primary hover:bg-surface-medium shrink-0" aria-label="Salvar"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditando(false)} className="w-11 h-11 grid place-items-center rounded-lg text-text-primary/40 hover:bg-surface-medium shrink-0" aria-label="Cancelar"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <h1 className="flex-1 text-[15px] font-semibold text-text-primary font-display truncate">
                {conversaObj ? conversaObj.titulo : 'Áurea'}
              </h1>
              {conversaObj && (
                <button onClick={iniciarEdicao} className="w-11 h-11 grid place-items-center rounded-lg text-text-primary/40 hover:text-text-primary hover:bg-surface-medium shrink-0" aria-label="Renomear">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </header>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            {carregandoMsgs ? (
              <div className="flex justify-center py-10 text-text-primary/40"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (semConversa || vazio) ? (
              <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-text-primary font-display">Como posso ajudar?</p>
                  <p className="text-sm text-text-primary/50 max-w-md mt-1">
                    Pergunte sobre suas finanças, ou anexe uma planilha, extrato (.ofx), PDF ou .md — eu analiso e faço os cadastros e lançamentos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGESTOES.map((s) => (
                    <button key={s} onClick={() => enviarTexto(s)}
                      className="text-sm px-3.5 py-2 rounded-xl border border-text-primary/10 text-text-primary/70 hover:border-primary/30 hover:text-primary transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : mensagens.map((m, i) => {
              const url = m.role === 'assistant' ? downloadDaResposta(m.text) : null;
              const textoLimpo = url ? m.text.replace(RELATORIO_PATH, '').replace(/\[[^\]]*\]\(\s*\)/g, '') : m.text;
              if (m.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-medium border border-text-primary/5 px-4 py-2.5">
                      {m.arquivo && (
                        <span className="flex items-center gap-2 text-sm font-medium mb-1 text-text-primary/70">
                          <FileSpreadsheet className="w-4 h-4 shrink-0" /> {m.arquivo}
                        </span>
                      )}
                      {m.text && <Markdown text={m.text} />}
                    </div>
                  </div>
                );
              }
              const carregandoResposta = !m.text && ocupado;
              return (
                <div key={i} className="group/msg flex gap-3 items-start animate-fade-in-up">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 text-text-primary/90">
                    {carregandoResposta ? (
                      <span className="inline-flex items-center gap-2 text-sm text-text-primary/50">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {processandoArquivo ? `Analisando ${processandoArquivo}…` : 'Pensando…'}
                      </span>
                    ) : <Markdown text={textoLimpo} />}
                    {url && (
                      <a href={url} download
                        className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-primary text-on-primary rounded-xl hover:opacity-90 transition-opacity text-sm font-semibold no-underline">
                        <Download className="w-4 h-4" /> Baixar Relatório (.xlsx)
                      </a>
                    )}
                    {m.erro && m.pergunta && !ocupado && (
                      <button onClick={() => retentar(m.pergunta)}
                        className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-medium transition-colors"
                        aria-label="Tentar enviar novamente">
                        <RotateCcw className="w-4 h-4" /> Tentar novamente
                      </button>
                    )}
                    {!carregandoResposta && textoLimpo && !m.erro && (
                      <button onClick={() => copiar(textoLimpo, i)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-text-primary/30 hover:text-text-primary/70 opacity-100 lg:opacity-0 lg:group-hover/msg:opacity-100 transition-opacity"
                        aria-label="Copiar resposta">
                        {copiado === i
                          ? <><Check className="w-3 h-3" /> Copiado</>
                          : <><Copy className="w-3 h-3" /> Copiar</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={fimRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 pt-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="max-w-3xl mx-auto">
            {arquivoAnexado && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm text-text-primary w-fit max-w-full">
                <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate font-medium">{arquivoAnexado.name}</span>
                <span className="text-text-primary/40 shrink-0">— escreva o que fazer e envie</span>
                <button onClick={() => setArquivoAnexado(null)} disabled={ocupado} aria-label="Remover arquivo"
                  className="ml-1 p-0.5 rounded hover:bg-primary/20 text-text-primary/50 hover:text-text-primary shrink-0 disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 border border-text-primary/10 rounded-2xl px-2 py-2 bg-surface-low focus-within:border-primary/30 transition-colors">
              <input ref={fileRef} type="file" accept={TIPOS_ACEITOS} className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (f.size > MAX_ANEXO_BYTES) {
                    toast.error(`O arquivo é muito grande. O tamanho máximo é ${MAX_ANEXO_MB} MB.`);
                    return;
                  }
                  setArquivoAnexado(f);
                }} />
              <button onClick={() => fileRef.current?.click()} disabled={ocupado} title="Anexar planilha, OFX, PDF ou .md"
                className="w-11 h-11 grid place-items-center rounded-xl text-text-primary/50 hover:text-primary transition-colors disabled:opacity-40 shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder={arquivoAnexado ? 'Descreva o que fazer com o arquivo…' : 'Escreva para a Áurea…'}
                rows={1}
                className="flex-1 bg-transparent px-1 py-2 text-[15px] text-text-primary outline-none placeholder:text-text-primary/30 resize-none max-h-40"
              />
              {podeParar ? (
                <button onClick={pararStream} aria-label="Parar resposta"
                  className="w-11 h-11 rounded-xl bg-surface-medium text-text-primary flex items-center justify-center hover:bg-surface-high transition-colors shrink-0">
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button onClick={enviar} disabled={ocupado || !input.trim()} aria-label="Enviar"
                  className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0">
                  {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-primary/35 mt-2 text-center">
              Enter envia · Shift+Enter quebra linha · aceita .xlsx, .xls, .csv, .ofx, .pdf, .md (máx. {MAX_ANEXO_MB} MB)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
