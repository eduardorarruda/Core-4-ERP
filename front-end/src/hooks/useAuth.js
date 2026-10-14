import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, clearAuth } from '../lib/api';
import { useAuthContext, empresaAtivaDe } from '../context/AuthContext';

/**
 * Leitura do estado de autenticação. O estado e o polling de permissões vivem no
 * AuthProvider (um único intervalo para o app inteiro); este hook só deriva valores.
 */
export function useAuth() {
  const navigate = useNavigate();
  const { loginState } = useAuthContext();

  // CR-F2: logout não silencia erro — sessão do servidor deve ser invalidada
  const logout = useCallback(async () => {
    await auth.logout();
    clearAuth();
    navigate('/login');
  }, [navigate]);

  // Permissões efetivas da empresa ATIVA (S.11: empresa selecionada, com fallback ao 1º vínculo)
  const permissoes = useMemo(
    () => new Set(empresaAtivaDe(loginState)?.permissoes ?? []),
    [loginState],
  );

  const adminSistema = loginState?.adminSistema ?? false;
  const temPermissao = useCallback(
    (codigo) => adminSistema || permissoes.has(codigo),
    [adminSistema, permissoes],
  );

  return {
    usuario: loginState?.usuario ?? null,
    tipoConta: loginState?.usuario?.tipoConta ?? null,
    adminSistema,
    senhaProvisoria: loginState?.senhaProvisoria ?? false,
    permissoes,
    temPermissao,
    logout,
  };
}
