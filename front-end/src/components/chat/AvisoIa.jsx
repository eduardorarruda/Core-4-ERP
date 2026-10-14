import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const CHAVE_AVISO = 'aviso-ia-openai-visto';

function jaViu() {
  try { return localStorage.getItem(CHAVE_AVISO) === '1'; } catch { return false; }
}

/**
 * Aviso de primeiro uso do assistente: as mensagens saem do Brasil para a OpenAI (EUA).
 * Transparência exigida pela LGPD (arts. 9º e 33). Some depois que o usuário fecha.
 */
export default function AvisoIa({ className }) {
  const [visivel, setVisivel] = useState(() => !jaViu());
  if (!visivel) return null;

  const fechar = () => {
    try { localStorage.setItem(CHAVE_AVISO, '1'); } catch { /* sem storage: o aviso volta na próxima vez, sem prejuízo */ }
    setVisivel(false);
  };

  return (
    <div
      role="note"
      className={cn('flex items-start gap-2 rounded-xl border border-secondary/30 bg-secondary/10 pl-3 pr-1 py-1 text-xs leading-relaxed text-text-primary/80', className)}
    >
      <Info className="w-4 h-4 mt-2 shrink-0 text-secondary" aria-hidden="true" />
      <p className="flex-1 py-1.5">
        As mensagens e arquivos enviados à Áurea são processados pela OpenAI, nos Estados Unidos.
        Evite enviar dados de outras pessoas sem necessidade.{' '}
        <Link to="/privacidade" target="_blank" rel="noopener" className="underline text-text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          Política de Privacidade
        </Link>
      </p>
      <button
        type="button"
        onClick={fechar}
        aria-label="Entendi, fechar aviso"
        className="min-w-11 min-h-11 grid place-items-center rounded-lg text-text-primary/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
