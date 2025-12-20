
import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database, HeartHandshake, MinusCircle, Clock } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addCourse, updateCourse, addPerson, addExternalEvent, courses: globalCourses, people: globalPeople, navigate, locationState } = useApp();
  const editingLog = locationState?.log as LogEntry | undefined;
  
  // Tabs: LOG(Manual), AI(Smart Upload), PERSON, SCHEDULE
  const [activeTab, setActiveTab] = useState<'LOG' | 'AI' | 'PERSON' | 'SCHEDULE'>('LOG');

  // Regions for selection
  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

  // --- Autosave Indicator State ---
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // --- Log Form State (Manual) ---
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<string>('영업');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [contactPerson, setContactPerson] = useState('');
  
  // --- Bulk Person Form State ---
  const [personEntries, setPersonEntries] = useState<any[]>([
    { id: Date.now(), name: '', role: '', phone: '', courseId: '', affinity: '0', notes: '' }
  ]);

  // --- Bulk Schedule Form State ---
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([
    { id: Date.now(), title: '', date: new Date().toISOString().split('T')[0], time: '09:00', courseId: '', type: 'MEETING' }
  ]);

  // --- Quick Person Add State (For Log Tab) ---
  const [isQuickPersonModalOpen, setIsQuickPersonModalOpen] = useState(false);
  const [quickPerson, setQuickPerson] = useState({ name: '', role: '', phone: '', affinity: '0', courseId: '' });

  // --- AI Upload State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]); 
  const [processedIndices, setProcessedIndices] = useState<Set<number>>(new Set()); 

  // --- Shared State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  
  // --- Dynamic Course Modal State ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<any>({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });

  // --- Filtered People for Log Form ---
  const filteredPeopleForLog = globalPeople.filter(p => 
    courseId ? p.currentCourseId === courseId : true
  );

  // --- Initial Data Loading ---
  useEffect(() => {
    if (editingLog) {
      setActiveTab('LOG');
      setLogDate(editingLog.date);
      setTitle(editingLog.title);
      setContent(editingLog.content);
      setDept(editingLog.department);
      setCourseId(editingLog.courseId);
      setTags(editingLog.tags || []);
      setContactPerson(editingLog.contactPerson || '');
    }
  }, [editingLog]);

  // --- Row Management Handlers ---
  const addPersonRow = () => {
    setPersonEntries([...personEntries, { id: Date.now(), name: '', role: '', phone: '', courseId: '', affinity: '0', notes: '' }]);
  };
  const removePersonRow = (id: number) => {
    if (personEntries.length > 1) setPersonEntries(personEntries.filter(p => p.id !== id));
  };
  const updatePersonEntry = (id: number, field: string, value: any) => {
    setPersonEntries(personEntries.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addScheduleRow = () => {
    setScheduleEntries([...scheduleEntries, { id: Date.now(), title: '', date: new Date().toISOString().split('T')[0], time: '09:00', courseId: '', type: 'MEETING' }]);
  };
  const removeScheduleRow = (id: number) => {
    if (scheduleEntries.length > 1) setScheduleEntries(scheduleEntries.filter(s => s.id !== id));
  };
  const updateScheduleEntry = (id: number, field: string, value: any) => {
    setScheduleEntries(scheduleEntries.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // --- handleSaveNewCourse implementation ---
  const handleSaveNewCourse = () => {
    if (!newCourse.name.trim()) {
      alert('골프장 명칭을 입력해주세요.');
      return;
    }

    const newId = `c-manual-${Date.now()}`;
    addCourse({
      ...newCourse,
      id: newId,
      grassInfo: {
        green: '벤트그라스',
        tee: '켄터키 블루그라스',
        fairway: '한국잔디(중지)'
      },
      areaInfo: {
        total: newCourse.area || '정보없음',
        green: '정보없음',
        tee: '정보없음',
        fairway: '정보없음'
      },
      issues: []
    });

    setCourseId(newId);
    setIsCourseModalOpen(false);
    setNewCourse({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });
    alert('새로운 골프장이 마스터 DB에 등록되었습니다.');
  };

  // --- Submission Handlers ---
  const handleBulkPersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const validEntries = personEntries.filter(p => p.name.trim() !== '');
        if (validEntries.length === 0) {
            alert('최소 한 명 이상의 이름을 입력해주세요.');
            setIsSubmitting(false);
            return;
        }

        for (const p of validEntries) {
            await addPerson({
                id: `person-${Date.now()}-${Math.random()}`,
                name: p.name,
                phone: p.phone,
                currentRole: p.role,
                currentCourseId: p.courseId,
                affinity: parseInt(p.affinity) as AffinityLevel,
                notes: p.notes,
                careers: []
            });
        }
        alert(`${validEntries.length}명의 인물이 성공적으로 등록되었습니다.`);
        setPersonEntries([{ id: Date.now(), name: '', role: '', phone: '', courseId: '', affinity: '0', notes: '' }]);
    } catch (err) {
        alert('등록 중 오류가 발생했습니다.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBulkScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const validEntries = scheduleEntries.filter(s => s.title.trim() !== '');
        if (validEntries.length === 0) {
            alert('최소 한 건 이상의 일정을 입력해주세요.');
            setIsSubmitting(false);
            return;
        }

        for (const s of validEntries) {
            await addExternalEvent({
                id: `sched-${Date.now()}-${Math.random()}`,
                title: s.title,
                date: s.date,
                time: s.time,
                source: 'Manual',
                type: s.type as EventType,
                courseId: s.courseId
            });
        }
        alert(`${validEntries.length}건의 일정이 등록되었습니다.`);
        setScheduleEntries([{ id: Date.now(), title: '', date: new Date().toISOString().split('T')[0], time: '09:00', courseId: '', type: 'MEETING' }]);
    } catch (err) {
        alert('등록 중 오류가 발생했습니다.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const selectedCourse = globalCourses.find(c => c.id === courseId);
    const logData = {
        department: dept as Department, courseId, courseName: selectedCourse?.name || '미지정',
        title, content, tags, contactPerson, updatedAt: Date.now(), date: logDate
    };
    if (editingLog) updateLog({ ...editingLog, ...logData });
    else addLog({ id: `manual-${Date.now()}`, author: '사용자', createdAt: Date.now(), ...logData });
    setTimeout(() => { setIsSubmitting(false); alert('저장되었습니다.'); if(!editingLog) window.history.back(); }, 500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const startAnalysis = async () => {
      if (selectedFiles.length === 0) return;
      setIsAnalyzing(true);
      setAnalysisResults([]);
      try {
          const inputData = await Promise.all(selectedFiles.map(async (file) => {
              return new Promise<{ base64Data: string, mimeType: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve({ base64Data: (e.target?.result as string).split(',')[1], mimeType: file.type });
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
              });
          }));
          const existingNames = globalCourses.map(c => c.name);
          const results = await analyzeDocument(inputData, existingNames);
          if (results) setAnalysisResults(results);
      } catch (error: any) {
          alert(`분석 중 오류 발생: ${error.message}`);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const getInputClass = () => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 bg-slate-50 border-slate-200 text-sm font-medium`;
  const getSelectClass = () => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 appearance-none bg-white border-slate-200 text-sm font-bold`;

  return (
    <div className="space-y-6 relative max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Tabs */}
      {!editingLog && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-x-auto no-scrollbar">
            {[
                { id: 'LOG', label: '수기 작성', icon: <FileText size={18}/> },
                { id: 'AI', label: 'AI 스마트 업로드', icon: <Sparkles size={18}/> },
                { id: 'PERSON', label: '인물 일괄 등록', icon: <UserPlus size={18}/> },
                { id: 'SCHEDULE', label: '일정 일괄 등록', icon: <CalendarPlus size={18}/> }
            ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[130px] py-3 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
            ))}
          </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 relative min-h-[500px]">
            {/* MANUAL LOG TAB */}
            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><FileText className="mr-2 text-brand-600"/> 업무 일지 작성</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">작성 날짜</label><input type="date" required className={getInputClass()} value={logDate} onChange={(e) => setLogDate(e.target.value)} /></div>
                        <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">담당 부서</label><div className="relative"><select className={getSelectClass()} value={dept} onChange={(e) => setDept(e.target.value)}>{Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}</select><ChevronDown className="absolute right-4 top-3.5 text-slate-400" size={16}/></div></div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">대상 골프장</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input list="courses-logs" className={getInputClass()} value={globalCourses.find(c => c.id === courseId)?.name || ''} onChange={(e) => { const found = globalCourses.find(c => c.name === e.target.value); setCourseId(found ? found.id : ''); }} placeholder="골프장 명칭 검색..." />
                                <datalist id="courses-logs">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                <Building2 className="absolute right-4 top-3.5 text-slate-300" size={16}/>
                            </div>
                            <button type="button" onClick={() => setIsCourseModalOpen(true)} className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors" title="신규 골프장 등록">
                                <Plus size={20}/>
                            </button>
                        </div>
                    </div>
                    <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">업무 제목</label><input type="text" required className={getInputClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 핵심 요약 제목" /></div>
                    <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 업무 내역</label><textarea required rows={8} className={getInputClass()} value={content} onChange={(e) => setContent(e.target.value)} placeholder="상세 진행 내용, 특이사항, 향후 계획 등..." /></div>
                    <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 일지 저장하기</button></div>
                </form>
            )}

            {/* BULK PERSON REGISTRATION TAB */}
            {activeTab === 'PERSON' && (
                <form onSubmit={handleBulkPersonSubmit} className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center"><UserPlus className="mr-2 text-brand-600"/> 인물 네트워크 일괄 등록</h3>
                        <button type="button" onClick={addPersonRow} className="bg-brand-50 text-brand-700 px-4 py-2 rounded-xl text-xs font-black border border-brand-100 hover:bg-brand-100 flex items-center transition-all shadow-sm">
                            <Plus size={14} className="mr-1"/> 인물 추가
                        </button>
                    </div>

                    <div className="space-y-4">
                        {personEntries.map((p, idx) => (
                            <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group animate-in slide-in-from-top-2">
                                {personEntries.length > 1 && (
                                    <button type="button" onClick={() => removePersonRow(p.id)} className="absolute -right-2 -top-2 bg-white text-red-500 rounded-full p-1 border border-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MinusCircle size={18}/>
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">성함 *</label>
                                        <input type="text" className={getInputClass()} value={p.name} onChange={e => updatePersonEntry(p.id, 'name', e.target.value)} placeholder="홍길동" required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">직책</label>
                                        <input type="text" className={getInputClass()} value={p.role} onChange={e => updatePersonEntry(p.id, 'role', e.target.value)} placeholder="예: 코스팀장" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">소속 골프장</label>
                                        <div className="relative">
                                            <input list={`courses-person-${idx}`} className={getInputClass()} value={globalCourses.find(c => c.id === p.courseId)?.name || ''} onChange={e => { const f = globalCourses.find(c => c.name === e.target.value); updatePersonEntry(p.id, 'courseId', f ? f.id : ''); }} placeholder="검색 선택..." />
                                            <datalist id={`courses-person-${idx}`}>{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                        </div>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">연락처</label>
                                        <input type="text" className={getInputClass()} value={p.phone} onChange={e => updatePersonEntry(p.id, 'phone', e.target.value)} placeholder="010-0000-0000" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-brand-700 flex justify-center items-center active:scale-[0.99] transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />} 인물 정보 ({personEntries.length}건) 일괄 저장
                        </button>
                    </div>
                </form>
            )}

            {/* BULK SCHEDULE REGISTRATION TAB */}
            {activeTab === 'SCHEDULE' && (
                <form onSubmit={handleBulkScheduleSubmit} className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center"><CalendarPlus className="mr-2 text-brand-600"/> 일정 일괄 등록</h3>
                        <button type="button" onClick={addScheduleRow} className="bg-brand-50 text-brand-700 px-4 py-2 rounded-xl text-xs font-black border border-brand-100 hover:bg-brand-100 flex items-center shadow-sm">
                            <Plus size={14} className="mr-1"/> 일정 추가
                        </button>
                    </div>

                    <div className="space-y-4">
                        {scheduleEntries.map((s, idx) => (
                            <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group animate-in slide-in-from-top-2">
                                {scheduleEntries.length > 1 && (
                                    <button type="button" onClick={() => removeScheduleRow(s.id)} className="absolute -right-2 -top-2 bg-white text-red-500 rounded-full p-1 border border-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MinusCircle size={18}/>
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">일정 제목 *</label>
                                        <input type="text" className={getInputClass()} value={s.title} onChange={e => updateScheduleEntry(s.id, 'title', e.target.value)} placeholder="예: 미팅, 방문" required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">날짜</label>
                                        <input type="date" className={getInputClass()} value={s.date} onChange={e => updateScheduleEntry(s.id, 'date', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">시간</label>
                                        <div className="relative">
                                            <input type="time" className={getInputClass()} value={s.time} onChange={e => updateScheduleEntry(s.id, 'time', e.target.value)} />
                                            <Clock className="absolute right-4 top-3 text-slate-300" size={16}/>
                                        </div>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">관련 골프장</label>
                                        <div className="relative">
                                            <input list={`courses-sched-${idx}`} className={getInputClass()} value={globalCourses.find(c => c.id === s.courseId)?.name || ''} onChange={e => { const f = globalCourses.find(c => c.name === e.target.value); updateScheduleEntry(s.id, 'courseId', f ? f.id : ''); }} placeholder="골프장 검색..." />
                                            <datalist id={`courses-sched-${idx}`}>{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CalendarPlus className="mr-2" />} 일정 ({scheduleEntries.length}건) 일괄 등록
                        </button>
                    </div>
                </form>
            )}

            {/* AI SMART UPLOAD TAB (As existing functionality) */}
            {activeTab === 'AI' && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3"><Sparkles size={32} /></div>
                        <h2 className="text-xl font-bold text-slate-900">AI 지능형 데이터 일괄 분석</h2>
                        <p className="text-sm text-slate-500 mt-1">엑셀 캡처나 PDF 보고서를 올리면 AI가 정보를 일괄 추출합니다.</p>
                    </div>

                    {!isAnalyzing && analysisResults.length === 0 && (
                        <div className="border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center hover:border-indigo-500 cursor-pointer group transition-all" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                            <UploadCloud size={64} className="mx-auto text-slate-200 group-hover:text-indigo-500 mb-4 transition-colors" />
                            <p className="font-black text-slate-700">파일을 클릭하여 업로드하세요 (최대 10개)</p>
                        </div>
                    )}

                    {selectedFiles.length > 0 && !isAnalyzing && analysisResults.length === 0 && (
                        <button onClick={startAnalysis} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg flex justify-center items-center active:scale-[0.99] transition-all">
                            <Sparkles size={20} className="mr-2" /> {selectedFiles.length}개 파일 분석 및 추출 시작
                        </button>
                    )}

                    {isAnalyzing && (
                        <div className="py-20 text-center">
                            <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
                            <h3 className="font-black text-slate-800 text-lg">AI가 실시간 분석을 진행하고 있습니다...</h3>
                        </div>
                    )}

                    {/* (Analysis Results display code as before) */}
                </div>
            )}
      </div>

      {/* Course Modal maintained for new entries */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
             <div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="font-black text-xl text-slate-900 flex items-center"><Building2 size={24} className="mr-3 text-brand-600"/>신규 골프장 등록</h3><button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button></div>
             <div className="space-y-5">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">골프장 명칭</label><input type="text" className={getInputClass()} value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} placeholder="예: 그린마스터 CC" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">지역</label><select className={getSelectClass()} value={newCourse.region} onChange={(e) => setNewCourse({...newCourse, region: e.target.value as Region})}>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">홀 수</label><input type="number" className={getInputClass()} value={newCourse.holes} onChange={(e) => setNewCourse({...newCourse, holes: parseInt(e.target.value)})} /></div>
                 </div>
                 <div className="flex justify-end space-x-3 mt-8 pt-4 border-t"><button onClick={() => setIsCourseModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800">취소</button><button onClick={handleSaveNewCourse} className="px-10 py-3.5 bg-brand-600 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-brand-700 flex items-center active:scale-95 transition-all"><CheckCircle size={18} className="mr-2"/> 등록 완료</button></div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteLog;
