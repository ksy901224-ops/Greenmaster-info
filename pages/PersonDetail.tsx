
import React, { useState, useEffect, useMemo } from 'react';
import { User, Phone, Briefcase, MapPin, HeartHandshake, ChevronDown, Edit2, X, CheckCircle, Trash2, Plus, ArrowRight, Archive, Sparkles, Cloud, Loader2, ShieldAlert, FileWarning, Eye, Building2, Calendar, History as HistoryIcon, UserX, ExternalLink, Database, Info, Map, FileText, Search, PlusCircle } from 'lucide-react';
import { AffinityLevel, Person, CareerRecord, CourseType, GrassType, Region } from '../types';
import { useApp } from '../contexts/AppContext';
import { generatePersonReputationReport } from '../services/geminiService';

const PersonDetail: React.FC = () => {
  const { people, courses, updatePerson, deletePerson, addCourse, routeParams, navigate, canUseAI, logs } = useApp();
  const id = routeParams.id;
  
  // 1. Hooks
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Person | null>(null);
  const [originalPerson, setOriginalPerson] = useState<Person | null>(null);
  const [shouldArchive, setShouldArchive] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({ name: '', region: '경기' as Region, holes: 18 });
  const [isAnalyzingReputation, setIsAnalyzingReputation] = useState(false);
  const [reputationReport, setReputationReport] = useState<string | null>(null);

  // Temporary state to track the display name of the current course in the edit form
  const [currentCourseSearch, setCurrentCourseSearch] = useState('');

  // Derived Values via useMemo
  const person = useMemo(() => people.find(p => p.id === id), [people, id]);

  const hasRoleChanged = useMemo(() => {
    return editForm && originalPerson && (
        editForm.currentCourseId !== originalPerson.currentCourseId || 
        editForm.currentRole !== originalPerson.currentRole
    );
  }, [editForm, originalPerson]);

  const currentCourse = useMemo(() => {
    return person ? courses.find(c => c.id === person.currentCourseId) : null;
  }, [person, courses]);

  useEffect(() => {
    if (hasRoleChanged) {
        setShouldArchive(true);
    } else {
        setShouldArchive(false);
    }
  }, [hasRoleChanged]);

  if (!person) return <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 font-bold text-slate-400 animate-pulse">인물 정보를 불러올 수 없습니다.</div>;

  const toggleExpanded = (index: number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExpandedItems(newSet);
  };

  const getAffinityColor = (level: AffinityLevel) => {
      if(level >= 1) return "text-green-600 bg-green-50 border-green-200";
      if(level <= -1) return "text-red-600 bg-red-50 border-red-200";
      return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const getAffinityText = (level: AffinityLevel) => {
      if(level === AffinityLevel.ALLY) return "강력한 아군 (Ally)";
      if(level === AffinityLevel.FRIENDLY) return "우호적 (Friendly)";
      if(level === AffinityLevel.NEUTRAL) return "중립 (Neutral)";
      if(level === AffinityLevel.UNFRIENDLY) return "비우호적 (Unfriendly)";
      return "적대적 (Hostile)";
  };

  const openEditModal = () => {
      setEditForm({ ...person, careers: [...person.careers] });
      setOriginalPerson({ ...person });
      setCurrentCourseSearch(courses.find(c => c.id === person.currentCourseId)?.name || '');
      setShouldArchive(false);
      setIsEditModalOpen(true);
  };

  const handleEditChange = (field: keyof Person, value: any) => {
      if (editForm) {
          setEditForm({ ...editForm, [field]: value });
      }
  };

  const handleCurrentCourseSearchChange = (value: string) => {
      setCurrentCourseSearch(value);
      if (editForm) {
          const matched = courses.find(c => c.name === value);
          setEditForm({ ...editForm, currentCourseId: matched ? matched.id : '' });
      }
  };

  const addCareerToForm = () => {
    if (editForm) {
        const newCareer: CareerRecord = { courseId: '', courseName: '', role: '', startDate: '', endDate: '', description: '' };
        setEditForm({...editForm, careers: [newCareer, ...editForm.careers]});
    }
  };

  const removeCareerFromForm = (index: number) => {
    if (editForm) {
        const newCareers = [...editForm.careers];
        newCareers.splice(index, 1);
        setEditForm({...editForm, careers: newCareers});
    }
  };

  const updateCareerField = (index: number, field: keyof CareerRecord, value: string) => {
      if (editForm) {
          const newCareers = [...editForm.careers];
          const updatedRecord = { ...newCareers[index], [field]: value };
          
          if (field === 'courseName') {
              const matchedCourse = courses.find(c => c.name === value);
              updatedRecord.courseId = matchedCourse ? matchedCourse.id : '';
          }
          
          newCareers[index] = updatedRecord;
          setEditForm({...editForm, careers: newCareers});
      }
  };

  const handleQuickAddCourse = () => {
      if (!newCourseForm.name.trim()) return;
      const newId = `c-quick-${Date.now()}`;
      addCourse({
          id: newId,
          name: newCourseForm.name,
          region: newCourseForm.region,
          holes: newCourseForm.holes,
          type: CourseType.PUBLIC,
          openYear: new Date().getFullYear().toString(),
          address: `${newCourseForm.region} 신규 등록 골프장`,
          grassType: GrassType.ZOYSIA,
          area: '정보없음',
          description: '인물 정보 등록 중 즉시 추가됨',
          issues: []
      });
      setIsCourseModalOpen(false);
      
      // If we're in the middle of editing the person, we might want to auto-assign this new course
      if (editForm && isEditModalOpen) {
          // Check which field triggered the modal - for now we just show a success alert
          alert(`'${newCourseForm.name}' 골프장이 마스터 DB에 등록되었습니다. 이제 검색하여 선택할 수 있습니다.`);
      }
      setNewCourseForm({ name: '', region: '경기', holes: 18 });
  };

  const saveEdit = () => {
      if (!editForm) return;

      let finalPerson = { ...editForm };
      
      // AUTO-ARCHIVE LOGIC
      if (shouldArchive && originalPerson && originalPerson.currentCourseId) {
          const oldCourseName = courses.find(c => c.id === originalPerson.currentCourseId)?.name || '미지정';
          const archivedRecord: CareerRecord = {
              courseId: originalPerson.currentCourseId,
              courseName: oldCourseName,
              role: originalPerson.currentRole,
              startDate: originalPerson.currentRoleStartDate || '',
              endDate: new Date().toISOString().split('T')[0],
              description: `[시스템 자동 보관] 소속/직책 변경됨`
          };
          finalPerson.careers = [archivedRecord, ...finalPerson.careers];
      }

      updatePerson(finalPerson);
      setIsEditModalOpen(false);
      alert('인물 정보가 업데이트되었습니다.');
  };

  const handleDelete = () => {
      if (window.confirm(`정말로 '${person.name}' 인물 정보를 삭제하시겠습니까?`)) {
          deletePerson(person.id);
          navigate('/courses');
      }
  };

  const handleAnalyzeReputation = async () => {
      setIsAnalyzingReputation(true);
      setReputationReport(null);
      const relatedLogs = logs.filter(l => l.content.includes(person.name) || l.title.includes(person.name) || l.contactPerson === person.name);
      try {
          const report = await generatePersonReputationReport(person, relatedLogs);
          setReputationReport(report);
      } catch (error) {
          alert('분석 중 오류가 발생했습니다.');
      } finally {
          setIsAnalyzingReputation(false);
      }
  };

  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-200 overflow-hidden relative">
        <div className="bg-slate-900 h-28 relative">
             <div className="absolute top-6 right-6 flex space-x-2 z-20">
                 <button onClick={handleDelete} className="bg-white/10 hover:bg-red-500 text-white p-2.5 rounded-xl backdrop-blur-md transition-all border border-white/10 shadow-lg" title="삭제"><Trash2 size={20} /></button>
                 <button onClick={openEditModal} className="bg-white/10 hover:bg-brand-600 text-white p-2.5 rounded-xl backdrop-blur-md transition-all border border-white/10 shadow-lg" title="수정"><Edit2 size={20} /></button>
             </div>
        </div>
        <div className="px-10 pb-10 relative">
            <div className="flex flex-col md:flex-row justify-between items-end -mt-12 mb-6 gap-6">
                <div className="bg-white p-1.5 rounded-[2.5rem] shadow-xl">
                    <div className="bg-slate-100 rounded-[2.2rem] w-32 h-32 flex items-center justify-center text-slate-400 border-4 border-white shadow-inner">
                        <User size={64} />
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    {canUseAI && (
                        <button onClick={handleAnalyzeReputation} disabled={isAnalyzingReputation} className="flex items-center px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95 ring-1 ring-white/10">
                            {isAnalyzingReputation ? <Loader2 size={16} className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2 text-brand-400"/>}
                            {isAnalyzingReputation ? "분석 중..." : "AI 평판/리스크 분석"}
                        </button>
                    )}
                    <div className={`px-6 py-3 rounded-2xl border text-sm font-black flex items-center shadow-sm uppercase tracking-wider ${getAffinityColor(person.affinity)}`}>
                        {getAffinityText(person.affinity)}
                    </div>
                </div>
            </div>
            
            <div className="space-y-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{person.name}</h1>
                <div className="flex flex-wrap items-center mt-2 gap-y-2">
                    {currentCourse ? (
                      <button 
                        onClick={() => navigate(`/courses/${currentCourse.id}`)}
                        className="text-brand-700 font-bold text-xl flex items-center hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                      >
                        <Building2 size={20} className="mr-2 opacity-70"/> {currentCourse.name}
                        <ExternalLink size={14} className="ml-2 opacity-50"/>
                      </button>
                    ) : (
                      <p className="text-slate-400 font-bold text-xl flex items-center px-2 py-1">
                        <Building2 size={20} className="mr-2 opacity-70"/> 소속 정보 미지정
                      </p>
                    )}
                    <span className="mx-4 text-slate-200 hidden md:block">|</span>
                    <span className="text-slate-600 text-xl font-medium px-2">{person.currentRole}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100 text-sm font-medium text-slate-500">
                <div className="flex items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner group transition-all hover:bg-white hover:border-brand-200"><Phone size={18} className="mr-3 text-brand-500" /> <span className="text-slate-800 font-black text-base">{person.phone || '연락처 미등록'}</span></div>
                <div className="flex items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner group transition-all hover:bg-white hover:border-brand-200"><Calendar size={18} className="mr-3 text-brand-500" /> <span className="text-slate-800 font-black text-base">발령일: {person.currentRoleStartDate || '정보 없음'}</span></div>
            </div>
        </div>
      </div>

      {reputationReport && (
          <div className="bg-indigo-900 text-white p-1 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Sparkles size={200}/></div>
              <div className="bg-indigo-950/50 p-10 rounded-[2.2rem] border border-white/5">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black flex items-center tracking-tight text-white">
                        <FileWarning size={28} className="mr-4 text-amber-400" />
                        AI Strategic Reputation Report
                    </h3>
                    <button onClick={() => setReputationReport(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <div className="text-indigo-100 text-lg leading-relaxed whitespace-pre-line font-medium custom-scrollbar max-h-[500px] overflow-y-auto pr-6">
                    {reputationReport}
                </div>
              </div>
          </div>
      )}

      {/* Career History Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-200 h-fit">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center tracking-tight">
                      <HeartHandshake size={20} className="mr-3 text-brand-600" /> 인물 특이사항 및 전략
                  </h3>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-inner italic font-medium">
                      {person.notes || '등록된 메모가 없습니다. 주요 인물의 경우 관계 전략 가이드를 작성하세요.'}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-200">
            <div className="flex justify-between items-center mb-10 px-2">
                <h3 className="text-xl font-black text-slate-900 flex items-center tracking-tight">
                    <Briefcase size={22} className="mr-3 text-brand-600" /> 경력 히스토리 타임라인
                </h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-widest">{person.careers.length + 1} Placements Total</span>
            </div>
            
            <div className="relative border-l-4 border-slate-100 ml-5 space-y-12 pb-6">
                {/* Current Item */}
                <div className="relative pl-12">
                    <div className="absolute -left-[14px] top-1.5 w-6 h-6 rounded-full bg-brand-500 border-4 border-white shadow-lg z-10"></div>
                    <div className="bg-brand-50 border border-brand-200 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={120} /></div>
                        <span className="text-[9px] font-black bg-brand-600 text-white px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block shadow-sm">PRESENT PLACEMENT</span>
                        <h4 className="font-black text-slate-900 text-2xl mb-1 flex items-center">
                          {currentCourse?.name || '소속 미지정'}
                          {currentCourse && <button onClick={() => navigate(`/courses/${currentCourse.id}`)} className="ml-3 p-1.5 bg-white text-brand-600 rounded-lg shadow-sm border border-brand-100 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={16}/></button>}
                        </h4>
                        <p className="text-brand-700 font-black text-lg mb-3">{person.currentRole}</p>
                        <p className="text-slate-400 text-xs font-mono bg-white w-fit px-3 py-1.5 rounded-xl border border-brand-100 shadow-inner">{person.currentRoleStartDate || '정보없음'} ~ 현재 재직 중</p>
                    </div>
                </div>

                {/* Historical Items */}
                {person.careers.map((career, idx) => {
                     const isExpanded = expandedItems.has(idx);
                     const hasMasterLink = career.courseId && courses.some(c => c.id === career.courseId);
                     
                     return (
                        <div key={idx} className="relative pl-12 group animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="absolute -left-[12px] top-6 w-5 h-5 rounded-full bg-slate-200 border-4 border-white shadow-md group-hover:bg-slate-400 transition-colors z-10"></div>
                            <div onClick={() => toggleExpanded(idx)} className={`rounded-[2rem] border p-8 transition-all cursor-pointer hover:shadow-xl ${isExpanded ? 'bg-white border-slate-300 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <h4 className="font-black text-slate-800 text-xl group-hover:text-brand-700 transition-colors truncate">{career.courseName}</h4>
                                            {hasMasterLink && <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 shadow-inner flex items-center uppercase tracking-tighter"><Database size={8} className="mr-1"/> Master Synced</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500 font-bold text-xs bg-slate-100 px-3 py-1 rounded-full shadow-inner">{career.role}</span>
                                            <span className="text-slate-400 text-xs font-mono">{career.startDate} ~ {career.endDate || '미상'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 shrink-0">
                                      {career.courseId && <button onClick={(e) => { e.stopPropagation(); navigate(`/courses/${career.courseId}`); }} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-xl transition-all" title="골프장 상세정보"><Building2 size={18}/></button>}
                                      <ChevronDown size={24} className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-600' : ''}`} />
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-3">
                                        <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-line bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">{career.description || '상세 업무 이력 정보가 기록되지 않았습니다.'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                     );
                })}
            </div>
          </div>
      </div>

       {/* Edit Modal */}
       {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-black text-2xl text-slate-900 flex items-center tracking-tight">
                        <Edit2 size={28} className="mr-4 text-brand-600 bg-brand-100 p-1.5 rounded-xl shadow-inner"/> 인물 정보 편집 및 경력 관리
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-200 rounded-full focus:outline-none"><X size={32} /></button>
                </div>
                
                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">성명 (Real Name)</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 p-5 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-black text-lg" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">공식 연락처</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 p-5 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-black text-lg" value={editForm.phone} onChange={(e) => handleEditChange('phone', e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Building2 size={16} className="mr-3 text-brand-600"/> 현재 소속 발령 정보</h4>
                            <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-[10px] font-black text-brand-600 hover:underline flex items-center"><PlusCircle size={12} className="mr-1"/> 신규 골프장 퀵 등록</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-2 ml-1">소속 골프장 (검색 및 선택)</label>
                                <div className="relative group">
                                    <input 
                                        list="master-courses-datalist"
                                        placeholder="골프장 이름 검색..."
                                        className="w-full rounded-2xl border-slate-200 p-4 bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-black text-slate-800"
                                        value={currentCourseSearch}
                                        onChange={(e) => handleCurrentCourseSearchChange(e.target.value)}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-brand-500 transition-colors">
                                        <Search size={18}/>
                                    </div>
                                    {editForm.currentCourseId && (
                                        <div className="mt-2 text-[10px] text-brand-600 font-black flex items-center px-1">
                                            <CheckCircle size={10} className="mr-1"/> 마스터 DB와 매핑되었습니다 (ID: {editForm.currentCourseId})
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-2 ml-1">현직 공식 직책</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 p-4 bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-black text-slate-800" value={editForm.currentRole} onChange={(e) => handleEditChange('currentRole', e.target.value)} />
                            </div>
                        </div>

                        {/* AUTO-ARCHIVE CONFIRMATION */}
                        {hasRoleChanged && originalPerson?.currentCourseId && (
                            <div className="mt-8 bg-amber-50 p-6 rounded-[2rem] border border-amber-200 flex items-start gap-5 animate-in slide-in-from-top-2 shadow-soft">
                                <div className="p-3 bg-white rounded-2xl text-amber-600 shadow-sm border border-amber-100"><Archive size={24}/></div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-amber-900 mb-3 leading-snug">소속 또는 직책의 변경이 감지되었습니다. 이전 정보를 경력 히스토리에 자동으로 보관하시겠습니까?</p>
                                    <label className="flex items-center space-x-3 cursor-pointer select-none bg-white/50 w-fit px-4 py-2 rounded-xl border border-amber-200 hover:bg-white transition-all">
                                        <input type="checkbox" checked={shouldArchive} onChange={(e) => setShouldArchive(e.target.checked)} className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500 border-slate-300 transition-all" />
                                        <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Yes, Archive to Career History</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Advanced Career History Management */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center"><HistoryIcon size={14} className="mr-2 text-brand-600"/> 과거 경력 이력 관리</h4>
                            <button type="button" onClick={addCareerToForm} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center"><Plus size={16} className="mr-1.5"/> ADD RECORD</button>
                        </div>
                        <div className="space-y-4">
                            {editForm.careers.map((career, idx) => (
                                <div key={idx} className="relative bg-slate-50 p-6 rounded-3xl border border-slate-200 group transition-all hover:border-slate-300 hover:bg-white shadow-soft">
                                    <button onClick={() => removeCareerFromForm(idx)} className="absolute -right-3 -top-3 bg-white text-red-400 hover:text-red-600 p-2.5 rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 transition-all focus:outline-none"><Trash2 size={16} /></button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">골프장 (검색 및 자동 매핑)</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <input 
                                                        list="master-courses-datalist"
                                                        placeholder="골프장 명칭 입력..." 
                                                        className="w-full text-sm font-bold border-slate-200 rounded-xl p-3 pr-10 focus:ring-4 focus:ring-brand-500/5 shadow-inner" 
                                                        value={career.courseName} 
                                                        onChange={(e) => updateCareerField(idx, 'courseName', e.target.value)} 
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                                                        <Search size={14}/>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => { setNewCourseForm({ ...newCourseForm, name: career.courseName }); setIsCourseModalOpen(true); }} className="p-3 bg-white border border-slate-200 rounded-xl text-brand-600 hover:bg-brand-50 shadow-sm" title="신규 골프장 등록"><Plus size={18}/></button>
                                            </div>
                                            {career.courseId && <p className="text-[8px] text-brand-600 font-black flex items-center px-1"><CheckCircle size={10} className="mr-1"/> Master Link Verified (ID: {career.courseId})</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">수행 직책 / 업무</label>
                                            <input type="text" placeholder="직책 입력..." className="w-full text-sm font-bold border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 shadow-inner" value={career.role} onChange={(e) => updateCareerField(idx, 'role', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">시작 시점 (YYYY-MM)</label>
                                            <input type="text" placeholder="YYYY-MM" className="w-full text-sm font-bold border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 shadow-inner" value={career.startDate} onChange={(e) => updateCareerField(idx, 'startDate', e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">종료 시점 (YYYY-MM)</label>
                                            <input type="text" placeholder="YYYY-MM" className="w-full text-sm font-bold border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 shadow-inner" value={career.endDate || ''} onChange={(e) => updateCareerField(idx, 'endDate', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">관계 전략 및 특징 메모</label>
                        <textarea className="w-full rounded-[2rem] border-slate-200 p-6 h-40 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-inner font-medium leading-relaxed bg-slate-50/30" value={editForm.notes} onChange={(e) => handleEditChange('notes', e.target.value)} placeholder="인물의 성격, 관계 관리 전략 등을 상세히 기록하세요..." />
                    </div>
                </div>

                {/* Common Datalist for Course Search */}
                <datalist id="master-courses-datalist">
                    {courses.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
                
                <div className="p-10 border-t border-slate-100 bg-slate-50 flex justify-end space-x-4 shrink-0 shadow-inner">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors">취소</button>
                    <button onClick={saveEdit} className="px-14 py-5 text-sm font-black text-white bg-slate-900 rounded-[1.5rem] hover:bg-slate-800 flex items-center shadow-2xl transform active:scale-95 transition-all uppercase tracking-widest"><CheckCircle size={24} className="mr-3 text-brand-400" /> 변경 사항 마스터 DB 반영</button>
                </div>
            </div>
        </div>
      )}

      {/* Quick Add Course Modal */}
      {isCourseModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-50">
                      <h4 className="font-black text-lg text-brand-900 flex items-center tracking-tight"><Building2 size={24} className="mr-3 text-brand-600"/> 신규 골프장 마스터 등록</h4>
                      <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-white rounded-full"><X size={28}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">골프장 명칭 *</label>
                          <input type="text" required className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" value={newCourseForm.name} onChange={e => setNewCourseForm({...newCourseForm, name: e.target.value})} placeholder="공식 명칭 입력" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">행정 구역</label>
                              <select className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm bg-white focus:ring-4 focus:ring-brand-500/5" value={newCourseForm.region} onChange={e => setNewCourseForm({...newCourseForm, region: e.target.value as Region})}>
                                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">홀 규모</label>
                              <input type="number" className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-brand-500/5" value={newCourseForm.holes} onChange={e => setNewCourseForm({...newCourseForm, holes: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      <div className="pt-4">
                          <button onClick={handleQuickAddCourse} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm shadow-xl hover:bg-slate-800 transition-all flex justify-center items-center active:scale-95">
                              <CheckCircle size={20} className="mr-2 text-brand-400" /> MASTER DB 즉시 등록
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PersonDetail;
