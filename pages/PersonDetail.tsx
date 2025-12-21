
import React, { useState, useEffect } from 'react';
import { User, Phone, Briefcase, MapPin, HeartHandshake, ChevronDown, Edit2, X, CheckCircle, Trash2, Plus, ArrowRight, Archive, Sparkles, Cloud, Loader2, ShieldAlert, FileWarning, Eye, Building2, Calendar, History as HistoryIcon } from 'lucide-react';
import { AffinityLevel, Person, CareerRecord, CourseType, GrassType, Region } from '../types';
import { useApp } from '../contexts/AppContext';
import { generatePersonReputationReport } from '../services/geminiService';

const PersonDetail: React.FC = () => {
  const { people, courses, updatePerson, deletePerson, addCourse, routeParams, navigate, canUseAI, logs } = useApp();
  const id = routeParams.id;
  
  const person = people.find(p => p.id === id);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Person | null>(null);
  const [originalPerson, setOriginalPerson] = useState<Person | null>(null);
  const [shouldArchive, setShouldArchive] = useState(false);

  // New Course Modal State (inside Person Edit)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({ name: '', region: '경기' as Region, holes: 18 });

  // Reputation Analysis State
  const [isAnalyzingReputation, setIsAnalyzingReputation] = useState(false);
  const [reputationReport, setReputationReport] = useState<string | null>(null);

  if (!person) return <div className="p-8 text-center">인물 정보를 찾을 수 없습니다.</div>;

  const currentCourse = courses.find(c => c.id === person.currentCourseId);

  // Detect critical role fields changes for auto-archive logic
  const hasRoleChanged = editForm && originalPerson && (
    editForm.currentCourseId !== originalPerson.currentCourseId || 
    editForm.currentRole !== originalPerson.currentRole
  );

  useEffect(() => {
    if (hasRoleChanged) {
        setShouldArchive(true);
    } else {
        setShouldArchive(false);
    }
  }, [hasRoleChanged]);

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
      setShouldArchive(false);
      setIsEditModalOpen(true);
  };

  const handleEditChange = (field: keyof Person, value: any) => {
      if (editForm) setEditForm({ ...editForm, [field]: value });
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
          
          // If courseName is changed, try to find and link courseId automatically
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
      setNewCourseForm({ name: '', region: '경기', holes: 18 });
      alert(`'${newCourseForm.name}' 골프장이 마스터 DB에 등록되었습니다.`);
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
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{person.name}</h1>
                <p className="text-brand-700 font-bold text-lg flex items-center">
                    <Building2 size={18} className="mr-2 opacity-70"/> {currentCourse?.name || '소속 정보 없음'}
                    <span className="mx-3 text-slate-300 font-normal">|</span>
                    <span className="text-slate-600">{person.currentRole}</span>
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100 text-sm font-medium text-slate-500">
                <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-100"><Phone size={18} className="mr-3 text-brand-500" /> <span className="text-slate-800 font-bold">{person.phone}</span></div>
                <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-100"><Calendar size={18} className="mr-3 text-brand-500" /> <span className="text-slate-800 font-bold">재직일: {person.currentRoleStartDate ? `${person.currentRoleStartDate} ~ 현재` : '정보 없음'}</span></div>
            </div>
        </div>
      </div>

      {reputationReport && (
          <div className="bg-indigo-900 text-white p-1 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Sparkles size={200}/></div>
              <div className="bg-indigo-950/50 p-8 rounded-[2.2rem] border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black flex items-center tracking-tight">
                        <FileWarning size={24} className="mr-3 text-amber-400" />
                        AI Strategic Reputation Report
                    </h3>
                    <button onClick={() => setReputationReport(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="text-indigo-100 text-base leading-relaxed whitespace-pre-line font-medium custom-scrollbar max-h-[400px] overflow-y-auto pr-4">
                    {reputationReport}
                </div>
              </div>
          </div>
      )}

      {/* Career History Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2rem] shadow-soft border border-slate-200">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center tracking-tight">
                      <HeartHandshake size={20} className="mr-3 text-brand-600" /> 관계 전략 및 특징
                  </h3>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner italic">
                      {person.notes || '등록된 메모가 없습니다.'}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-soft border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center tracking-tight">
                <Briefcase size={20} className="mr-3 text-brand-600" /> 커리어 타임라인
            </h3>
            
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                <div className="relative pl-10">
                    <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-brand-500 border-4 border-white shadow-md"></div>
                    <div className="bg-brand-50/50 border border-brand-100 rounded-3xl p-6 shadow-sm">
                        <span className="text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest mb-3 inline-block">CURRENT ROLE</span>
                        <h4 className="font-black text-slate-900 text-xl mb-1">{currentCourse?.name || '소속 미지정'}</h4>
                        <p className="text-brand-700 font-bold text-sm mb-2">{person.currentRole}</p>
                        <p className="text-slate-400 text-xs font-mono">{person.currentRoleStartDate ? `${person.currentRoleStartDate} ~ 현재` : '정보 없음'}</p>
                    </div>
                </div>

                {person.careers.map((career, idx) => {
                     const isExpanded = expandedItems.has(idx);
                     return (
                        <div key={idx} className="relative pl-10 group">
                            <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-slate-200 border-4 border-white shadow-sm group-hover:bg-slate-400 transition-colors"></div>
                            <div onClick={() => toggleExpanded(idx)} className={`rounded-3xl border p-6 transition-all cursor-pointer hover:shadow-lg ${isExpanded ? 'bg-white border-slate-300 shadow-soft' : 'bg-white border-slate-100'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-black text-slate-800 text-lg mb-1">{career.courseName}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 font-bold text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{career.role}</span>
                                            <span className="text-slate-400 text-xs font-mono">{career.startDate} ~ {career.endDate || '미상'}</span>
                                        </div>
                                    </div>
                                    <ChevronDown size={20} className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-600' : ''}`} />
                                </div>
                                {isExpanded && (
                                    <div className="mt-5 pt-5 border-t border-slate-50 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-slate-600 text-sm leading-relaxed">{career.description || '이력 정보가 없습니다.'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                     );
                })}
            </div>
          </div>
      </div>

       {/* Edit Modal with Auto-Archive Trigger */}
       {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight">
                        <Edit2 size={24} className="mr-3 text-brand-600"/> 인물 정보 편집 및 발령
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-200 rounded-full focus:outline-none"><X size={28} /></button>
                </div>
                
                <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">성명</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 p-4 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-bold" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">연락처</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 p-4 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-bold" value={editForm.phone} onChange={(e) => handleEditChange('phone', e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <div className="flex items-center"><Building2 size={14} className="mr-2 text-brand-600"/> 현재 소속 발령 정보</div>
                            <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-brand-600 hover:underline text-[9px] font-black uppercase">목록에 없나요? 신규 등록</button>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">소속 골프장 선택</label>
                                <select className="w-full rounded-2xl border-slate-200 p-4 bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-bold" value={editForm.currentCourseId || ''} onChange={(e) => handleEditChange('currentCourseId', e.target.value)}>
                                    <option value="">미지정</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">현직 직책</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 p-4 bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-bold" value={editForm.currentRole} onChange={(e) => handleEditChange('currentRole', e.target.value)} />
                            </div>
                        </div>

                        {/* AUTO-ARCHIVE CONFIRMATION */}
                        {hasRoleChanged && originalPerson?.currentCourseId && (
                            <div className="mt-6 bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-4 animate-in slide-in-from-top-2">
                                <div className="p-2 bg-white rounded-xl text-amber-600 shadow-sm"><Archive size={20}/></div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-900 mb-2">소속 또는 직책의 변경이 감지되었습니다. 이전 정보를 경력 히스토리로 자동 보관하시겠습니까?</p>
                                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={shouldArchive} onChange={(e) => setShouldArchive(e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300" />
                                        <span className="text-xs font-black text-amber-700 uppercase tracking-tighter">Yes, Archive previous role to History</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><HistoryIcon size={14} className="mr-2 text-brand-600"/> 과거 경력 이력 관리</h4>
                            <button type="button" onClick={addCareerToForm} className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center"><Plus size={14} className="mr-1"/> ADD RECORD</button>
                        </div>
                        <div className="space-y-4">
                            {editForm.careers.map((career, idx) => (
                                <div key={idx} className="relative bg-slate-50 p-5 rounded-2xl border border-slate-200 group transition-all hover:border-slate-300">
                                    <button onClick={() => removeCareerFromForm(idx)} className="absolute -right-2 -top-2 bg-white text-red-400 hover:text-red-600 p-1.5 rounded-lg border border-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-all focus:outline-none"><Trash2 size={14} /></button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">골프장 (Master DB 연동)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    list="courses-list-careers"
                                                    placeholder="골프장 명칭 검색..." 
                                                    className="flex-1 text-xs font-bold border-slate-200 rounded-xl p-2.5 focus:ring-brand-500 shadow-sm" 
                                                    value={career.courseName} 
                                                    onChange={(e) => updateCareerField(idx, 'courseName', e.target.value)} 
                                                />
                                                <button type="button" onClick={() => { setNewCourseForm({ ...newCourseForm, name: career.courseName }); setIsCourseModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 rounded-xl text-brand-600 hover:bg-brand-50" title="신규 등록"><Plus size={16}/></button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">수행 직책 / 업무</label>
                                            <input type="text" placeholder="직책 / 업무" className="w-full text-xs font-bold border-slate-200 rounded-xl p-2.5 focus:ring-brand-500 shadow-sm" value={career.role} onChange={(e) => updateCareerField(idx, 'role', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="시작일(YYYY-MM)" className="w-full text-xs font-bold border-slate-200 rounded-xl p-2.5 focus:ring-brand-500 shadow-sm" value={career.startDate} onChange={(e) => updateCareerField(idx, 'startDate', e.target.value)} />
                                        <input type="text" placeholder="종료일(YYYY-MM)" className="w-full text-xs font-bold border-slate-200 rounded-xl p-2.5 focus:ring-brand-500 shadow-sm" value={career.endDate || ''} onChange={(e) => updateCareerField(idx, 'endDate', e.target.value)} />
                                    </div>
                                    {career.courseId && <div className="mt-2 text-[9px] text-brand-600 font-bold flex items-center px-1"><CheckCircle size={10} className="mr-1"/> 마스터 DB 골프장과 연결됨 (ID: {career.courseId})</div>}
                                </div>
                            ))}
                        </div>
                        <datalist id="courses-list-careers">
                            {courses.map(c => <option key={c.id} value={c.name} />)}
                        </datalist>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">특징 및 전략 메모</label>
                        <textarea className="w-full rounded-2xl border-slate-200 p-4 h-32 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm font-medium leading-relaxed" value={editForm.notes} onChange={(e) => handleEditChange('notes', e.target.value)} />
                    </div>
                </div>
                
                <div className="p-10 border-t border-slate-100 bg-slate-50 flex justify-end space-x-4 shrink-0 shadow-inner">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-3.5 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest">취소</button>
                    <button onClick={saveEdit} className="px-12 py-3.5 text-sm font-black text-white bg-slate-900 rounded-2xl hover:bg-slate-800 flex items-center shadow-xl transform active:scale-95 transition-all uppercase tracking-widest"><CheckCircle size={20} className="mr-3 text-brand-400" /> 변경 사항 적용</button>
                </div>
            </div>
        </div>
      )}

      {/* Quick Add Course Modal (Nested) */}
      {isCourseModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-50">
                      <h4 className="font-black text-lg text-brand-900 flex items-center tracking-tight"><Building2 size={20} className="mr-2"/> 신규 골프장 마스터 등록</h4>
                      <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">골프장 명칭 *</label>
                          <input type="text" required className="w-full rounded-xl border-slate-200 p-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" value={newCourseForm.name} onChange={e => setNewCourseForm({...newCourseForm, name: e.target.value})} placeholder="공식 명칭 입력" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">지역</label>
                              <select className="w-full rounded-xl border-slate-200 p-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" value={newCourseForm.region} onChange={e => setNewCourseForm({...newCourseForm, region: e.target.value as Region})}>
                                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">홀 수</label>
                              <input type="number" className="w-full rounded-xl border-slate-200 p-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" value={newCourseForm.holes} onChange={e => setNewCourseForm({...newCourseForm, holes: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      <div className="pt-4">
                          <button onClick={handleQuickAddCourse} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all flex justify-center items-center">
                              <CheckCircle size={18} className="mr-2 text-brand-400" /> MASTER DB에 즉시 등록
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
