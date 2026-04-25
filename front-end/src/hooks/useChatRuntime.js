import { useLocalRuntime } from "@assistant-ui/react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const core4ChatAdapter = {
  async *run({ messages, abortSignal }) {
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (!lastUserMessage) return;

    const textContent = lastUserMessage.content
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    try {
      const response = await fetch(`${BASE_URL}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mensagem: textContent }),
        signal: abortSignal,
      });

      if (response.status === 401) {
        localStorage.removeItem("usuario");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        yield {
          content: [
            {
              type: "text",
              text: error.mensagem || "Erro ao processar mensagem. Tente novamente.",
            },
          ],
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const token = line.slice(5);
            accumulatedText += token;
            yield { content: [{ type: "text", text: accumulatedText }] };
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      yield {
        content: [
          {
            type: "text",
            text: "Não foi possível conectar ao servidor. Verifique sua conexão.",
          },
        ],
      };
    }
  },
};

export function useChatRuntime() {
  return useLocalRuntime(core4ChatAdapter);
}
