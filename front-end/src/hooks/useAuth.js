import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginState, auth, clearAuth } from '../lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const [loginState, setLoginStateLocal] = useState(getLoginState);

  useEffect(() => {
    const sync = () => setLoginStateLocal(getLoginState());
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  }, []);

  // CR-F2: logout não silencia erro — sessão do servidor deve ser invalidada
  const logout = useCallback(async () => {
    await auth.logout();
    clearAuth();
    navigate('/login');
  }, [navigate]);

  // Permissões efetivas da empresa atual (primeira da lista ao fazer login)
  const permissoes = new Set(loginState?.empresas?.[0]?.permissoes ?? []);

  // CR-F7: deps completas — permissoes incluída para evitar stale closure
  const temPermissao = useCallback((codigo) => {
    if (loginState?.adminSistema) return true;
    return permissoes.has(codigo);
  }, [loginState, permissoes]);

  return {
    usuario: loginState?.usuario ?? null,
    tipoConta: loginState?.usuario?.tipoConta ?? null,
    adminSistema: loginState?.adminSistema ?? false,
    senhaProvisoria: loginState?.senhaProvisoria ?? false,
    permissoes,
    temPermissao,
    logout,
  };
}
