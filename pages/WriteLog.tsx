
import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database, HeartHandshake, MinusCircle, Clock, PlusCircle, Trash } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addCourse, updateCourse, addPerson, addExternalEvent, courses: globalCourses, people: globalPeople, navigate, locationState } = useApp();
  const editingLog = locationState?.log as LogEntry | undefined;
  
  // Tabs: LOG(Manual), AI(Smart Upload), PERSON, SCHEDULE
  const [activeTab, setActiveTab] = useState<'LOG' | 'AI' | 'PERSON' | 'SCHEDULE'>('LOG');

  // Regions for selection
  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

  // --- Log Form State (Manual) ---
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<string>('영업');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // --- Bulk Person Form State ---
  const [personEntries, setPersonEntries] = useState<any[]>([
    { id: Date.now(), name: '', role: '', phone: '', courseId: '', affinity: '0' }
  ]);

  // --- Bulk Schedule Form State ---
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([
    { id: Date.now(), title: '', date: new Date().toISOString().split('T')[0], time: '09:00', courseId: '', type: 'MEETING' }
  ]);

  // --- AI Upload State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]); 

  // --- Shared State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Dynamic Course Modal State ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<any>({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });

  // --- Initial Data Loading ---
  useEffect(() => {
    if (editingLog) {
      setActiveTab('LOG');
      setLogDate(editingLog.date);
      setTitle(editingLog.title);
      setContent(editingLog.content);
      setDept(editingLog.department);
      setCourseId(editingLog.courseId);
    }
  }, [editingLog]);

  // --- Row Management Handlers ---
  const addPersonRow = () => {
    setPersonEntries([...personEntries, { id: Date.now(), name: '', role: '', phone: '', courseId: '', affinity: '0' }]);
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

  // Fix: Added missing handleFileSelect function to handle file input changes
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
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
                notes: '일괄 등록됨',
                careers: []
            });
        }
        alert(`${validEntries.length}명의 인물이 등록되었습니다.`);
        setPersonEntries([{ id: Date.now(), name: '', role: '', phone: '', courseId: '', affinity: '0' }]);
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
        title, content, tags: [], createdAt: Date.now(), updatedAt: Date.now(), date: logDate, author: '사용자'
    };
    if (editingLog) updateLog({ ...editingLog, ...logData });
    else addLog({ id: `manual-${Date.now()}`, ...logData });
    setTimeout(() => { setIsSubmitting(false); alert('저장되었습니다.'); if(!editingLog) window.history.back(); }, 500);
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
                { id: 'LOG', label: '업무 일지', icon: <FileText size={18}/> },
                { id: 'AI', label: 'AI 분석 등록', icon: <Sparkles size={18}/> },
                { id: 'PERSON', label: '인물 다중 등록', icon: <UserPlus size={18}/> },
                { id: 'SCHEDULE', label: '일정 다중 등록', icon: <CalendarPlus size={18}/> }
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

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 min-h-[500px]">
            {/* MANUAL LOG TAB */}
            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center"><FileText className="mr-3 text-brand-600"/> 업무 일지 작성</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">작성 날짜</label><input type="date" required className={getInputClass()} value={logDate} onChange={(e) => setLogDate(e.target.value)} /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">담당 부서</label><div className="relative"><select className={getSelectClass()} value={dept} onChange={(e) => setDept(e.target.value)}>{Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}</select><ChevronDown className="absolute right-4 top-3.5 text-slate-400" size={16}/></div></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">대상 골프장</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input list="courses-logs-all" className={getInputClass()} value={globalCourses.find(c => c.id === courseId)?.name || ''} onChange={(e) => { const found = globalCourses.find(c => c.name === e.target.value); setCourseId(found ? found.id : ''); }} placeholder="골프장 명칭 검색..." />
                                <datalist id="courses-logs-all">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                <Building2 className="absolute right-4 top-3.5 text-slate-300" size={16}/>
                            </div>
                            <button type="button" onClick={() => setIsCourseModalOpen(true)} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors shadow-sm active:scale-95" title="신규 골프장 등록">
                                <PlusCircle size={20}/>
                            </button>
                        </div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">업무 제목</label><input type="text" required className={getInputClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 핵심 요약 제목" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 업무 내역</label><textarea required rows={8} className={getInputClass()} value={content} onChange={(e) => setContent(e.target.value)} placeholder="상세 진행 내용, 특이사항, 향후 계획 등..." /></div>
                    <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 일지 저장하기</button></div>
                </form>
            )}

            {/* BULK PERSON REGISTRATION TAB */}
            {activeTab === 'PERSON' && (
                <form onSubmit={handleBulkPersonSubmit} className="space-y-6">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-900 flex items-center"><UserPlus className="mr-3 text-brand-600"/> 인물 네트워크 등록</h3>
                        <p className="text-xs text-slate-400 font-bold">한 번에 여러 명의 인물 정보를 추가하고 일괄 저장할 수 있습니다.</p>
                    </div>

                    <div className="space-y-4">
                        {personEntries.map((p, idx) => (
                            <div key={p.id} className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 relative group animate-in slide-in-from-top-2 shadow-sm">
                                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                                    <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">Target Person #{idx + 1}</span>
                                    {personEntries.length > 1 && (
                                        <button type="button" onClick={() => removePersonRow(p.id)} className="text-red-500 hover:text-red-700 flex items-center text-xs font-black transition-colors group">
                                            <Trash size={14} className="mr-1.5 transition-transform group-hover:scale-110"/> DELETE
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">성함 *</label>
                                        <input type="text" className={getInputClass()} value={p.name} onChange={e => updatePersonEntry(p.id, 'name', e.target.value)} placeholder="홍길동" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">직책</label>
                                        <input type="text" className={getInputClass()} value={p.role} onChange={e => updatePersonEntry(p.id, 'role', e.target.value)} placeholder="예: 코스팀장" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">소속 골프장</label>
                                        <div className="relative">
                                            <input list={`courses-p-${idx}`} className={getInputClass()} value={globalCourses.find(c => c.id === p.courseId)?.name || ''} onChange={e => { const f = globalCourses.find(c => c.name === e.target.value); updatePersonEntry(p.id, 'courseId', f ? f.id : ''); }} placeholder="검색 선택..." />
                                            <datalist id={`courses-p-${idx}`}>{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">연락처</label>
                                        <input type="text" className={getInputClass()} value={p.phone} onChange={e => updatePersonEntry(p.id, 'phone', e.target.value)} placeholder="010-0000-0000" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-10 flex flex-col items-center">
                        <button type="button" onClick={addPersonRow} className="mb-8 group flex flex-col items-center text-slate-300 hover:text-brand-600 transition-all">
                            <PlusCircle size={40} className="mb-2 group-hover:scale-110 transition-transform shadow-sm rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Add Another Person</span>
                        </button>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-brand-700 flex justify-center items-center active:scale-[0.99] transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />} 인물 정보 ({personEntries.length}건) 일괄 저장
                        </button>
                    </div>
                </form>
            )}

            {/* BULK SCHEDULE REGISTRATION TAB */}
            {activeTab === 'SCHEDULE' && (
                <form onSubmit={handleBulkScheduleSubmit} className="space-y-6">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-900 flex items-center"><CalendarPlus className="mr-3 text-brand-600"/> 일정 네트워크 등록</h3>
                        <p className="text-xs text-slate-400 font-bold">주요 미팅, 방문 일정을 한 번에 다수 등록할 수 있습니다.</p>
                    </div>

                    <div className="space-y-4">
                        {scheduleEntries.map((s, idx) => (
                            <div key={s.id} className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 relative group animate-in slide-in-from-top-2 shadow-sm">
                                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                                    <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">Planned Event #{idx + 1}</span>
                                    {scheduleEntries.length > 1 && (
                                        <button type="button" onClick={() => removeScheduleRow(s.id)} className="text-red-500 hover:text-red-700 flex items-center text-xs font-black transition-colors group">
                                            <Trash size={14} className="mr-1.5 transition-transform group-hover:scale-110"/> DELETE
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">일정 제목 *</label>
                                        <input type="text" className={getInputClass()} value={s.title} onChange={e => updateScheduleEntry(s.id, 'title', e.target.value)} placeholder="예: 미팅, 방문" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">날짜</label>
                                        <input type="date" className={getInputClass()} value={s.date} onChange={e => updateScheduleEntry(s.id, 'date', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">시간</label>
                                        <div className="relative">
                                            <input type="time" className={getInputClass()} value={s.time} onChange={e => updateScheduleEntry(s.id, 'time', e.target.value)} />
                                            <Clock className="absolute right-4 top-3 text-slate-300" size={16}/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">관련 골프장</label>
                                        <div className="relative">
                                            <input list={`courses-s-${idx}`} className={getInputClass()} value={globalCourses.find(c => c.id === s.courseId)?.name || ''} onChange={e => { const f = globalCourses.find(c => c.name === e.target.value); updateScheduleEntry(s.id, 'courseId', f ? f.id : ''); }} placeholder="골프장 검색..." />
                                            <datalist id={`courses-s-${idx}`}>{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-10 flex flex-col items-center">
                        <button type="button" onClick={addScheduleRow} className="mb-8 group flex flex-col items-center text-slate-300 hover:text-brand-600 transition-all">
                            <PlusCircle size={40} className="mb-2 group-hover:scale-110 transition-transform shadow-sm rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Add Another Schedule</span>
                        </button>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CalendarPlus className="mr-2" />} 일정 정보 ({scheduleEntries.length}건) 일괄 등록
                        </button>
                    </div>
                </form>
            )}

            {/* AI SMART UPLOAD TAB */}
            {activeTab === 'AI' && (
                <div className="space-y-6">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-brand-50 text-brand-600 rounded-3xl mb-4 shadow-sm"><Sparkles size={40} /></div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI 지능형 데이터 일괄 분석</h2>
                        <p className="text-sm text-slate-500 mt-2 font-medium">문서 캡처(IMG)나 PDF 보고서를 업로드하세요. <br/>AI가 골프장 마스터 정보와 업무 내역을 자동 추출하여 동기화합니다.</p>
                    </div>

                    {!isAnalyzing && analysisResults.length === 0 && (
                        <div className="border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center hover:border-brand-500 hover:bg-brand-50/10 cursor-pointer group transition-all" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                            <UploadCloud size={80} className="mx-auto text-slate-100 group-hover:text-brand-400 mb-6 transition-colors" />
                            <p className="font-black text-slate-800 text-lg">파일을 클릭하여 분석 시작 (최대 10개)</p>
                            <p className="text-[10px] text-slate-400 mt-3 font-bold tracking-widest uppercase">ENCRYPTED IMAGE / PDF ANALYSIS SUPPORTED</p>
                        </div>
                    )}

                    {selectedFiles.length > 0 && !isAnalyzing && analysisResults.length === 0 && (
                        <button onClick={startAnalysis} className="w-full bg-brand-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-brand-700 flex justify-center items-center active:scale-[0.99] transition-all">
                            <Sparkles size={24} className="mr-3" /> {selectedFiles.length}개 파일 실시간 인텔리전스 분석 시작
                        </button>
                    )}

                    {isAnalyzing && (
                        <div className="py-24 text-center">
                            <Loader2 size={64} className="mx-auto text-brand-600 animate-spin mb-6" />
                            <h3 className="font-black text-slate-900 text-xl tracking-tight">AI가 실시간 마스터 데이터 추출 중...</h3>
                            <p className="text-slate-400 text-sm mt-2">잠시만 기다려 주세요. 문서의 복잡도에 따라 10-30초 소요될 수 있습니다.</p>
                        </div>
                    )}
                </div>
            )}
      </div>

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-5">
                 <h3 className="font-black text-xl text-slate-900 flex items-center"><Building2 size={28} className="mr-3 text-brand-600 bg-brand-50 p-1 rounded-lg"/>신규 골프장 등록</h3>
                 <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
             </div>
             <div className="space-y-6 overflow-y-auto max-h-[70vh] p-1 custom-scrollbar">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">골프장 공식 명칭</label><input type="text" className={getInputClass()} value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} placeholder="예: 그린마스터 CC" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">지역</label><select className={getSelectClass()} value={newCourse.region} onChange={(e) => setNewCourse({...newCourse, region: e.target.value as Region})}>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">홀 수</label><input type="number" className={getInputClass()} value={newCourse.holes} onChange={(e) => setNewCourse({...newCourse, holes: parseInt(e.target.value)})} /></div>
                 </div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 도로명 주소</label><input type="text" className={getInputClass()} value={newCourse.address} onChange={(e) => setNewCourse({...newCourse, address: e.target.value})} placeholder="주소 정보를 입력하세요" /></div>
             </div>
             <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-slate-100 shadow-inner">
                 <button onClick={() => setIsCourseModalOpen(false)} className="px-8 py-4 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors">CANCEL</button>
                 <button onClick={handleSaveNewCourse} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-2xl hover:bg-slate-800 flex items-center active:scale-95 transition-all uppercase tracking-widest"><CheckCircle size={20} className="mr-2"/> REGISTER COURSE</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteLog;
