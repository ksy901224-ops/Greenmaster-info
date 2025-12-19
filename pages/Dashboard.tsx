
import React, { useState, useMemo } from 'react';
import LogCard from '../components/LogCard';
import { CalendarView } from '../components/CalendarView';
import { Department, LogEntry, UserRole, GolfCourse } from '../types';
import { 
  Calendar as CalendarIcon, 
  List as ListIcon, 
  LayoutGrid, 
  Search, 
  Sparkles, 
  ChevronRight, 
  Lock, 
  TrendingUp, 
  FileText, 
  PlusCircle, 
  ArrowUpRight,
  Zap,
  Globe,
  Loader2,
  Users,
  Settings,
  Target,
  MessageSquare,
  Activity,
  BarChart3
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { searchAppWithAIStream } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { logs, courses, people, user, canUseAI, canViewFullData, navigate } = useApp();
  
  const [filterDept, setFilterDept] = useState<Department | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'course'>('list');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // 컨설팅 지수 계산
  const consultingStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const recentLogs = logs.filter(l => {
      const logDate = new Date(l.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    });

    const issuesCount = courses.reduce((acc, c) => acc + (c.issues?.length || 0), 0);
    const dataDensity = Math.min(100, Math.round((logs.length / (courses.length * 1.5)) * 100));

    return {
      recentActivity: recentLogs.length,
      criticalIssues: issuesCount,
      dataDensity,
      totalCourses: courses.length
    };
  }, [logs, courses]);

  const latestLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => {
        const timeA = a.createdAt || new Date(a.date).getTime();
        const timeB = b.createdAt || new Date(b.date).getTime();
        return timeB - timeA;
      })
      .slice(0, 12);
  }, [logs]);

  const handleAiSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiSearchQuery.trim()) return;
    setIsAiSearching(true);
    setAiSearchResult('');
    try {
      await searchAppWithAIStream(aiSearchQuery, { logs, courses, people }, (chunk) => {
        setAiSearchResult(prev => (prev || '') + chunk);
      });
    } catch (error) { 
      setAiSearchResult("데이터 분석 중 오류가 발생했습니다."); 
    } finally { 
      setIsAiSearching(false); 
    }
  };

  if (!canViewFullData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-6"><Lock size={40}/></div>
        <h2 className="text-2xl font-bold text-slate-900">액세스 권한 제한</h2>
        <p className="text-slate-500 mt-2">대시보드 인텔리전스는 중급자 이상의 권한이 필요합니다.</p>
        <button onClick={() => navigate('/courses')} className="mt-8 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold">골프장 목록 보기</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto">
      
      {/* 1. 컨설팅 요약 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-brand-950 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><BarChart3 size={120} /></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black mb-1">인텔리전스 현황</h1>
            <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-6">Strategic Consulting Dashboard</p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">데이터 밀도</p>
                <p className="text-2xl font-black">{consultingStats.dataDensity}%</p>
                <div className="w-full h-1 bg-white/10 rounded-full mt-2"><div className="h-full bg-brand-400 rounded-full" style={{width: `${consultingStats.dataDensity}%`}}></div></div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">주간 업데이트</p>
                <p className="text-2xl font-black">{consultingStats.recentActivity} <span className="text-xs font-normal text-slate-400">건</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">분석 대상 골프장</p>
            <p className="text-3xl font-black text-slate-900">{consultingStats.totalCourses}</p>
            <button onClick={() => navigate('/courses')} className="mt-4 text-[11px] font-bold text-brand-600 flex items-center hover:underline">마스터 DB 바로가기 <ChevronRight size={12}/></button>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">진행 중인 주요 이슈</p>
            <p className="text-3xl font-black text-amber-500">{consultingStats.criticalIssues}</p>
            <p className="mt-4 text-[11px] text-slate-400">데이터 기반 리스크 관리 중</p>
        </div>
      </div>

      {/* 2. 빠른 실행 및 AI 검색 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-indigo-900 rounded-[2rem] p-6 text-white shadow-lg border border-indigo-800 flex items-center gap-6">
           <div className="hidden sm:flex p-4 bg-white/10 rounded-2xl"><Sparkles size={28} className="text-indigo-300"/></div>
           <div className="flex-1">
              <h3 className="text-sm font-bold mb-3 flex items-center">AI 컨설팅 어시스턴트</h3>
              <form onSubmit={handleAiSearch} className="relative">
                <input 
                  type="text" 
                  value={aiSearchQuery} 
                  onChange={e => setAiSearchQuery(e.target.value)} 
                  placeholder="골프장 이름이나 인맥 정보를 물어보세요..." 
                  className="w-full bg-white/10 border-none rounded-xl text-xs py-3.5 pl-4 pr-12 focus:ring-2 focus:ring-indigo-400 transition-all placeholder:text-indigo-300/50" 
                />
                <button type="submit" className="absolute right-2 top-1.5 p-2 bg-indigo-500 rounded-lg hover:bg-indigo-400 transition-colors">
                  {isAiSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </form>
           </div>
        </div>

        <div className="lg:col-span-4 grid grid-cols-2 gap-3 h-full">
            <button onClick={() => navigate('/write')} className="bg-brand-600 text-white rounded-[1.5rem] flex flex-col items-center justify-center p-4 hover:bg-brand-700 transition-all shadow-md group">
                <PlusCircle size={24} className="mb-2 group-hover:scale-110 transition-transform"/>
                <span className="text-xs font-bold">정보 등록</span>
            </button>
            <button onClick={() => navigate('/relationship-map')} className="bg-slate-900 text-white rounded-[1.5rem] flex flex-col items-center justify-center p-4 hover:bg-slate-800 transition-all shadow-md group">
                <Users size={24} className="mb-2 group-hover:scale-110 transition-transform"/>
                <span className="text-xs font-bold">인맥 관계</span>
            </button>
        </div>
      </div>

      {/* 3. 최신 활동 피드 (메인 타임라인) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-xl text-brand-600"><Activity size={18}/></div>
            <h2 className="text-xl font-black text-slate-900">Latest Intelligence Feed</h2>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><ListIcon size={16}/></button>
              <button onClick={() => setViewMode('course')} className={`p-2 rounded-lg ${viewMode === 'course' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><LayoutGrid size={16}/></button>
          </div>
        </div>

        {aiSearchResult && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold"><Sparkles size={16}/> AI 분석 결과</div>
                {aiSearchResult}
                <button onClick={() => setAiSearchResult(null)} className="mt-4 text-[11px] text-slate-400 hover:text-slate-600">닫기</button>
            </div>
        )}

        <div className={`grid gap-6 ${viewMode === 'course' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {latestLogs.map(log => (
            <LogCard key={log.id} log={log} />
          ))}
          {latestLogs.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm font-medium">최근 등록된 인텔리전스가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-8">
            <button className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-all">전체 활동 내역 보기</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
