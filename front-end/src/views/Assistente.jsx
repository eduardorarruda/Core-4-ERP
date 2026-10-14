import React, { useEffect, useRef, useState } from 'react';
import { Check, PanelLeft, Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMovimentoReduzido } from '../hooks/useAcessibilidade';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import Drawer from '../components/ui/Drawer';
import AvisoIa from '../components/chat/AvisoIa';
import AureaAvatar from '../components/chat/AureaAvatar';
import BoasVindasAurea from '../components/chat/BoasVindasAurea';
import ComposerAurea from '../components/chat/ComposerAurea';
import ListaConversas from '../components/chat/ListaConversas';
import { MensagemAssistente, MensagemUsuario } from '../components/chat/MensagemAurea';
import { useConversaAurea } from '../components/chat/useConversaAurea';

function CabecalhoConversa({ conversa, ocupado, onAbrirLista, onRenomear, onExcluir }) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState('');

  const iniciar = () => { setTitulo(conversa?.titulo ?? ''); setEditando(true); };
  const salvar = () => { onRenomear(titulo); setEditando(false); };

  return (
    <header className="flex items-center gap-2 px-3 sm:px-5 min-h-16 py-2 border-b border-border shrink-0 c4-glass">
      <Button variant="ghost" size="icon" onClick={onAbrirLista} aria-label="Abrir lista de conversas" className="md:hidden shrink-0">
        <PanelLeft className="w-5 h-5" aria-hidden="true" />
      </Button>
      <AureaAvatar size="md" ativo={ocupado} />
      {editando ? (
        <form className="flex items-center gap-1 flex-1 min-w-0" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
          <label className="flex-1 min-w-0">
            <span className="sr-only">Título da conversa</span>
            <input
              autoFocus
              value={titulo}
              maxLength={120}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditando(false); }}
              className="w-full min-h-11 bg-surface border border-primary/40 rounded-xl px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <Button type="submit" variant="ghost" size="icon" aria-label="Salvar título"><Check className="w-4 h-4" aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setEditando(false)} aria-label="Cancelar"><X className="w-4 h-4" aria-hidden="true" /></Button>
        </form>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-text-primary font-display truncate">{conversa?.titulo || 'Áurea'}</h1>
            <p className="text-xs text-text-primary/60 truncate">{ocupado ? 'Escrevendo…' : 'Assistente financeira do Core 4'}</p>
          </div>
          {conversa && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" onClick={iniciar} aria-label="Renomear conversa"><Pencil className="w-4 h-4" aria-hidden="true" /></Button>
              <Button variant="ghost" size="icon" onClick={onExcluir} disabled={ocupado} aria-label="Excluir conversa" className="hover:text-error">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}
    </header>
  );
}

export default function Assistente() {
  const toast = useToast();
  const confirmar = useConfirm();
  const { usuario } = useAuth();
  const desktop = useMediaQuery('(min-width: 768px)');
  const [busca, setBusca] = useState('');
  const [listaAberta, setListaAberta] = useState(false);
  const fimRef = useRef(null);
  const reduzir = useMovimentoReduzido();

  const c = useConversaAurea({ onErro: (msg) => toast.error(msg) });
  const conversa = c.conversas.find((x) => x.id === c.ativa) ?? null;
  const vazio = c.mensagens.length === 0;
  const ultimoId = c.mensagens[c.mensagens.length - 1]?.id;
  const ultimoTexto = c.mensagens[c.mensagens.length - 1]?.text;

  // Acompanha a resposta enquanto ela chega
  useEffect(() => {
    if (!c.mensagens.length) return;
    fimRef.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'end' });
  }, [c.mensagens.length, ultimoTexto, reduzir]);

  const fecharLista = () => setListaAberta(false);
  const selecionar = (id) => { c.selecionar(id); fecharLista(); };
  const nova = async () => { await c.novaConversa(); fecharLista(); };

  async function excluirAtual() {
    if (!conversa) return;
    const ok = await confirmar({
      title: 'Excluir conversa?',
      message: `A conversa “${conversa.titulo || 'sem título'}” e as mensagens dela serão excluídas. Seus dados financeiros não mudam.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (ok && (await c.excluir(conversa.id))) toast.success('Conversa excluída.');
  }

  const enviar = (texto, arquivo) => (arquivo ? c.enviarComArquivo(texto, arquivo) : c.enviarTexto(texto));

  const lista = (
    <ListaConversas
      conversas={c.conversas}
      ativa={c.ativa}
      carregando={c.carregandoLista}
      busca={busca}
      onBusca={setBusca}
      onSelecionar={selecionar}
      onNova={nova}
    />
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {desktop ? (
        <aside aria-label="Conversas" className="w-72 shrink-0 h-full bg-surface-low/70 border-r border-border">{lista}</aside>
      ) : (
        <Drawer open={listaAberta} onClose={fecharLista} side="left" size="sm" title="Conversas">
          <div className="-mx-5 -my-4 h-full">{lista}</div>
        </Drawer>
      )}

      <section aria-label="Conversa com a Áurea" className="flex-1 flex flex-col min-w-0 h-full">
        <CabecalhoConversa
          key={conversa?.id ?? 'nova'}
          conversa={conversa}
          ocupado={c.ocupado}
          onAbrirLista={() => setListaAberta(true)}
          onRenomear={(t) => conversa && c.renomear(conversa.id, t)}
          onExcluir={excluirAtual}
        />

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Mensagens da conversa"
            className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6"
          >
            {c.carregandoMsgs ? (
              <div className="space-y-5" aria-hidden="true">
                <Skeleton className="h-12 w-2/3 ml-auto rounded-2xl" />
                <Skeleton className="h-24 w-5/6 rounded-2xl" />
                <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
              </div>
            ) : vazio ? (
              <BoasVindasAurea nome={usuario?.nome} onSugestao={c.enviarTexto} desabilitado={c.ocupado} />
            ) : c.mensagens.map((m) => (
              m.role === 'user' ? (
                <MensagemUsuario key={m.id} texto={m.text} arquivo={m.arquivo} />
              ) : (
                <MensagemAssistente
                  key={m.id}
                  texto={m.text}
                  erro={m.erro}
                  escrevendo={c.escrevendoId === m.id}
                  pensandoRotulo={c.processandoArquivo ? `Lendo ${c.processandoArquivo}` : undefined}
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

        <div className="shrink-0 px-3 sm:px-6 pt-2 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-4">
          <div className="max-w-3xl mx-auto">
            <AvisoIa className="mb-2" />
            <ComposerAurea
              key={c.ativa ?? 'nova'}
              onEnviar={enviar}
              onParar={c.parar}
              ocupado={c.ocupado}
              podeParar={c.ocupado && !c.processandoArquivo}
              onErroAnexo={(msg) => toast.error(msg)}
              autoFocus={desktop}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
