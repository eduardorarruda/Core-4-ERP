import React, { useEffect, useId, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, Tag, Landmark, FileText,
  CreditCard, TrendingUp, Repeat, CalendarDays, BarChart3,
  Settings, Plus, X, Clock, HelpCircle, LifeBuoy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { busca } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from './Modal';

// Ícone por tipo de registro retornado pela busca global do backend.
const TIPO_ICON = { PARCEIRO: Users, CONTA: FileText, LANCAMENTO_CARTAO: CreditCard };

// `permissao: null` → sempre visível. Demais são filtradas por temPermissao (gap conhecido corrigido).
const PAGES = [
  { id: 'dashboard',        icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard',        desc: 'Visão geral financeira',      permissao: 'DASHBOARD_VISUALIZAR' },
  { id: 'parceiros',        icon: Users,           label: 'Parceiros',        path: '/parceiros',        desc: 'Clientes e fornecedores',     permissao: 'PARCEIRO_VISUALIZAR' },
  { id: 'categorias',       icon: Tag,             label: 'Categorias',       path: '/categorias',       desc: 'Categorias de lançamentos',   permissao: 'CATEGORIA_VISUALIZAR' },
  { id: 'contas-correntes', icon: Landmark,        label: 'Contas Correntes', path: '/contas-correntes', desc: 'Suas contas bancárias',       permissao: 'CONTA_CORRENTE_VISUALIZAR' },
  { id: 'contas',           icon: FileText,        label: 'Lançamentos',      path: '/contas',           desc: 'Contas a pagar e receber',    permissao: 'CONTA_VISUALIZAR' },
  { id: 'cartoes',          icon: CreditCard,      label: 'Cartões',          path: '/cartoes',          desc: 'Cartões de crédito',          permissao: 'CARTAO_LANCAR' },
  { id: 'investimentos',    icon: TrendingUp,      label: 'Investimentos',    path: '/investimentos',    desc: 'Carteira de investimentos',   permissao: 'INVESTIMENTO_VISUALIZAR' },
  { id: 'assinaturas',      icon: Repeat,          label: 'Assinaturas',      path: '/assinaturas',      desc: 'Assinaturas recorrentes',     permissao: 'ASSINATURA_VISUALIZAR' },
  { id: 'calendario',       icon: CalendarDays,    label: 'Calendário',       path: '/calendario',       desc: 'Calendário financeiro',       permissao: 'CALENDARIO_VISUALIZAR' },
  { id: 'reports',          icon: BarChart3,       label: 'Relatórios',       path: '/reports',          desc: 'Relatórios e exportações',    permissao: null },
  { id: 'configuracoes',    icon: Settings,        label: 'Configurações',    path: '/configuracoes',    desc: 'Perfil e preferências',       permissao: null },
  { id: 'ajuda',            icon: HelpCircle,      label: 'Central de Ajuda', path: '/ajuda',            desc: 'Aprenda a usar cada tela',    permissao: null },
];

const ACTIONS = [
  { id: 'nova-conta-pagar',  icon: Plus, label: 'Nova conta a pagar',    path: '/contas',       desc: 'Registrar nova despesa',           permissao: 'CONTA_CRIAR' },
  { id: 'nova-conta-receber',icon: Plus, label: 'Nova conta a receber',   path: '/contas',       desc: 'Registrar nova receita',           permissao: 'CONTA_CRIAR' },
  { id: 'novo-parceiro',     icon: Plus, label: 'Novo parceiro',          path: '/parceiros',    desc: 'Cadastrar cliente/fornecedor',     permissao: 'PARCEIRO_CRIAR' },
  { id: 'novo-investimento', icon: Plus, label: 'Novo investimento',      path: '/investimentos',desc: 'Registrar investimento',           permissao: 'INVESTIMENTO_CRIAR' },
  { id: 'nova-assinatura',   icon: Plus, label: 'Nova assinatura',        path: '/assinaturas',  desc: 'Adicionar assinatura recorrente',  permissao: 'ASSINATURA_CRIAR' },
];

// Atalhos "Como faço para…" — levam direto ao tópico da Central de Ajuda. Sempre visíveis.
const HELP_TOPICS = [
  { id: 'help-conciliacao', icon: LifeBuoy, label: 'Como faço para conciliar o extrato?', path: '/ajuda#conciliacao',        desc: 'Central de Ajuda' },
  { id: 'help-aurea',       icon: LifeBuoy, label: 'Como uso a Áurea (assistente)?',      path: '/ajuda#aurea',             desc: 'Central de Ajuda' },
  { id: 'help-baixar',      icon: LifeBuoy, label: 'Como faço para baixar uma conta?',    path: '/ajuda#lancamentos',       desc: 'Central de Ajuda' },
  { id: 'help-instalar',    icon: LifeBuoy, label: 'Como instalo o app no celular?',      path: '/ajuda#pwa',               desc: 'Central de Ajuda' },
];

const RECENT_KEY = 'c4_cmd_recent';

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(id) {
  const prev = getRecent().filter((r) => r !== id).slice(0, 4);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev]));
}

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const { temPermissao } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listaId = useId();
  const recent = getRecent();

  // Só mostra páginas/ações que o usuário pode acessar (itens sem permissão são sempre visíveis).
  const podeVer = (item) => item.permissao == null || temPermissao(item.permissao);
  const pages = PAGES.filter(podeVer);
  const actions = ACTIONS.filter(podeVer);

  // Busca de dados reais (contas, parceiros, lançamentos) no backend, com debounce.
  useEffect(() => {
    const termo = query.trim();
    if (termo.length < 2) { setResultados([]); setBuscando(false); return undefined; }
    setBuscando(true);
    const t = setTimeout(async () => {
      try { setResultados(await busca.global(termo)); }
      catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const dataItems = resultados.map((r) => ({
    id: `rec-${r.tipo}-${r.id}`,
    icon: TIPO_ICON[r.tipo] ?? FileText,
    label: r.titulo,
    desc: r.subtitulo,
    path: r.rota,
    transient: true,
  }));

  const q = query.toLowerCase();
  const pageActionItems = query
    ? [
        ...pages.filter((p) => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)),
        ...actions.filter((a) => a.label.toLowerCase().includes(q)),
      ]
    : [];
  const helpItems = query ? HELP_TOPICS.filter((h) => h.label.toLowerCase().includes(q)) : [];

  const sections = query
    ? [
        { label: 'Registros', items: dataItems },
        { label: 'Páginas e ações', items: pageActionItems },
        { label: 'Ajuda', items: helpItems },
      ].filter((s) => s.items.length)
    : [
        { label: 'Recentes', items: pages.filter((p) => recent.includes(p.id)) },
        { label: 'Páginas', items: pages.filter((p) => !recent.includes(p.id)) },
        { label: 'Ações rápidas', items: actions },
      ].filter((s) => s.items.length);

  const flatItems = sections.flatMap((s) => s.items);
  const opcaoId = (idx) => `${listaId}-opcao-${idx}`;

  const handleSelect = useCallback((item) => {
    if (!item.transient) saveRecent(item.id); // não guardar registros de dados como "recentes"
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
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let flatIdx = 0;
  const statusTexto = buscando
    ? 'Buscando...'
    : `${flatItems.length} resultado${flatItems.length === 1 ? '' : 's'}`;

  return (
    <Modal open onClose={onClose} title="Buscar no sistema" size="md" initialFocusRef={inputRef} className="sm:max-h-[80dvh]">
      {/* Campo de busca (combobox) */}
      <div className="flex items-center gap-3 px-3 rounded-xl border border-text-primary/15 bg-surface focus-within:ring-2 focus-within:ring-primary">
        <Search className="w-5 h-5 text-text-primary/60 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => alterarBusca(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Contas, parceiros, lançamentos, páginas..."
          aria-label="Buscar contas, parceiros, lançamentos e páginas"
          role="combobox"
          aria-expanded={flatItems.length > 0}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={flatItems[active] ? opcaoId(active) : undefined}
          className="flex-1 min-h-11 bg-transparent text-text-primary placeholder:text-text-primary/50 outline-none text-sm font-body"
        />
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

      {/* Results */}
      <div ref={listRef} id={listaId} role="listbox" aria-label="Resultados da busca" className="overflow-y-auto max-h-[55dvh] py-2 -mx-2">
        {flatItems.length === 0 && (
          <p className="text-center text-sm text-text-primary/70 py-12">
            {buscando ? 'Buscando...' : 'Nenhum resultado encontrado'}
          </p>
        )}
        {sections.map((section) => (
          <div key={section.label} role="group" aria-label={section.label}>
            <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-text-primary/60" aria-hidden="true">
              {section.label}
            </p>
            {section.items.map((item) => {
              const idx = flatIdx++;
              const isActive = idx === active;
              const Icon = item.icon;
              const isRecent = recent.includes(item.id);
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
                    'w-full flex items-center gap-3 px-3 min-h-11 py-2 text-left transition-colors rounded-xl cursor-pointer',
                    isActive ? 'bg-surface-medium' : 'hover:bg-surface-medium'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isActive ? 'bg-primary/15' : 'bg-surface-highest'
                  )}>
                    <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-text-primary/70')} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.label}</p>
                    <p className="text-xs text-text-primary/70 truncate">{item.desc}</p>
                  </div>
                  {isRecent && !query && (
                    <Clock className="w-3.5 h-3.5 text-text-primary/50 shrink-0" aria-label="Recente" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Atalhos (só faz sentido com teclado físico) */}
      <div className="hidden sm:flex pt-3 border-t border-text-primary/10 items-center gap-4 text-xs text-text-primary/60" aria-hidden="true">
        <span className="flex items-center gap-1"><kbd className="bg-surface-highest px-1 py-0.5 rounded border border-text-primary/10">↑↓</kbd> navegar</span>
        <span className="flex items-center gap-1"><kbd className="bg-surface-highest px-1 py-0.5 rounded border border-text-primary/10">↵</kbd> abrir</span>
        <span className="flex items-center gap-1"><kbd className="bg-surface-highest px-1 py-0.5 rounded border border-text-primary/10">Esc</kbd> fechar</span>
      </div>
    </Modal>
  );
}
