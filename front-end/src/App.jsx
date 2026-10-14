import React, { lazy, Suspense, useState, useCallback, useContext, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import BottomNav from './components/layout/BottomNav';
import FundoVivo from './components/layout/FundoVivo';
import RodapeApp from './components/layout/RodapeApp';
import CamadaAcessibilidade from './components/acessibilidade/CamadaAcessibilidade';
import PwaStatus from './components/layout/PwaStatus';
import InstalarPwaBanner from './components/layout/InstalarPwaBanner';
import ChatLauncher from './components/chat/ChatLauncher';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import { PageSkeleton } from './components/ui/Skeleton';
import { ToastContainer } from './components/ui/Toast';
import { PageTransition } from './components/motion/Movimento';
import { variantesDrawer, variantesOverlay } from './components/motion/presets';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './hooks/useConfirm';
import { useAuth } from './hooks/useAuth';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePageMeta } from './hooks/usePageMeta';
import { useAtalhosGlobais } from './hooks/useAtalhos';
import { useFocusTrap } from './hooks/useFocusTrap';
import { useMovimentoReduzido } from './hooks/useAcessibilidade';
import { AuthProvider } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';
import { getFirstAccessibleRoute } from './lib/routeUtils';
import { tituloDaRota } from './lib/navigation';

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
const Orcamentos      = lazy(() => import('./views/Orcamentos'));
const Insights        = lazy(() => import('./views/Insights'));
const Configuracoes   = lazy(() => import('./views/Configuracoes'));
const CommandPalette  = lazy(() => import('./components/ui/CommandPalette'));
const AceitarConvite     = lazy(() => import('./views/AceitarConvite'));
const GestaoOperadores   = lazy(() => import('./views/GestaoOperadores'));
const GestaoPerfis       = lazy(() => import('./views/GestaoPerfis'));
const Ajuda              = lazy(() => import('./views/Ajuda'));
const Privacidade        = lazy(() => import('./views/Privacidade'));
const Termos             = lazy(() => import('./views/Termos'));
const Acessibilidade     = lazy(() => import('./views/Acessibilidade'));

const CHAVE_SIDEBAR = 'c4_sidebar_recolhida';

function isAuthenticated() {
  // localStorage: sessão compartilhada entre abas (o JWT continua só no cookie HttpOnly).
  // Fallback ao sessionStorage cobre sessões abertas antes da migração.
  return Boolean(localStorage.getItem('usuario') || sessionStorage.getItem('usuario'));
}

function lerSidebarRecolhida() {
  try { return localStorage.getItem(CHAVE_SIDEBAR) === '1'; } catch { return false; }
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
      description="Você entrou com uma senha provisória. Defina uma senha sua para liberar o acesso ao Core 4."
    >
      <Modal.Footer className="flex-col-reverse sm:flex-row">
        <Button variant="ghost" onClick={onSair} className="w-full sm:w-auto">Sair</Button>
        <Button onClick={onConfirm} className="w-full sm:w-auto">Definir minha senha</Button>
      </Modal.Footer>
    </Modal>
  );
}

