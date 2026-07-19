import React, { useState } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Gavel,
  Users, Landmark, FileText, CreditCard, TrendingUp,
  LogOut, Tag, Repeat, CalendarDays, Settings, GitMerge,
  ChevronRight, UserCog, ShieldCheck, Sparkles, HelpCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard' },
      { id: 'assistente', icon: Sparkles,        label: 'Áurea',            path: '/assistente' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'parceiros',        icon: Users,       label: 'Parceiros',        path: '/parceiros', permissao: 'PARCEIRO_VISUALIZAR' },
      { id: 'categorias',       icon: Tag,         label: 'Categorias',       path: '/categorias', permissao: 'CATEGORIA_VISUALIZAR' },
      { id: 'contas-correntes', icon: Landmark,    label: 'Contas Correntes', path: '/contas-correntes', permissao: 'CONTA_CORRENTE_VISUALIZAR' },
      { id: 'contas',           icon: FileText,    label: 'Lançamentos',      path: '/contas', permissao: 'CONTA_VISUALIZAR' },
      { id: 'cartoes-dropdown', type: 'DROPDOWN', icon: CreditCard, label: 'Cartões' },
      { id: 'investimentos',    icon: TrendingUp,  label: 'Investimentos',    path: '/investimentos', permissao: 'INVESTIMENTO_VISUALIZAR' },
      { id: 'assinaturas',      icon: Repeat,      label: 'Assinaturas',      path: '/assinaturas', permissao: 'ASSINATURA_VISUALIZAR' },
      { id: 'conciliacao',      icon: GitMerge,    label: 'Conciliação',      path: '/conciliacao', permissao: 'CONCILIACAO_VISUALIZAR' },
    ],
  },
  {
    label: 'Análises',
    items: [
      { id: 'calendario',   icon: CalendarDays, label: 'Calendário',   path: '/calendario', permissao: 'CALENDARIO_VISUALIZAR' },
      { id: 'reports',      icon: BarChart3,    label: 'Relatórios',   path: '/reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'audit',       icon: Gavel,    label: 'Auditoria',       path: '/audit',              permissao: 'AUDITORIA_VISUALIZAR', empresaOnly: true },
      { id: 'operadores',  icon: UserCog,  label: 'Operadores',      path: '/empresa/operadores', permissao: 'USUARIO_VISUALIZAR',   empresaOnly: true },
      { id: 'perfis',      icon: ShieldCheck, label: 'Perfis de Acesso', path: '/empresa/perfis', permissao: 'CONFIGURACAO_EDITAR',  empresaOnly: true },
    ],
  },
];

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/**
 * Classe de visibilidade dos rótulos.
 * - `expandido` (drawer mobile): rótulos sempre visíveis.
 * - rail desktop: aparecem no hover E no foco por teclado (acessibilidade).
 */
function labelVisibility(expandido) {
  return expandido
    ? 'opacity-100'
    : 'opacity-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100';
}

/* BrandMark com SVG 4-grid idêntico ao Login */
function BrandMark({ expandido }) {
  return (
    <NavLink
      to="/dashboard"
      className="px-4 mb-4 flex items-center gap-3 cursor-pointer w-full"
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: 'linear-gradient(135deg,rgba(110,255,192,.16),rgba(110,255,192,.04))',
        border: '1px solid rgba(110,255,192,.22)',
        display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%,rgba(110,255,192,.4),transparent 60%)', opacity: .8 }} />
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <rect x="1" y="1" width="9" height="9" rx="1.5" fill="#6EFFC0"/>
          <rect x="12" y="1" width="9" height="9" rx="1.5" stroke="#6EFFC0" strokeWidth="1.6"/>
          <rect x="1" y="12" width="9" height="9" rx="1.5" stroke="#6EFFC0" strokeWidth="1.6"/>
          <rect x="12" y="12" width="9" height="9" rx="1.5" fill="#6EFFC0" opacity=".4"/>
        </svg>
      </div>
      <div className={cn('transition-opacity duration-200 whitespace-nowrap min-w-0', labelVisibility(expandido))}>
        <div className="text-sm font-bold text-text-primary font-display leading-tight flex items-center gap-2">
          Core <span className="text-primary">4</span> ERP
          <span className="live-dot" style={{ width: 5, height: 5 }} />
        </div>
        <div className="text-[9px] text-text-primary/30 font-mono tracking-widest uppercase">Enterprise</div>
      </div>
    </NavLink>
  );
}

const CARTAO_SUB_ITEMS = [
  { label: 'Dashboard',   path: '/cartoes/dashboard',  permissao: 'CARTAO_VISUALIZAR',             icon: LayoutDashboard },
  { label: 'Lançamentos', path: '/cartoes',             permissao: 'CARTAO_LANCAR',                 icon: FileText },
  { label: 'Conciliação', path: '/cartoes/conciliacao', permissao: 'CARTAO_CONCILIACAO_VISUALIZAR', icon: GitMerge },
];

