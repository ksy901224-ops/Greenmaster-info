
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { AffinityLevel } from '../types';
import { Share2, Search, Calendar, Crown, Filter, History, Briefcase, MapPin, RefreshCcw, UserCheck, UserMinus, Shield, AlertCircle } from 'lucide-react';

const RelationshipMap: React.FC = () => {
  const { courses, people, navigate } = useApp();
  const [filterAffinity, setFilterAffinity] = useState<AffinityLevel | 'ALL'>('ALL');
  const [filterDept, setFilterDept] = useState<'ALL' | 'MANAGEMENT' | 'COURSE' | 'OPERATIONS' | 'OTHER'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CURRENT' | 'PAST'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredNode, setHoveredNode] = useState<{ type: 'PERSON' | 'COURSE', id: string } | null>(null);

  const getTenure = (startDate?: string, endDate?: string) => {
    if (!startDate) return '기간 미상';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    if (isNaN(start.getTime())) return '기간 미상';
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) return `${years}년 ${months}개월`;
    return `${months}개월`;
  };

  const getDepartmentCategory = (role: string) => {
    if (!role) return 'OTHER';
    const r = role.replace(/\s/g, '').toLowerCase();
    if (r.match(/코스|잔디|그린|조경|시설|설비|장비|조경|키퍼|슈퍼/)) return 'COURSE';
    if (r.match(/지배인|대표|이사|사장|회장|전무|상무|본부장/)) return 'MANAGEMENT';
    if (r.match(/운영|경기|지원|프론트|예약|마케팅|영업|식음|서비스/)) return 'OPERATIONS';
    return 'OTHER';
  };

  const connections = useMemo(() => {
    const list: any[] = [];
    if (!people) return list;

    people.forEach(p => {
      const matchAffinity = filterAffinity === 'ALL' || p.affinity === filterAffinity;
      const matchSearch = searchTerm === '' || 
                         p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.currentRole.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (matchAffinity && matchSearch) {
        if (p.currentCourseId && (filterStatus === 'ALL' || filterStatus === 'CURRENT')) {
           const currentDept = getDepartmentCategory(p.currentRole);
           if (filterDept === 'ALL' || currentDept === filterDept) {
             list.push({ 
               courseId: p.currentCourseId, 
               personId: p.id, 
               personName: p.name, 
               personRole: p.currentRole, 
               personAffinity: p.affinity, 
               startDate: p.currentRoleStartDate, 
               type: 'CURRENT', 
               deptCategory: currentDept 
             });
           }
        }
        
        if (filterStatus === 'ALL' || filterStatus === 'PAST') {
            (p.careers || []).forEach(career => {
                if (career.courseId) {
                    const pastDept = getDepartmentCategory(career.role);
                    if (filterDept === 'ALL' || pastDept === filterDept) {
                        list.push({ 
                          courseId: career.courseId, 
                          personId: p.id, 
                          personName: p.name, 
                          personRole: career.role, 
                          personAffinity: p.affinity, 
                          startDate: career.startDate, 
                          endDate: career.endDate, 
                          type: 'PAST', 
                          deptCategory: pastDept 
                        });
                    }
                }
            });
        }
      }
    });
    return list;
  }, [people, filterAffinity, filterDept, filterStatus, searchTerm]);

  const hubData = useMemo(() => {
    if (!courses) return [];
    
    const full = courses.map(c => {
      const related = connections.filter(conn => conn.courseId === c.id);
      return { ...c, people: related };
    }).filter(c => c.people.length > 0);
    
    // SAFEGUARD: LIMIT INITIAL HUB COUNT
    // If no search term and no specific filters, only show top 30 courses
    // to prevent stack overflow in React Fiber/DOM depth.
    const isFiltered = searchTerm !== '' || filterAffinity !== 'ALL' || filterDept !== 'ALL' || filterStatus !== 'ALL';
    if (!isFiltered) {
        return full.slice(0, 30);
    }
    
    // Even when filtered, limit to 80 to avoid browser crash
    return full.slice(0, 80);
  }, [courses, connections, searchTerm, filterAffinity, filterDept, filterStatus]);

  const centerX = 400;
  const centerY = 350;
  const hubRadius = 220; 

  const getAffinityColor = (level: AffinityLevel) => {
      if(level >= 1) return '#16a34a';
      if(level <= -1) return '#dc2626';
      return '#64748b';
  };

  const resetFilters = () => {
      setFilterAffinity('ALL'); 
      setFilterDept('ALL'); 
      setFilterStatus('ALL'); 
      setSearchTerm('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center"><Share2 className="mr-2 text-brand-600" /> 인물 관계도</h1>
              <p className="text-slate-500 text-sm mt-1">골프장별 인물 배치와 근무 이력을 시각화합니다.</p>
           </div>
           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="검색으로 관계 찾기..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 shadow-sm" 
              />
           </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
           <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
               <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center"><History size={10} className="mr-1"/> 근무 상태</label>
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                      {[
                        { k: 'ALL', l: '전체', i: <Briefcase size={14}/> }, 
                        { k: 'CURRENT', l: '현직', i: <UserCheck size={14}/> }, 
                        { k: 'PAST', l: '전직', i: <UserMinus size={14}/> }
                      ].map(opt => (
                          <button 
                            key={opt.k} 
                            onClick={() => setFilterStatus(opt.k as any)} 
                            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === opt.k ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            {opt.i} <span>{opt.l}</span>
                          </button>
                      ))}
                   </div>
               </div>
               <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center"><Shield size={10} className="mr-1"/> 직무 분류</label>
                   <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                      {[{ k: 'ALL', l: '전체' }, { k: 'MANAGEMENT', l: '경영' }, { k: 'COURSE', l: '코스' }, { k: 'OPERATIONS', l: '운영' }].map(opt => (
                        <button 
                          key={opt.k} 
                          onClick={() => setFilterDept(opt.k as any)} 
                          className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterDept === opt.k ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {opt.l}
                        </button>
                      ))}
                   </div>
               </div>
           </div>
           <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
               <button onClick={resetFilters} className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
                 <RefreshCcw size={14} /> <span>초기화</span>
               </button>
           </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl relative min-h-[600px] flex items-center justify-center border border-slate-700 select-none">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* SAFEGUARD NOTICE */}
        {hubData.length >= 30 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-900/80 text-white px-4 py-2 rounded-full text-xs flex items-center z-50 border border-indigo-500 backdrop-blur-md shadow-lg">
                <AlertCircle size={14} className="mr-2 text-indigo-300"/> 
                {searchTerm ? '검색된 항목이 너무 많아 일부만 표시 중입니다.' : '데이터 보호를 위해 주요 30개소만 표시 중입니다. 검색을 이용하세요.'}
            </div>
        )}

        <div className="w-full h-[700px] relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {hubData.map((course, idx) => {
                    const angle = (idx / hubData.length) * 2 * Math.PI - Math.PI / 2;
                    const x = centerX + Math.cos(angle) * hubRadius;
                    const y = centerY + Math.sin(angle) * hubRadius;
                    return <line key={`link-${course.id}`} x1={centerX} y1={centerY} x2={x} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />;
                })}
            </svg>
            <div className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 rounded-full bg-brand-600 border-4 border-brand-400 shadow-[0_0_30px_rgba(34,197,94,0.3)] flex flex-col items-center justify-center text-white" style={{ left: centerX, top: centerY }}>
              <Crown size={28} className="text-yellow-300 mb-1" />
              <span className="text-[9px] font-bold">GreenMaster</span>
            </div>

            {hubData.map((course, idx) => {
                const angle = (idx / hubData.length) * 2 * Math.PI - Math.PI / 2;
                const cx = centerX + Math.cos(angle) * hubRadius;
                const cy = centerY + Math.sin(angle) * hubRadius;
                
                // Limit internal people nodes per hub for performance
                const visiblePeople = course.people.slice(0, 12);
                const personRadius = 75; 
                
                return (
                    <div key={course.id} className="absolute" style={{ left: cx, top: cy }}>
                        <div 
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 bg-slate-800 border border-slate-600 rounded-lg p-2 text-center shadow-lg z-20 cursor-pointer hover:border-brand-400 transition-colors" 
                          onMouseEnter={() => setHoveredNode({type: 'COURSE', id: course.id})} 
                          onMouseLeave={() => setHoveredNode(null)}
                          onClick={() => navigate(`/courses/${course.id}`)}
                        >
                            <h3 className="text-xs font-bold text-white truncate">{course.name}</h3>
                            <span className="text-[9px] text-slate-400 block">{course.people.length}명 연결</span>
                        </div>
                        {visiblePeople.map((personConn, pIdx) => {
                             const pAngle = (pIdx / visiblePeople.length) * 2 * Math.PI;
                             const px = Math.cos(pAngle) * personRadius;
                             const py = Math.sin(pAngle) * personRadius;
                             const isHovered = hoveredNode?.type === 'PERSON' && hoveredNode.id === `${personConn.personId}-${course.id}`;
                             const affinityColor = getAffinityColor(personConn.personAffinity);
                             const isPast = personConn.type === 'PAST';
                             
                             return (
                                 <React.Fragment key={`${personConn.personId}-${course.id}-${pIdx}`}>
                                    <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                                        <line x1={0} y1={0} x2={px} y2={py} stroke={isHovered ? affinityColor : (isPast ? "#475569" : "#64748b")} strokeWidth={isHovered ? 2 : 1} strokeDasharray={isPast ? "4,4" : "none"} />
                                    </svg>
                                    <div 
                                      onClick={() => navigate(`/people/${personConn.personId}`)} 
                                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border bg-slate-900 flex items-center justify-center cursor-pointer transition-all ${isHovered ? 'z-50 ring-2 ring-white scale-125' : ''} ${isPast ? 'opacity-70 grayscale-[0.5]' : ''}`} 
                                      style={{ left: px, top: py, borderColor: affinityColor }} 
                                      onMouseEnter={() => setHoveredNode({type: 'PERSON', id: `${personConn.personId}-${course.id}`})} 
                                      onMouseLeave={() => setHoveredNode(null)}
                                    >
                                        <span className="text-[10px] text-white font-bold">{personConn.personName[0]}</span>
                                        <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-900" style={{ backgroundColor: affinityColor }}></span>
                                        {isHovered && (
                                            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-60 bg-white text-slate-900 p-0 rounded-lg shadow-xl border border-slate-200 z-50 pointer-events-none overflow-hidden animate-in fade-in zoom-in-90">
                                                <div className="p-3 bg-slate-50 border-b flex justify-between items-center"><span className="font-bold text-sm">{personConn.personName}</span><span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: affinityColor }}>{personConn.personAffinity > 0 ? '우호' : '중립'}</span></div>
                                                <div className="p-3 space-y-1"><div className="flex items-center text-xs"><MapPin size={12} className="mr-2 text-brand-600" />{course.name}</div><div className="flex items-center text-xs"><Briefcase size={12} className="mr-2 text-brand-600" />{personConn.personRole}</div><div className="text-[10px] bg-slate-100 p-1.5 rounded flex items-center mt-1"><Calendar size={10} className="mr-1.5"/>{getTenure(personConn.startDate, personConn.endDate)}</div></div>
                                            </div>
                                        )}
                                    </div>
                                 </React.Fragment>
                             );
                        })}
                    </div>
                );
            })}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-6 text-xs text-slate-600 shadow-sm justify-between">
          <div className="flex flex-wrap gap-4 items-center">
             <span className="font-bold flex items-center text-slate-800"><Filter size={14} className="mr-1"/> 범례:</span>
             <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5"></span> 우호적</div>
             <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5"></span> 중립</div>
             <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span> 적대적</div>
          </div>
          <div className="flex flex-wrap gap-4 items-center border-l border-slate-200 pl-4">
             <div className="flex items-center"><span className="w-4 h-px bg-slate-400 mr-1.5"></span> 현직 (실선)</div>
             <div className="flex items-center"><span className="w-4 h-px border-b border-dashed border-slate-400 mr-1.5"></span> 전직 (점선)</div>
          </div>
      </div>
    </div>
  );
};

export default RelationshipMap;
