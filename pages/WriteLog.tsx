
import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region, CareerRecord } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database, HeartHandshake, MinusCircle, Clock, PlusCircle, Trash, ExternalLink, Info, Check, AlertTriangle, Briefcase, Calendar } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addCourse, updateCourse, addPerson, addExternalEvent, courses: globalCourses, people: globalPeople, navigate, locationState } = useApp();
  const editingLog = locationState?.log as LogEntry | undefined;
  
  const [activeTab, setActiveTab] = useState<'LOG' | 'AI' | 'PERSON'>('LOG');
  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

  // --- Manual Log State ---
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<string>('영업');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // --- Enhanced Person Registration State ---
  const [personForm, setPersonForm] = useState<{
    name: string;
    phone: string;
    currentRole: string;
    currentCourseName: string;
    currentCourseId: string;
    currentRoleStartDate: string;
    affinity: AffinityLevel;
    notes: string;
    careers: Partial<CareerRecord>[];
  }>({
    name: '',
    phone: '',
    currentRole: '',
    currentCourseName: '',
    currentCourseId: '',
    currentRoleStartDate: new Date().toISOString().split('T')[0],
    affinity: AffinityLevel.NEUTRAL,
    notes: '',
    careers: []
  });

  // --- AI State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [aiResults, setAiResults] = useState<{
      extractedCourses: any[],
      extractedLogs: any[],
      extractedPeople: any[]
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<any>({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const startAiAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    setIsAnalyzing(true);
    setAiResults(null);
    setAnalysisProgress('문서 텍스트 스캔 및 인텔리전스 도출 중...');
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
      if (results) setAiResults(results);
    } catch (error: any) {
      alert(`AI 분석 오류: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const commitAiResults = async () => {
      if (!aiResults) return;
      setIsSubmitting(true);
      try {
          for (const c of aiResults.extractedCourses) {
              const existing = globalCourses.find(gc => gc.name === c.name);
              if (!existing) await addCourse({ id: `c-ai-${Date.now()}-${Math.random()}`, name: c.name, region: (c.region as Region) || '기타', address: c.address || '', holes: c.holes || 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '정보없음', description: c.description || 'AI 추출 정보', openYear: '미상', issues: [] });
          }
          for (const p of aiResults.extractedPeople) {
              const course = globalCourses.find(gc => gc.name === p.courseName);
              await addPerson({ id: `p-ai-${Date.now()}-${Math.random()}`, name: p.name, phone: '정보없음', currentRole: p.role, currentCourseId: course?.id, affinity: p.affinity as AffinityLevel, notes: p.notes || '', careers: [] });
          }
          for (const l of aiResults.extractedLogs) {
              const course = globalCourses.find(gc => gc.name === l.courseName);
              await addLog({ id: `l-ai-${Date.now()}-${Math.random()}`, date: l.date || new Date().toISOString().split('T')[0], author: 'AI Intelligence', department: (l.department as Department) || Department.SALES, courseId: course?.id || '', courseName: l.courseName, title: l.title, content: `${l.content}\n\n[AI Insight]\n${l.insight}`, tags: ['AI추출'], createdAt: Date.now() });
          }
          alert('전체 데이터가 시스템에 반영되었습니다.');
          navigate('/');
      } catch (err) {
          alert('데이터 저장 중 오류가 발생했습니다.');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSaveNewCourse = () => {
    if (!newCourse.name.trim()) return;
    const newId = `c-man-${Date.now()}`;
    addCourse({ ...newCourse, id: newId, grassInfo: { green: '벤트그라스', tee: '켄터키', fairway: '한국잔디' }, areaInfo: { total: newCourse.area || '정보없음', green: '정보없음', tee: '정보없음', fairway: '정보없음' }, issues: [] });
    setIsCourseModalOpen(false);
    setNewCourse({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });
  };

  // --- Enhanced Person Handlers ---
  const handlePersonFieldChange = (field: string, value: any) => {
    setPersonForm(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'currentCourseName') {
        const matched = globalCourses.find(c => c.name === value);
        newState.currentCourseId = matched ? matched.id : '';
      }
      return newState;
    });
  };

  const addCareerRow = () => {
    setPersonForm(prev => ({
      ...prev,
      careers: [{ courseName: '', courseId: '', role: '', startDate: '', endDate: '', description: '' }, ...prev.careers]
    }));
  };

  const updateCareerField = (idx: number, field: string, value: string) => {
    setPersonForm(prev => {
      const newCareers = [...prev.careers];
      const updated = { ...newCareers[idx], [field]: value };
      if (field === 'courseName') {
        const matched = globalCourses.find(c => c.name === value);
        updated.courseId = matched ? matched.id : '';
      }
      newCareers[idx] = updated;
      return { ...prev, careers: newCareers };
    });
  };

  const removeCareerRow = (idx: number) => {
    setPersonForm(prev => ({
      ...prev,
      careers: prev.careers.filter((_, i) => i !== idx)
    }));
  };

  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.name.trim()) return;
    setIsSubmitting(true);
    try {
        await addPerson({
          id: `person-${Date.now()}`,
          name: personForm.name,
          phone: personForm.phone,
          currentRole: personForm.currentRole,
          currentCourseId: personForm.currentCourseId,
          currentRoleStartDate: personForm.currentRoleStartDate,
          affinity: personForm.affinity,
          notes: personForm.notes,
          careers: personForm.careers as CareerRecord[]
        });
        alert(`${personForm.name}님의 정보가 성공적으로 등록되었습니다.`);
        navigate('/courses');
    } catch (err) {
        alert('등록 중 오류가 발생했습니다.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const selectedCourse = globalCourses.find(c => c.id === courseId);
    const logData = { department: dept as Department, courseId, courseName: selectedCourse?.name || '미지정', title, content, tags: [], createdAt: Date.now(), updatedAt: Date.now(), date: logDate, author: '사용자' };
    if (editingLog) updateLog({ ...editingLog, ...logData });
    else addLog({ id: `manual-${Date.now()}`, ...logData });
    setTimeout(() => { setIsSubmitting(false); navigate('/'); }, 500);
  };

  const getInputClass = () => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 bg-slate-50 border-slate-200 text-sm font-bold shadow-sm`;
  const getSelectClass = () => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 appearance-none bg-white border-slate-200 text-sm font-black shadow-sm`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {!editingLog && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-x-auto no-scrollbar">
            {[
                { id: 'LOG', label: '업무 일지', icon: <FileText size={18}/> },
                { id: 'AI', label: 'AI 스마트 등록', icon: <Sparkles size={18}/> },
                { id: 'PERSON', label: '인물 신규 등록', icon: <UserPlus size={18}/> },
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[140px] py-3.5 text-sm font-black rounded-xl transition-all duration-200 flex items-center justify-center ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
            ))}
          </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 min-h-[500px]">
            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 flex items-center mb-6"><FileText className="mr-3 text-brand-600"/> 업무 기록 작성</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">작성 날짜</label><input type="date" required className={getInputClass()} value={logDate} onChange={(e) => setLogDate(e.target.value)} /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">담당 부서</label><select className={getSelectClass()} value={dept} onChange={(e) => setDept(e.target.value)}>{Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">대상 골프장 <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-brand-600 hover:underline">목록에 없나요?</button></label>
                        <div className="relative">
                            <input list="courses-logs-all" className={getInputClass()} value={globalCourses.find(c => c.id === courseId)?.name || ''} onChange={(e) => { const found = globalCourses.find(c => c.name === e.target.value); setCourseId(found ? found.id : ''); }} placeholder="골프장 검색 또는 입력..." />
                            <datalist id="courses-logs-all">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">업무 제목</label><input type="text" required className={getInputClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 내용</label><textarea required rows={8} className={getInputClass()} value={content} onChange={(e) => setContent(e.target.value)} placeholder="상세 진행 내역..." /></div>
                    <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 업무 기록 저장</button></div>
                </form>
            )}

            {activeTab === 'PERSON' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900 flex items-center"><UserPlus className="mr-3 text-brand-600"/> 인물 정보 정밀 등록</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personal Relationship Mapping</p>
                    </div>
                    
                    <form onSubmit={handlePersonSubmit} className="space-y-10">
                        {/* Core Info Section */}
                        <section className="space-y-6">
                            <h4 className="text-[11px] font-black text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">기본 인적 사항</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">성명 *</label><input type="text" className={getInputClass()} value={personForm.name} onChange={e => handlePersonFieldChange('name', e.target.value)} required placeholder="이름" /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">연락처</label><input type="text" className={getInputClass()} value={personForm.phone} onChange={e => handlePersonFieldChange('phone', e.target.value)} placeholder="010-0000-0000" /></div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">우리와의 친밀도</label>
                                    <select className={getSelectClass()} value={personForm.affinity} onChange={e => handlePersonFieldChange('affinity', parseInt(e.target.value))}>
                                        <option value={AffinityLevel.ALLY}>강력한 아군 (Ally)</option>
                                        <option value={AffinityLevel.FRIENDLY}>우호적 (Friendly)</option>
                                        <option value={AffinityLevel.NEUTRAL}>중립 (Neutral)</option>
                                        <option value={AffinityLevel.UNFRIENDLY}>비우호적 (Unfriendly)</option>
                                        <option value={AffinityLevel.HOSTILE}>적대적 (Hostile)</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Current Placement Section */}
                        <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Building2 size={16} className="mr-2 text-brand-600"/> 현재 소속 발령 정보</h4>
                                <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-[10px] font-black text-brand-600 hover:underline">골프장 신규 등록</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">소속 골프장 (Master DB 연동)</label>
                                    <input 
                                      list="courses-person-reg" 
                                      className={getInputClass()} 
                                      value={personForm.currentCourseName} 
                                      onChange={e => handlePersonFieldChange('currentCourseName', e.target.value)} 
                                      placeholder="골프장 검색..."
                                    />
                                    <datalist id="courses-person-reg">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                    {personForm.currentCourseId && <p className="text-[9px] text-brand-600 font-bold mt-1.5 flex items-center"><CheckCircle size={10} className="mr-1"/> 마스터 DB 연결됨</p>}
                                </div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">현직 공식 직책</label><input type="text" className={getInputClass()} value={personForm.currentRole} onChange={e => handlePersonFieldChange('currentRole', e.target.value)} placeholder="코스팀장, 총지배인 등" /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">현직 발령일</label><input type="date" className={getInputClass()} value={personForm.currentRoleStartDate} onChange={e => handlePersonFieldChange('currentRoleStartDate', e.target.value)} /></div>
                            </div>
                        </section>

                        {/* Career History Section */}
                        <section className="space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Briefcase size={16} className="mr-2 text-brand-600"/> 과거 주요 경력 사항 (Careers)</h4>
                                <button type="button" onClick={addCareerRow} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-slate-800 transition-all flex items-center active:scale-95"><Plus size={14} className="mr-1.5"/> ADD RECORD</button>
                            </div>
                            
                            {personForm.careers.length > 0 ? (
                                <div className="space-y-4">
                                    {personForm.careers.map((career, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-soft relative group animate-in slide-in-from-top-2 duration-300">
                                            <button type="button" onClick={() => removeCareerRow(idx)} className="absolute -right-2 -top-2 bg-white text-red-400 hover:text-red-600 p-2 rounded-xl border border-slate-100 shadow-md opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="lg:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5 ml-1">골프장 명칭</label>
                                                    <input list={`career-courses-${idx}`} className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 outline-none" value={career.courseName} onChange={e => updateCareerField(idx, 'courseName', e.target.value)} placeholder="검색..." />
                                                    <datalist id={`career-courses-${idx}`}>{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                                </div>
                                                <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5 ml-1">수행 직책</label><input className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 outline-none" value={career.role} onChange={e => updateCareerField(idx, 'role', e.target.value)} placeholder="직책 입력" /></div>
                                                <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5 ml-1">시작일 (YYYY-MM)</label><input className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 outline-none" value={career.startDate} onChange={e => updateCareerField(idx, 'startDate', e.target.value)} placeholder="YYYY-MM" /></div>
                                                <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5 ml-1">종료일 (YYYY-MM)</label><input className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/5 outline-none" value={career.endDate} onChange={e => updateCareerField(idx, 'endDate', e.target.value)} placeholder="YYYY-MM" /></div>
                                            </div>
                                            {career.courseId && <p className="text-[8px] text-brand-600 font-black mt-2 px-1 flex items-center uppercase tracking-tighter"><CheckCircle size={10} className="mr-1"/> Master DB Match: {career.courseId}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <History size={32} className="mx-auto text-slate-200 mb-3"/>
                                    <p className="text-slate-400 text-xs font-bold">등록된 과거 경력이 없습니다. 인맥 관리를 위해 추가를 권장합니다.</p>
                                </div>
                            )}
                        </section>

                        <section className="space-y-4">
                            <label className="block text-[11px] font-black text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">전략적 관계 메모</label>
                            <textarea rows={4} className={getInputClass()} value={personForm.notes} onChange={e => handlePersonFieldChange('notes', e.target.value)} placeholder="성격, 특이사항, 관계 유지 전략 등을 입력하세요..." />
                        </section>

                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.98] transition-all">
                                {isSubmitting ? <Loader2 className="animate-spin mr-3" /> : <Save className="mr-3" />} 인물 마스터 DB 등록
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'AI' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    {!aiResults ? (
                        <div className="space-y-8">
                            <div className="text-center max-w-2xl mx-auto">
                                <div className="inline-flex p-6 bg-indigo-50 text-indigo-600 rounded-[2rem] mb-6 shadow-soft ring-1 ring-indigo-100"><Sparkles size={48} className="animate-pulse" /></div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">AI 지능형 데이터 통합</h2>
                                <p className="text-slate-500 leading-relaxed font-medium">보고서, 메일, 텍스트 일지를 업로드하세요. <br/>AI가 골프장 및 인물 정보를 자동 추출하여 시스템에 매핑합니다.</p>
                            </div>
                            {!isAnalyzing ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center hover:border-brand-500 hover:bg-brand-50/10 cursor-pointer group transition-all duration-500" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    <UploadCloud size={80} className="mx-auto text-slate-100 group-hover:text-brand-400 mb-6 transition-all duration-500 group-hover:scale-110" />
                                    <p className="font-black text-slate-800 text-xl group-hover:text-brand-700">분석할 파일을 업로드하세요</p>
                                    <p className="text-xs text-slate-400 mt-4 font-bold tracking-widest uppercase">Images, PDF, Text Logs supported</p>
                                    {selectedFiles.length > 0 && <div className="mt-8 flex flex-wrap justify-center gap-3">{selectedFiles.map((f, i) => (<div key={i} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-xs font-bold text-slate-600 flex items-center"><FileIcon size={14} className="mr-2 text-brand-500"/> {f.name}</div>))}</div>}
                                </div>
                            ) : (
                                <div className="py-24 text-center bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                                    <Loader2 size={64} className="mx-auto text-brand-600 animate-spin mb-8" />
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-2">지능형 분석 가동 중...</h3>
                                    <p className="text-brand-600 font-bold animate-pulse text-sm">{analysisProgress}</p>
                                </div>
                            )}
                            {selectedFiles.length > 0 && !isAnalyzing && (
                                <button onClick={startAiAnalysis} className="w-full bg-brand-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-brand-700 flex justify-center items-center active:scale-[0.98] transition-all"><Sparkles size={24} className="mr-3 text-amber-300" /> {selectedFiles.length}건의 문서 정밀 분석 시작</button>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-8">
                                <div><h2 className="text-3xl font-black text-slate-900 flex items-center tracking-tight"><ListChecks size={32} className="mr-3 text-brand-600"/> 데이터 검토 및 시스템 반영</h2><p className="text-slate-500 mt-2 font-medium">추출된 결과를 최종 확인하고 사내 데이터베이스에 통합하세요.</p></div>
                                <button onClick={() => setAiResults(null)} className="flex items-center text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors mb-2"><RotateCcw size={16} className="mr-2"/> 분석 초기화</button>
                            </div>
                            <div className="space-y-12">
                                {/* Courses */}
                                {aiResults.extractedCourses.length > 0 && (
                                    <section>
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Building2 size={16} className="mr-2"/> 식별된 골프장 ({aiResults.extractedCourses.length})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {aiResults.extractedCourses.map((c, i) => (<div key={i} className={`p-6 rounded-[1.5rem] border ${c.isNew ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} shadow-sm flex items-start gap-4`}><div className={`p-3 rounded-2xl ${c.isNew ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Database size={24} /></div><div><div className="flex items-center gap-2 mb-1"><h4 className="font-black text-slate-800">{c.name}</h4>{c.isNew && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full">NEW</span>}</div><p className="text-xs text-slate-500"><MapPin size={10} className="inline mr-1"/> {c.region} | {c.address}</p></div></div>))}
                                        </div>
                                    </section>
                                )}
                                {/* Logs */}
                                {aiResults.extractedLogs.length > 0 && (
                                    <section>
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><FileText size={16} className="mr-2"/> 업무 히스토리 ({aiResults.extractedLogs.length})</h3>
                                        <div className="space-y-4">
                                            {aiResults.extractedLogs.map((l, i) => (<div key={i} className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-soft group hover:border-brand-300 transition-all"><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-2"><span className="bg-brand-50 text-brand-700 text-[10px] font-black px-3 py-1 rounded-full border border-brand-100 uppercase tracking-widest">{l.department}</span><span className="text-xs text-slate-400 font-bold">{l.courseName}</span></div><span className="text-xs font-mono text-slate-300">{l.date}</span></div><h4 className="font-black text-slate-800 text-lg mb-2">{l.title}</h4><p className="text-sm text-slate-600 leading-relaxed mb-4">{l.content}</p><div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-start"><Sparkles size={16} className="text-indigo-600 mt-1 shrink-0" /><p className="text-xs text-indigo-900 font-bold leading-relaxed">{l.insight}</p></div></div>))}
                                        </div>
                                    </section>
                                )}
                                {/* People */}
                                {aiResults.extractedPeople.length > 0 && (
                                    <section>
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><HeartHandshake size={16} className="mr-2"/> 인적 관계 매핑 ({aiResults.extractedPeople.length})</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {aiResults.extractedPeople.map((p, i) => (<div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:bg-white hover:shadow-md transition-all"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${p.affinity > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{p.name[0]}</div><div><h4 className="font-black text-slate-800 text-sm">{p.name}</h4><p className="text-[10px] text-slate-500 font-bold mb-1">{p.role} @ {p.courseName}</p><div className="flex gap-1">{Array.from({ length: 5 }).map((_, idx) => (<div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx < (p.affinity + 2) ? 'bg-brand-500' : 'bg-slate-200'}`}></div>))}</div></div></div>))}
                                        </div>
                                    </section>
                                )}
                            </div>
                            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col items-center">
                                <button onClick={commitAiResults} disabled={isSubmitting} className="w-full max-w-md bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-slate-800 flex justify-center items-center">
                                    {isSubmitting ? <Loader2 size={24} className="animate-spin mr-3"/> : <Check size={24} className="mr-3 text-brand-400" />} 전체 데이터 시스템 반영
                                </button>
                                <p className="text-xs text-slate-400 mt-4 font-bold tracking-tight">확정된 데이터는 즉시 전사 공유됩니다.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
      </div>

      {/* Shared Course Creation Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
             <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                 <h3 className="font-black text-2xl text-slate-900 flex items-center tracking-tight"><Building2 size={32} className="mr-4 text-brand-600 bg-brand-50 p-1.5 rounded-xl shadow-sm"/>신규 골프장 마스터 등록</h3>
                 <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full focus:outline-none"><X size={28}/></button>
             </div>
             <div className="space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar px-1">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">골프장 명칭 *</label><input type="text" className={getInputClass()} value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} placeholder="공식 명칭 입력" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">지역</label><select className={getSelectClass()} value={newCourse.region} onChange={(e) => setNewCourse({...newCourse, region: e.target.value as Region})}>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">홀 수</label><input type="number" className={getInputClass()} value={newCourse.holes} onChange={(e) => setNewCourse({...newCourse, holes: parseInt(e.target.value)})} /></div>
                 </div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">주소</label><input type="text" className={getInputClass()} value={newCourse.address} onChange={(e) => setNewCourse({...newCourse, address: e.target.value})} placeholder="도로명 주소" /></div>
             </div>
             <div className="flex justify-end space-x-4 mt-10 pt-8 border-t border-slate-100">
                 <button onClick={() => setIsCourseModalOpen(false)} className="px-8 py-4 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest">취소</button>
                 <button onClick={handleSaveNewCourse} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-2xl hover:bg-slate-800 flex items-center active:scale-95 transition-all uppercase tracking-widest"><Check size={20} className="mr-2 text-brand-400"/> SYNC TO MASTER DB</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteLog;
