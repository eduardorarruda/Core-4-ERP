import React, { useRef, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, History, Menu, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ThemeContext } from '../../context/ThemeContext';

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
  const { theme, toggleTheme } = useContext(ThemeContext);
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
        <button className="hover:bg-surface-medium p-2 rounded-lg transition-all relative text-text-primary/60 hidden xs:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="hover:bg-surface-medium p-2 rounded-lg transition-all text-text-primary/60 hidden xs:block">
          <History className="w-5 h-5" />
        </button>

        <button
          onClick={toggleTheme}
          title="Alternar tema"
          className="hover:bg-surface-medium p-2 rounded-lg transition-colors duration-200 text-text-primary/60 hover:text-text-primary"
        >
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <div className="relative" ref={wrapperRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden border border-text-primary/10 cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center bg-surface-medium"
          >
            {usuario?.fotoPerfil ? (
              <img
                src={usuario.fotoPerfil}
                alt="Perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-text-primary select-none">
                {getInitials(usuario?.nome)}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-medium border border-text-primary/10 shadow-xl overflow-hidden z-50">
              {usuario && (
                <div className="px-4 py-3 border-b border-text-primary/10">
                  <p className="text-xs font-bold text-text-primary truncate">{usuario.nome}</p>
                  <p className="text-[10px] text-text-primary/50 truncate">{usuario.email}</p>
                </div>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/configuracoes'); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-primary/80 hover:bg-surface-highest hover:text-text-primary transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações da Conta
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-error hover:bg-surface-highest transition-colors"
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
