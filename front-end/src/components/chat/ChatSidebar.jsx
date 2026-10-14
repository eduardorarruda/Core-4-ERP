import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  useMessage,
  useMessageRuntime,
  useThread,
  useThreadRuntime,
} from '@assistant-ui/react';
import { ArrowUp, Check, Copy, Maximize2, ShieldCheck, Trash2, X } from 'lucide-react';
import { useChatRuntime } from '../../hooks/useChatRuntime';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { chat } from '../../lib/api';
import { DownloadToolUI } from './RelatorioToolUI';
import AvisoIa from './AvisoIa';
import AureaAvatar from './AureaAvatar';
import BoasVindasAurea from './BoasVindasAurea';
import ConfirmacaoAcao from './ConfirmacaoAcao';
import ErroAurea from './ErroAurea';
import MarkdownAurea from './MarkdownAurea';
import { PensandoAurea } from './MensagemAurea';
import {
  RESPOSTA_CANCELAR, RESPOSTA_CONFIRMAR, TEXTO_CONFIANCA,
  ehRespostaDeErro, mensagemDaRespostaDeErro, pedeConfirmacao,
} from './aureaUtils';

const BOTAO_ICONE =
  'min-w-11 min-h-11 grid place-items-center rounded-xl text-text-primary/65 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Texto de uma resposta: o mesmo markdown da tela cheia; frase de erro do backend vira estado de erro. */
function TextoAurea({ text }) {
  const rodando = useMessage((m) => m.status?.type === 'running');
  const runtime = useMessageRuntime();
  if (ehRespostaDeErro(text)) {
    return <ErroAurea mensagem={mensagemDaRespostaDeErro(text)} onTentarNovamente={() => runtime.reload()} desabilitado={rodando} />;
  }
  return <MarkdownAurea texto={text} cursor={rodando} />;
}

/** Cartão Confirmar/Cancelar na última resposta que pede o OK do usuário. */
function ConfirmacaoDaMensagem() {
  const ultima = useMessage((m) => m.isLast);
  const texto = useMessage((m) => m.content?.filter((p) => p.type === 'text').map((p) => p.text).join('') ?? '');
  const rodando = useThread((t) => t.isRunning);
  const thread = useThreadRuntime();
  if (!ultima || rodando || ehRespostaDeErro(texto) || !pedeConfirmacao(texto)) return null;
  return (
    <ConfirmacaoAcao
      compacto
      onConfirmar={() => thread.append(RESPOSTA_CONFIRMAR)}
      onCancelar={() => thread.append(RESPOSTA_CANCELAR)}
    />
  );
}

function MensagemUsuario() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/12 border border-primary/20 px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
        <p className="sr-only">Você:</p>
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function MensagemAssistente() {
  return (
    <MessagePrimitive.Root className="flex gap-2.5 items-start">
      <AureaAvatar size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="sr-only">Áurea:</p>
        <MessagePrimitive.If hasContent={false}>
          <PensandoAurea />
        </MessagePrimitive.If>
        <MessagePrimitive.If hasContent>
          <MessagePrimitive.Content components={{ Text: TextoAurea }} />
          <ConfirmacaoDaMensagem />
          <ActionBarPrimitive.Root hideWhenRunning className="mt-0.5 flex">
            <ActionBarPrimitive.Copy
              aria-label="Copiar resposta"
              className="group inline-flex items-center gap-1.5 min-h-11 px-2.5 -ml-2.5 rounded-lg text-xs font-medium text-text-primary/65 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessagePrimitive.If copied>
                <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Copiado
              </MessagePrimitive.If>
              <MessagePrimitive.If copied={false}>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copiar
              </MessagePrimitive.If>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </MessagePrimitive.If>
      </div>
    </MessagePrimitive.Root>
  );
}

