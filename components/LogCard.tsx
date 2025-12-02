import React, { useState } from 'react';
import { LogEntry, Department, UserRole } from '../types';
import { Calendar, Tag, Image as ImageIcon, Sparkles, Loader2, X, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeLogEntry } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface LogCardProps {
  log: LogEntry;
}

const getDeptColor = (dept: Department) => {
  switch (dept) {
    case Department.SALES: return 'bg-blue-100 text-blue-800 border-blue-200';
    case Department.RESEARCH: return 'bg-purple-100 text-purple-800 border-purple-200';
    case Department.CONSTRUCTION: return 'bg-orange-100 text-orange-800 border-orange-200';
    case Department.CONSULTING: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const LogCard: React.FC<LogCardProps> = ({ log }) => {
  const { deleteLog, user } = useApp();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showInsight) {
      setShowInsight(false);
      return;
    }

    if (insight) {
      setShowInsight(true);
      return;
    }

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
    if (window.confirm("정말로 이 업무 기록을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) {
      deleteLog(log.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/write', { state: { log } });
  };

  // Helper to render bold text from markdown-style **text**
  const renderInsightContent = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-brand-800">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const shouldTruncate = log.content.length > 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getDeptColor(log.department)}`}>
            {log.department}
          </span>
          <span className="text-sm text-slate-500 font-medium">{log.courseName}</span>
        </div>
        
        <div className="flex items-center space-x-2">
           <div className="flex items-center text-xs text-slate-400">
             <Calendar size={12} className="mr-1" />
             {log.date}
           </div>
           
           {/* Edit/Delete Actions - Always visible, Restricted to ADMIN only */}
           {isAdmin && (
             <div className="flex space-x-1 pl-2 border-l border-slate-100">
               <button 
                 onClick={handleEdit} 
                 className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                 title="수정"
               >
                 <Edit2 size={14} />
               </button>
               <button 
                 onClick={handleDelete} 
                 className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                 title="삭제"
               >
                 <Trash2 size={14} />
               </button>
             </div>
           )}
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-1 pr-16">{log.title}</h3>
      
      {/* Content with Expand/Collapse Animation */}
      <div 
        className={`relative text-slate-600 text-sm whitespace-pre-line overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-[1000px] mb-4' : 'max-h-20 mb-1'
        }`}
      >
          {log.content}
          
          {/* Gradient Overlay when collapsed */}
          {!isExpanded && shouldTruncate && (
            <div 
              className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            />
          )}
      </div>
      
      {shouldTruncate && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="flex items-center text-xs font-bold text-slate-400 hover:text-brand-600 mb-3 transition-colors focus:outline-none"
        >
          {isExpanded ? (
            <>
              접기 <ChevronUp size={14} className="ml-1"/>
            </>
          ) : (
            <>
              더 읽기 <ChevronDown size={14} className="ml-1"/>
            </>
          )}
        </button>
      )}

      {log.imageUrls && log.imageUrls.length > 0 && (
        <div className="flex overflow-x-auto space-x-2 mb-3 pb-2">
          {log.imageUrls.map((url, idx) => (
            <img key={idx} src={url} alt="Attachment" className="h-20 w-20 object-cover rounded-md flex-shrink-0 border border-slate-200" />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
        <div className="flex items-center space-x-2 overflow-hidden flex-1 flex-wrap gap-y-1">
          {log.tags?.map((tag, idx) => (
            <span key={idx} className="flex items-center text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
              <Tag size={10} className="mr-1" /> {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center space-x-3 shrink-0 ml-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                작성자: {log.author}
            </span>
            <button 
                onClick={handleAnalyze}
                disabled={isLoading}
                className={`flex items-center text-xs font-bold px-2 py-1 rounded-full border transition-all ${
                    showInsight 
                    ? 'bg-brand-100 text-brand-700 border-brand-200 ring-1 ring-brand-200' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
                }`}
                title="이 업무 기록의 맥락과 리스크를 AI로 분석합니다"
            >
                {isLoading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
                {isLoading ? '분석 중...' : 'AI Insight'}
            </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-3 bg-slate-50/50 rounded-lg p-4 border border-slate-100 animate-pulse">
            <div className="flex items-center space-x-2 mb-3">
               <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
               <div className="h-3 bg-slate-200 rounded w-32"></div>
            </div>
            <div className="space-y-2">
                <div className="h-2 bg-slate-200 rounded w-full"></div>
                <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                <div className="h-2 bg-slate-200 rounded w-4/6"></div>
            </div>
        </div>
      )}

      {showInsight && insight && !isLoading && (
          <div className="mt-3 bg-gradient-to-br from-brand-50/80 to-white border border-brand-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm relative overflow-hidden group ring-1 ring-brand-200 ring-offset-0">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
              
              <div className="flex justify-between items-start mb-2 border-b border-brand-100 pb-2 pl-2">
                 <h4 className="text-xs font-bold text-brand-800 flex items-center">
                     <Sparkles size={12} className="mr-1.5 text-brand-600 animate-pulse" /> AI 스마트 분석 리포트
                 </h4>
                 <button onClick={() => setShowInsight(false)} className="text-brand-400 hover:text-brand-600 p-0.5 hover:bg-brand-100 rounded transition-colors">
                   <X size={14}/>
                 </button>
              </div>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium pl-2">
                  {renderInsightContent(insight)}
              </div>
              <div className="mt-2 text-[10px] text-brand-400 text-right border-t border-brand-50 pt-1 pl-2">
                  Gemini 2.5 Flash로 분석됨
              </div>
          </div>
      )}
    </div>
  );
};

export default LogCard;