import { makeAssistantToolUI } from "@assistant-ui/react";
import { Download } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const DownloadToolUI = makeAssistantToolUI({
  toolName: "downloadRelatorio",
  render: ({ args }) => {
    const fullUrl = `${BASE_URL}${args.url}`;

    return (
      <a
        href={fullUrl}
        download
        className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Baixar Relatório (.xlsx)
      </a>
    );
  },
});
