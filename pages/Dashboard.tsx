
import React, { useState, useMemo, useEffect } from 'react';
import LogCard from '../components/LogCard';
import { CalendarView } from '../components/CalendarView';
import { CalendarSettingsModal } from '../components/CalendarSettingsModal';
// Added GolfCourse import to fix type inference issues
import { Department, LogEntry, UserRole, GolfCourse } from '../types';
import { Calendar as CalendarIcon, List as ListIcon, CalendarPlus, Settings, LayoutGrid, Users, CheckCircle, PlusCircle, Loader2, Search, Sparkles, AlertTriangle, ChevronRight, Lock, TrendingUp, AlertOctagon, FileText } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { addTodo } from '../services/firestoreService';
import { searchAppWithAIStream } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { logs, courses, people, user, canUseAI, canViewFullData, isAdmin, navigate } = useApp();
  
  const [filterDept, setFilterDept] = useState<Department | 'ALL'>(
    (user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN) ? 'ALL' : (user?.department || 'ALL')
  );

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'course'>('course');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [todoText, setTodoText] = useState('');
  const [isTodoSubmitting, setIsTodoSubmitting] = useState(false);

  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.date === today).length;
    const totalIssues = courses.reduce((acc, c) => acc + (c.issues?.length || 0), 0);
    return { todayLogs, totalIssues };
  }, [logs, courses]);

  const handleAiSearch = async (e?: React.FormEvent, queryOverride?: string) => {
    if (e) e.preventDefault();
    const query = queryOverride || aiSearchQuery;
    if (!query.trim()) return;
    setIsAiSearching(true);
    setAiSearchResult('');
    try {
      await searchAppWithAIStream(query, { logs, courses, people }, (chunk) => {
        setAiSearchResult(prev => (prev || '') + chunk);
      });
    } catch (error) { setAiSearchResult("검색 중 오류 발생"); } finally { setIsAiSearching(false); }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault(); if (!todoText.trim()) return;
    setIsTodoSubmitting(true);
    try { await addTodo(todoText, user?.name || 'User'); setTodoText(''); } catch (error) { alert('오류 발생'); } finally { setIsTodoSubmitting(false); }
  };

  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
  }, [logs]);

  const groupedByCourse = useMemo(() => {
    const filtered = filterDept === 'ALL' ? logs : logs.filter(l => l.department === filterDept);
    return filtered.reduce((acc, log) => {
        const cName = log.courseName || '미지정';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(log);
        return acc;
    }, {} as Record<string, LogEntry[]>);
  }, [logs, filterDept]);

  // --- 하급자 전용 뷰 (RBAC) ---
  if (!canViewFullData) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex items-center space-x-4 shadow-sm">
                  <div className="p-3 bg-white rounded-xl text-amber-600 shadow-sm"><AlertTriangle size={32} /></div>
                  <div>
                      <h1 className="text-xl font-bold text-slate-900">현장 이슈 대시보드 (Junior)</h1>
                      <p className="text-sm text-slate-600">골프장별 주요 이슈와 최신 등록 현황을 요약하여 보여줍니다.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Fixed Property access errors by explicitly typing the course parameter */}
                  {courses.slice(0, 12).map((course: GolfCourse) => (
                      <div key={course.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="font-bold text-slate-900 text-lg">{course.name}</h3>
                              <button onClick={() => navigate(`/courses/${course.id}`)} className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded">상세이슈</button>
                          </div>
                          {/* Guarded access to issues array with explicit casting to fix unknown type errors */}
                          {course.issues && (course.issues as string[]).length > 0 ? (
                              <ul className="space-y-2">
                                  {(course.issues as string[]).slice(0, 3).map((issue, i) => (
                                      <li key={i} className="text-xs text-slate-600 flex items-start bg-slate-50 p-2 rounded-lg">
                                          <AlertOctagon size={12} className="text-red-400 mr-2 mt-0.5 shrink-0" />
                                          <span className="line-clamp-1">{issue}</span>
                                      </li>
                                  ))}
                              </ul>
                          ) : (
                              <div className="text-center py-4 text-slate-400 text-xs italic">등록된 이슈 없음</div>
                          )}
                      </div>
                  ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="font-bold text-slate-800 mb-4 flex items-center"><FileText size={18} className="mr-2 text-brand-600"/> 최신 업데이트 현황</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recentLogs.map(log => (
                          <div key={log.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1"><span>{log.courseName}</span><span>{log.date}</span></div>
                              <h4 className="text-sm font-bold text-slate-800 truncate">{log.title}</h4>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-slate-100 p-4 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center">
                  <Lock size={14} className="mr-2"/> 인맥 정보 및 상세 업무 일지 조회는 중급자 이상의 권한이 필요합니다.
              </div>
          </div>
      );
  }

  // --- 중급자 이상 뷰 ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-brand-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <h1 className="text-2xl font-bold mb-1">{user?.name}님, 환영합니다</h1>
              <p className="text-brand-300 text-sm">{user?.department}팀 | {user?.role.split(' (')[0]}</p>
              <div className="mt-6 flex space-x-4">
                  <div className="text-center"><p className="text-[10px] text-brand-400 uppercase font-bold">오늘 일지</p><p className="text-xl font-bold">{stats.todayLogs}</p></div>
                  <div className="text-center border-l border-white/10 pl-4"><p className="text-[10px] text-brand-400 uppercase font-bold">진행 이슈</p><p className="text-xl font-bold">{stats.totalIssues}</p></div>
              </div>
          </div>

          {canUseAI && (
              <div className="md:col-span-2 bg-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-800">
                  <div className="flex items-center mb-3"><Sparkles size={16} className="text-indigo-400 mr-2"/><h3 className="text-sm font-bold">AI 통합 검색</h3></div>
                  <div className="flex gap-2 mb-2">
                      <input type="text" value={aiSearchQuery} onChange={e => setAiSearchQuery(e.target.value)} placeholder="질문을 입력하세요..." className="flex-1 bg-slate-800 border-none rounded-lg text-xs p-2.5 focus:ring-1 focus:ring-indigo-500" />
                      <button onClick={() => handleAiSearch()} disabled={isAiSearching} className="bg-indigo-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500">{isAiSearching ? <Loader2 size={14} className="animate-spin"/> : '검색'}</button>
                  </div>
                  {aiSearchResult && <div className="text-[11px] text-slate-400 bg-black/30 p-2 rounded-lg h-16 overflow-y-auto custom-scrollbar whitespace-pre-wrap">{aiSearchResult}</div>}
              </div>
          )}
      </div>

      <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex space-x-1 overflow-x-auto no-scrollbar">
              {(user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN) && (
                  <button onClick={() => setFilterDept('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold ${filterDept === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>전체</button>
              )}
              {Object.values(Department).map(d => (
                  (isAdmin || user?.department === d) && (
                      <button key={d} onClick={() => setFilterDept(d)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filterDept === d ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>{d}</button>
                  )
              ))}
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><ListIcon size={16}/></button>
              <button onClick={() => setViewMode('course')} className={`p-2 rounded-lg ${viewMode === 'course' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={16}/></button>
              <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><CalendarIcon size={16}/></button>
          </div>
      </div>

      <div>
          {viewMode === 'course' && (
              <div className="space-y-8">
                  {Object.entries(groupedByCourse).map(([cName, cLogs]) => (
                      <div key={cName}>
                          <h3 className="font-bold text-slate-800 mb-4 px-2 border-l-4 border-brand-500 ml-1">{cName} <span className="text-xs text-slate-400 ml-2">({cLogs.length})</span></h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {cLogs.map(log => <LogCard key={log.id} log={log} />)}
                          </div>
                      </div>
                  ))}
              </div>
          )}
          {viewMode === 'list' && <div className="space-y-4">{logs.map(log => <LogCard key={log.id} log={log} />)}</div>}
          {viewMode === 'calendar' && <CalendarView logs={logs} onDateSelect={setSelectedCalendarDate} selectedDate={selectedCalendarDate} />}
      </div>
    </div>
  );
};

export default Dashboard;
