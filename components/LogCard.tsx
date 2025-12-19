
import React, { useState } from 'react';
import { LogEntry, Department, UserRole } from '../types';
import { Calendar, Tag, Image as ImageIcon, Sparkles, Loader2, X, Edit2, Trash2, ChevronDown, ChevronUp, Info, CheckCircle, User, AlertTriangle, Lightbulb, Target, TrendingUp } from 'lucide-react';
import { analyzeLogEntry } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

interface LogCardProps {
  log: LogEntry;
}

const getDeptBadgeStyle = (dept: Department) => {
  switch (dept) {
    case Department.SALES: return 'bg-brand-50 text-brand-700 border-brand-200 ring-brand-500/10';
    case Department.RESEARCH: return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/10';
    case Department.CONSTRUCTION: return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/10';
    case Department.CONSULTING: return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10';
    default: return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10';
  }
};

const LogCard: React.FC<LogCardProps> = ({ log }) => {
  const { deleteLog, user, canUseAI, navigate } = useApp();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showInsight) return;
    if (insight) { setShowInsight(true); return; }

    setIsLoading(true);
    try {
      const result = await analyzeLogEntry(log);
      setInsight(result);
      setShowInsight(true);
    } catch (error) {
      console.error(error);
      alert('AI 분석에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("정말로 이 업무 기록을 삭제하시겠습니까?")) {
      deleteLog(log.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sanitizedLog = {
        id: log.id,
        date: log.date,
        author: log.author,
        department: log.department,
        courseId: log.courseId,
        courseName: log.courseName,
        title: log.title,
        content: log.content,
        tags: [...(log.tags || [])],
        contactPerson: log.contactPerson,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };
    
    navigate('/write', { log: sanitizedLog });
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
      } else if (rawTitle.includes("리스크") || rawTitle.includes("함의")) {
        styleClass = "bg-amber-50 border-amber-100"; titleClass = "text-amber-700"; Icon = AlertTriangle;
      } else if (rawTitle.includes("액션") || rawTitle.includes("추천")) {
        styleClass = "bg-emerald-50 border-emerald-100"; titleClass = "text-emerald-700"; Icon = Target;
      }
      return (
        <div key={index} className={`rounded-xl border p-4 mb-4 last:mb-0 shadow-sm transition-all hover:shadow-md ${styleClass}`}>
          <h4 className={`font-bold text-sm mb-2 flex items-center ${titleClass}`}>
            <Icon size={16} className="mr-2" /> {rawTitle}
          </h4>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line pl-1">{body.replace(/^:/, '').trim()}</p>
        </div>
      );
    });
  };

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SENIOR;
  const isSales = log.department === Department.SALES;
  const shouldTruncate = log.content.length > 150;

  return (
    <>
      <div className={`bg-white rounded-[2rem] border p-6 transition-all duration-300 group relative flex flex-col h-full transform hover:-translate-y-1 ${isSales ? 'border-brand-100 shadow-sm hover:border-brand-300 hover:shadow-xl' : 'border-slate-200 shadow-sm hover:shadow-lg'}`}>
        
        {isSales && (
            <div className="absolute -top-3 left-6 px-3 py-1 bg-brand-600 text-white text-[9px] font-black rounded-full shadow-lg uppercase tracking-tighter flex items-center">
                <TrendingUp size={10} className="mr-1" /> Sales Opportunity
            </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ring-2 ring-offset-2 ring-transparent transition-all ${getDeptBadgeStyle(log.department)}`}>{log.department}</span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md flex items-center"><Calendar size={10} className="mr-1"/> {log.date}</span>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin && (
              <>
                <button onClick={handleEdit} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-800 mb-3 leading-tight group-hover:text-brand-700 transition-colors tracking-tight">{log.title}</h3>
        
        <div className={`relative text-slate-600 text-[13px] leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] mb-6' : 'max-h-24 mb-2'}`}>
            {log.content}
            {!isExpanded && shouldTruncate && <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white via-white/80 to-transparent cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} />}
        </div>

        {shouldTruncate && (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="flex items-center text-[11px] font-black text-slate-400 hover:text-brand-600 mb-6 transition-colors uppercase tracking-widest">
            {isExpanded ? <>Collapse <ChevronUp size={14} className="ml-1"/></> : <>Read Full Log <ChevronDown size={14} className="ml-1"/></>}
          </button>
        )}

        {log.imageUrls && log.imageUrls.length > 0 && (
          <div className="flex overflow-x-auto space-x-3 mb-6 pb-2 no-scrollbar">
            {log.imageUrls.map((url, idx) => (
              <img key={idx} src={url} alt="Attachment" className="h-28 w-28 object-cover rounded-2xl flex-shrink-0 border border-slate-100 shadow-sm hover:scale-105 transition-transform cursor-zoom-in" />
            ))}
          </div>
        )}

        <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden flex-1 flex-wrap gap-y-2">
            {log.tags?.map((tag, idx) => (
              <span key={idx} className="flex items-center text-[9px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg font-bold border border-slate-200 uppercase tracking-tighter">
                <Tag size={10} className="mr-1 opacity-50" /> {tag}
              </span>
            ))}
            {log.contactPerson && (
              <span className="flex items-center text-[9px] text-brand-600 bg-brand-50 px-2 py-1 rounded-lg font-bold border border-brand-100 uppercase tracking-tighter">
                <User size={10} className="mr-1" /> {log.contactPerson}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 shrink-0 ml-4">
              {canUseAI && (
                  <button onClick={handleAnalyze} disabled={isLoading} className={`flex items-center text-[11px] font-black px-4 py-2 rounded-xl border transition-all shadow-sm ${showInsight ? 'bg-indigo-600 text-white border-transparent ring-4 ring-indigo-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-transparent'}`}>
                      {isLoading ? <Loader2 size={12} className="animate-spin mr-2" /> : <Sparkles size={12} className="mr-2" />}
                      {isLoading ? 'ANALYZING...' : 'AI INSIGHT'}
                  </button>
              )}
          </div>
        </div>
      </div>

      {showInsight && insight && !isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowInsight(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 flex justify-between items-center shrink-0">
               <div className="flex items-center text-white">
                  <div className="bg-white/10 p-3 rounded-2xl mr-4 shadow-inner"><Sparkles className="text-indigo-400" size={32} /></div>
                  <div>
                    <h3 className="font-black text-2xl leading-none tracking-tight">AI 전략 분석 리포트</h3>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-black">Generated by GreenMaster Gemini-3 Intelligence</p>
                  </div>
               </div>
               <button onClick={() => setShowInsight(false)} className="text-slate-400 hover:text-white hover:bg-white/10 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 mb-8 shadow-sm flex items-start gap-5">
                   <div className="p-3 bg-slate-100 rounded-2xl text-slate-500 shadow-inner"><Info size={24} /></div>
                   <div className="flex-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2 flex items-center justify-between"><span>분석 대상 레코드</span><span className="text-slate-400 font-mono font-normal">{log.date}</span></div>
                      <div className="font-black text-slate-900 text-lg mb-1">{log.courseName} <span className="font-normal text-slate-400 text-sm">| {log.department}</span></div>
                      <div className="text-sm text-slate-600 line-clamp-1 italic font-medium">"{log.title}"</div>
                   </div>
                </div>
                <div className="space-y-2">{renderStructuredInsight(insight)}</div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0">
               <button onClick={() => setShowInsight(false)} className="px-8 py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all text-sm shadow-xl hover:shadow-2xl transform active:scale-95 flex items-center uppercase tracking-widest"><CheckCircle size={18} className="mr-3" /> Report Confirmed</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LogCard;
