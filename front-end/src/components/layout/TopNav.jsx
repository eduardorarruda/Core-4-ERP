import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, History, Menu } from 'lucide-react';

export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center h-16 px-4 lg:px-8 shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-4 lg:gap-8 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-zinc-400 hover:text-primary transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-white font-bold text-sm lg:text-lg uppercase tracking-widest whitespace-nowrap hidden sm:block">Financial Architect</span>
        <div className="relative w-full max-w-[200px] lg:max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
          <input
            className="w-full bg-surface-low border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-zinc-600 outline-none"
            placeholder="Search..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-6 text-primary">
        <button className="hover:bg-surface-medium p-2 rounded-lg transition-all relative text-zinc-400 hidden xs:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="hover:bg-surface-medium p-2 rounded-lg transition-all text-zinc-400 hidden xs:block">
          <History className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden border border-white/10 cursor-pointer hover:border-primary/50 transition-colors" onClick={handleLogout}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNW_eS8hzpzv6sGpq4inGYNVwDkBWDm6VV7tV2IkSdNcpytKRU8XDSBelJUEaYCyHzfSXR-1wIcWCzjpZjf9jQuc1p8lUCblg8ibGWFv1_pRFlAadchf-8kKpOHQChDWAVUTt1ljiOGY2eEGUBBXUb70v_E9vIEwNIzy8UC-rPxDIQs4TVrTxT0iLF1Xwv5MB7aNRjUYRp05LlaMfBIaV3RfMHO_lvH4boS0lFEe_Mjvph-emquMhuHoxVqc9_57xwXrpZirOZJYc"
            alt="Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
