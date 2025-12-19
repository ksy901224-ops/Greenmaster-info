
import React, { useState } from 'react';
import { Menu, X, MapPin, Users, Home, PlusSquare, Settings, LogOut, Shield, User, Share2, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { UserRole } from '../types';
import { isMockMode } from '../firebaseConfig';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAdmin, canViewFullData, currentPath, navigate } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 역할 기반 네비게이션 항목 정의
  const getNavItems = () => {
    const items = [
      { label: '홈', path: '/', icon: <Home size={18} /> },
      { label: '골프장', path: '/courses', icon: <MapPin size={18} /> },
    ];

    // 중급자 이상만 관계도 및 등록 가능
    if (canViewFullData) {
      items.push({ label: '관계도', path: '/relationship-map', icon: <Share2 size={18} /> });
      items.push({ label: '등록', path: '/write', icon: <PlusSquare size={18} /> });
    }

    // 관리자 및 상급자만 Admin 메뉴 노출
    if (isAdmin) {
      items.push({ label: 'Admin', path: '/admin-dashboard', icon: <Shield size={18} /> });
    }
    
    items.push({ label: '설정', path: '/settings', icon: <Settings size={18} /> });
    return items;
  };

  const navItems = getNavItems();
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-100 rounded-full blur-[100px] opacity-40 translate-x-1/3 -translate-y-1/3"></div>
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-900/75 backdrop-blur-xl shadow-lg text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center space-x-2 group">
            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-all">
              <Shield size={20} className="text-brand-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-none">GreenMaster</span>
              <span className="text-[10px] text-brand-300 font-medium">INTELLIGENCE</span>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            <nav className="flex items-center space-x-1 bg-white/5 p-1 rounded-full border border-white/10">
              {navItems.map((item) => (
                <a
                  key={item.path}
                  href={`#${item.path}`}
                  onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive(item.path)
                      ? 'bg-white text-brand-900 shadow-md'
                      : 'text-brand-100 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </a>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center space-x-4">
             <div className="text-right hidden lg:block">
                <div className="text-sm font-bold leading-none">{user?.name}</div>
                <div className="text-[10px] text-brand-300 mt-1">{user?.role.split(' (')[0]}</div>
             </div>
             <button onClick={logout} className="p-2 rounded-full text-brand-200 hover:text-white hover:bg-white/10 transition-colors">
               <LogOut size={18} />
             </button>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-brand-100">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-brand-900/95 backdrop-blur-2xl border-t border-white/10 absolute w-full left-0 top-16 shadow-2xl animate-in slide-in-from-top-5">
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.path}
                  href={`#${item.path}`}
                  onClick={(e) => { e.preventDefault(); navigate(item.path); setIsMobileMenuOpen(false); }}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium ${
                    isActive(item.path) ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
              <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-200 hover:bg-red-900/40 mt-4 border border-red-500/20">
                  <LogOut size={20} />
                  <span>로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full p-4 md:p-8 relative z-10">
        {children}
      </main>

      <footer className="bg-white/50 border-t border-slate-200 py-6 text-center text-slate-500 text-sm">
        <p>© 2024 GreenMaster Info System.</p>
        <div className="flex items-center justify-center space-x-2 text-[10px] mt-1">
            <div className={`w-2 h-2 rounded-full ${!isMockMode ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            <span>{isMockMode ? 'Offline Mode' : 'Connected'}</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
