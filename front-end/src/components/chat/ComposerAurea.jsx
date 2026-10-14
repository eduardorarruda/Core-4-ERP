import React, { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, FileSpreadsheet, FileText, Paperclip, ShieldCheck, Square, X } from 'lucide-react';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { pressionar, TRANSICAO_BASE } from '../motion/presets';
import { cn } from '../../lib/utils';
import { MAX_ANEXO_MB, TEXTO_CONFIANCA, TIPOS_ANEXO, tamanhoLegivel, validarAnexo } from './aureaUtils';

const ALTURA_MAX = 160;

function IconeArquivo({ nome, className }) {
  const planilha = /\.(xlsx|xls|csv)$/i.test(nome);
  const Icone = planilha ? FileSpreadsheet : FileText;
  return <Icone className={className} aria-hidden="true" />;
}

/**
 * Campo de mensagem da Áurea: texto que cresce, anexo (clique ou arrastar), enviar/parar.
 * Props: onEnviar(texto, arquivo|null), onParar, ocupado, podeParar, onErroAnexo(msg), autoFocus.
 */
export default function ComposerAurea({ onEnviar, onParar, ocupado, podeParar, onErroAnexo, autoFocus = false }) {
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const reduzir = useMovimentoReduzido();

  // Cresce com o conteúdo até ALTURA_MAX (depois rola)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAX)}px`;
  }, [texto]);

  function escolher(f) {
    if (!f) return;
    const erro = validarAnexo(f);
    if (erro) { onErroAnexo?.(erro); return; }
    setArquivo(f);
    textareaRef.current?.focus();
  }

  function enviar() {
    const t = texto.trim();
    if (ocupado || (!t && !arquivo)) return;
    // Com anexo, a instrução é opcional — o backend precisa de algum texto para orientar a leitura
    onEnviar(t || (arquivo ? 'Analise este arquivo.' : ''), arquivo);
    setTexto('');
    setArquivo(null);
  }

  const podeEnviar = !ocupado && (texto.trim() || arquivo);

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setArrastando(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false); }}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files?.[0]); }}
    >
      <AnimatePresence initial={false}>
        {arquivo && (
          <motion.div
            key="anexo"
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 6 }}
            transition={TRANSICAO_BASE}
            className="mb-2 flex items-center gap-3 pl-3 pr-1 py-1 rounded-2xl bg-surface-medium border border-border w-fit max-w-full"
          >
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary/12 text-primary shrink-0">
              <IconeArquivo nome={arquivo.name} className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-primary truncate">{arquivo.name}</span>
              <span className="block text-xs text-text-primary/65">{tamanhoLegivel(arquivo.size)} · escreva o que fazer e envie</span>
            </span>
            <button
              type="button"
              onClick={() => setArquivo(null)}
              disabled={ocupado}
              aria-label={`Remover o anexo ${arquivo.name}`}
              className="min-w-11 min-h-11 grid place-items-center rounded-xl text-text-primary/65 hover:text-text-primary hover:bg-surface-high disabled:opacity-40 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'relative flex items-end gap-1.5 rounded-[1.25rem] border bg-surface-low px-1.5 py-1.5 transition-[box-shadow,border-color]',
          'focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent),0_0_28px_-10px_var(--color-primary)]',
          arrastando ? 'border-primary border-dashed bg-primary/5' : 'border-border-strong',
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept={TIPOS_ANEXO}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; escolher(f); }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={ocupado}
          aria-label="Anexar arquivo: planilha, extrato OFX, PDF ou .md"
          className="w-11 h-11 grid place-items-center rounded-xl text-text-primary/65 hover:text-primary hover:bg-surface-medium transition-colors disabled:opacity-40 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Paperclip className="w-5 h-5" aria-hidden="true" />
        </button>
        <label className="flex-1 min-w-0">
          <span className="sr-only">Mensagem para a Áurea</span>
          <textarea
            ref={textareaRef}
            value={texto}
            autoFocus={autoFocus}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(); } }}
            placeholder={arrastando ? 'Solte o arquivo aqui' : arquivo ? 'O que a Áurea deve fazer com o arquivo?' : 'Escreva para a Áurea…'}
            rows={1}
            aria-describedby="aurea-dica-teclado"
            className="block w-full bg-transparent px-1 py-2.5 text-[0.9375rem] leading-relaxed text-text-primary outline-none placeholder:text-text-primary/50 resize-none"
            style={{ maxHeight: ALTURA_MAX }}
          />
        </label>
        {podeParar ? (
          <motion.button
            type="button"
            whileTap={pressionar}
            onClick={onParar}
            aria-label="Parar a resposta"
            className="w-11 h-11 rounded-xl bg-surface-high text-text-primary grid place-items-center hover:bg-surface-highest transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Square className="w-4 h-4 fill-current" aria-hidden="true" />
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={podeEnviar ? pressionar : undefined}
            onClick={enviar}
            disabled={!podeEnviar}
            aria-label="Enviar mensagem"
            className="w-11 h-11 rounded-xl bg-gradient-primary text-on-primary grid place-items-center shadow-[var(--shadow-primary)] transition-opacity disabled:opacity-35 disabled:shadow-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
          >
            <ArrowUp className="w-5 h-5" aria-hidden="true" />
          </motion.button>
        )}
      </div>

      <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-text-primary/60">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0 text-primary" aria-hidden="true" />
          {TEXTO_CONFIANCA}
        </p>
        <p id="aurea-dica-teclado" className="hidden sm:block shrink-0">
          <kbd className="c4-kbd">Enter</kbd> envia · <kbd className="c4-kbd">Shift</kbd>+<kbd className="c4-kbd">Enter</kbd> quebra a linha · até {MAX_ANEXO_MB} MB
        </p>
      </div>
    </div>
  );
}
