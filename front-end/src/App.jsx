import React, { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import ChatSidebar from './components/chat/ChatSidebar';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './hooks/useConfirm';
import { ToastContainer } from './components/ui/Toast';
import { getUsuario } from './lib/api';
import { useAuth } from './hooks/useAuth';
import { cn } from './lib/utils';
import SkeletonCard from './components/ui/SkeletonCard';

const Dashboard         = lazy(() => import('./views/Dashboard'));
const Login             = lazy(() => import('./views/Login'));
const Register          = lazy(() => import('./views/Register'));
const RedefinirSenha    = lazy(() => import('./views/RedefinirSenha'));

const Conciliacao         = lazy(() => import('./views/Conciliacao'));
const ConciliacaoHistorico = lazy(() => import('./views/ConciliacaoHistorico'));
const ConciliacaoRelatorio = lazy(() => import('./views/ConciliacaoRelatorio'));
const ConciliacaoCartao         = lazy(() => import('./views/ConciliacaoCartao'));
const ConciliacaoCartaoHistorico = lazy(() => import('./views/ConciliacaoCartaoHistorico'));
const ConciliacaoCartaoRelatorio = lazy(() => import('./views/ConciliacaoCartaoRelatorio'));
const CartaoDashboard   = lazy(() => import('./views/CartaoDashboard'));
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
const VisualizacaoPlanos = lazy(() => import('./views/VisualizacaoPlanos'));
const PagamentoMock      = lazy(() => import('./views/PagamentoMock'));
const AceitarConvite     = lazy(() => import('./views/AceitarConvite'));
const GestaoPlanos       = lazy(() => import('./views/GestaoPlanos'));
const GestaoOperadores   = lazy(() => import('./views/GestaoOperadores'));
const GestaoPerfis       = lazy(() => import('./views/GestaoPerfis'));

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

function SenhaProvisoriaModal({ onConfirm, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,193,7,.1)', border: '1px solid rgba(255,193,7,.2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD37A" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#fafafa', marginBottom: 8 }}>Senha Provisória</h2>
        <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', lineHeight: 1.6, marginBottom: 24 }}>
          Você está usando uma senha provisória. Recomendamos definir sua própria senha para maior segurança.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDismiss} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.5)', fontSize: 13, cursor: 'pointer' }}>
            Mais tarde
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
            Trocar Senha
          </button>
        </div>
      </div>
    </div>
  );
}

function ProtectedLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const { senhaProvisoria } = useAuth();
  const navigate = useNavigate();

  const openCmd = useCallback(() => setCmdOpen(true), []);
  const closeCmd = useCallback(() => setCmdOpen(false), []);

  useEffect(() => {
    if (senhaProvisoria) setShowSenhaModal(true);
  }, [senhaProvisoria]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen bg-surface flex relative overflow-hidden">
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

      {showSenhaModal && (
        <SenhaProvisoriaModal
          onConfirm={() => { setShowSenhaModal(false); navigate('/configuracoes'); }}
          onDismiss={() => setShowSenhaModal(false)}
        />
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

          <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login"              element={<Login />} />
            <Route path="/register"           element={<Register />} />
            <Route path="/redefinir-senha"    element={<RedefinirSenha />} />
            <Route path="/planos"             element={<VisualizacaoPlanos />} />
            <Route path="/pagamento"          element={<PagamentoMock />} />
            <Route path="/aceitar-convite"    element={<AceitarConvite />} />

            <Route path="/dashboard"        element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/conciliacao"              element={<ProtectedLayout><Conciliacao /></ProtectedLayout>} />
            <Route path="/conciliacao/historico"   element={<ProtectedLayout><ConciliacaoHistorico /></ProtectedLayout>} />
            <Route path="/conciliacao/:id"          element={<ProtectedLayout><Conciliacao /></ProtectedLayout>} />
            <Route path="/conciliacao/:id/relatorio" element={<ProtectedLayout><ConciliacaoRelatorio /></ProtectedLayout>} />
            <Route path="/assinaturas"      element={<ProtectedLayout><Assinaturas /></ProtectedLayout>} />
            <Route path="/calendario"       element={<ProtectedLayout><Calendario /></ProtectedLayout>} />
            <Route path="/reports"          element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/audit"            element={<ProtectedLayout><AdminRoute><Audit /></AdminRoute></ProtectedLayout>} />
            <Route path="/parceiros"        element={<ProtectedLayout><Parceiros /></ProtectedLayout>} />
            <Route path="/categorias"       element={<ProtectedLayout><Categorias /></ProtectedLayout>} />
            <Route path="/contas-correntes" element={<ProtectedLayout><ContasCorrentes /></ProtectedLayout>} />
            <Route path="/contas"           element={<ProtectedLayout><ContasFinanceiras /></ProtectedLayout>} />
            <Route path="/cartoes"                              element={<ProtectedLayout><Cartoes /></ProtectedLayout>} />
            <Route path="/cartoes/dashboard"                    element={<ProtectedLayout><CartaoDashboard /></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao"                  element={<ProtectedLayout><ConciliacaoCartao /></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao/historico"        element={<ProtectedLayout><ConciliacaoCartaoHistorico /></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao/:id"              element={<ProtectedLayout><ConciliacaoCartao /></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao/:id/relatorio"    element={<ProtectedLayout><ConciliacaoCartaoRelatorio /></ProtectedLayout>} />
            <Route path="/investimentos"    element={<ProtectedLayout><Investimentos /></ProtectedLayout>} />
            <Route path="/notificacoes"     element={<ProtectedLayout><Notificacoes /></ProtectedLayout>} />
            <Route path="/configuracoes"    element={<ProtectedLayout><Configuracoes /></ProtectedLayout>} />
            <Route path="/admin/planos"       element={<ProtectedLayout><GestaoPlanos /></ProtectedLayout>} />
            <Route path="/empresa/operadores" element={<ProtectedLayout><GestaoOperadores /></ProtectedLayout>} />
            <Route path="/empresa/perfis"     element={<ProtectedLayout><GestaoPerfis /></ProtectedLayout>} />

            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
