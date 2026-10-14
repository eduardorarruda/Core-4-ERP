import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, Trash2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import AvisoIa from './AvisoIa';
import AureaAvatar from './AureaAvatar';
import BoasVindasAurea from './BoasVindasAurea';
import ComposerAurea from './ComposerAurea';
import { MensagemAssistente, MensagemUsuario } from './MensagemAurea';
import { useConversaBalao } from './useConversaBalao';

const BOTAO_ICONE =
  'min-w-11 min-h-11 grid place-items-center rounded-xl text-text-primary/65 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40';

/**
 * Conteúdo do painel flutuante da Áurea (carregado sob demanda pelo ChatLauncher).
 * Conversa do canal BALAO (separada da tela /assistente), com o mesmo pipeline de streaming,
 * as mesmas mensagens e os mesmos erros amigáveis da tela cheia. Anexos ficam na tela cheia.
 */
export default function ChatSidebar({ onClose }) {
  const { usuario } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const reduzir = useMovimentoReduzido();
  const fimRef = useRef(null);
  const c = useConversaBalao();

  const mensagens = c.mensagens ?? [];
  const ultimoId = mensagens[mensagens.length - 1]?.id;
  const ultimoTexto = mensagens[mensagens.length - 1]?.text;

  // Acompanha a resposta enquanto ela chega
  useEffect(() => {
    if (!mensagens.length) return;
    fimRef.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'end' });
  }, [mensagens.length, ultimoTexto, reduzir]);

  async function limpar() {
    const ok = await confirmar({
      title: 'Limpar conversa?',
      message: 'As mensagens deste painel serão apagadas. Seus dados financeiros não mudam.',
      confirmLabel: 'Limpar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await c.limpar();
      toast.success('Conversa apagada.');
    } catch {
      toast.error('Não foi possível limpar a conversa. Tente novamente.');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border shrink-0">
        <AureaAvatar size="md" ativo={c.ocupado} />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary font-display">Áurea</h2>
          <p className="text-xs text-text-primary/65 truncate">{c.ocupado ? 'Escrevendo…' : 'Assistente financeira do Core 4'}</p>
        </div>
        <Link to="/assistente" onClick={onClose} aria-label="Abrir a Áurea em tela cheia, com o histórico de conversas" className={BOTAO_ICONE}>
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
        </Link>
        <button type="button" onClick={limpar} disabled={c.carregando || mensagens.length === 0} aria-label="Limpar conversa" className={BOTAO_ICONE}>
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar a Áurea" className={BOTAO_ICONE}>
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensagens da conversa com a Áurea" className="flex flex-col gap-4 px-4 py-4">
          <AvisoIa />
          {c.carregando ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-text-primary/70" role="status">
              <AureaAvatar size="lg" ativo />
              Abrindo a conversa…
            </div>
          ) : mensagens.length === 0 ? (
            <BoasVindasAurea compacto nome={usuario?.nome} onSugestao={c.enviarTexto} desabilitado={c.ocupado} />
          ) : mensagens.map((m) => (
            m.role === 'user' ? (
              <MensagemUsuario key={m.id} texto={m.text} />
            ) : (
              <MensagemAssistente
                key={m.id}
                texto={m.text}
                erro={m.erro}
                escrevendo={c.escrevendoId === m.id}
                ultima={m.id === ultimoId}
                ocupado={c.ocupado}
                onTentarNovamente={m.pergunta ? () => c.tentarNovamente(m.id, m.pergunta) : undefined}
                onResponder={c.enviarTexto}
              />
            )
          ))}
          <div ref={fimRef} />
        </div>
      </div>

      <div className="border-t border-border px-3 pt-3 shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <ComposerAurea
          onEnviar={(texto) => c.enviarTexto(texto)}
          onParar={c.parar}
          ocupado={c.ocupado || c.carregando}
          podeParar={c.ocupado}
          permitirAnexo={false}
          compacto
        />
      </div>
    </div>
  );
}
