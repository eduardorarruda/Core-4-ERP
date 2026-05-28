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

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch {}
    clearAuth();
    navigate('/login');
  }, [navigate]);

  // Permissões efetivas da empresa atual (primeira da lista ao fazer login)
  const permissoes = new Set(loginState?.empresas?.[0]?.permissoes ?? []);

  const temPermissao = useCallback((codigo) => {
    // Admin sistema tem tudo
    if (loginState?.adminSistema) return true;
    return permissoes.has(codigo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginState]);

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
