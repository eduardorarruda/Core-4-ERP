import React, { useEffect, useState } from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { MessageCircle, X, Trash2, Send, Download } from "lucide-react";
import { useChatRuntime } from "../../hooks/useChatRuntime";
import { DownloadToolUI } from "./RelatorioToolUI";
import { chat } from "../../lib/api";
import { safeUrl, isExternalUrl } from "../../lib/safeUrl";
import AvisoIa from "./AvisoIa";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";

const SUGGESTIONS = [
  "Ver saldo atual",
  "Contas atrasadas",
  "Resumo do mês",
  "Relatório rápido",
];

// Renderiza links de relatório como botão azul em evidência; demais links abrem em nova aba.
// Extrai o caminho relativo do relatório de qualquer href (ignora domínio inventado pelo modelo).
const RELATORIO_PATH = /\/api\/chat\/relatorios\/[^\s)"']+\.xlsx/;

const markdownComponents = {
  a: ({ href = "", children }) => {
    const match = href.match(RELATORIO_PATH);
    if (match) {
      // Sempre usa o caminho relativo à origem atual — nunca o domínio do href original.
      const relative = match[0];
      return (
        <a
          href={relative}
          download
          className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 min-h-11 bg-primary text-on-primary rounded-xl hover:opacity-90 transition-opacity text-sm font-semibold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Baixar relatório (.xlsx)
        </a>
      );
    }
    // Link vindo da IA: só http(s), mailto e caminhos relativos. Qualquer outro esquema
    // (javascript:, data: …) vira texto simples.
    const seguro = safeUrl(href);
    if (!seguro) return <span>{children}</span>;
    const externo = isExternalUrl(seguro);
    return (
      <a
        href={seguro}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="text-secondary underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        {children}
        {externo && <span className="sr-only"> (abre em nova aba)</span>}
      </a>
    );
  },
};

function MarkdownText(props) {
  return <MarkdownTextPrimitive {...props} components={markdownComponents} />;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" role="status" aria-label="A Áurea está escrevendo">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-primary/50 animate-typing"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ChatContent({ onClose, onLimpar }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-text-primary/5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface-low animate-pulse-dot" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary font-display">Áurea</h3>
            <p className="text-xs text-text-primary/60">Assistente financeira</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onLimpar}
            aria-label="Limpar conversa"
            className="min-w-11 min-h-11 grid place-items-center rounded-lg text-text-primary/60 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar assistente"
            className="min-w-11 min-h-11 grid place-items-center rounded-lg text-text-primary/60 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <ThreadPrimitive.Root>
          <div className="px-4 pt-3">
            <AvisoIa />
          </div>
          <ThreadPrimitive.Viewport
            role="log"
            aria-live="polite"
            aria-label="Mensagens da conversa com a Áurea"
            className="flex flex-col gap-3 p-4"
          >
            <ThreadPrimitive.Messages
              components={{
                UserMessage: () => (
                  <MessagePrimitive.Root className="flex justify-end">
                    <div className="bg-primary/20 text-text-primary rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm">
                      <MessagePrimitive.Content />
                    </div>
                  </MessagePrimitive.Root>
                ),
                AssistantMessage: () => (
                  <MessagePrimitive.Root className="flex justify-start">
                    <div className="bg-surface-medium text-text-primary/80 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
                      {/* Sem conteúdo ainda = aguardando o 1º token → indicador de digitação. */}
                      <MessagePrimitive.If hasContent={false}>
                        <TypingDots />
                      </MessagePrimitive.If>
                      <MessagePrimitive.If hasContent>
                        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
                      </MessagePrimitive.If>
                    </div>
                  </MessagePrimitive.Root>
                ),
              }}
            />
          </ThreadPrimitive.Viewport>

          {/* Suggestions */}
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <ThreadPrimitive.Suggestion
                  key={s}
                  prompt={s}
                  method="replace"
                  autoSend
                  className="text-xs min-h-11 px-3 py-1.5 rounded-full border border-text-primary/15 text-text-primary/70 hover:border-primary/30 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {s}
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-text-primary/5 px-3 pt-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            <ComposerPrimitive.Root className="flex gap-2 items-end">
              <ComposerPrimitive.Input
                placeholder="Pergunte sobre suas finanças..."
                aria-label="Mensagem para a Áurea"
                className="flex-1 bg-surface border border-text-primary/10 rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/60 placeholder:text-text-primary/50 font-body resize-none min-h-11 max-h-28"
              />
              <ComposerPrimitive.Send
                aria-label="Enviar mensagem"
                className="bg-primary text-on-primary min-w-11 min-h-11 grid place-items-center rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </ThreadPrimitive.Root>
      </div>
    </div>
  );
}

// Painel do balão. Monta só quando aberto: carrega a conversa do canal BALAO (separada da conversa
// da tela /assistente — contextos isolados no backend) e só então cria o runtime com
// initialMessages, para o balão exibir exatamente o que a IA "lembra" nesta superfície.
function PainelAurea({ onClose }) {
  const [inicial, setInicial] = useState(null); // null = carregando
  const [resetKey, setResetKey] = useState(0);  // muda → remonta o runtime (limpa a UI)
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    chat.historico('BALAO')
      .then((h) => setInicial(Array.isArray(h)
        ? h.map((m) => ({ role: m.role, content: [{ type: "text", text: m.texto }] }))
        : []))
      .catch(() => setInicial([]));
  }, []);

  async function limpar() {
    const ok = await confirm({
      title: 'Limpar conversa',
      message: 'Isto vai apagar as mensagens desta conversa com a Áurea. Deseja continuar?',
      confirmLabel: 'Limpar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await chat.limparHistorico('BALAO');
      // Reseta o runtime local remontando com histórico vazio.
      setInicial([]);
      setResetKey((k) => k + 1);
      toast.success('Conversa apagada.');
    } catch {
      toast.error('Não foi possível limpar a conversa. Tente novamente.');
    }
  }

  if (inicial === null) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-text-primary/70">
        Carregando conversa…
      </div>
    );
  }
  return (
    <PainelAureaRuntime
      key={resetKey}
      initialMessages={inicial}
      onClose={onClose}
      onLimpar={limpar}
    />
  );
}

function PainelAureaRuntime({ initialMessages, onClose, onLimpar }) {
  const runtime = useChatRuntime(initialMessages);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DownloadToolUI />
      <ChatContent onClose={onClose} onLimpar={onLimpar} />
    </AssistantRuntimeProvider>
  );
}

/** Conteúdo do painel da Áurea (carregado sob demanda pelo ChatLauncher). */
export default function ChatSidebar({ onClose }) {
  return <PainelAurea onClose={onClose} />;
}
