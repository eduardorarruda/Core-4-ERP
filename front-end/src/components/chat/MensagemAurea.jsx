import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Download, FileText } from 'lucide-react';
import AureaAvatar from './AureaAvatar';
import MarkdownAurea from './MarkdownAurea';
import ErroAurea from './ErroAurea';
import ConfirmacaoAcao from './ConfirmacaoAcao';
import { relatorioDoTexto, textoSemRelatorio, pedeConfirmacao, RESPOSTA_CONFIRMAR, RESPOSTA_CANCELAR } from './aureaUtils';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { TRANSICAO_BASE } from '../motion/presets';

function Entrada({ children, className }) {
  const reduzir = useMovimentoReduzido();
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSICAO_BASE}
    >
      {children}
    </motion.div>
  );
}

/** Pontinhos de "pensando" antes do 1º trecho da resposta. */
export function PensandoAurea({ rotulo = 'A Áurea está pensando' }) {
  const reduzir = useMovimentoReduzido();
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-text-primary/70 py-1">
      <span className="inline-flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={reduzir ? { opacity: 0.7 } : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={reduzir ? undefined : { duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      {rotulo}…
    </span>
  );
}

function BotaoCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      setFalhou(true);
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={copiado ? 'Resposta copiada' : 'Copiar resposta'}
      className="inline-flex items-center gap-1.5 min-h-11 px-2.5 -ml-2.5 rounded-lg text-xs font-medium text-text-primary/65 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {copiado ? <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
      {copiado ? 'Copiado' : falhou ? 'Selecione e copie' : 'Copiar'}
      <span className="sr-only" aria-live="polite">{copiado ? 'Resposta copiada.' : ''}</span>
    </button>
  );
}

/** Mensagem do usuário (direita), com o arquivo anexado quando houver. */
export function MensagemUsuario({ texto, arquivo }) {
  return (
    <Entrada className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/12 border border-primary/20 px-4 py-2.5 text-text-primary">
        {arquivo && (
          <span className="flex items-center gap-2 text-sm font-medium mb-1.5 text-text-primary/80">
            <FileText className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{arquivo}</span>
          </span>
        )}
        {texto && <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words">{texto}</p>}
      </div>
    </Entrada>
  );
}

/**
 * Resposta da Áurea na tela cheia. Props:
 * - texto, erro (mensagem de erro), escrevendo (stream em andamento), pensandoRotulo
 * - ultima (é a última mensagem da conversa), ocupado (há resposta em andamento)
 * - onTentarNovamente, onResponder(texto) (botões do cartão de confirmação)
 */
export function MensagemAssistente({ texto, erro, escrevendo, pensandoRotulo, ultima, ocupado, onTentarNovamente, onResponder }) {
  const relatorio = relatorioDoTexto(texto);
  const limpo = textoSemRelatorio(texto || '');
  const aguardando = escrevendo && !limpo;
  const confirmar = ultima && !escrevendo && !erro && pedeConfirmacao(limpo);

  return (
    <Entrada className="flex gap-3 items-start">
      <AureaAvatar size="sm" ativo={escrevendo} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="sr-only">Áurea:</p>
        {aguardando && <PensandoAurea rotulo={pensandoRotulo} />}
        {erro && <ErroAurea mensagem={erro} onTentarNovamente={onTentarNovamente} desabilitado={ocupado} />}
        {!erro && limpo && <MarkdownAurea texto={limpo} cursor={escrevendo} />}
        {relatorio && !escrevendo && (
          <a
            href={relatorio}
            download
            className="mt-3 inline-flex items-center gap-2 px-4 min-h-11 rounded-xl bg-gradient-primary text-on-primary text-sm font-semibold shadow-[var(--shadow-primary)] hover:brightness-105 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Baixar relatório (.xlsx)
          </a>
        )}
        {confirmar && (
          <ConfirmacaoAcao
            desabilitado={ocupado}
            onConfirmar={() => onResponder?.(RESPOSTA_CONFIRMAR)}
            onCancelar={() => onResponder?.(RESPOSTA_CANCELAR)}
          />
        )}
        {!escrevendo && !erro && limpo && (
          <div className="mt-1 flex items-center gap-1">
            <BotaoCopiar texto={limpo} />
          </div>
        )}
      </div>
    </Entrada>
  );
}
