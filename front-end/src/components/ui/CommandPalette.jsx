import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, Tag, Landmark, FileText,
  CreditCard, TrendingUp, Repeat, Bell, CalendarDays, BarChart3,
  Gavel, Settings, Plus, X, Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const PAGES = [
  { id: 'dashboard',        icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard',        desc: 'Visão geral financeira' },
  { id: 'parceiros',        icon: Users,           label: 'Parceiros',        path: '/parceiros',        desc: 'Clientes e fornecedores' },
  { id: 'categorias',       icon: Tag,             label: 'Categorias',       path: '/categorias',       desc: 'Categorias de lançamentos' },
  { id: 'contas-correntes', icon: Landmark,        label: 'Contas Correntes', path: '/contas-correntes', desc: 'Suas contas bancárias' },
  { id: 'contas',           icon: FileText,        label: 'Lançamentos',      path: '/contas',           desc: 'Contas a pagar e receber' },
  { id: 'cartoes',          icon: CreditCard,      label: 'Cartões',          path: '/cartoes',          desc: 'Cartões de crédito' },
  { id: 'investimentos',    icon: TrendingUp,      label: 'Investimentos',    path: '/investimentos',    desc: 'Carteira de investimentos' },
  { id: 'assinaturas',      icon: Repeat,          label: 'Assinaturas',      path: '/assinaturas',      desc: 'Assinaturas recorrentes' },
  { id: 'notificacoes',     icon: Bell,            label: 'Notificações',     path: '/notificacoes',     desc: 'Alertas e avisos' },
  { id: 'calendario',       icon: CalendarDays,    label: 'Calendário',       path: '/calendario',       desc: 'Calendário financeiro' },
  { id: 'reports',          icon: BarChart3,       label: 'Relatórios',       path: '/reports',          desc: 'Relatórios e exportações' },
  { id: 'configuracoes',    icon: Settings,        label: 'Configurações',    path: '/configuracoes',    desc: 'Perfil e preferências' },
];

const ACTIONS = [
  { id: 'nova-conta-pagar',  icon: Plus, label: 'Nova conta a pagar',    path: '/contas',       desc: 'Registrar nova despesa' },
  { id: 'nova-conta-receber',icon: Plus, label: 'Nova conta a receber',   path: '/contas',       desc: 'Registrar nova receita' },
  { id: 'novo-parceiro',     icon: Plus, label: 'Novo parceiro',          path: '/parceiros',    desc: 'Cadastrar cliente/fornecedor' },
  { id: 'novo-investimento', icon: Plus, label: 'Novo investimento',      path: '/investimentos',desc: 'Registrar investimento' },
  { id: 'nova-assinatura',   icon: Plus, label: 'Nova assinatura',        path: '/assinaturas',  desc: 'Adicionar assinatura recorrente' },
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
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const recent = getRecent();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const allItems = query
    ? [
        ...PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()) || p.desc.toLowerCase().includes(query.toLowerCase())),
        ...ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())),
      ]
    : [
        ...PAGES.filter((p) => recent.includes(p.id)),
        ...PAGES.filter((p) => !recent.includes(p.id)),
      ];

  const sections = query
    ? [{ label: 'Resultados', items: allItems }]
    : [
        { label: 'Recentes', items: PAGES.filter((p) => recent.includes(p.id)) },
        { label: 'Páginas', items: PAGES.filter((p) => !recent.includes(p.id)) },
        { label: 'Ações Rápidas', items: ACTIONS },
      ].filter((s) => s.items.length);

  const flatItems = sections.flatMap((s) => s.items);

  const handleSelect = useCallback((item) => {
    saveRecent(item.id);
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
            placeholder="Buscar páginas e ações..."
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
            <p className="text-center text-sm text-text-primary/40 py-12">Nenhum resultado encontrado</p>
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
