import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsuario, auth, clearAuth } from '../lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const usuario = getUsuario();

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch {}
    clearAuth();
    navigate('/login');
  }, [navigate]);

  return { usuario, logout };
}
