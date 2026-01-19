
import React, { useState } from 'react';
import { LogEntry, Department, UserRole } from '../types';
import { Calendar, Tag, Image as ImageIcon, Sparkles, Loader2, X, Edit2, Trash2, ChevronDown, ChevronUp, Info, CheckCircle, User, AlertTriangle, Lightbulb, Target, ShieldAlert, Zap, FileText, MapPin, Layers, Phone } from 'lucide-react';
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
    // Split by the specific header format requested in the prompt: "1. **Title**"
    const parts = text.split(/(?=\d+\.\s\*\*)/);
    
    return parts.map((part, index) => {
      const headerMatch = part.match(/\*\*(.*?)\*\*/);
      if (!headerMatch) {
        // Render introductory text or unstructured content if any
        if(part.trim()) return <p key={index} className="mb-4 text-sm text-slate-600 px-1 whitespace-pre-line">{part.trim()}</p>;
        return null;
      }
      
      const rawTitle = headerMatch[1].replace(/:$/, '').trim(); 
      // Remove the header line (e.g., "1. **Title**") from the body
      const body = part.replace(/^\d+\.\s\*\*.*?\*\*/, '').trim(); 
      
      let styleClass = "bg-white border-slate-200";
      let titleClass = "text-slate-800";
      let Icon = Info;
      let iconColor = "text-slate-400";

      // Enhanced Styling Logic based on Keywords
      if (rawTitle.includes("요약") || rawTitle.includes("Summary")) {
        styleClass = "bg-indigo-50/50 border-indigo-100 ring-1 ring-indigo-50"; 
        titleClass = "text-indigo-800"; 
        Icon = Lightbulb;
        iconColor = "text-indigo-500";
      } else if (rawTitle.includes("상세") || rawTitle.includes("분석") || rawTitle.includes("Analysis")) {
        styleClass = "bg-white border-slate-200"; 
        titleClass = "text-slate-800"; 
        Icon = FileText;
        iconColor = "text-brand-500";
      } else if (rawTitle.includes("리스크") || rawTitle.includes("위험") || rawTitle.includes("Risk")) {
        styleClass = "bg-red-50/50 border-red-100 ring-1 ring-red-50"; 
        titleClass = "text-red-800"; 
        Icon = ShieldAlert;
        iconColor = "text-red-500";
      } else if (rawTitle.includes("전략") || rawTitle.includes("시사점") || rawTitle.includes("Implication")) {
        styleClass = "bg-emerald-50/50 border-emerald-100 ring-1 ring-emerald-50"; 
        titleClass = "text-emerald-800"; 
        Icon = Target;
        iconColor = "text-emerald-500";
      }

      return (
        <div key={index} className={`rounded-2xl border p-5 mb-4 last:mb-0 shadow-sm transition-all hover:shadow-md ${styleClass}`}>
          <h4 className={`font-black text-sm mb-3 flex items-center ${titleClass}`}>
            <Icon size={18} className={`mr-2.5 ${iconColor}`} /> {rawTitle}
          </h4>
          <div className="text-slate-700 text-sm leading-7 font-medium whitespace-pre-line pl-1">
             {body.replace(/^:/, '').trim()}
          </div>
        </div>
      );
    });
  };

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SENIOR;
  const shouldTruncate = log.content.length > 100;
  
  // Calculate extra courses
  const extraCoursesCount = log.relatedCourses ? log.relatedCourses.length - 1 : 0;
  const hasExtraDetails = (log.relatedCourses && log.relatedCourses.length > 1) || log.contactPerson || (log.imageUrls && log.imageUrls.length > 0);
  const showExpandButton = shouldTruncate || hasExtraDetails;

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

        {/* Expanded Details Section */}
        {isExpanded && (
            <div className="mb-4 space-y-3 border-t border-slate-100 pt-3 animate-in fade-in slide-in-from-top-1 duration-300">
                {/* Contact Info */}
                {log.contactPerson && (
                    <div className="flex items-center text-xs text-slate-500">
                        <Phone size={12} className="mr-2 text-slate-400"/>
                        <span className="font-bold mr-2 text-slate-700">관련 담당자:</span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">{log.contactPerson}</span>
                    </div>
                )}

                {/* Related Courses List */}
                {log.relatedCourses && log.relatedCourses.length > 1 && (
                    <div className="flex items-start text-xs text-slate-500">
                        <Layers size={12} className="mr-2 mt-0.5 text-slate-400 flex-shrink-0"/>
                        <span className="font-bold mr-2 text-slate-700 mt-0.5 flex-shrink-0">관련 골프장:</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                            {log.relatedCourses.map(c => (
                                <span key={c.id} className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600">
                                    {c.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Attached Images */}
                {log.imageUrls && log.imageUrls.length > 0 && (
                    <div className="mt-2">
                        <p className="text-xs font-bold text-slate-700 mb-2 flex items-center"><ImageIcon size={12} className="mr-2 text-slate-400"/>첨부 이미지</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {log.imageUrls.map((url, idx) => (
                                <img 
                                    key={idx} 
                                    src={url} 
                                    alt={`Attachment ${idx}`} 
                                    className="h-20 w-auto rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(url, '_blank');
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {showExpandButton && (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="flex items-center text-xs font-bold text-slate-400 hover:text-brand-600 mb-4 transition-colors focus:outline-none w-fit">
            {isExpanded ? <>접기 <ChevronUp size={14} className="ml-1"/></> : <>더 보기 (상세 정보) <ChevronDown size={14} className="ml-1"/></>}
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
                  <button onClick={handleAnalyze} disabled={isLoading} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full border transition-all shadow-sm ${showInsight ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white hover:border-transparent'}`}>
                      {isLoading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
                      {isLoading ? '분석 중...' : 'AI 인사이트'}
                  </button>
              )}
          </div>
        </div>
      </div>

      {showInsight && insight && !isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowInsight(false)}>
          <div className="bg-slate-50 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 max-h-[85vh] ring-1 ring-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 flex justify-between items-center shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-10"><Sparkles size={100} className="text-white"/></div>
               <div className="flex items-center text-white relative z-10">
                  <div className="bg-brand-500/20 p-3 rounded-2xl mr-5 shadow-inner backdrop-blur-sm border border-brand-500/30"><Sparkles className="text-brand-400" size={28} /></div>
                  <div>
                      <h3 className="font-black text-xl leading-none tracking-tight text-white uppercase">AI Business Insight</h3>
                      <p className="text-[11px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-bold">Strategic Intelligence Report</p>
                  </div>
               </div>
               <button onClick={() => setShowInsight(false)} className="text-slate-400 hover:text-white hover:bg-white/10 p-2.5 rounded-full transition-colors focus:outline-none relative z-10"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm flex items-start gap-5 ring-1 ring-slate-100">
                   <div className="p-3.5 bg-slate-900 rounded-2xl text-brand-400 shadow-lg shrink-0"><Info size={24} /></div>
                   <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Analysis Target</span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{log.date}</span>
                      </div>
                      <div className="font-black text-slate-900 text-lg mb-1 truncate leading-tight">{log.title}</div>
                      <div className="text-xs font-bold text-slate-500">{log.courseName} <span className="text-slate-300 mx-2">|</span> {log.department}</div>
                   </div>
                </div>
                
                <div className="space-y-2">
                    {renderStructuredInsight(insight)}
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex justify-end shrink-0 gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
               <button onClick={() => setShowInsight(false)} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-[1.5rem] transition-all text-sm shadow-xl active:scale-95 flex items-center uppercase tracking-widest">
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
