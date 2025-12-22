
import React, { useState } from 'react';
import { LogEntry, Department, UserRole } from '../types';
import { Calendar, Tag, Image as ImageIcon, Sparkles, Loader2, X, Edit2, Trash2, ChevronDown, ChevronUp, Info, CheckCircle, User, AlertTriangle, Lightbulb, Target, ShieldAlert, Zap, FileText, MapPin, Layers } from 'lucide-react';
import { analyzeLogEntry } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

interface LogCardProps {
  log: LogEntry;
}

const getDeptBadgeStyle = (dept: Department) => {
  switch (dept) {
    case Department.SALES: return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
    case Department.RESEARCH: return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20';
    case Department.CONSTRUCTION: return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20';
    case Department.CONSULTING: return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
    default: return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20';
  }
};

const LogCard: React.FC<LogCardProps> = ({ log }) => {
  const { deleteLog, user, canUseAI, navigate } = useApp();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (showInsight) return;
    if (insight) { setShowInsight(true); return; }
    setIsLoading(true);
    try {
      const result = await analyzeLogEntry(log);
      setInsight(result);
      setShowInsight(true);
    } catch (error) { alert('AI 분석에 실패했습니다.'); } finally { setIsLoading(false); }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    navigate('/write', { log: { ...log, tags: [...(log.tags || [])] } });
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      if(window.confirm('정말 이 업무 기록을 삭제하시겠습니까?')) {
          deleteLog(log.id);
      }
  };

  const renderStructuredInsight = (text: string) => {
    const parts = text.split(/(?=\d+\.\s\*\*)/);
    return parts.map((part, index) => {
      const headerMatch = part.match(/\*\*(.*?)\*\*/);
      if (!headerMatch) {
        if(part.trim()) return <p key={index} className="mb-4 text-sm text-slate-600 px-1">{part}</p>;
        return null;
      }
      const rawTitle = headerMatch[1].replace(/:$/, '').trim(); 
      const body = part.replace(headerMatch[0], '').replace(/^\d+\.\s*:?/, '').trim(); 
      
      let styleClass = "bg-slate-50 border-slate-200";
      let titleClass = "text-slate-700";
      let Icon = Info;

      if (rawTitle.includes("요약")) {
        styleClass = "bg-indigo-50 border-indigo-100"; titleClass = "text-indigo-700"; Icon = Lightbulb;
      } else if (rawTitle.includes("상세") || rawTitle.includes("분석")) {
        styleClass = "bg-white border-slate-200"; titleClass = "text-slate-700"; Icon = FileText;
      } else if (rawTitle.includes("리스크") || rawTitle.includes("함의")) {
        styleClass = "bg-red-50 border-red-100"; titleClass = "text-red-700"; Icon = ShieldAlert;
      } else if (rawTitle.includes("전략") || rawTitle.includes("액션")) {
        styleClass = "bg-emerald-50 border-emerald-100"; titleClass = "text-emerald-700"; Icon = Target;
      }

      return (
        <div key={index} className={`rounded-xl border p-5 mb-4 last:mb-0 shadow-sm transition-all hover:shadow-md ${styleClass}`}>
          <h4 className={`font-black text-xs uppercase tracking-widest mb-3 flex items-center ${titleClass}`}>
            <Icon size={14} className="mr-2" /> {rawTitle}
          </h4>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line font-medium">{body.replace(/^:/, '').trim()}</p>
        </div>
      );
    });
  };

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SENIOR;
  const shouldTruncate = log.content.length > 100;
  
  // Calculate extra courses
  const extraCoursesCount = log.relatedCourses ? log.relatedCourses.length - 1 : 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-300 hover:shadow-lg transition-all duration-300 group relative flex flex-col h-full transform hover:-translate-y-1">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ring-1 inset-0 ${getDeptBadgeStyle(log.department)}`}>{log.department}</span>
                <div className="flex items-center text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    <MapPin size={10} className="mr-1 text-brand-600"/> 
                    {log.courseName}
                    {extraCoursesCount > 0 && (
                        <span className="ml-1.5 bg-brand-600 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center">
                            <Layers size={8} className="mr-0.5"/> +{extraCoursesCount}
                        </span>
                    )}
                </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center text-xs text-slate-400 font-mono">{log.date}</div>
            {(isAdmin || log.author === user?.name) && (
              <div className="flex items-center space-x-1 ml-3 bg-white rounded-lg p-1 border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight group-hover:text-brand-700 transition-colors">{log.title}</h3>
        <div className={`relative text-slate-600 text-sm leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] mb-4' : 'max-h-20 mb-1'}`}>
            {log.content}
            {!isExpanded && shouldTruncate && <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} />}
        </div>
        {shouldTruncate && (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="flex items-center text-xs font-bold text-slate-400 hover:text-brand-600 mb-4 transition-colors focus:outline-none w-fit">
            {isExpanded ? <>접기 <ChevronUp size={14} className="ml-1"/></> : <>더 읽기 <ChevronDown size={14} className="ml-1"/></>}
          </button>
        )}
        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden flex-1 flex-wrap gap-y-2">
            {log.tags?.map((tag, idx) => (
              <span key={idx} className="flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-medium border border-slate-200"><Tag size={10} className="mr-1 opacity-70" /> {tag}</span>
            ))}
          </div>
          <div className="flex items-center space-x-3 shrink-0 ml-2">
              <span className="text-xs text-slate-400 flex items-center bg-slate-50 px-2 py-1 rounded-full"><User size={10} className="mr-1"/> {log.author}</span>
              {canUseAI && (
                  <button onClick={handleAnalyze} disabled={isLoading} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full border transition-all shadow-sm ${showInsight ? 'bg-purple-100 text-purple-700 border-purple-200 ring-2 ring-purple-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-500 hover:text-white hover:border-transparent'}`}>
                      {isLoading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
                      {isLoading ? '분석 중...' : 'Intelligent Insight'}
                  </button>
              )}
          </div>
        </div>
      </div>

      {showInsight && insight && !isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowInsight(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 max-h-[85vh] ring-1 ring-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0 border-b border-slate-800">
               <div className="flex items-center text-white">
                  <div className="bg-brand-500/20 p-2.5 rounded-2xl mr-4 shadow-inner"><Sparkles className="text-brand-400" size={24} /></div>
                  <div>
                      <h3 className="font-black text-xl leading-none tracking-tight text-white uppercase">AI Business Insight</h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-[0.2em] font-black">Strategic Intelligence Report</p>
                  </div>
               </div>
               <button onClick={() => setShowInsight(false)} className="text-slate-400 hover:text-white hover:bg-white/10 p-2.5 rounded-full transition-colors focus:outline-none"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/30 flex-1">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm flex items-start gap-4 ring-1 ring-slate-100">
                   <div className="p-3 bg-slate-900 rounded-xl text-brand-400 shadow-lg"><Info size={20} /></div>
                   <div className="flex-1 overflow-hidden">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 flex items-center justify-between">
                          <span>Intelligence Source</span>
                          <span className="font-mono text-slate-500">{log.date}</span>
                      </div>
                      <div className="font-black text-slate-900 text-base mb-1 truncate">{log.courseName} <span className="font-medium text-slate-400 mx-2">|</span> {log.department}</div>
                      <div className="text-xs text-slate-500 truncate font-bold">{log.title}</div>
                   </div>
                </div>
                
                <div className="space-y-4">
                    {renderStructuredInsight(insight)}
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0 gap-3 shadow-inner">
               <button onClick={() => setShowInsight(false)} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-[1.2rem] transition-all text-sm shadow-xl active:scale-95 flex items-center uppercase tracking-widest">
                   <CheckCircle size={18} className="mr-3 text-brand-400" />Done
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LogCard;
