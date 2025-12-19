
import React, { useState } from 'react';
import { Menu, X, MapPin, Users, Home, PlusSquare, Settings, LogOut, Shield, User, Share2, Wifi, WifiOff, Globe, Sparkles } from 'lucide-react';
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
      { label: '대시보드', path: '/', icon: <Home size={18} /> },
      { label: '마스터 DB', path: '/courses', icon: <Globe size={18} /> },
    ];

    // 중급자 이상만 관계도 및 등록 가능
    if (canViewFullData) {
      items.push({ label: '인맥 네트워크', path: '/relationship-map', icon: <Users size={18} /> });
      items.push({ label: '인텔리전스 등록', path: '/write', icon: <PlusSquare size={18} /> });
    }

    // 관리자 및 상급자만 Admin 메뉴 노출
    if (isAdmin) {
      items.push({ label: '전략 시스템', path: '/admin-dashboard', icon: <Shield size={18} /> });
    }
    
    return items;
  };

  const navItems = getNavItems();
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-100 rounded-full blur-[150px] opacity-30 translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-[150px] opacity-20 -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-2xl shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center space-x-3 group">
            <div className="bg-brand-900 p-2.5 rounded-2xl group-hover:scale-105 transition-all shadow-lg shadow-brand-900/20">
              <Shield size={22} className="text-brand-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter leading-none text-slate-900">GreenMaster</span>
              <span className="text-[9px] text-brand-600 font-black uppercase tracking-[0.3em] mt-1">Intelligence</span>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-1">
            <nav className="flex items-center space-x-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
              {navItems.map((item) => (
                <a
                  key={item.path}
                  href={`#${item.path}`}
                  onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive(item.path)
                      ? 'bg-white text-brand-900 shadow-md transform scale-105 ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </div>

          <div className="hidden lg:flex items-center space-x-6">
             <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
                <div className="text-right">
                    <div className="text-sm font-black text-slate-900 leading-none">{user?.name}</div>
                    <div className="text-[10px] text-brand-600 font-black mt-1 uppercase tracking-wider">{user?.role.split(' (')[0]}</div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <User size={20} />
                </div>
             </div>
             <button onClick={() => navigate('/settings')} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all">
               <Settings size={20} />
             </button>
             <button onClick={logout} className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
               <LogOut size={20} />
             </button>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-3 bg-slate-100 rounded-xl text-slate-600 shadow-sm">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-3xl border-t border-slate-200 absolute w-full left-0 top-20 shadow-2xl animate-in slide-in-from-top-5 duration-300">
            <div className="p-6 space-y-3">
              {navItems.map((item) => (
                <a
                  key={item.path}
                  href={`#${item.path}`}
                  onClick={(e) => { e.preventDefault(); navigate(item.path); setIsMobileMenuOpen(false); }}
                  className={`flex items-center space-x-4 px-5 py-4 rounded-2xl text-base font-black ${
                    isActive(item.path) ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                <button onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-600 font-bold flex items-center justify-center"><Settings size={20} className="mr-2"/> 설정</button>
                <button onClick={logout} className="flex-1 py-4 bg-red-50 rounded-2xl text-red-600 font-bold flex items-center justify-center"><LogOut size={20} className="mr-2"/> 로그아웃</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 lg:p-10 relative z-10">
        {children}
      </main>

      <footer className="bg-white/50 border-t border-slate-200 py-10 text-center relative z-10">
        <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
                <Shield size={16} className="text-brand-900" />
                <span className="text-sm font-black text-slate-900 tracking-tighter">GreenMaster Info System</span>
            </div>
            <p className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">Strategic Data Intelligence Platform for Golf Professional Group</p>
            <div className="flex items-center justify-center space-x-3 text-[10px] font-black">
                <div className="flex items-center px-3 py-1 bg-white rounded-full shadow-sm border border-slate-200">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${!isMockMode ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-orange-500'}`}></div>
                    <span className="text-slate-600">{isMockMode ? 'MOCK_ENGINE_ACTIVE' : 'FIREBASE_LIVE_CONNECTED'}</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">v1.0.5 PROFESSIONAL</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
