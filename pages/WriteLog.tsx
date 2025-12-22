
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region, CareerRecord } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database, HeartHandshake, MinusCircle, Clock, PlusCircle, Trash, ExternalLink, Info, Check, AlertTriangle, Briefcase, Calendar, Target, ShieldAlert, Zap, Filter } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { user, addLog, updateLog, addCourse, updateCourse, addPerson, addExternalEvent, courses: globalCourses, people: globalPeople, navigate, locationState } = useApp();
  const editingLog = locationState?.log as LogEntry | undefined;
  
  const [activeTab, setActiveTab] = useState<'LOG' | 'AI' | 'PERSON'>('LOG');
  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

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

  // AI Result Filters
  const [aiFilterPriority, setAiFilterPriority] = useState<number | 'ALL'>('ALL');
  const [aiFilterType, setAiFilterType] = useState<'ALL' | 'NEW_COURSE' | 'RISK'>('ALL');

  const filteredAiLogs = useMemo(() => {
      if (!aiResults) return [];
      return aiResults.extractedLogs.filter(l => {
          const matchPriority = aiFilterPriority === 'ALL' || l.priority >= aiFilterPriority;
          const matchType = aiFilterType === 'ALL' || (aiFilterType === 'RISK' && l.risk);
          return matchPriority && matchType;
      });
  }, [aiResults, aiFilterPriority, aiFilterType]);

  // --- Quick Add Course State ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({
      name: '',
      region: '경기' as Region,
      holes: 18,
      type: CourseType.PUBLIC
  });

  // --- Manual Log State ---
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<Department>(user?.department || Department.SALES);
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // --- Person Registration State ---
  const [personForm, setPersonForm] = useState({
    name: '',
    phone: '',
    currentRole: '',
    currentCourseName: '',
    affinity: AffinityLevel.NEUTRAL,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title || !content) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const logData: LogEntry = {
        id: editingLog?.id || `log-${Date.now()}`,
        date: logDate,
        author: user?.name || '익명',
        department: dept,
        courseId,
        courseName: globalCourses.find(c => c.id === courseId)?.name || '미지정',
        title,
        content,
        createdAt: editingLog?.createdAt || Date.now()
      };
      if (editingLog) {
        updateLog(logData);
      } else {
        addLog(logData);
      }
      alert('성공적으로 저장되었습니다.');
      navigate('/');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCourseAdd = () => {
      if (!newCourseForm.name.trim()) return;
      const newId = `c-quick-${Date.now()}`;
      const newCourse: GolfCourse = {
          id: newId,
          name: newCourseForm.name,
          region: newCourseForm.region,
          holes: newCourseForm.holes,
          type: newCourseForm.type,
          openYear: new Date().getFullYear().toString(),
          address: `${newCourseForm.region} 신규 등록지`,
          grassType: GrassType.ZOYSIA,
          area: '정보없음',
          description: '일지 작성 중 퀵 등록됨',
          issues: []
      };
      addCourse(newCourse);
      
      if (activeTab === 'PERSON') {
          setPersonForm({...personForm, currentCourseName: newCourseForm.name});
      } else {
          setCourseId(newId);
      }
      
      setIsCourseModalOpen(false);
      setNewCourseForm({ name: '', region: '경기', holes: 18, type: CourseType.PUBLIC });
      alert(`'${newCourse.name}' 골프장이 마스터 DB에 추가되었습니다.`);
  };

  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.name || !personForm.currentRole) {
      alert('성명과 직책을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const course = globalCourses.find(c => c.name === personForm.currentCourseName);
      const newPerson: Person = {
        id: `p-${Date.now()}`,
        name: personForm.name,
        phone: personForm.phone,
        currentRole: personForm.currentRole,
        currentCourseId: course?.id || '',
        currentRoleStartDate: new Date().toISOString().split('T')[0],
        affinity: personForm.affinity,
        notes: personForm.notes,
        careers: []
      };
      await addPerson(newPerson);
      alert('인물 정보가 마스터 DB에 등록되었습니다.');
      setPersonForm({ name: '', phone: '', currentRole: '', currentCourseName: '', affinity: AffinityLevel.NEUTRAL, notes: '' });
      setActiveTab('LOG');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
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
          for (const l of filteredAiLogs) {
              const course = globalCourses.find(gc => gc.name === l.courseName);
              const combinedContent = `${l.summary}\n\n[상세 내용]\n${l.details}\n\n[전략 가치]\n${l.strategy}\n\n[리스크]\n${l.risk}`;
              await addLog({ 
                  id: `l-ai-${Date.now()}-${Math.random()}`, 
                  date: l.date || new Date().toISOString().split('T')[0], 
                  author: 'AI Intelligence', 
                  department: (l.department as Department) || Department.SALES, 
                  courseId: course?.id || '', 
                  courseName: l.courseName, 
                  title: l.title, 
                  content: combinedContent, 
                  tags: ['AI추출', ...(l.tags || [])], 
                  createdAt: Date.now() 
              });
          }
          alert('전체 데이터가 시스템에 반영되었습니다.');
          navigate('/');
      } catch (err) { alert('데이터 저장 중 오류가 발생했습니다.'); } finally { setIsSubmitting(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setSelectedFiles(Array.from(e.target.files)); };
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
            {activeTab === 'AI' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    {!aiResults ? (
                        <div className="space-y-8">
                            <div className="text-center max-w-2xl mx-auto">
                                <div className="inline-flex p-6 bg-indigo-50 text-indigo-600 rounded-[2rem] mb-6 shadow-soft ring-1 ring-indigo-100"><Sparkles size={48} className="animate-pulse" /></div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">AI 지능형 데이터 분석</h2>
                                <p className="text-slate-500 leading-relaxed font-medium">분석 결과는 요약, 상세설명, 전략, 리스크로 세분화됩니다. <br/>추출된 데이터를 검토하고 필터링하여 원하는 정보만 선택 등록하세요.</p>
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
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-2">정밀 분석 엔진 가동 중...</h3>
                                    <p className="text-brand-600 font-bold animate-pulse text-sm">{analysisProgress}</p>
                                </div>
                            )}
                            {selectedFiles.length > 0 && !isAnalyzing && (
                                <button onClick={startAiAnalysis} className="w-full bg-brand-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-brand-700 flex justify-center items-center active:scale-[0.98] transition-all"><Sparkles size={24} className="mr-3 text-amber-300" /> {selectedFiles.length}건의 문서 정밀 분석 시작</button>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-slate-100 pb-8 gap-4">
                                <div><h2 className="text-3xl font-black text-slate-900 flex items-center tracking-tight"><ListChecks size={32} className="mr-3 text-brand-600"/> 분석 결과 검토 센터</h2><p className="text-slate-500 mt-2 font-medium">분류된 결과를 확인하고 최종 승인하세요.</p></div>
                                <div className="flex gap-2">
                                    <button onClick={() => setAiResults(null)} className="px-4 py-2 text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center"><RotateCcw size={16} className="mr-2"/> 분석 초기화</button>
                                </div>
                            </div>

                            {/* Advanced AI Filters */}
                            <div className="bg-slate-50 p-6 rounded-3xl mb-10 border border-slate-200 flex flex-wrap gap-6 items-center shadow-inner">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Filter size={14} className="mr-2"/> Result Filters</span>
                                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                        {[
                                            {id: 'ALL', label: '전체'},
                                            {id: 'RISK', label: '리스크 집중'},
                                            {id: 'NEW_COURSE', label: '신규 골프장만'}
                                        ].map(f => (
                                            <button key={f.id} onClick={() => setAiFilterType(f.id as any)} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${aiFilterType === f.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>{f.label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Priority</span>
                                    <select value={aiFilterPriority} onChange={e => setAiFilterPriority(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} className="text-[11px] font-black border-slate-200 rounded-xl px-3 py-1.5 shadow-sm outline-none focus:ring-brand-500">
                                        <option value="ALL">All Levels</option>
                                        <option value="3">P3 or Higher</option>
                                        <option value="4">P4 or Higher</option>
                                        <option value="5">Critical Only (P5)</option>
                                    </select>
                                </div>
                                <div className="ml-auto text-xs font-bold text-brand-600 flex items-center bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100"><Zap size={12} className="mr-1.5"/> Showing {filteredAiLogs.length} intelligent records</div>
                            </div>

                            <div className="space-y-12">
                                {/* Courses */}
                                {aiResults.extractedCourses.length > 0 && aiFilterType !== 'RISK' && (
                                    <section className="animate-in slide-in-from-left-4 duration-500">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Building2 size={16} className="mr-2"/> 식별된 골프장 ({aiResults.extractedCourses.length})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {aiResults.extractedCourses.map((c, i) => (<div key={i} className={`p-6 rounded-[1.5rem] border ${c.isNew ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} shadow-sm flex items-start gap-4 transition-all hover:scale-[1.02]`}><div className={`p-3 rounded-2xl ${c.isNew ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Database size={24} /></div><div><div className="flex items-center gap-2 mb-1"><h4 className="font-black text-slate-800">{c.name}</h4>{c.isNew && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full">NEW ENTRY</span>}</div><p className="text-xs text-slate-500 font-medium"><MapPin size={10} className="inline mr-1"/> {c.region} | {c.address}</p></div></div>))}
                                        </div>
                                    </section>
                                )}
                                
                                {/* Logs */}
                                {filteredAiLogs.length > 0 && (
                                    <section className="animate-in slide-in-from-left-4 duration-500" style={{animationDelay: '100ms'}}>
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><FileText size={16} className="mr-2"/> 분석된 전략 히스토리 ({filteredAiLogs.length})</h3>
                                        <div className="space-y-6">
                                            {filteredAiLogs.map((l, i) => (
                                                <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-soft group hover:border-brand-300 transition-all">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <span className="bg-brand-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">{l.department || 'INTEL'}</span>
                                                            <span className="text-lg font-black text-slate-900">{l.courseName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex gap-1">{Array.from({length: 5}).map((_, idx) => (<div key={idx} className={`w-2 h-2 rounded-full ${idx < l.priority ? 'bg-amber-500' : 'bg-slate-100'}`}></div>))}</div>
                                                            <span className="text-xs font-mono text-slate-300">{l.date}</span>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-black text-slate-800 text-xl mb-6">{l.title}</h4>
                                                    
                                                    {/* Categorized AI Results */}
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                        <div className="space-y-6">
                                                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Info size={12} className="mr-2"/> Executive Summary</h5>
                                                                <p className="text-sm text-slate-800 font-bold leading-relaxed">{l.summary}</p>
                                                            </div>
                                                            <div>
                                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center ml-1"><FileText size={12} className="mr-2"/> Detailed Description</h5>
                                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{l.details}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                                                                <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center"><Target size={14} className="mr-2"/> Strategic Insights</h5>
                                                                <p className="text-xs text-emerald-900 font-bold leading-relaxed">{l.strategy}</p>
                                                            </div>
                                                            {l.risk && (
                                                                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm">
                                                                    <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center"><ShieldAlert size={14} className="mr-2"/> Risk Assessment</h5>
                                                                    <p className="text-xs text-red-900 font-bold leading-relaxed">{l.risk}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                            
                            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col items-center">
                                <button onClick={commitAiResults} disabled={isSubmitting} className="w-full max-w-md bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.98] transition-all">
                                    {isSubmitting ? <Loader2 size={24} className="animate-spin mr-3"/> : <CheckCircle size={24} className="mr-3 text-brand-400" />} 전체 분석 데이터 최종 승인
                                </button>
                                <p className="text-xs text-slate-400 mt-4 font-bold tracking-tight">승인된 데이터는 즉시 전사 지식 베이스에 통합됩니다.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-xl font-black text-slate-900 flex items-center mb-6"><FileText className="mr-3 text-brand-600"/> 업무 기록 작성</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">작성 날짜</label><input type="date" required className={getInputClass()} value={logDate} onChange={(e) => setLogDate(e.target.value)} /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">담당 부서</label><select className={getSelectClass()} value={dept} onChange={(e) => setDept(e.target.value as Department)}>{Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">대상 골프장 <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-brand-600 hover:underline flex items-center"><PlusCircle size={12} className="mr-1"/> 목록에 없나요? 신규 등록</button></label>
                        <div className="relative">
                            <input list="courses-logs-all" className={getInputClass()} value={globalCourses.find(c => c.id === courseId)?.name || ''} onChange={(e) => { const found = globalCourses.find(c => c.name === e.target.value); setCourseId(found ? found.id : ''); }} placeholder="골프장 검색 또는 선택..." />
                            <datalist id="courses-logs-all">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">업무 제목</label><input type="text" required className={getInputClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="핵심 제목을 입력하세요" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 내용</label><textarea required rows={8} className={getInputClass()} value={content} onChange={(e) => setContent(e.target.value)} placeholder="구체적인 업무 수행 내역 및 현장 특이사항..." /></div>
                    <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 업무 기록 마스터 DB 저장</button></div>
                </form>
            )}

            {activeTab === 'PERSON' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900 flex items-center"><UserPlus className="mr-3 text-brand-600"/> 인물 정보 정밀 등록</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personal Relationship Mapping</p>
                    </div>
                    <form onSubmit={handlePersonSubmit} className="space-y-10">
                        <section className="space-y-6">
                            <h4 className="text-[11px] font-black text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">기본 인적 사항</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">성명 *</label><input type="text" className={getInputClass()} value={personForm.name} onChange={e => setPersonForm({...personForm, name: e.target.value})} required placeholder="이름" /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">연락처</label><input type="text" className={getInputClass()} value={personForm.phone} onChange={e => setPersonForm({...personForm, phone: e.target.value})} placeholder="010-0000-0000" /></div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">우리와의 친밀도</label>
                                    <select className={getSelectClass()} value={personForm.affinity} onChange={e => setPersonForm({...personForm, affinity: parseInt(e.target.value)})}>
                                        <option value={AffinityLevel.ALLY}>강력한 아군 (Ally)</option>
                                        <option value={AffinityLevel.FRIENDLY}>우호적 (Friendly)</option>
                                        <option value={AffinityLevel.NEUTRAL}>중립 (Neutral)</option>
                                        <option value={AffinityLevel.UNFRIENDLY}>비우호적 (Unfriendly)</option>
                                        <option value={AffinityLevel.HOSTILE}>적대적 (Hostile)</option>
                                    </select>
                                </div>
                            </div>
                        </section>
                        <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Building2 size={16} className="mr-2 text-brand-600"/> 현재 소속 발령 정보</h4>
                                <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-[10px] font-black text-brand-600 hover:underline flex items-center"><PlusCircle size={12} className="mr-1"/> 신규 골프장 퀵 등록</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">소속 골프장 (마스터 DB 검색)</label>
                                    <input list="courses-person-reg" className={getInputClass()} value={personForm.currentCourseName} onChange={e => setPersonForm({...personForm, currentCourseName: e.target.value})} placeholder="골프장 검색 또는 입력..." />
                                    <datalist id="courses-person-reg">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                </div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">현직 공식 직책 *</label><input type="text" className={getInputClass()} required value={personForm.currentRole} onChange={e => setPersonForm({...personForm, currentRole: e.target.value})} placeholder="예: 코스관리팀장" /></div>
                            </div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">인물 특징 및 관계 메모</label><textarea className={getInputClass()} rows={4} value={personForm.notes} onChange={e => setPersonForm({...personForm, notes: e.target.value})} placeholder="성격, 주요 관심사, 공략 포인트 등..." /></div>
                        </section>
                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.98] transition-all">
                                {isSubmitting ? <Loader2 className="animate-spin mr-3" /> : <Save className="mr-3" />} 인물 마스터 DB 등록
                            </button>
                        </div>
                    </form>
                </div>
            )}
      </div>

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
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">골프장 공식 명칭 *</label>
                          <input type="text" required className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" value={newCourseForm.name} onChange={e => setNewCourseForm({...newCourseForm, name: e.target.value})} placeholder="골프장 이름 입력" />
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
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">운영 형태</label>
                          <select className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm bg-white focus:ring-4 focus:ring-brand-500/5" value={newCourseForm.type} onChange={e => setNewCourseForm({...newCourseForm, type: e.target.value as CourseType})}>
                              <option value={CourseType.PUBLIC}>대중제</option>
                              <option value={CourseType.MEMBER}>회원제</option>
                          </select>
                      </div>
                      <div className="pt-4">
                          <button onClick={handleQuickCourseAdd} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm shadow-xl hover:bg-slate-800 transition-all flex justify-center items-center active:scale-95">
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

export default WriteLog;
