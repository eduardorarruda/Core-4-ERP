import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, Tag, Landmark, FileText,
  CreditCard, TrendingUp, Repeat, CalendarDays, BarChart3,
  Gavel, Settings, Plus, X, Clock, HelpCircle, LifeBuoy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { busca } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

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
  const recent = getRecent();

  // Só mostra páginas/ações que o usuário pode acessar (itens sem permissão são sempre visíveis).
  const podeVer = (item) => item.permissao == null || temPermissao(item.permissao);
  const pages = PAGES.filter(podeVer);
  const actions = ACTIONS.filter(podeVer);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Busca de dados reais (contas, parceiros, lançamentos) no backend, com debounce.
  useEffect(() => {
    const termo = query.trim();
    if (termo.length < 2) { setResultados([]); setBuscando(false); return; }
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
        { label: 'Ações Rápidas', items: actions },
      ].filter((s) => s.items.length);

  const flatItems = sections.flatMap((s) => s.items);

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

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-low border border-text-primary/10 rounded-2xl shadow-elevated overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-text-primary/10">
          <Search className="w-5 h-5 text-text-primary/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar contas, parceiros, lançamentos, páginas..."
            aria-label="Busca global"
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-primary/30 outline-none text-sm font-body"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpar busca" className="text-text-primary/40 hover:text-text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-bold bg-surface-highest px-1.5 py-0.5 rounded border border-text-primary/10 text-text-primary/40 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[60vh] py-2">
          {flatItems.length === 0 && (
            <p className="text-center text-sm text-text-primary/40 py-12">
              {buscando ? 'Buscando...' : 'Nenhum resultado encontrado'}
            </p>
          )}
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-text-primary/30">
                {section.label}
              </p>
              {section.items.map((item) => {
                const idx = flatIdx++;
                const isActive = idx === active;
                const Icon = item.icon;
                const isRecent = recent.includes(item.id);
                return (
                  <button
                    key={item.id}
                    data-active={isActive}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isActive ? 'bg-surface-medium' : 'hover:bg-surface-medium'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      isActive ? 'bg-primary/15' : 'bg-surface-highest'
                    )}>
                      <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-text-primary/50')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{item.label}</p>
                      <p className="text-[11px] text-text-primary/40 truncate">{item.desc}</p>
                    </div>
                    {isRecent && !query && (
                      <Clock className="w-3.5 h-3.5 text-text-primary/20 shrink-0" />
                    )}
                    {isActive && (
                      <kbd className="text-[10px] bg-surface-highest px-1.5 py-0.5 rounded border border-text-primary/10 text-text-primary/40 shrink-0">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-text-primary/10 flex items-center gap-4 text-[10px] text-text-primary/30">
          <span className="flex items-center gap-1"><kbd className="bg-surface-highest px-1 py-0.5 rounded border border-text-primary/10">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="bg-surface-highest px-1 py-0.5 rounded border border-text-primary/10">↵</kbd> selecionar</span>
          <span className="flex items-center gap-1"><kbd className="bg-surface-highest px-1 py-0.5 rounded border border-text-primary/10">ESC</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
