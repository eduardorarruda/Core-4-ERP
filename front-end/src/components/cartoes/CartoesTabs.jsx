import React from 'react';
import { CreditCard, GitMerge, LayoutDashboard } from 'lucide-react';
import Tabs from '../ui/Tabs';
import { usePermissao } from '../../hooks/usePermissao';

/*
 * Abas do módulo Cartões (rotas). Cada aba só aparece com a permissão da própria rota
 * (as mesmas das PermissaoRoute do App.jsx): a navegação nunca leva a um 403.
 * Use dentro do PageHeader: <PageHeader …><CartoesTabs /></PageHeader>
 */
const ABAS = [
  { to: '/cartoes/dashboard', label: 'Visão geral', icon: LayoutDashboard, permissao: 'CARTAO_VISUALIZAR' },
  { to: '/cartoes', label: 'Faturas e lançamentos', icon: CreditCard, permissao: 'CARTAO_LANCAR', end: true },
  { to: '/cartoes/conciliacao', label: 'Conciliação', icon: GitMerge, permissao: 'CARTAO_CONCILIACAO_VISUALIZAR' },
];

export default function CartoesTabs({ className }) {
  const pode = usePermissao();
  const itens = ABAS.filter((a) => pode(a.permissao));
  if (itens.length < 2) return null;
  return <Tabs.Links label="Seções de cartões" items={itens} className={className} />;
}
