import React, { lazy, Suspense, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import Dashboard from './views/Dashboard';
import Login from './views/Login';
import Register from './views/Register';
import ChatSidebar from './components/chat/ChatSidebar';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './hooks/useConfirm';
import { ToastContainer } from './components/ui/Toast';
import { getUsuario } from './lib/api';
import { cn } from './lib/utils';
import SkeletonCard from './components/ui/SkeletonCard';

const Conciliacao         = lazy(() => import('./views/Conciliacao'));
const ConciliacaoHistorico = lazy(() => import('./views/ConciliacaoHistorico'));
const ConciliacaoRelatorio = lazy(() => import('./views/ConciliacaoRelatorio'));
const Assinaturas     = lazy(() => import('./views/Assinaturas'));
const Calendario      = lazy(() => import('./views/Calendario'));
const Categorias      = lazy(() => import('./views/Categorias'));
const Reports         = lazy(() => import('./views/Reports'));
const Audit           = lazy(() => import('./views/Audit'));
const Parceiros       = lazy(() => import('./views/Parceiros'));
const ContasCorrentes = lazy(() => import('./views/ContasCorrentes'));
const ContasFinanceiras = lazy(() => import('./views/ContasFinanceiras'));
const Cartoes         = lazy(() => import('./views/Cartoes'));
const Investimentos   = lazy(() => import('./views/Investimentos'));
const Notificacoes    = lazy(() => import('./views/Notificacoes'));
const Configuracoes   = lazy(() => import('./views/Configuracoes'));
const CommandPalette  = lazy(() => import('./components/ui/CommandPalette'));

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonCard className="h-24" rows={1} />
      <div className="grid grid-cols-12 gap-6">
        <SkeletonCard className="col-span-12 lg:col-span-8" rows={4} />
        <SkeletonCard className="col-span-12 lg:col-span-4" rows={3} />
      </div>
    </div>
  );
}

function isAuthenticated() {
  return Boolean(sessionStorage.getItem('usuario'));
}

function AdminRoute({ children }) {
  const usuario = getUsuario();
  if (!usuario || usuario.role !== 'ROLE_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function ProtectedLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const openCmd = useCallback(() => setCmdOpen(true), []);
  const closeCmd = useCallback(() => setCmdOpen(false), []);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface flex relative overflow-x-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-50',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          onMenuClick={() => setIsSidebarOpen(true)}
          onCommandPaletteOpen={openCmd}
        />
        <main id="main-content" className="flex-1 p-4 lg:p-8 overflow-y-auto no-scrollbar animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>

      <ChatSidebar />
      <ToastContainer />

      {/* Command Palette */}
      {cmdOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={closeCmd} />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          {/* Skip navigation for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-lg focus:text-sm focus:font-bold"
          >
            Ir para o conteúdo
          </a>

          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard"        element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/conciliacao"            element={<ProtectedLayout><Conciliacao /></ProtectedLayout>} />
            <Route path="/conciliacao/historico"  element={<ProtectedLayout><ConciliacaoHistorico /></ProtectedLayout>} />
            <Route path="/conciliacao/:id/relatorio" element={<ProtectedLayout><ConciliacaoRelatorio /></ProtectedLayout>} />
            <Route path="/assinaturas"      element={<ProtectedLayout><Assinaturas /></ProtectedLayout>} />
            <Route path="/calendario"       element={<ProtectedLayout><Calendario /></ProtectedLayout>} />
            <Route path="/reports"          element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/audit"            element={<ProtectedLayout><AdminRoute><Audit /></AdminRoute></ProtectedLayout>} />
            <Route path="/parceiros"        element={<ProtectedLayout><Parceiros /></ProtectedLayout>} />
            <Route path="/categorias"       element={<ProtectedLayout><Categorias /></ProtectedLayout>} />
            <Route path="/contas-correntes" element={<ProtectedLayout><ContasCorrentes /></ProtectedLayout>} />
            <Route path="/contas"           element={<ProtectedLayout><ContasFinanceiras /></ProtectedLayout>} />
            <Route path="/cartoes"          element={<ProtectedLayout><Cartoes /></ProtectedLayout>} />
            <Route path="/investimentos"    element={<ProtectedLayout><Investimentos /></ProtectedLayout>} />
            <Route path="/notificacoes"     element={<ProtectedLayout><Notificacoes /></ProtectedLayout>} />
            <Route path="/configuracoes"    element={<ProtectedLayout><Configuracoes /></ProtectedLayout>} />

            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
