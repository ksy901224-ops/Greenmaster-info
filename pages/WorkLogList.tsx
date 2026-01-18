
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Department, LogEntry } from '../types';
import LogCard from '../components/LogCard';
import { Search, Filter, Calendar, FileText, Plus, X, List, Grid } from 'lucide-react';

const WorkLogList: React.FC = () => {
  const { logs, user, navigate } = useApp();
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<Department | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        (log.title || '').toLowerCase().includes(term) || 
        (log.content || '').toLowerCase().includes(term) ||
        (log.courseName || '').toLowerCase().includes(term) ||
        (log.author || '').toLowerCase().includes(term) ||
        (log.tags && log.tags.some(tag => tag.toLowerCase().includes(term)));

      const matchDept = filterDept === 'ALL' || log.department === filterDept;
      
      const logDate = new Date(log.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const matchDate = (!start || logDate >= start) && (!end || logDate <= end);

      return matchSearch && matchDept && matchDate;
    }).sort((a, b) => {
        // Primary Sort: Date (Newest first)
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        
        // Secondary Sort: Created Timestamp (Newest first) for same-day logs
        const createdA = a.createdAt || 0;
        const createdB = b.createdAt || 0;
        return createdB - createdA;
    });
  }, [logs, searchTerm, filterDept, startDate, endDate]);

  const resetFilters = () => {
      setSearchTerm('');
      setFilterDept('ALL');
      setStartDate('');
      setEndDate('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <div className="inline-flex items-center space-x-2 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-brand-100">
                <FileText size={12}/><span>Unified Work Logs</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">통합 업무 일지</h1>
            <p className="text-slate-500 text-sm mt-1">전사 업무 기록을 최신순으로 조회하고 관리합니다.</p>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={() => navigate('/write')}
                className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center active:scale-95"
             >
                 <Plus size={18} className="mr-2"/> 새 업무일지 작성
             </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative group">
                  <input 
                    type="text" 
                    placeholder="제목, 내용, 골프장, 작성자 검색..." 
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all font-medium text-sm bg-slate-50 focus:bg-white" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
              </div>
              
              <div className="relative">
                  <Filter className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                  <select 
                    value={filterDept} 
                    onChange={(e) => setFilterDept(e.target.value as any)} 
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all font-medium text-sm bg-slate-50 focus:bg-white appearance-none cursor-pointer"
                  >
                      <option value="ALL">전체 부서</option>
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
              </div>

              <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="w-full pl-4 pr-2 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all font-medium text-xs bg-slate-50 focus:bg-white"
                      />
                  </div>
                  <span className="text-slate-400">~</span>
                  <div className="relative flex-1">
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="w-full pl-4 pr-2 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all font-medium text-xs bg-slate-50 focus:bg-white"
                      />
                  </div>
              </div>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center text-xs font-bold text-slate-500">
                  총 <span className="text-brand-600 mx-1 text-base">{filteredLogs.length}</span> 건의 기록이 있습니다.
              </div>
              <div className="flex gap-3">
                  <button onClick={resetFilters} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center transition-colors">
                      <X size={14} className="mr-1"/> 필터 초기화
                  </button>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}><Grid size={16}/></button>
                      <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}><List size={16}/></button>
                  </div>
              </div>
          </div>
      </div>

      {/* Log List */}
      {filteredLogs.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'GRID' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {filteredLogs.map(log => (
                  <LogCard key={log.id} log={log} />
              ))}
          </div>
      ) : (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 border-dashed">
              <FileText size={48} className="mx-auto text-slate-200 mb-4"/>
              <p className="text-slate-400 font-bold">조건에 맞는 업무 일지가 없습니다.</p>
              <button onClick={resetFilters} className="mt-4 text-brand-600 font-bold text-sm hover:underline">필터 해제하기</button>
          </div>
      )}
    </div>
  );
};

export default WorkLogList;