function CartaoDropdown({ onNavigate, temPermissao, expandido }) {
  const [open, setOpen] = useState(false);
  const isActive = useMatch('/cartoes/*');

  const visibleSubItems = CARTAO_SUB_ITEMS.filter((sub) => temPermissao(sub.permissao));
  if (visibleSubItems.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Cartões"
        aria-expanded={open}
        className={cn(
          'w-full min-h-11 px-3 py-2.5 flex items-center gap-3 rounded-xl transition-all duration-200',
          isActive ? 'text-text-primary' : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
        )}
      >
        <CreditCard className={cn('w-5 h-5 shrink-0 transition-colors', isActive && 'text-primary')} />
        <span className={cn('transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap font-mono flex-1 text-left', labelVisibility(expandido))}>
          Cartões
        </span>
        <ChevronRight className={cn('w-3.5 h-3.5 transition-all duration-200 shrink-0', labelVisibility(expandido), open && 'rotate-90')} />
      </button>
      {open && (
        <div className={cn('pl-8 space-y-0.5 transition-opacity duration-200', labelVisibility(expandido))}>
          {visibleSubItems.map((sub) => (
            <NavLink
              key={sub.path}
              to={sub.path}
              end={sub.path === '/cartoes'}
              onClick={onNavigate}
              title={sub.label}
              className={({ isActive: a }) => cn(
                'w-full min-h-11 px-3 py-2 flex items-center gap-2 rounded-xl transition-all duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap font-mono',
                a ? 'text-primary' : 'text-text-primary/40 hover:text-text-primary'
              )}
            >
              {({ isActive: a }) => (
                <>
                  <sub.icon className={cn('w-4 h-4 shrink-0 transition-colors', a && 'text-primary')} />
                  {sub.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Sidebar — usada em 2 contextos:
 *  - Rail no desktop (lg+): largura w-16 que expande para w-56 no hover/foco.
 *  - Drawer no mobile: aberto pelo App.jsx com `expandido` = true, mostrando
 *    todos os rótulos (o drawer não tem hover).
 *
 * Props:
 *  - expandido  (bool)  força o estado expandido (rótulos visíveis, w-56). Default: false.
 *  - onNavigate (fn?)   chamado ao navegar por um item — usado pelo App para fechar o drawer.
 *  - onClose    (fn?)   compatibilidade: fallback de onNavigate quando este não é passado.
 */
export default function Sidebar({ onClose, onNavigate, expandido = false }) {
  const { usuario, logout, tipoConta, adminSistema, temPermissao } = useAuth();
  // Fecha o drawer ao navegar (no desktop rail, onNavigate/onClose costumam ser no-op).
  const handleNav = onNavigate ?? onClose;

  return (
    <aside className={cn(
      'group/sidebar h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-hidden bg-surface-low flex flex-col items-start py-6 gap-2 z-50 border-r border-text-primary/5 pb-safe',
      expandido ? 'w-56' : 'w-16 hover:w-56 focus-within:w-56'
    )}>
      {/* Logo */}
      <BrandMark expandido={expandido} />

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 w-full overflow-y-auto no-scrollbar px-2">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.permissao && !temPermissao(item.permissao)) return false;
            if (item.empresaOnly && tipoConta !== 'EMPRESA') return false;
            if (item.adminSistemaOnly && !adminSistema) return false;
            return true;
          });
          if (!visibleItems.length) return null;
          return (
            <React.Fragment key={group.label}>
              <div className={cn('px-2 pt-3 pb-1 transition-opacity duration-200', labelVisibility(expandido))}>
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-primary/30 font-mono">
                  {group.label}
                </span>
              </div>
              {visibleItems.map((item) =>
                item.type === 'DROPDOWN'
                  ? <CartaoDropdown key={item.id} onNavigate={handleNav} temPermissao={temPermissao} expandido={expandido} />
                  : (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={handleNav}
                      title={item.label}
                      className={({ isActive }) => cn(
                        'w-full min-h-11 px-3 py-2.5 flex items-center gap-3 rounded-xl transition-all duration-200 relative',
                        isActive
                          ? 'text-text-primary bg-gradient-to-r from-primary/15 to-transparent border-l-2 border-primary pl-[calc(0.75rem-2px)]'
                          : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('w-5 h-5 shrink-0 transition-colors', isActive && 'text-primary')} />
                          <span className={cn('transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap font-mono', labelVisibility(expandido))}>
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  )
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Separador */}
      <div className="w-full px-4 mb-1">
        <div className="h-px bg-text-primary/5" />
      </div>

      {/* User + Logout */}
      <div className="w-full px-2 space-y-1">
        <NavLink
          to="/configuracoes"
          onClick={handleNav}
          title="Configurações"
          className={({ isActive }) => cn(
            'w-full min-h-11 px-3 py-2.5 flex items-center gap-3 rounded-xl transition-all duration-200',
            isActive ? 'text-text-primary bg-surface-medium' : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className={cn('transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap font-mono', labelVisibility(expandido))}>
            Configurações
          </span>
        </NavLink>

        {/* Ajuda — acessível a todos (sem permissão) */}
        <NavLink
          to="/ajuda"
          onClick={handleNav}
          title="Ajuda"
          className={({ isActive }) => cn(
            'w-full min-h-11 px-3 py-2.5 flex items-center gap-3 rounded-xl transition-all duration-200',
            isActive ? 'text-text-primary bg-surface-medium' : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
          )}
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span className={cn('transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap font-mono', labelVisibility(expandido))}>
            Ajuda
          </span>
        </NavLink>

        <button
          onClick={logout}
          title="Sair"
          className="w-full min-h-11 px-3 py-2.5 flex items-center gap-3 rounded-xl text-text-primary/50 hover:text-error hover:bg-error/5 transition-all duration-200"
          aria-label="Sair do sistema"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={cn('transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap font-mono', labelVisibility(expandido))}>
            Sair
          </span>
        </button>

        {/* Avatar do usuário */}
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(110,255,192,.3),rgba(110,255,192,.1))', border: '1px solid rgba(110,255,192,.2)' }}>
            {usuario?.fotoPerfil ? (
              <img src={usuario.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary select-none font-display">
                {getInitials(usuario?.nome)}
              </span>
            )}
          </div>
          <div className={cn('transition-opacity duration-200 min-w-0', labelVisibility(expandido))}>
            <p className="text-[11px] font-bold text-text-primary truncate font-display">{usuario?.nome ?? 'Usuário'}</p>
            <p className="text-[9px] text-text-primary/40 truncate font-mono">{usuario?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
