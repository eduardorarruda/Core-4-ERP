import React, { useState } from 'react';
import { LayoutDashboard, CreditCard } from 'lucide-react';
import Dashboard from './Dashboard';
import CartaoDashboard from './CartaoDashboard';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const TAB_KEY = 'c4_dashboard_tab';

/**
 * Tela unificada de dashboards. O padrão é a Visão Geral (Dashboard principal), com um toggle de
 * fácil acesso para o Dashboard de Cartões — elimina a navegação entre telas separadas.
 * A aba de Cartões só aparece para quem tem permissão CARTAO_VISUALIZAR.
 */
export default function DashboardHome() {
  const { temPermissao } = useAuth();
  const podeVerCartoes = temPermissao('CARTAO_VISUALIZAR');

  const [aba, setAba] = useState(() => {
    const salva = sessionStorage.getItem(TAB_KEY);
    return salva === 'cartoes' ? 'cartoes' : 'geral';
  });

  // Se perdeu a permissão de cartões, força a Visão Geral.
  const abaAtiva = aba === 'cartoes' && podeVerCartoes ? 'cartoes' : 'geral';

  const selecionar = (nova) => {
    setAba(nova);
    sessionStorage.setItem(TAB_KEY, nova);
  };

  const tabs = [
    { id: 'geral', label: 'Visão Geral', icon: LayoutDashboard },
    ...(podeVerCartoes ? [{ id: 'cartoes', label: 'Cartões', icon: CreditCard }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Toggle de dashboards */}
      {tabs.length > 1 && (
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl w-fit bg-surface-low border border-text-primary/10"
          role="tablist"
          aria-label="Alternar entre dashboards"
        >
          {tabs.map((t) => {
            const ativo = abaAtiva === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={ativo}
                onClick={() => selecionar(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 min-h-11 rounded-lg text-xs font-bold uppercase tracking-widest font-mono transition-colors',
                  ativo
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {abaAtiva === 'cartoes' ? <CartaoDashboard /> : <Dashboard />}
    </div>
  );
}