/** Menu lateral no celular: gaveta da esquerda com mola, foco preso e Esc para fechar. */
function MenuMobile({ aberto, onFechar, onBuscar }) {
  const painelRef = useRef(null);
  const reduzir = useMovimentoReduzido();
  useFocusTrap(aberto, painelRef, { onClose: onFechar });
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div key="menu-mobile" className="fixed inset-0 z-[60] lg:hidden" initial="inicial" animate="visivel" exit="saida">
          <motion.div
            aria-hidden="true"
            variants={variantesOverlay}
            className="absolute inset-0 bg-surface-overlay backdrop-blur-sm"
            onClick={onFechar}
          />
          <motion.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            tabIndex={-1}
            variants={reduzir ? variantesOverlay : variantesDrawer('left')}
            className="absolute inset-y-0 left-0 outline-none shadow-elevated"
          >
            <Sidebar drawer onNavigate={onFechar} onBuscar={() => { onFechar(); onBuscar(); }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProtectedLayout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhida, setRecolhida] = useState(lerSidebarRecolhida);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { senhaProvisoria, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const mainRef = useRef(null);
  const { toggleTheme } = useContext(ThemeContext);

  // Rotas "tela cheia": a Áurea ocupa toda a área (dois painéis do tamanho da janela)
  const fullBleed = pathname === '/assistente';
  // Com senha provisória o backend bloqueia quase tudo: o modal fica aberto em qualquer tela,
  // exceto em Configurações, onde a troca é feita.
  const exibirModalSenha = senhaProvisoria && pathname !== '/configuracoes';

  const openCmd = useCallback(() => setCmdOpen(true), []);
  const closeCmd = useCallback(() => setCmdOpen(false), []);
  const abrirMenu = useCallback(() => setMenuAberto(true), []);
  const fecharMenu = useCallback(() => setMenuAberto(false), []);
  const alternarRecolhida = useCallback(() => {
    setRecolhida((v) => {
      try { localStorage.setItem(CHAVE_SIDEBAR, v ? '0' : '1'); } catch { /* sem storage */ }
      return !v;
    });
  }, []);

  // Atalhos: Ctrl/⌘+K busca · Alt+T tema · Alt+P privacidade
  useAtalhosGlobais({ alternarTema: toggleTheme, abrirBusca: openCmd });

  // Título da aba a partir da navegação; telas autenticadas não são indexadas
  usePageMeta({ title: tituloDaRota(pathname) ?? 'Core 4', noindex: true });

  // Cada tela começa do topo (o contêiner do <main> é quem rola)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-dvh flex relative overflow-hidden bg-surface">
      <FundoVivo />

      {/* Menu lateral fixo (desktop) */}
      <div className="hidden lg:block relative z-30 shrink-0">
        <Sidebar recolhida={recolhida} onAlternarRecolhida={alternarRecolhida} onBuscar={openCmd} />
      </div>

      {/* Menu lateral em gaveta (celular) */}
      <MenuMobile aberto={menuAberto && !desktop} onFechar={fecharMenu} onBuscar={openCmd} />

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 relative z-[1]">
        <TopNav onCommandPaletteOpen={openCmd} />
        <PwaStatus />
        {fullBleed ? (
          <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 min-h-0 outline-none overflow-hidden">
            <Suspense fallback={<div className="p-6"><PageSkeleton kpis={0} /></div>}>
              <Outlet />
            </Suspense>
          </main>
        ) : (
          // O contêiner rola; dentro dele, <main> (conteúdo) + <footer> (ajuda e documentos, sempre no mesmo lugar)
          <div ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col">
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-10 outline-none"
            >
              <PageTransition key={pathname}>
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </PageTransition>
            </main>
            <RodapeApp className="pb-28 lg:pb-6" />
          </div>
        )}
      </div>

      <ChatLauncher />
      <BottomNav onAbrirMenu={abrirMenu} />
      <ToastContainer />

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

/** Atalho para rota protegida por permissão. */
const comPermissao = (permissao, elemento) => <PermissaoRoute permissao={permissao}>{elemento}</PermissaoRoute>;
const soEmpresa = (permissao, elemento) => (
  <ContaEmpresaRoute><PermissaoRoute permissao={permissao}>{elemento}</PermissaoRoute></ContaEmpresaRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          {/* Modo de acessibilidade: links "pular para…", anúncio de troca de página, guia de leitura e painel (Alt+A) */}
          <CamadaAcessibilidade />

          <ErrorBoundary>
          <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
          <Routes>
            <Route path="/login"              element={<Login />} />
            <Route path="/register"           element={<Register />} />
            <Route path="/redefinir-senha"    element={<RedefinirSenha />} />
            <Route path="/aceitar-convite"    element={<AceitarConvite />} />
            <Route path="/privacidade"        element={<Privacidade />} />
            <Route path="/termos"             element={<Termos />} />
            <Route path="/acessibilidade"     element={<Acessibilidade />} />

            {/* Área logada: um único layout (menu, barra, transição) para todas as telas */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard"        element={comPermissao('DASHBOARD_VISUALIZAR', <DashboardHome />)} />
              <Route path="/insights"         element={comPermissao('DASHBOARD_VISUALIZAR', <Insights />)} />
              <Route path="/orcamentos"       element={comPermissao('ORCAMENTO_VISUALIZAR', <Orcamentos />)} />
              <Route path="/conciliacao"                element={comPermissao('CONCILIACAO_VISUALIZAR', <Conciliacao />)} />
              <Route path="/conciliacao/historico"      element={comPermissao('CONCILIACAO_VISUALIZAR', <ConciliacaoHistorico />)} />
              <Route path="/conciliacao/:id"            element={comPermissao('CONCILIACAO_VISUALIZAR', <Conciliacao />)} />
              <Route path="/conciliacao/:id/relatorio"  element={comPermissao('CONCILIACAO_VISUALIZAR', <ConciliacaoRelatorio />)} />
              <Route path="/assinaturas"      element={comPermissao('ASSINATURA_VISUALIZAR', <Assinaturas />)} />
              <Route path="/calendario"       element={comPermissao('CALENDARIO_VISUALIZAR', <Calendario />)} />
              <Route path="/reports"          element={<Reports />} />
              <Route path="/assistente"       element={<Assistente />} />
              <Route path="/audit"            element={soEmpresa('AUDITORIA_VISUALIZAR', <Audit />)} />
              <Route path="/parceiros"        element={comPermissao('PARCEIRO_VISUALIZAR', <Parceiros />)} />
              <Route path="/categorias"       element={comPermissao('CATEGORIA_VISUALIZAR', <Categorias />)} />
              <Route path="/contas-correntes" element={comPermissao('CONTA_CORRENTE_VISUALIZAR', <ContasCorrentes />)} />
              <Route path="/contas"           element={comPermissao('CONTA_VISUALIZAR', <ContasFinanceiras />)} />
              <Route path="/cartoes"                            element={comPermissao('CARTAO_LANCAR', <Cartoes />)} />
              <Route path="/cartoes/dashboard"                  element={comPermissao('CARTAO_VISUALIZAR', <CartaoDashboard />)} />
              <Route path="/cartoes/conciliacao"                element={comPermissao('CARTAO_CONCILIACAO_VISUALIZAR', <ConciliacaoCartao />)} />
              <Route path="/cartoes/conciliacao/historico"      element={comPermissao('CARTAO_CONCILIACAO_VISUALIZAR', <ConciliacaoCartaoHistorico />)} />
              <Route path="/cartoes/conciliacao/:id"            element={comPermissao('CARTAO_CONCILIACAO_VISUALIZAR', <ConciliacaoCartao />)} />
              <Route path="/cartoes/conciliacao/:id/relatorio"  element={comPermissao('CARTAO_CONCILIACAO_VISUALIZAR', <ConciliacaoCartaoRelatorio />)} />
              <Route path="/investimentos"    element={comPermissao('INVESTIMENTO_VISUALIZAR', <Investimentos />)} />
              <Route path="/configuracoes"    element={<Configuracoes />} />
              <Route path="/ajuda"            element={<Ajuda />} />
              <Route path="/empresa/operadores" element={soEmpresa('USUARIO_VISUALIZAR', <GestaoOperadores />)} />
              <Route path="/empresa/perfis"     element={soEmpresa('CONFIGURACAO_EDITAR', <GestaoPerfis />)} />
            </Route>

            <Route path="/help" element={<Navigate to="/ajuda" replace />} />
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
