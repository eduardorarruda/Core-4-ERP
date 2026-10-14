import { makeAssistantToolUI } from "@assistant-ui/react";
import { Download } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
// Só aceita o caminho de relatório gerado pelo backend — o argumento vem do modelo de IA
// e não pode virar um link arbitrário (javascript:, outro domínio etc.).
const RELATORIO_PATH = /^\/api\/chat\/relatorios\/(?!.*\.\.)[\w.\-/%]+\.xlsx$/;

export const DownloadToolUI = makeAssistantToolUI({
  toolName: "downloadRelatorio",
  render: ({ args }) => {
    const caminho = typeof args?.url === "string" ? args.url.trim() : "";
    if (!RELATORIO_PATH.test(caminho)) return null;

    return (
      <a
        href={`${BASE_URL}${caminho}`}
        download
        className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 min-h-11 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Baixar relatório (.xlsx)
      </a>
    );
  },
});
