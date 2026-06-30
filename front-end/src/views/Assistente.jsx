import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Paperclip, Trash2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { chat, clearAuth } from '../lib/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const RELATORIO_PATH = /\/api\/chat\/relatorios\/[^\s)"']+\.xlsx/;
const TIPOS_ACEITOS = '.xlsx,.xls,.csv,.ofx';

const SUGESTOES = [
  'Qual o meu saldo?',
  'Quais contas estão atrasadas?',
  'Onde eu mais gasto?',
  'Resumo das minhas finanças',
];

/** Renderiza markdown simples (negrito, listas, quebras) de forma segura (React escapa o texto). */
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
    if (m) {
      bullets = bullets || [];
      bullets.push(<li key={idx}>{inline(m[1])}</li>);
    } else {
      flush();
      if (l.trim() === '') out.push(<div key={idx} className="h-2" />);
      else out.push(<p key={idx} className="my-0.5">{inline(l)}</p>);
    }
  });
  flush();
  return <div className="text-sm leading-relaxed">{out}</div>;
}

/** Extrai um eventual link de relatório (.xlsx) da resposta para mostrar como botão de download. */
function downloadDaResposta(texto) {
  const m = (texto || '').match(RELATORIO_PATH);
  return m ? m[0] : null;
}

export default function Assistente() {
  const [mensagens, setMensagens] = useState([]); // { role: 'user'|'assistant', text, arquivo? }
  const [input, setInput] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [processandoArquivo, setProcessandoArquivo] = useState(null);
  const fimRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens, ocupado]);

  async function enviarTexto(texto) {
    const msg = (texto ?? input).trim();
    if (!msg || ocupado) return;
    setInput('');
    setMensagens((m) => [...m, { role: 'user', text: msg }, { role: 'assistant', text: '' }]);
    setOcupado(true);
    try {
      const resp = await fetch(`${BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mensagem: msg }),
      });
      if (resp.status === 401) { clearAuth(); window.location.href = '/login'; return; }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        atualizarUltima(err.mensagem || 'Não foi possível processar. Tente novamente.');
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let acc = '', buf = '';
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
    } catch {
      atualizarUltima('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setOcupado(false);
    }
  }

  function atualizarUltima(text) {
    setMensagens((m) => {
      const c = [...m];
      for (let i = c.length - 1; i >= 0; i--) {
        if (c[i].role === 'assistant') { c[i] = { ...c[i], text }; break; }
      }
      return c;
    });
  }

  async function enviarArquivo(arquivo) {
    if (!arquivo || ocupado) return;
    setMensagens((m) => [...m, { role: 'user', text: '', arquivo: arquivo.name }, { role: 'assistant', text: '' }]);
    setOcupado(true);
    setProcessandoArquivo(arquivo.name);
    try {
      const resp = await chat.enviarAnexo(arquivo);
      atualizarUltima(resp?.resposta || 'Arquivo processado.');
    } catch (e) {
      atualizarUltima(e.message || 'Não foi possível processar o arquivo.');
    } finally {
      setOcupado(false);
      setProcessandoArquivo(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function limpar() {
    try { await chat.limparHistorico(); } catch {}
    setMensagens([]);
  }

  const vazio = mensagens.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto w-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary font-display">Assistente IA</h1>
            <p className="text-xs text-text-primary/50">Converse ou envie planilhas e extratos (OFX) para a IA processar</p>
          </div>
        </div>
        <button onClick={limpar} title="Limpar conversa"
          className="p-2 rounded-lg text-text-primary/40 hover:text-text-primary hover:bg-surface-medium transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-text-primary/5 bg-surface-low p-4 space-y-3">
        {vazio && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Como posso ajudar?</p>
              <p className="text-sm text-text-primary/50 max-w-md mt-1">
                Pergunte sobre suas finanças, ou anexe uma planilha (.xlsx/.csv) ou extrato bancário (.ofx)
                e eu analiso e faço os cadastros/lançamentos necessários.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviarTexto(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-text-primary/10 text-text-primary/60 hover:border-primary/30 hover:text-primary transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) => {
          const url = m.role === 'assistant' ? downloadDaResposta(m.text) : null;
          const textoLimpo = url ? m.text.replace(RELATORIO_PATH, '').replace(/\[[^\]]*\]\(\s*\)/g, '') : m.text;
          return (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.role === 'user'
                ? 'bg-primary/20 text-text-primary rounded-br-sm'
                : 'bg-surface-medium text-text-primary/90 rounded-bl-sm'}`}>
                {m.arquivo ? (
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <FileSpreadsheet className="w-4 h-4" /> {m.arquivo}
                  </span>
                ) : m.role === 'assistant' && !m.text && ocupado ? (
                  <span className="inline-flex items-center gap-2 text-sm text-text-primary/50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {processandoArquivo ? `Analisando ${processandoArquivo}…` : 'Pensando…'}
                  </span>
                ) : (
                  <Markdown text={textoLimpo} />
                )}
                {url && (
                  <a href={url} download
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold no-underline">
                    <Download className="w-4 h-4" /> Baixar Relatório (.xlsx)
                  </a>
                )}
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      {/* Entrada */}
      <div className="mt-3 flex items-end gap-2">
        <input ref={fileRef} type="file" accept={TIPOS_ACEITOS} className="hidden"
          onChange={(e) => e.target.files?.[0] && enviarArquivo(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={ocupado}
          title="Anexar planilha ou OFX"
          className="p-3 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-40 shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
          placeholder="Pergunte sobre suas finanças, ou anexe um arquivo…"
          rows={1}
          disabled={ocupado}
          className="flex-1 bg-surface border border-text-primary/10 rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-text-primary/30 resize-none max-h-32"
        />
        <button onClick={() => enviarTexto()} disabled={ocupado || !input.trim()}
          aria-label="Enviar"
          className="bg-primary text-on-primary p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0">
          <Send className="w-5 h-5" />
        </button>
      </div>
      <p className="text-[11px] text-text-primary/35 mt-1.5 text-center">
        Formatos: .xlsx, .xls, .csv, .ofx (máx. 5 MB). A IA confirma antes de operações que mexem em dinheiro.
      </p>
    </div>
  );
}
