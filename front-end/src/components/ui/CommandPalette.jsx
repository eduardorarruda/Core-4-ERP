import React, { useEffect, useId, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, CreditCard, Plus, X, Clock, LifeBuoy, CornerDownLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { busca } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { itensVisiveis, NAV_ACOES, NAV_CONTA } from '../../lib/navigation';
import Modal from './Modal';

/**
 * Busca global (Ctrl/⌘+K): telas (de lib/navigation.js), ações rápidas, ajuda e registros
 * reais do backend (contas, parceiros, lançamentos do cartão) com debounce.
 * Combobox acessível: setas navegam, Enter abre, Esc fecha.
 */

// Ícone por tipo de registro retornado pela busca global do backend.
const TIPO_ICON = { PARCEIRO: Users, CONTA: FileText, LANCAMENTO_CARTAO: CreditCard };

// Atalhos "Como faço para…" — levam direto ao tópico da Central de Ajuda.
const HELP_TOPICS = [
  { id: 'help-conciliacao', icon: LifeBuoy, label: 'Como faço para conciliar o extrato?', path: '/ajuda#conciliacao', desc: 'Central de Ajuda' },
  { id: 'help-aurea', icon: LifeBuoy, label: 'Como uso a Áurea?', path: '/ajuda#aurea', desc: 'Central de Ajuda' },
  { id: 'help-baixar', icon: LifeBuoy, label: 'Como faço para baixar uma conta?', path: '/ajuda#lancamentos', desc: 'Central de Ajuda' },
  { id: 'help-instalar', icon: LifeBuoy, label: 'Como instalo o app no celular?', path: '/ajuda#pwa', desc: 'Central de Ajuda' },
];

const RECENT_KEY = 'c4_cmd_recent';
const MIN_TERMO = 2;
const DEBOUNCE_MS = 250;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(id) {
  try {
    const prev = getRecent().filter((r) => r !== id).slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev]));
  } catch { /* storage bloqueado: só não lembra */ }
}

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const { temPermissao, tipoConta } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  // Resposta guardada junto com o termo que a gerou: "buscando" é derivado, sem setState em efeito
  const [resposta, setResposta] = useState({ termo: '', itens: [] });
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listaId = useId();
  const recent = getRecent();

  const termo = query.trim();
  const buscaAtiva = termo.length >= MIN_TERMO;
  const buscando = buscaAtiva && resposta.termo !== termo;
  const resultados = buscaAtiva && resposta.termo === termo ? resposta.itens : [];

  const pages = [...itensVisiveis({ temPermissao, tipoConta }), ...NAV_CONTA.map((i) => ({ ...i, to: i.path }))]
    .map((i) => ({ id: i.id, icon: i.icon, label: i.label, desc: i.desc, path: i.to ?? i.path }));
  const actions = NAV_ACOES
    .filter((a) => a.ativa && (!a.permissao || temPermissao(a.permissao)))
    .map((a) => ({ ...a, icon: Plus }));

  // Busca de dados reais no backend, com debounce
  useEffect(() => {
    if (!buscaAtiva) return undefined;
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const itens = await busca.global(termo);
        if (!cancelado) setResposta({ termo, itens: Array.isArray(itens) ? itens : [] });
      } catch {
        if (!cancelado) setResposta({ termo, itens: [] });
      }
    }, DEBOUNCE_MS);
    return () => { cancelado = true; clearTimeout(t); };
  }, [termo, buscaAtiva]);

  const dataItems = resultados.map((r) => ({
    id: `rec-${r.tipo}-${r.id}`,
    icon: TIPO_ICON[r.tipo] ?? FileText,
    label: r.titulo,
    desc: r.subtitulo,
    path: r.rota,
    transient: true,
  }));

  const q = normalizar(termo);
  const casa = (texto) => normalizar(texto ?? '').includes(q);
  const sections = q
    ? [
        { label: 'Telas e ações', items: [...pages.filter((p) => casa(p.label) || casa(p.desc)), ...actions.filter((a) => casa(a.label))] },
        { label: 'Registros', items: dataItems },
        { label: 'Ajuda', items: HELP_TOPICS.filter((h) => casa(h.label)) },
      ].filter((s) => s.items.length)
    : [
        { label: 'Recentes', items: recent.map((id) => pages.find((p) => p.id === id)).filter(Boolean) },
        { label: 'Ações rápidas', items: actions },
        { label: 'Telas', items: pages.filter((p) => !recent.includes(p.id)) },
      ].filter((s) => s.items.length);

  const flatItems = sections.flatMap((s) => s.items);
  const opcaoId = (idx) => `${listaId}-opcao-${idx}`;

  const handleSelect = useCallback((item) => {
    if (!item.transient) saveRecent(item.id); // registros de dados não entram em "recentes"
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[active]) handleSelect(flatItems[active]);
    }
  };

  const alterarBusca = (valor) => {
    setQuery(valor);
    setActive(0);
  };

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let flatIdx = 0;
  const statusTexto = buscando ? 'Buscando…' : `${flatItems.length} resultado${flatItems.length === 1 ? '' : 's'}`;

  return (
    <Modal open onClose={onClose} title="Buscar no Core 4" size="md" initialFocusRef={inputRef} className="sm:max-h-[80dvh]">
      <div className="flex items-center gap-3 px-3 rounded-xl border border-border-strong bg-surface focus-within:ring-2 focus-within:ring-primary focus-within:border-primary/40 transition-shadow">
        <Search className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => alterarBusca(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Telas, contas, parceiros, lançamentos…"
          aria-label="Buscar telas, contas, parceiros e lançamentos"
          role="combobox"
          aria-expanded={flatItems.length > 0}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={flatItems[active] ? opcaoId(active) : undefined}
          className="flex-1 min-h-12 bg-transparent text-text-primary placeholder:text-text-primary/50 outline-none text-[0.95rem] font-body"
        />
        {buscando && <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />}
        {query && (
          <button
            type="button"
            onClick={() => { alterarBusca(''); inputRef.current?.focus(); }}
            aria-label="Limpar busca"
            className="min-w-11 min-h-11 -mr-2 grid place-items-center rounded-lg text-text-primary/60 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{query ? statusTexto : ''}</p>

      <div ref={listRef} id={listaId} role="listbox" aria-label="Resultados da busca" className="overflow-y-auto max-h-[55dvh] py-2 -mx-2">
        {flatItems.length === 0 && (
          <div className="text-center py-12 px-6">
            <p className="text-sm font-medium text-text-primary/80">{buscando ? 'Buscando…' : 'Nada encontrado'}</p>
            {!buscando && (
              <p className="mt-1 text-xs text-text-primary/60">Tente outro termo — a busca olha nomes de telas, contas, parceiros e lançamentos do cartão.</p>
            )}
          </div>
        )}
        {sections.map((section) => (
          <div key={section.label} role="group" aria-label={section.label}>
            <p className="c4-eyebrow px-3 pt-3 pb-1.5" aria-hidden="true">{section.label}</p>
            {section.items.map((item) => {
              const idx = flatIdx++;
              const isActive = idx === active;
              const Icon = item.icon;
              const isRecent = !query && recent.includes(item.id);
              return (
                <div
                  key={item.id}
                  id={opcaoId(idx)}
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive}
                  onClick={() => handleSelect(item)}
                  onMouseMove={() => { if (!isActive) setActive(idx); }}
                  className={cn(
                    'relative w-full flex items-center gap-3 px-3 min-h-12 py-2 text-left rounded-xl cursor-pointer transition-colors',
                    isActive ? 'bg-primary/[0.09]' : 'hover:bg-text-primary/[0.04]'
                  )}
                >
                  {isActive && <span aria-hidden="true" className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full bg-primary" />}
                  <span className={cn(
                    'w-9 h-9 rounded-lg grid place-items-center shrink-0 border transition-colors',
                    isActive ? 'bg-primary/15 border-primary/25 text-primary' : 'bg-surface-medium border-border text-text-primary/70'
                  )}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-text-primary truncate">{item.label}</span>
                    {item.desc && <span className="block text-xs text-text-primary/60 truncate">{item.desc}</span>}
                  </span>
                  {isRecent && <Clock className="w-3.5 h-3.5 text-text-primary/45 shrink-0" aria-label="Recente" />}
                  {isActive && <CornerDownLeft className="hidden sm:block w-4 h-4 text-text-primary/45 shrink-0" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="hidden sm:flex pt-3 border-t border-border items-center gap-4 text-xs text-text-primary/60" aria-hidden="true">
        <span className="flex items-center gap-1.5"><kbd className="c4-kbd">↑</kbd><kbd className="c4-kbd">↓</kbd> navegar</span>
        <span className="flex items-center gap-1.5"><kbd className="c4-kbd">↵</kbd> abrir</span>
        <span className="flex items-center gap-1.5"><kbd className="c4-kbd">Esc</kbd> fechar</span>
      </div>
    </Modal>
  );
}
