import React from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function DownloadButton({ loading, onClick, children = 'Baixar Excel' }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm flex items-center justify-center gap-2 transition-opacity"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          {children}
        </>
      )}
    </button>
  );
}
