
import React, { useState, useMemo } from 'react';
import { Search, MapPin, ArrowRight, Filter, Grid, List as ListIcon, X, SlidersHorizontal, ChevronDown, Check, UserCog, Briefcase, Building2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Region, CourseType, GrassType, ManagementModel, OutsourcingType } from '../types';

const CourseList: React.FC = () => {
  const { courses, people, navigate } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region | '전체'>('전체');
  const [selectedType, setSelectedType] = useState<CourseType | '전체'>('전체');
  const [selectedHoles, setSelectedHoles] = useState<string | '전체'>('전체');
  const [selectedGrass, setSelectedGrass] = useState<GrassType | '전체'>('전체');
  const [selectedMgmtModel, setSelectedMgmtModel] = useState<ManagementModel | '전체'>('전체');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<OutsourcingType | '전체'>('전체');
  
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const regions: (Region | '전체')[] = ['전체', '서울', '경기', '인천', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종', '부산', '대구', '울산', '대전', '광주'];

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = c.name.includes(searchTerm) || c.address.includes(searchTerm);
      const matchRegion = selectedRegion === '전체' || c.region === selectedRegion;
      const matchType = selectedType === '전체' || c.type === selectedType;
      const matchGrass = selectedGrass === '전체' || c.grassType === selectedGrass;
      const matchMgmt = selectedMgmtModel === '전체' || c.management?.model === selectedMgmtModel;
      
      const matchService = selectedServiceFilter === '전체' || 
                           (c.management?.outsourcingTypes && c.management.outsourcingTypes.includes(selectedServiceFilter));

      let matchHoles = true;
      if (selectedHoles !== '전체') {
        if (selectedHoles === '9H') matchHoles = c.holes <= 9;
        else if (selectedHoles === '18H') matchHoles = c.holes === 18;
        else if (selectedHoles === '27H+') matchHoles = c.holes >= 27;
      }

      let matchManager = true;
      if (managerSearch.trim()) {
          const managerName = c.managerId ? people.find(p => p.id === c.managerId)?.name : '';
          matchManager = !!managerName && managerName.includes(managerSearch);
      }
      
      return matchSearch && matchRegion && matchType && matchHoles && matchGrass && matchManager && matchMgmt && matchService;
    });
  }, [courses, people, searchTerm, managerSearch, selectedRegion, selectedType, selectedHoles, selectedGrass, selectedMgmtModel, selectedServiceFilter]);

  const resetFilters = () => {
      setSelectedRegion('전체');
      setSelectedType('전체');
      setSelectedHoles('전체');
      setSelectedGrass('전체');
      setSelectedMgmtModel('전체');
      setSelectedServiceFilter('전체');
      setSearchTerm('');
      setManagerSearch('');
  };

  const activeFilterCount = [selectedRegion, selectedType, selectedHoles, selectedGrass, selectedMgmtModel, selectedServiceFilter].filter(f => f !== '전체').length + (managerSearch ? 1 : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <div className="inline-flex items-center space-x-2 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-brand-100"><Filter size={12}/><span>Master Intelligence DB</span></div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">전국 골프장 마스터 DB</h1>
            <p className="text-slate-500 text-sm mt-1">총 {courses.length}개소의 데이터를 관리합니다.</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="relative flex-grow md:w-80 shadow-soft">
                <input type="text" placeholder="골프장 이름 또는 주소 검색..." className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-medium text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute left-4 top-4 text-slate-400" size={18} />
             </div>
             <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className={`p-3.5 rounded-2xl border transition-all flex items-center gap-2 font-bold text-sm ${isFilterExpanded || activeFilterCount > 0 ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <SlidersHorizontal size={18}/><span className="hidden sm:inline">필터</span>
                {activeFilterCount > 0 && <span className="bg-white text-brand-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{activeFilterCount}</span>}
             </button>
        </div>
      </div>

      {isFilterExpanded && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center"><Filter size={16} className="mr-2 text-brand-600"/> 상세 검색 필터</h3>
                  <button onClick={resetFilters} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center"><X size={14} className="mr-1"/> 초기화</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">담당자(Manager)</label>
                      <div className="relative">
                        <input type="text" value={managerSearch} onChange={(e) => setManagerSearch(e.target.value)} placeholder="담당자 성명 검색" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none" />
                        <UserCog size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">지역</label>
                      <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold">{regions.map(r => <option key={r} value={r}>{r}</option>)}</select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">관리 방식 (Main)</label>
                      <select value={selectedMgmtModel} onChange={(e) => setSelectedMgmtModel(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"><option value="전체">전체 방식</option><option value="직영">직영 관리</option><option value="위탁">위탁(외주) 관리</option></select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">용역 형태 (Sub)</label>
                      <select value={selectedServiceFilter} onChange={(e) => setSelectedServiceFilter(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold">
                          <option value="전체">전체 용역</option>
                          <option value="전면위탁(턴키)">전면위탁(턴키)</option>
                          <option value="방제용역">방제용역</option>
                          <option value="인력용역">인력용역</option>
                          <option value="장비용역">장비용역</option>
                          <option value="지급자재">지급자재</option>
                      </select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">규모</label>
                      <select value={selectedHoles} onChange={(e) => setSelectedHoles(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"><option value="전체">전체 규모</option><option value="9H">9홀 이하</option><option value="18H">18홀</option><option value="27H+">27홀 이상</option></select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">주요 잔디</label>
                      <select value={selectedGrass} onChange={(e) => setSelectedGrass(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"><option value="전체">전체 종</option><option value={GrassType.ZOYSIA}>한국잔디</option><option value={GrassType.BENTGRASS}>벤트그라스</option><option value={GrassType.KENTUCKY}>켄터키</option></select>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center px-1">
          <p className="text-xs text-slate-400 font-bold">검색 결과: <span className="text-brand-600">{filteredCourses.length}</span> 건</p>
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}><Grid size={16}/></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}><ListIcon size={16}/></button>
          </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => {
                const manager = course.managerId ? people.find(p => p.id === course.managerId) : null;
                const isOutsourced = course.management?.model === '위탁';
                const hasSubServices = course.management?.outsourcingTypes && course.management.outsourcingTypes.length > 0;
                
                return (
                <div key={course.id} onClick={() => navigate(`/courses/${course.id}`)} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 relative group flex flex-col h-full">
                    <div className={`h-24 bg-gradient-to-br from-brand-500 to-brand-700 p-6 flex flex-col justify-end relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Building2 size={80}/></div>
                        <h3 className="text-xl font-black text-white relative z-10">{course.name}</h3>
                    </div>
                    {manager && (
                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center">
                            <UserCog size={12} className="mr-1"/> {manager.name}
                        </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center text-slate-400 text-[11px] font-bold mb-4"><MapPin size={12} className="mr-1.5 text-brand-500" /> <span className="truncate">{course.address}</span></div>
                        
                        <div className="mt-auto space-y-3">
                            <div className="flex justify-between text-xs font-bold text-slate-700 border-t border-slate-100 pt-4"><span>{course.holes} Holes</span><span>{course.type}</span></div>
                            <div className="space-y-1">
                                <div className={`flex items-center justify-center py-2 rounded-xl text-xs font-black border ${isOutsourced ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                    <Briefcase size={12} className="mr-1.5"/>
                                    {course.management?.model || '직영'}
                                    {isOutsourced && course.management?.outsourcingCompany && ` (${course.management.outsourcingCompany})`}
                                </div>
                                {hasSubServices && (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {course.management?.outsourcingTypes?.map((t, i) => (
                                            <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )})}
        </div>
      ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                      <tr><th className="px-6 py-4">골프장 명칭</th><th className="px-6 py-4">지역</th><th className="px-6 py-4">관리 방식</th><th className="px-6 py-4">담당자</th><th className="px-6 py-4">규모</th><th className="px-6 py-4">구분</th><th className="px-6 py-4 text-right">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {filteredCourses.map(course => {
                          const manager = course.managerId ? people.find(p => p.id === course.managerId) : null;
                          const isOutsourced = course.management?.model === '위탁';
                          const hasSubServices = course.management?.outsourcingTypes && course.management.outsourcingTypes.length > 0;

                          return (
                          <tr key={course.id} onClick={() => navigate(`/courses/${course.id}`)} className="hover:bg-brand-50/30 transition-colors cursor-pointer group">
                              <td className="px-6 py-4 font-black text-slate-900">{course.name}</td>
                              <td className="px-6 py-4 text-slate-700 font-medium">{course.region}</td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                      <span className={`text-[10px] font-black px-2 py-1 rounded border w-fit ${isOutsourced ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                          {course.management?.model || '직영'}
                                          {isOutsourced && course.management?.outsourcingCompany && ` (${course.management.outsourcingCompany})`}
                                      </span>
                                      {hasSubServices && (
                                          <div className="flex gap-1 flex-wrap">
                                              {course.management?.outsourcingTypes?.map((t, i) => (
                                                  <span key={i} className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  {manager ? (
                                      <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md flex items-center w-fit"><UserCog size={12} className="mr-1"/> {manager.name}</span>
                                  ) : (
                                      <span className="text-[11px] text-slate-400">-</span>
                                  )}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-600">{course.holes}H</td>
                              <td className="px-6 py-4"><span className={`text-[10px] font-black px-2 py-0.5 rounded ${course.type === CourseType.MEMBER ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{course.type}</span></td>
                              <td className="px-6 py-4 text-right"><ArrowRight size={18} className="text-slate-300 group-hover:text-brand-600 ml-auto"/></td>
                          </tr>
                      )})}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

export default CourseList;
