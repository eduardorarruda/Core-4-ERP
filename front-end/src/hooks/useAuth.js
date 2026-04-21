import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsuario, auth } from '../lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const usuario = getUsuario();

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch {}
    localStorage.removeItem('usuario');
    navigate('/login');
  }, [navigate]);

  return { usuario, logout };
}
