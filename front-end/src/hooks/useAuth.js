import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsuario, auth, clearAuth } from '../lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const [usuario, setUsuarioState] = useState(getUsuario);

  useEffect(() => {
    const sync = () => setUsuarioState(getUsuario());
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch {}
    clearAuth();
    navigate('/login');
  }, [navigate]);

  return { usuario, logout };
}
