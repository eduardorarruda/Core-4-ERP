import React, { useState } from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { MessageCircle, X, Trash2 } from "lucide-react";
import { useChatRuntime } from "../../hooks/useChatRuntime";
import { DownloadToolUI } from "./RelatorioToolUI";
import { cn } from "../../lib/utils";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function ChatContent({ onClose }) {
  async function limparHistorico() {
    try {
      await fetch(`${BASE_URL}/api/chat/historico`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white">C4 Assistant</h3>
          <p className="text-[10px] text-zinc-500">Assistente financeiro</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={limparHistorico}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            title="Limpar conversa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Viewport className="flex flex-col gap-4 p-4">
            <ThreadPrimitive.Messages
              components={{
                UserMessage: () => (
                  <MessagePrimitive.Root className="flex justify-end mb-2">
                    <div className="bg-primary/20 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm">
                      <MessagePrimitive.Content />
                    </div>
                  </MessagePrimitive.Root>
                ),
                AssistantMessage: () => (
                  <MessagePrimitive.Root className="flex justify-start mb-2">
                    <div className="bg-surface-medium text-zinc-200 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
                      <MessagePrimitive.Content
                        components={{ Text: MarkdownTextPrimitive }}
                      />
                    </div>
                  </MessagePrimitive.Root>
                ),
              }}
            />
          </ThreadPrimitive.Viewport>

          <div className="border-t border-white/5 p-3">
            <ComposerPrimitive.Root className="flex gap-2">
              <ComposerPrimitive.Input
                placeholder="Pergunte sobre suas finanças..."
                className="flex-1 bg-surface border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-zinc-600"
              />
              <ComposerPrimitive.Send className="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-30">
                Enviar
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
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 transition-transform"
          title="Abrir assistente"
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
              "bg-surface-low border-l border-white/5 shadow-2xl",
              "transform transition-transform duration-300",
              isOpen ? "translate-x-0" : "translate-x-full"
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
