import React, { lazy, Suspense, useState, useCallback, useContext, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import PwaStatus from './components/layout/PwaStatus';
import InstalarPwaBanner from './components/layout/InstalarPwaBanner';
import ChatLauncher from './components/chat/ChatLauncher';
import BottomNav from './components/layout/BottomNav';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './hooks/useConfirm';
import { ToastContainer } from './components/ui/Toast';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './context/AuthContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import { setRobotsNoindex } from './hooks/usePageMeta';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import { cn } from './lib/utils';
import SkeletonCard from './components/ui/SkeletonCard';
import { getFirstAccessibleRoute } from './lib/routeUtils';
import { ThemeContext } from './context/ThemeContext';
import { useAtalhosGlobais } from './hooks/useAtalhos';
import { PageTransition } from './components/motion/Movimento';

/* Fundo vivo: luz esmeralda que deriva devagar + os fios curvos dos cantos da logo */
function FundoCore4() {
  return (
    <div className="c4-backdrop" aria-hidden="true">
      <span className="b1" />
      <span className="b2" />
      <span className="b3" />
      <svg className="-left-px -top-px w-[38vmin] h-[38vmin] opacity-40" viewBox="0 0 200 200" fill="none">
        <path d="M200 0 L60 140 Q40 160 0 160" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="-right-px -bottom-px w-[38vmin] h-[38vmin] opacity-40" viewBox="0 0 200 200" fill="none">
        <path d="M0 200 L140 60 Q160 40 200 40" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

const DashboardHome     = lazy(() => import('./views/DashboardHome'));
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
const Assistente      = lazy(() => import('./views/Assistente'));
const Audit           = lazy(() => import('./views/Audit'));
const Parceiros       = lazy(() => import('./views/Parceiros'));
const ContasCorrentes = lazy(() => import('./views/ContasCorrentes'));
const ContasFinanceiras = lazy(() => import('./views/ContasFinanceiras'));
const Cartoes         = lazy(() => import('./views/Cartoes'));
const Investimentos   = lazy(() => import('./views/Investimentos'));
const Configuracoes   = lazy(() => import('./views/Configuracoes'));
const CommandPalette  = lazy(() => import('./components/ui/CommandPalette'));
const AceitarConvite     = lazy(() => import('./views/AceitarConvite'));
const GestaoOperadores   = lazy(() => import('./views/GestaoOperadores'));
const GestaoPerfis       = lazy(() => import('./views/GestaoPerfis'));
const Ajuda              = lazy(() => import('./views/Ajuda'));
const Privacidade        = lazy(() => import('./views/Privacidade'));
const Termos             = lazy(() => import('./views/Termos'));

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
  // localStorage: sessão compartilhada entre abas (o JWT continua só no cookie HttpOnly).
  // Fallback ao sessionStorage cobre sessões abertas antes da migração.
  return Boolean(localStorage.getItem('usuario') || sessionStorage.getItem('usuario'));
}

function NavigateToFirstAccessible() {
  const { temPermissao } = useAuth();
  return <Navigate to={getFirstAccessibleRoute(temPermissao)} replace />;
}

function PermissaoRoute({ permissao, children }) {
  const { temPermissao } = useAuth();
  if (!temPermissao(permissao)) {
    return <NavigateToFirstAccessible />;
  }
  return children;
}

function ContaEmpresaRoute({ children }) {
  const { tipoConta } = useAuth();
  if (tipoConta === 'PESSOA_FISICA') {
    return <NavigateToFirstAccessible />;
  }
  return children;
}

function SenhaProvisoriaModal({ open, onConfirm, onSair }) {
  return (
    <Modal
      open={open}
      onClose={() => {}}
      closeOnEsc={false}
      closeOnOverlay={false}
      showClose={false}
      size="sm"
      title="Troque sua senha"
      description="Você entrou com uma senha provisória. Defina uma senha sua para liberar o acesso ao sistema."
    >
      <Modal.Footer className="flex-col-reverse sm:flex-row">
        <Button variant="ghost" onClick={onSair} className="w-full sm:w-auto">Sair</Button>
        <Button onClick={onConfirm} className="w-full sm:w-auto">Definir minha senha</Button>
      </Modal.Footer>
    </Modal>
  );
}

const FOCAVEIS_DRAWER = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ProtectedLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { senhaProvisoria, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const drawerRef = useRef(null);
  const focoAntesDoDrawer = useRef(null);
  // Rotas "tela cheia": ocupam toda a área (sem padding/max-width) — ex.: a tela da Áurea, que
  // precisa dos 2 painéis do tamanho da janela, estilo ChatGPT.
  const fullBleed = pathname === '/assistente';
  // Com senha provisória o backend bloqueia quase tudo: o modal fica aberto em qualquer tela,
  // exceto em Configurações, onde a troca é feita.
  const exibirModalSenha = senhaProvisoria && pathname !== '/configuracoes';

  const { toggleTheme } = useContext(ThemeContext);
  const openCmd = useCallback(() => setCmdOpen(true), []);
  const closeCmd = useCallback(() => setCmdOpen(false), []);
  const abrirMenu = useCallback(() => {
    focoAntesDoDrawer.current = document.activeElement;
    setIsSidebarOpen(true);
  }, []);
  const fecharMenu = useCallback(() => setIsSidebarOpen(false), []);

  // Atalhos: Alt+1…9 telas · P privacidade · T tema · / busca
  useAtalhosGlobais({ navegar: navigate, alternarTema: toggleTheme, abrirBusca: openCmd });

  // Telas autenticadas não devem ser indexadas por buscadores
  useEffect(() => {
    setRobotsNoindex(true);
    return () => setRobotsNoindex(false);
  }, []);

  // Drawer mobile: foco entra no menu ao abrir, Esc fecha e o foco volta para quem abriu
  const drawerAberto = isSidebarOpen && !desktop;
  useEffect(() => {
    if (!drawerAberto) return undefined;
    drawerRef.current?.querySelector(FOCAVEIS_DRAWER)?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setIsSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    const quemAbriu = focoAntesDoDrawer.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      quemAbriu?.focus?.();
    };
  }, [drawerAberto]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-dvh bg-surface flex relative overflow-hidden">
      <FundoCore4 />
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={fecharMenu}
        />
      )}

      {/* Sidebar — no mobile vira drawer; fechado fica `inert` (fora do Tab e do leitor de tela) */}
      <div
        ref={drawerRef}
        inert={!desktop && !isSidebarOpen ? true : undefined}
        role={drawerAberto ? 'dialog' : undefined}
        aria-modal={drawerAberto ? 'true' : undefined}
        aria-label={drawerAberto ? 'Menu principal' : undefined}
        className={cn(
          'fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-50',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/*
          expandido = drawer aberto no mobile → rótulos sempre visíveis (w-56).
          No desktop isSidebarOpen é sempre false → mantém o rail w-16 com hover/foco.
          onNavigate fecha o drawer ao clicar num item de menu.
        */}
        <Sidebar
          expandido={isSidebarOpen}
          onNavigate={fecharMenu}
          onClose={fecharMenu}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-[1]">
        <TopNav
          onMenuClick={abrirMenu}
          onCommandPaletteOpen={openCmd}
        />
        <PwaStatus />
        <main id="main-content" className={cn(
          'flex-1 min-h-0',
          fullBleed ? 'overflow-hidden' : 'p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto no-scrollbar'
        )}>
          {fullBleed ? (
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          ) : (
            <PageTransition key={pathname} className="max-w-7xl mx-auto">
              <Suspense fallback={<PageSkeleton />}>
                {children}
              </Suspense>
            </PageTransition>
          )}
        </main>
      </div>

      <ChatLauncher />

      {/* Navegação inferior — apenas mobile (lg:hidden). Abre o mesmo drawer do Sidebar. */}
      <BottomNav onAbrirMenu={abrirMenu} />

      <ToastContainer />

      {/* Command Palette */}
      {cmdOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={closeCmd} />
        </Suspense>
      )}

      <SenhaProvisoriaModal
        open={exibirModalSenha}
        onConfirm={() => navigate('/configuracoes?aba=seguranca')}
        onSair={logout}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="/aceitar-convite"    element={<AceitarConvite />} />
            <Route path="/privacidade"        element={<Privacidade />} />
            <Route path="/termos"             element={<Termos />} />

            <Route path="/dashboard"        element={<ProtectedLayout><PermissaoRoute permissao="DASHBOARD_VISUALIZAR"><DashboardHome /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/conciliacao"              element={<ProtectedLayout><PermissaoRoute permissao="CONCILIACAO_VISUALIZAR"><Conciliacao /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/conciliacao/historico"   element={<ProtectedLayout><PermissaoRoute permissao="CONCILIACAO_VISUALIZAR"><ConciliacaoHistorico /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/conciliacao/:id"          element={<ProtectedLayout><PermissaoRoute permissao="CONCILIACAO_VISUALIZAR"><Conciliacao /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/conciliacao/:id/relatorio" element={<ProtectedLayout><PermissaoRoute permissao="CONCILIACAO_VISUALIZAR"><ConciliacaoRelatorio /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/assinaturas"      element={<ProtectedLayout><PermissaoRoute permissao="ASSINATURA_VISUALIZAR"><Assinaturas /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/calendario"       element={<ProtectedLayout><PermissaoRoute permissao="CALENDARIO_VISUALIZAR"><Calendario /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/reports"          element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/assistente"       element={<ProtectedLayout><Assistente /></ProtectedLayout>} />
            <Route path="/audit"            element={<ProtectedLayout><ContaEmpresaRoute><PermissaoRoute permissao="AUDITORIA_VISUALIZAR"><Audit /></PermissaoRoute></ContaEmpresaRoute></ProtectedLayout>} />
            <Route path="/parceiros"        element={<ProtectedLayout><PermissaoRoute permissao="PARCEIRO_VISUALIZAR"><Parceiros /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/categorias"       element={<ProtectedLayout><PermissaoRoute permissao="CATEGORIA_VISUALIZAR"><Categorias /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/contas-correntes" element={<ProtectedLayout><PermissaoRoute permissao="CONTA_CORRENTE_VISUALIZAR"><ContasCorrentes /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/contas"           element={<ProtectedLayout><PermissaoRoute permissao="CONTA_VISUALIZAR"><ContasFinanceiras /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/cartoes"                              element={<ProtectedLayout><PermissaoRoute permissao="CARTAO_LANCAR"><Cartoes /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/cartoes/dashboard"                    element={<ProtectedLayout><PermissaoRoute permissao="CARTAO_VISUALIZAR"><CartaoDashboard /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao"                  element={<ProtectedLayout><PermissaoRoute permissao="CARTAO_CONCILIACAO_VISUALIZAR"><ConciliacaoCartao /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao/historico"        element={<ProtectedLayout><PermissaoRoute permissao="CARTAO_CONCILIACAO_VISUALIZAR"><ConciliacaoCartaoHistorico /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao/:id"              element={<ProtectedLayout><PermissaoRoute permissao="CARTAO_CONCILIACAO_VISUALIZAR"><ConciliacaoCartao /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/cartoes/conciliacao/:id/relatorio"    element={<ProtectedLayout><PermissaoRoute permissao="CARTAO_CONCILIACAO_VISUALIZAR"><ConciliacaoCartaoRelatorio /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/investimentos"    element={<ProtectedLayout><PermissaoRoute permissao="INVESTIMENTO_VISUALIZAR"><Investimentos /></PermissaoRoute></ProtectedLayout>} />
            <Route path="/configuracoes"    element={<ProtectedLayout><Configuracoes /></ProtectedLayout>} />
            <Route path="/ajuda"            element={<ProtectedLayout><Ajuda /></ProtectedLayout>} />
            <Route path="/help"             element={<Navigate to="/ajuda" replace />} />
            <Route path="/empresa/operadores" element={<ProtectedLayout><ContaEmpresaRoute><PermissaoRoute permissao="USUARIO_VISUALIZAR"><GestaoOperadores /></PermissaoRoute></ContaEmpresaRoute></ProtectedLayout>} />
            <Route path="/empresa/perfis"     element={<ProtectedLayout><ContaEmpresaRoute><PermissaoRoute permissao="CONFIGURACAO_EDITAR"><GestaoPerfis /></PermissaoRoute></ContaEmpresaRoute></ProtectedLayout>} />

            <Route path="/"  element={<NavigateToFirstAccessible />} />
            <Route path="*"  element={<NavigateToFirstAccessible />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>

          {/* Convite de instalação do PWA — global (aparece inclusive na tela de login). */}
          <InstalarPwaBanner />
        </ConfirmProvider>
      </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
