
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MOCK_EXTERNAL_EVENTS } from '../constants';
import LogCard from '../components/LogCard';
import { CalendarView } from '../components/CalendarView';
import { CalendarSettingsModal } from '../components/CalendarSettingsModal';
import { Department, LogEntry, UserRole } from '../types';
import { Calendar as CalendarIcon, List as ListIcon, X, CalendarPlus, Settings, LayoutGrid, Users, ArrowUpDown, CheckCircle, PlusCircle, Loader2, Search, Sparkles, MessageCircleQuestion, Clock, Activity, AlertTriangle, ChevronRight, Lock, TrendingUp, AlertOctagon, FileText, Send, User, RotateCcw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { addTodo } from '../services/firestoreService';
import { createChatSession } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const Dashboard: React.FC = () => {
  const { logs, courses, people, user, canUseAI, canViewFullData, isAdmin, navigate } = useApp();
  
  const [filterDept, setFilterDept] = useState<Department | 'ALL'>(
    (user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN) ? 'ALL' : (user?.department || 'ALL')
  );

  useEffect(() => {
    if (!(user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN) && user?.department) {
        setFilterDept(user.department);
    }
  }, [user]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'course'>('course');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- TODO Widget State ---
  const [todoText, setTodoText] = useState('');
  const [isTodoSubmitting, setIsTodoSubmitting] = useState(false);

  // --- AI Chat State ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.date === today).length;
    const totalIssues = courses.reduce((acc, c) => acc + (c.issues?.length || 0), 0);
    const activeProjects = logs.filter(l => l.tags?.includes('공사') || l.tags?.includes('견적')).length;
    return { todayLogs, totalIssues, activeProjects };
  }, [logs, courses]);

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const text = textOverride || currentInput;
    if (!text.trim() || isStreaming) return;

    if (!chatSessionRef.current) {
      chatSessionRef.current = createChatSession({ logs, courses, people });
    }

    const newUserMsg: ChatMessage = { role: 'user', content: text };
    setChatMessages(prev => [...prev, newUserMsg]);
    setCurrentInput('');
    setIsStreaming(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: text });
      
      let assistantMsgContent = '';
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of result) {
        assistantMsgContent += chunk.text;
        setChatMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = assistantMsgContent;
          return newMsgs;
        });
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '죄송합니다. 응답 생성 중 오류가 발생했습니다.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const resetChat = () => {
    chatSessionRef.current = null;
    setChatMessages([]);
    setCurrentInput('');
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoText.trim()) return;
    setIsTodoSubmitting(true);
    try {
      await addTodo(todoText, user?.name || '익명 사용자');
      setTodoText('');
      alert('할 일이 저장되었습니다!');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsTodoSubmitting(false);
    }
  };

  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const tA = a.createdAt || new Date(a.date).getTime();
      const tB = b.createdAt || new Date(b.date).getTime();
      return tB - tA;
    }).slice(0, 6);
  }, [logs]);

  const deptFilteredLogs = filterDept === 'ALL' ? logs : logs.filter(l => l.department === filterDept);
  const sortedLogs = [...deptFilteredLogs].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
  });
  const finalDisplayLogs = sortedLogs.filter(l => {
    if (viewMode === 'calendar' && selectedCalendarDate) return l.date === selectedCalendarDate;
    return true;
  });

  const externalEvents = [
    ...(isGoogleConnected ? MOCK_EXTERNAL_EVENTS.filter(e => e.source === 'Google') : []),
    ...(isOutlookConnected ? MOCK_EXTERNAL_EVENTS.filter(e => e.source === 'Outlook') : [])
  ];
  
  const handleDateSelect = (date: string) => setSelectedCalendarDate(selectedCalendarDate === date ? null : date);
  const isAnyCalendarConnected = isGoogleConnected || isOutlookConnected;

  const groupedByCourse = finalDisplayLogs.reduce((acc, log) => {
    const courseName = log.courseName || '미지정';
    if (!acc[courseName]) acc[courseName] = [];
    acc[courseName].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const suggestedQueries = [
    '최근 스카이뷰 CC 주요 이슈는?',
    '최민수 팀장 관련 기록 요약해줘',
    '진행 중인 공사 현황 알려줘',
  ];

  if (!canViewFullData) {
      return (
          <div className="space-y-8">
              <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-full text-yellow-600 shadow-sm"><AlertTriangle size={32} /></div>
                  <div><h1 className="text-2xl font-bold text-slate-900">주요 이슈 현황판</h1><p className="text-slate-600">골프장별 이슈 사항을 조회할 수 있습니다.</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map(course => (
                      <div key={course.id} className={`bg-white rounded-xl shadow-sm border p-6 transition-all hover:shadow-md ${course.issues?.length ? 'border-l-4 border-l-red-500 border-slate-200' : 'border-slate-200 opacity-80'}`}>
                          <div className="flex justify-between items-start mb-4"><h3 className="font-bold text-slate-900 text-lg">{course.name}</h3><button onClick={() => navigate(`/courses/${course.id}`)} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 hover:bg-slate-200 flex items-center font-medium">상세보기 <ChevronRight size={14} className="ml-1"/></button></div>
                          {course.issues?.length ? (
                              <ul className="space-y-3">{course.issues.map((issue, idx) => (<li key={idx} className="text-sm text-slate-700 flex items-start bg-red-50 p-2 rounded-lg cursor-pointer hover:bg-red-100 transition-colors group" onClick={() => navigate(`/courses/${course.id}`, { filterIssue: issue })}><AlertOctagon size={14} className="text-red-500 mr-2 mt-0.5 shrink-0" /><span className="group-hover:underline">{issue}</span></li>))}</ul>
                          ) : (<div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg"><CheckCircle size={20} className="mx-auto mb-2 opacity-50"/>등록된 주요 이슈가 없습니다.</div>)}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Hero Section & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-brand-800 to-brand-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
              <div className="relative z-10">
                  <h1 className="text-2xl font-bold mb-1">반갑습니다, {user?.name}님 👋</h1>
                  <p className="text-brand-200 text-sm mb-6">{user?.department}팀 / {user?.role.split('(')[0]}</p>
                  <div className="flex items-center space-x-2 text-xs bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10"><Users size={14} /><span>{isAdmin ? '팀 공유 모드 (전체 접근)' : `${user?.department} 부서 업무 모드`}</span></div>
              </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start"><div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">오늘의 업무</p><h2 className="text-3xl font-black text-brand-600 mt-1">{stats.todayLogs}</h2></div><div className="p-2 bg-brand-50 text-brand-600 rounded-lg"><ListIcon size={20}/></div></div>
              <div className="text-xs text-slate-400 mt-4 flex items-center"><TrendingUp size={12} className="mr-1 text-emerald-500"/> 전일 대비 활동 증가</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start"><div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">관리 이슈</p><h2 className="text-3xl font-black text-red-500 mt-1">{stats.totalIssues}</h2></div><div className="p-2 bg-red-50 text-red-500 rounded-lg"><AlertOctagon size={20}/></div></div>
              <div className="text-xs text-slate-400 mt-4">{stats.activeProjects}개의 프로젝트 진행 중</div>
          </div>
      </div>

      {/* 2. AI Chat Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canUseAI ? (
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-1 shadow-2xl border border-slate-800 flex flex-col min-h-[450px]">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl flex flex-col flex-1 relative overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-500/20 rounded-lg mr-3"><Sparkles className="text-indigo-400" size={20} /></div>
                        <h3 className="font-bold text-white text-md">GreenMaster AI 인텔리전스</h3>
                    </div>
                    {chatMessages.length > 0 && (
                        <button onClick={resetChat} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="대화 초기화"><RotateCcw size={16}/></button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/20">
                    {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Sparkles size={48} className="text-indigo-500 mb-4 animate-pulse" />
                            <p className="text-slate-400 text-sm font-medium">골프장 현황이나 인맥 관계에 대해<br/>무엇이든 물어보세요.</p>
                            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-sm">
                                {suggestedQueries.map((q, idx) => (
                                    <button key={idx} onClick={() => handleSendMessage(undefined, q)} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white transition-all">{q}</button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-white/5 shadow-inner'}`}>
                                        <div className="flex items-center mb-1 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                                            {msg.role === 'user' ? <><User size={10} className="mr-1"/> 나</> : <><Sparkles size={10} className="mr-1"/> 그린마스터 AI</>}
                                        </div>
                                        <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {isStreaming && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 rounded-full px-4 py-2 text-indigo-400 flex space-x-1 items-center">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-900/80 backdrop-blur-sm border-t border-white/5">
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                        <input 
                            type="text" 
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            placeholder="메시지를 입력하세요..."
                            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                            disabled={isStreaming}
                        />
                        <button 
                            type="submit" 
                            disabled={isStreaming || !currentInput.trim()}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg transform active:scale-95"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
          </div>
        ) : (
            <div className="lg:col-span-2 bg-gradient-to-r from-slate-50 to-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-center items-center text-center shadow-sm">
                <div className="p-4 bg-slate-100 rounded-full mb-3 text-slate-400"><Lock size={32} /></div>
                <h3 className="text-slate-800 font-bold mb-1">AI 기능 제한됨</h3>
                <p className="text-slate-500 text-sm">상급자 권한이 필요합니다.</p>
            </div>
        )}

        {/* Quick To-Do */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center space-x-2 mb-4">
                <div className="p-1.5 bg-brand-100 text-brand-700 rounded-lg"><CheckCircle size={18} /></div>
                <h3 className="font-bold text-slate-800">Quick To-Do</h3>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 mb-3 flex items-center justify-center text-center">
                <p className="text-xs text-slate-400">등록된 빠른 할 일이 없습니다.</p>
            </div>
            <form onSubmit={handleAddTodo} className="flex gap-2 mt-auto">
                <input 
                type="text" 
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="할 일 입력..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                <button type="submit" disabled={isTodoSubmitting || !todoText.trim()} className="bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
                    {isTodoSubmitting ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                </button>
            </form>
        </div>
      </div>

      {/* 3. Main Content Controls */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-20 z-40 backdrop-blur-md bg-white/80">
           <div className="flex space-x-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar px-2 items-center">
            {(user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN) && (
                <button onClick={() => setFilterDept('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${filterDept === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>전체</button>
            )}
            {Object.values(Department).map(dept => {
                const isRestricted = (user?.role !== UserRole.SENIOR && user?.role !== UserRole.ADMIN) && user?.department !== dept;
                if (isRestricted) return null;
                return (
                    <button key={dept} onClick={() => setFilterDept(dept)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center ${filterDept === dept ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>{dept}{(user?.role !== UserRole.SENIOR && user?.role !== UserRole.ADMIN) && <Lock size={10} className="ml-1.5 opacity-70" />}</button>
                );
            })}
          </div>
          <div className="flex items-center gap-2 px-2">
             <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon size={18}/></button>
                <button onClick={() => setViewMode('course')} className={`p-2 rounded-lg transition-all ${viewMode === 'course' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><CalendarIcon size={18}/></button>
             </div>
          </div>
      </div>

      {/* 4. Content Area */}
      <div>
        {viewMode === 'calendar' && (
          <CalendarView logs={deptFilteredLogs} externalEvents={externalEvents} onDateSelect={handleDateSelect} selectedDate={selectedCalendarDate} />
        )}
        {viewMode === 'course' && (
             <div className="space-y-8">
                {Object.keys(groupedByCourse).length > 0 ? (
                    Object.entries(groupedByCourse).map(([courseName, courseLogs]: [string, LogEntry[]]) => (
                        <div key={courseName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="flex items-center mb-4 px-1"><div className="w-1 h-6 bg-brand-500 rounded-full mr-3"></div><h3 className="text-xl font-bold text-slate-800">{courseName}</h3><span className="ml-3 bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">{courseLogs.length}</span></div>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{courseLogs.map(log => (<LogCard key={log.id} log={log} />))}</div>
                        </div>
                    ))
                ) : (<div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><Search size={32}/></div><p className="text-slate-400 font-medium">기록이 없습니다.</p></div>)}
             </div>
        )}
        {viewMode === 'list' && (
            <div className="space-y-4">
                {finalDisplayLogs.length > 0 ? (finalDisplayLogs.map(log => (<LogCard key={log.id} log={log} />))) : (<div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-400 font-medium">기록이 없습니다.</p></div>)}
            </div>
        )}
      </div>

      <CalendarSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        isGoogleConnected={isGoogleConnected}
        isOutlookConnected={isOutlookConnected}
        onToggleGoogle={() => setIsGoogleConnected(!isGoogleConnected)}
        onToggleOutlook={() => setIsOutlookConnected(!isOutlookConnected)}
      />
    </div>
  );
};

export default Dashboard;