function ConteudoPainel({ onClose, onLimpar }) {
  const { usuario } = useAuth();
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border shrink-0">
        <AureaAvatar size="md" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary font-display">Áurea</h2>
          <p className="text-xs text-text-primary/60 truncate">Assistente financeira do Core 4</p>
        </div>
        <Link to="/assistente" onClick={onClose} aria-label="Abrir a Áurea em tela cheia, com o histórico de conversas" className={BOTAO_ICONE}>
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
        </Link>
        <button type="button" onClick={onLimpar} aria-label="Limpar conversa" className={BOTAO_ICONE}>
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar a Áurea" className={BOTAO_ICONE}>
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      <ThreadPrimitive.Root className="flex-1 min-h-0 flex flex-col">
        <ThreadPrimitive.Viewport
          role="log"
          aria-live="polite"
          aria-label="Mensagens da conversa com a Áurea"
          className="flex-1 overflow-y-auto overscroll-contain no-scrollbar flex flex-col gap-4 px-4 py-4"
        >
          <AvisoIa />
          <ThreadPrimitive.Empty>
            <BoasVindasAurea
              compacto
              nome={usuario?.nome}
              renderSugestao={(s, classe, conteudo) => (
                <ThreadPrimitive.Suggestion prompt={s.texto} method="replace" autoSend className={classe}>
                  {conteudo}
                </ThreadPrimitive.Suggestion>
              )}
            />
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage: MensagemUsuario, AssistantMessage: MensagemAssistente }} />
        </ThreadPrimitive.Viewport>

        <div className="border-t border-border px-3 pt-3 shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <ComposerPrimitive.Root className="flex gap-1.5 items-end rounded-[1.25rem] border border-border-strong bg-surface px-1.5 py-1.5 focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)] transition-[box-shadow,border-color]">
            <ComposerPrimitive.Input
              placeholder="Escreva para a Áurea…"
              aria-label="Mensagem para a Áurea"
              className="flex-1 bg-transparent px-2.5 py-2.5 text-[0.9375rem] text-text-primary outline-none placeholder:text-text-primary/50 resize-none min-h-11 max-h-32"
            />
            <ComposerPrimitive.Send
              aria-label="Enviar mensagem"
              className="bg-gradient-primary text-on-primary w-11 h-11 grid place-items-center rounded-xl shadow-[var(--shadow-primary)] disabled:opacity-35 disabled:shadow-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
            >
              <ArrowUp className="w-5 h-5" aria-hidden="true" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-text-primary/60">
            <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0 text-primary" aria-hidden="true" />
            {TEXTO_CONFIANCA}
          </p>
        </div>
      </ThreadPrimitive.Root>
    </div>
  );
}

function PainelAureaRuntime({ initialMessages, onClose, onLimpar }) {
  const runtime = useChatRuntime(initialMessages);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DownloadToolUI />
      <ConteudoPainel onClose={onClose} onLimpar={onLimpar} />
    </AssistantRuntimeProvider>
  );
}

/**
 * Conteúdo do painel flutuante da Áurea (carregado sob demanda pelo ChatLauncher).
 * Carrega a conversa do canal BALAO (separada da tela /assistente) e só então cria o runtime
 * com initialMessages, para o painel mostrar exatamente o que a IA "lembra" aqui.
 */
export default function ChatSidebar({ onClose }) {
  const [inicial, setInicial] = useState(null); // null = carregando
  const [resetKey, setResetKey] = useState(0);
  const confirmar = useConfirm();
  const toast = useToast();

  useEffect(() => {
    let vigente = true;
    chat.historico('BALAO')
      .then((h) => {
        if (!vigente) return;
        setInicial(Array.isArray(h) ? h.map((m) => ({ role: m.role, content: [{ type: 'text', text: m.texto }] })) : []);
      })
      .catch(() => { if (vigente) setInicial([]); });
    return () => { vigente = false; };
  }, []);

  async function limpar() {
    const ok = await confirmar({
      title: 'Limpar conversa?',
      message: 'As mensagens deste painel serão apagadas. Seus dados financeiros não mudam.',
      confirmLabel: 'Limpar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await chat.limparHistorico('BALAO');
      setInicial([]);
      setResetKey((k) => k + 1);
      toast.success('Conversa apagada.');
    } catch {
      toast.error('Não foi possível limpar a conversa. Tente novamente.');
    }
  }

  if (inicial === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-text-primary/70" role="status">
        <AureaAvatar size="lg" ativo />
        Abrindo a conversa…
      </div>
    );
  }
  return <PainelAureaRuntime key={resetKey} initialMessages={inicial} onClose={onClose} onLimpar={limpar} />;
}
