import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import Dashboard from './views/Dashboard';
import Transactions from './views/Transactions';
import Reconciliation from './views/Reconciliation';
import Reports from './views/Reports';
import Audit from './views/Audit';
import Login from './views/Login';
import { TransactionProvider } from './context/TransactionContext';
import { cn } from './lib/utils';

function ProtectedLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface flex relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-50",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TransactionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          } />

          <Route path="/transactions" element={
            <ProtectedLayout>
              <Transactions />
            </ProtectedLayout>
          } />

          <Route path="/reconciliation" element={
            <ProtectedLayout>
              <Reconciliation />
            </ProtectedLayout>
          } />

          <Route path="/reports" element={
            <ProtectedLayout>
              <Reports />
            </ProtectedLayout>
          } />

          <Route path="/audit" element={
            <ProtectedLayout>
              <Audit />
            </ProtectedLayout>
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </TransactionProvider>
  );
}
