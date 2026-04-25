import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import Dashboard from './views/Dashboard';
import Assinaturas from './views/Assinaturas';
import Calendario from './views/Calendario';
import Categorias from './views/Categorias';
import Reports from './views/Reports';
import Audit from './views/Audit';
import Login from './views/Login';
import Register from './views/Register';
import Parceiros from './views/Parceiros';
import ContasCorrentes from './views/ContasCorrentes';
import ContasFinanceiras from './views/ContasFinanceiras';
import Cartoes from './views/Cartoes';
import Investimentos from './views/Investimentos';
import Notificacoes from './views/Notificacoes';
import Configuracoes from './views/Configuracoes';
import ChatSidebar from './components/chat/ChatSidebar';
import { getUsuario } from './lib/api';
import { cn } from './lib/utils';

function isAuthenticated() {
  return Boolean(localStorage.getItem('usuario'));
}

function AdminRoute({ children }) {
  const usuario = getUsuario();
  if (!usuario || usuario.role !== 'ROLE_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function ProtectedLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface flex relative overflow-x-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={cn(
        "fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-50",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      <ChatSidebar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard"        element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
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
    </BrowserRouter>
  );
}
