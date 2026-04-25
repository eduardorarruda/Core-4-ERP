import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, History, Menu, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function getInitials(nome) {
  if (!nome) return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function TopNav({ onMenuClick, onSearch }) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch?.(value);
    }, 300);
  }, [onSearch]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 w-full z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center h-16 px-4 lg:px-8 shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-4 lg:gap-8 flex-1">
      </div>

      <div className="flex items-center gap-2 lg:gap-6 text-primary">
        <button className="hover:bg-surface-medium p-2 rounded-lg transition-all relative text-zinc-400 hidden xs:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="hover:bg-surface-medium p-2 rounded-lg transition-all text-zinc-400 hidden xs:block">
          <History className="w-5 h-5" />
        </button>

        <div className="relative" ref={wrapperRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden border border-white/10 cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center bg-surface-medium"
          >
            {usuario?.fotoPerfil ? (
              <img
                src={usuario.fotoPerfil}
                alt="Perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white select-none">
                {getInitials(usuario?.nome)}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-medium border border-white/10 shadow-xl overflow-hidden z-50">
              {usuario && (
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-bold text-white truncate">{usuario.nome}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{usuario.email}</p>
                </div>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/configuracoes'); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-300 hover:bg-surface-highest hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações da Conta
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-surface-highest transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
