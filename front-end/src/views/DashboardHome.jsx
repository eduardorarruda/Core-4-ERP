import React from 'react';
import Dashboard from './Dashboard';

/**
 * Rota /dashboard (PermissaoRoute DASHBOARD_VISUALIZAR em App.jsx). O Início mostra só a visão
 * geral: o painel de cartões vive no módulo Cartões (/cartoes/dashboard). Mantido como wrapper
 * para não mexer no App.jsx; pode ser apagado quando a rota apontar direto para Dashboard.
 */
export default function DashboardHome() {
  return <Dashboard />;
}
