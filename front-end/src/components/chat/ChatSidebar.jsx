import React, { useEffect, useRef, useState } from "react";
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
import { cn } from "../../lib/utils";
import { chat } from "../../lib/api";

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
  a: ({ href = "", children, ...props }) => {
    const match = href.match(RELATORIO_PATH);
    if (match) {
      // Sempre usa o caminho relativo à origem atual — nunca o domínio do href original.
      const relative = match[0];
      return (
        <a
          href={relative}
          download
          className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md no-underline"
        >
          <Download className="w-4 h-4" />
          Baixar Relatório (.xlsx)
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline" {...props}>
        {children}
      </a>
    );
  },
};

function MarkdownText(props) {
  return <MarkdownTextPrimitive {...props} components={markdownComponents} />;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-primary/30 animate-typing"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ChatContent({ onClose }) {
  const viewportRef = useRef(null);

  async function limparHistorico() {
    try {
      await chat.limparHistorico();
    } catch {}
  }

  const scrollToBottom = () => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

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
            <h3 className="text-sm font-bold text-text-primary font-display">C4 Assistant</h3>
            <p className="text-[10px] text-text-primary/40">Assistente financeiro</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={limparHistorico}
            aria-label="Limpar conversa"
            className="p-1.5 rounded-lg text-text-primary/40 hover:text-text-primary hover:bg-surface-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Fechar assistente"
            className="p-1.5 rounded-lg text-text-primary/40 hover:text-text-primary hover:bg-surface-medium transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={viewportRef} className="flex-1 overflow-y-auto no-scrollbar">
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Viewport className="flex flex-col gap-3 p-4">
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
                      <MessagePrimitive.Content components={{ Text: MarkdownText }} />
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
                  className="text-[11px] px-3 py-1.5 rounded-full border border-text-primary/10 text-text-primary/50 hover:border-primary/30 hover:text-primary transition-colors"
                >
                  {s}
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-text-primary/5 p-3">
            <ComposerPrimitive.Root className="flex gap-2 items-end">
              <ComposerPrimitive.Input
                placeholder="Pergunte sobre suas finanças..."
                className="flex-1 bg-surface border border-text-primary/10 rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-text-primary/30 font-body resize-none min-h-[42px] max-h-28"
              />
              <ComposerPrimitive.Send
                aria-label="Enviar mensagem"
                className="bg-primary text-on-primary p-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
              >
                <Send className="w-4 h-4" />
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </ThreadPrimitive.Root>
      </div>
    </div>
  );
}

export default function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const runtime = useChatRuntime();

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir assistente financeiro"
          title="Assistente C4"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-primary-glow"
          style={{ boxShadow: 'var(--shadow-primary)' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "fixed right-0 top-0 bottom-0 z-[70] w-full sm:w-[420px]",
              "bg-surface-low border-l border-text-primary/5 shadow-2xl",
              "animate-slide-in-right"
            )}
          >
            <AssistantRuntimeProvider runtime={runtime}>
              <DownloadToolUI />
              <ChatContent onClose={() => setIsOpen(false)} />
            </AssistantRuntimeProvider>
          </div>
        </>
      )}
    </>
  );
}
