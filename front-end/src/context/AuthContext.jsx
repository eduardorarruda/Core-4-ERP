import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth, getLoginState, setLoginState } from '../lib/api';

export const AuthContext = createContext(null);

// Intervalo do polling de permissões: reflete mudanças feitas por administradores
// sem exigir novo login. O backend tem cache de 30s, então menos que isso é desperdício.
const INTERVALO_PERMISSOES_MS = 30_000;

/** Empresa ativa calculada a partir de um loginState (sem reler o storage). */
export function empresaAtivaDe(state) {
  const empresas = state?.empresas ?? [];
  return empresas.find((e) => e.id === state?.empresaAtivaId) ?? empresas[0] ?? null;
}

/**
 * Fonte única do estado de autenticação. Existe UM polling de permissões para o app inteiro
 * (antes cada componente que usava useAuth criava o seu), pausado com a aba em segundo plano
 * e reativado com uma atualização imediata quando a aba volta a ficar visível.
 */
export function AuthProvider({ children }) {
  const [loginState, setLoginStateLocal] = useState(getLoginState);
  const autenticado = Boolean(loginState);
  const emAndamento = useRef(false);

  useEffect(() => {
    const sync = () => setLoginStateLocal(getLoginState());
    window.addEventListener('auth-change', sync);
    // Outra aba fez login/logout ou trocou de empresa
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const atualizarPermissoes = useCallback(async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    try {
      const data = await auth.refreshPermissoes();
      const atual = getLoginState();
      const alvo = empresaAtivaDe(atual);
      if (!atual || !alvo || !data?.permissoes) return;
      // Cópia imutável: só a empresa ativa recebe as permissões novas
      const empresas = atual.empresas.map((e) => (
        e.id === alvo.id
          ? { ...e, permissoes: data.permissoes, perfilNome: data.perfilNome ?? e.perfilNome }
          : e
      ));
      setLoginState({ ...atual, empresas });
    } catch (err) {
      // 401 já é tratado em api.js (limpa a sessão e volta ao login). Falha de rede é
      // transitória: mantemos as permissões atuais e tentamos de novo no próximo ciclo.
      if (import.meta.env.DEV) console.warn('Falha ao atualizar permissões:', err);
    } finally {
      emAndamento.current = false;
    }
  }, []);

  useEffect(() => {
    if (!autenticado) return undefined;
    let intervalo = null;
    const iniciar = () => {
      if (intervalo) return;
      intervalo = setInterval(atualizarPermissoes, INTERVALO_PERMISSOES_MS);
    };
    const parar = () => {
      if (intervalo) { clearInterval(intervalo); intervalo = null; }
    };
    const onVisibilidade = () => {
      if (document.hidden) {
        parar();
      } else {
        atualizarPermissoes();
        iniciar();
      }
    };
    if (!document.hidden) iniciar();
    document.addEventListener('visibilitychange', onVisibilidade);
    return () => {
      parar();
      document.removeEventListener('visibilitychange', onVisibilidade);
    };
  }, [autenticado, atualizarPermissoes]);

  const value = useMemo(() => ({ loginState, atualizarPermissoes }), [loginState, atualizarPermissoes]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>');
  return ctx;
}
