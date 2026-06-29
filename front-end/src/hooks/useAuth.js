import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginState, getEmpresaAtiva, auth, clearAuth } from '../lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const [loginState, setLoginStateLocal] = useState(getLoginState);

  useEffect(() => {
    const sync = () => setLoginStateLocal(getLoginState());
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  }, []);

  // Atualiza permissões a cada 30s para refletir mudanças feitas por administradores
  // sem exigir logout do usuário
  useEffect(() => {
    const refresh = async () => {
      try {
        const data = await auth.refreshPermissoes();
        const current = getLoginState();
        // S.11: atualiza as permissões da empresa ATIVA (não assume índice 0)
        const ativa = getEmpresaAtiva();
        const alvo = current?.empresas?.find((e) => e.id === ativa?.id) ?? current?.empresas?.[0];
        if (alvo && data?.permissoes) {
          alvo.permissoes = data.permissoes;
          if (data.perfilNome) alvo.perfilNome = data.perfilNome;
          setLoginState(current);
        }
      } catch { /* 401 handler em api.js já faz logout e redirecionamento */ }
    };
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  // CR-F2: logout não silencia erro — sessão do servidor deve ser invalidada
  const logout = useCallback(async () => {
    await auth.logout();
    clearAuth();
    navigate('/login');
  }, [navigate]);

  // Permissões efetivas da empresa ATIVA (S.11: empresa selecionada, com fallback ao 1º vínculo)
  const empresaAtiva = getEmpresaAtiva();
  const permissoes = new Set(empresaAtiva?.permissoes ?? loginState?.empresas?.[0]?.permissoes ?? []);

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
