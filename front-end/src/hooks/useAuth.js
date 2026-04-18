import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsuario } from '../lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const usuario = getUsuario();

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    navigate('/login');
  }, [navigate]);

  return { usuario, logout };
}
