
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region, CareerRecord } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database, HeartHandshake, MinusCircle, Clock, PlusCircle, Trash, ExternalLink, Info, Check, AlertTriangle, Briefcase, Calendar, Target, ShieldAlert, Zap, Filter, CheckSquare, Square, UserCheck } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { user, addLog, updateLog, addCourse, updateCourse, addPerson, updatePerson, courses: globalCourses, people: globalPeople, navigate, locationState } = useApp();
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

  // Selection States
  const [selectedCourseIndices, setSelectedCourseIndices] = useState<Set<number>>(new Set());
  const [selectedLogIndices, setSelectedLogIndices] = useState<Set<number>>(new Set());
  const [selectedPeopleIndices, setSelectedPeopleIndices] = useState<Set<number>>(new Set());

  // AI Result Filters
  const [aiFilterPriority, setAiFilterPriority] = useState<number | 'ALL'>('ALL');
  const [aiFilterType, setAiFilterType] = useState<'ALL' | 'NEW_COURSE' | 'RISK'>('ALL');

  const filteredAiLogs = useMemo(() => {
      if (!aiResults) return [];
      return aiResults.extractedLogs.map((l, idx) => ({ ...l, originalIdx: idx })).filter(l => {
          const matchPriority = aiFilterPriority === 'ALL' || l.priority >= aiFilterPriority;
          // Fixed apiFilterType to aiFilterType below
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
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [personForm, setPersonForm] = useState({
    name: '',
    phone: '',
    currentRole: '',
    currentCourseId: '',
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

  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.name || !personForm.currentRole) {
      alert('성명과 직책은 필수 입력 사항입니다.');
      return;
    }
    setIsSubmitting(true);
    try {
      const personData: Person = {
        id: isUpdateMode ? selectedPersonId : `p-man-${Date.now()}`,
        name: personForm.name,
        phone: personForm.phone,
        currentRole: personForm.currentRole,
        currentCourseId: personForm.currentCourseId || undefined,
        affinity: personForm.affinity,
        notes: personForm.notes,
        careers: isUpdateMode ? globalPeople.find(p => p.id === selectedPersonId)?.careers || [] : []
      };

      if (isUpdateMode) {
        await updatePerson(personData);
        alert('인물 정보가 업데이트되었습니다.');
      } else {
        await addPerson(personData);
        alert('인물 정보가 신규 등록되었습니다.');
      }

      setPersonForm({
        name: '',
        phone: '',
        currentRole: '',
        currentCourseId: '',
        currentCourseName: '',
        affinity: AffinityLevel.NEUTRAL,
        notes: ''
      });
      setIsUpdateMode(false);
      setSelectedPersonId('');
      setActiveTab('LOG');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCourseAdd = async () => {
    if (!newCourseForm.name) {
      alert('골프장 명칭을 입력해주세요.');
      return;
    }
    try {
      const newId = `c-quick-${Date.now()}`;
      const courseData: GolfCourse = {
        id: newId,
        name: newCourseForm.name,
        region: newCourseForm.region,
        holes: newCourseForm.holes,
        type: newCourseForm.type,
        openYear: new Date().getFullYear().toString(),
        address: `${newCourseForm.region} 신규 등록 골프장`,
        grassType: GrassType.ZOYSIA,
        area: '정보없음',
        description: '작업 중 즉시 추가됨',
        issues: []
      };
      await addCourse(courseData);
      
      if (activeTab === 'LOG') {
          setCourseId(newId);
      } else if (activeTab === 'PERSON') {
          setPersonForm(prev => ({ ...prev, currentCourseId: newId, currentCourseName: courseData.name }));
      }
      
      setIsCourseModalOpen(false);
      setNewCourseForm({ name: '', region: '경기', holes: 18, type: CourseType.PUBLIC });
      alert('새로운 골프장이 등록되었습니다.');
    } catch (error) {
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const startAiAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    setIsAnalyzing(true);
    setAiResults(null);
    setSelectedCourseIndices(new Set());
    setSelectedLogIndices(new Set());
    setSelectedPeopleIndices(new Set());
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
      if (results) {
          setAiResults(results);
          const highConfCourses = new Set<number>();
          results.extractedCourses.forEach((c: any, i: number) => { if(c.confidence > 0.8) highConfCourses.add(i); });
          setSelectedCourseIndices(highConfCourses);

          const highConfLogs = new Set<number>();
          results.extractedLogs.forEach((l: any, i: number) => { if(l.confidence > 0.7) highConfLogs.add(i); });
          setSelectedLogIndices(highConfLogs);

          const highConfPeople = new Set<number>();
          results.extractedPeople.forEach((p: any, i: number) => { if(p.confidence > 0.8) highConfPeople.add(i); });
          setSelectedPeopleIndices(highConfPeople);
      }
    } catch (error: any) {
      alert(`AI 분석 오류: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelection = (type: 'COURSE' | 'LOG' | 'PERSON', index: number) => {
      if (type === 'COURSE') {
          const newSet = new Set(selectedCourseIndices);
          if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
          setSelectedCourseIndices(newSet);
      } else if (type === 'LOG') {
          const newSet = new Set(selectedLogIndices);
          if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
          setSelectedLogIndices(newSet);
      } else {
          const newSet = new Set(selectedPeopleIndices);
          if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
          setSelectedPeopleIndices(newSet);
      }
  };

  const commitAiResults = async () => {
      if (!aiResults) return;
      
      const totalToCommit = selectedCourseIndices.size + selectedLogIndices.size + selectedPeopleIndices.size;
      if (totalToCommit === 0) {
          alert('반영할 항목을 하나 이상 선택해주세요.');
          return;
      }

      setIsSubmitting(true);
      try {
          for (let idx of Array.from(selectedCourseIndices)) {
              const c = aiResults.extractedCourses[idx];
              const existing = globalCourses.find(gc => gc.name === c.name);
              if (!existing) {
                  await addCourse({ id: `c-ai-${Date.now()}-${idx}`, name: c.name, region: (c.region as Region) || '기타', address: c.address || '', holes: c.holes || 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '정보없음', description: c.description || 'AI 추출 정보', openYear: '미상', issues: [] });
              }
          }
          for (let idx of Array.from(selectedPeopleIndices)) {
              const p = aiResults.extractedPeople[idx];
              const course = globalCourses.find(gc => gc.name === p.courseName);
              await addPerson({ id: `p-ai-${Date.now()}-${idx}`, name: p.name, phone: '정보없음', currentRole: p.role, currentCourseId: course?.id, affinity: p.affinity as AffinityLevel, notes: p.notes || '', careers: [] });
          }
          for (let idx of Array.from(selectedLogIndices)) {
              const l = aiResults.extractedLogs[idx];
              const course = globalCourses.find(gc => gc.name === l.courseName);
              const combinedContent = `${l.summary}\n\n[상세 내용]\n${l.details}\n\n[전략 가치]\n${l.strategy}\n\n[리스크]\n${l.risk}`;
              await addLog({ 
                  id: `l-ai-${Date.now()}-${idx}`, 
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
          alert(`총 ${totalToCommit}건의 데이터가 시스템에 반영되었습니다.`);
          navigate('/');
      } catch (err) { alert('데이터 저장 중 오류가 발생했습니다.'); } finally { setIsSubmitting(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setSelectedFiles(Array.from(e.target.files)); };
  const getInputClass = () => `w-full rounded-xl border py-3.5 px-4 transition-all outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 bg-slate-50 border-slate-200 text-sm font-bold shadow-sm`;
  const getSelectClass = () => `w-full rounded-xl border py-3.5 px-4 transition-all outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 appearance-none bg-white border-slate-200 text-sm font-black shadow-sm`;

  const handlePersonSearch = (val: string) => {
    const matched = globalPeople.find(p => p.name === val);
    if (matched) {
      setIsUpdateMode(true);
      setSelectedPersonId(matched.id);
      setPersonForm({
        name: matched.name,
        phone: matched.phone || '',
        currentRole: matched.currentRole || '',
        currentCourseId: matched.currentCourseId || '',
        currentCourseName: globalCourses.find(c => c.id === matched.currentCourseId)?.name || '',
        affinity: matched.affinity,
        notes: matched.notes || ''
      });
    } else {
      setIsUpdateMode(false);
      setSelectedPersonId('');
      setPersonForm(prev => ({ ...prev, name: val }));
    }
  };

  const handleCourseSelectInPerson = (val: string) => {
    const matched = globalCourses.find(c => c.name === val);
    setPersonForm(prev => ({
      ...prev,
      currentCourseName: val,
      currentCourseId: matched ? matched.id : ''
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {!editingLog && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-x-auto no-scrollbar">
            {[
                { id: 'LOG', label: '업무 일지', icon: <FileText size={18}/> },
                { id: 'AI', label: 'AI 스마트 등록', icon: <Sparkles size={18}/> },
                { id: 'PERSON', label: '인물 정보 연동', icon: <UserPlus size={18}/> },
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
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">AI 지능형 데이터 분석 및 선택적 반영</h2>
                                <p className="text-slate-500 leading-relaxed font-medium">분석된 결과 중 시스템에 반영할 항목을 직접 선택할 수 있습니다. <br/>신뢰도가 높은 항목은 AI가 자동으로 1차 제안합니다.</p>
                            </div>
                            {!isAnalyzing ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center hover:border-brand-500 hover:bg-brand-50/10 cursor-pointer group transition-all duration-500" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    <UploadCloud size={80} className="mx-auto text-slate-100 group-hover:text-brand-400 mb-6 transition-all duration-500 group-hover:scale-110" />
                                    <p className="font-black text-slate-800 text-xl group-hover:text-brand-700">분석할 파일을 업로드하세요</p>
                                    <p className="text-xs text-slate-400 mt-4 font-bold tracking-widest uppercase">Images, PDF, Text Logs supported</p>
                                </div>
                            ) : (
                                <div className="py-24 text-center bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                                    <Loader2 size={64} className="mx-auto text-brand-600 animate-spin mb-8" />
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-2">지능형 분석 엔진 가동 중...</h3>
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
                                <div><h2 className="text-3xl font-black text-slate-900 flex items-center tracking-tight"><ListChecks size={32} className="mr-3 text-brand-600"/> 데이터 선별 및 통합 센터</h2><p className="text-slate-500 mt-2 font-medium">체크된 항목만 마스터 데이터베이스에 반영됩니다.</p></div>
                                <div className="flex gap-4">
                                    <div className="bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200 flex flex-col justify-center items-center min-w-[120px]">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SELECTED</span>
                                        <span className="text-xl font-black text-brand-600">{selectedCourseIndices.size + selectedLogIndices.size + selectedPeopleIndices.size}건</span>
                                    </div>
                                    <button onClick={() => setAiResults(null)} className="px-4 py-2 text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center"><RotateCcw size={16} className="mr-2"/> 초기화</button>
                                </div>
                            </div>

                            <div className="space-y-16">
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center"><Building2 size={16} className="mr-2"/> 식별된 골프장 ({aiResults.extractedCourses.length})</h3>
                                        <button onClick={() => setSelectedCourseIndices(selectedCourseIndices.size === aiResults.extractedCourses.length ? new Set() : new Set(aiResults.extractedCourses.map((_, i) => i)))} className="text-[10px] font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">전체 선택/해제</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {aiResults.extractedCourses.map((c, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => toggleSelection('COURSE', i)}
                                                className={`p-6 rounded-[1.5rem] border cursor-pointer transition-all flex items-start gap-4 ${selectedCourseIndices.has(i) ? 'bg-emerald-50 border-emerald-400 shadow-md ring-1 ring-emerald-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className={`shrink-0 transition-colors ${selectedCourseIndices.has(i) ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                    {selectedCourseIndices.has(i) ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-black text-slate-800">{c.name}</h4>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${c.confidence > 0.8 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>AI Conf: {Math.round(c.confidence * 100)}%</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium truncate mb-2">{c.region} | {c.address}</p>
                                                    <div className="text-[10px] text-slate-400 italic bg-white/50 p-2 rounded-lg border border-slate-100">{c.reason || '문서 분석을 통해 자동 추출된 장소입니다.'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center"><User size={16} className="mr-2"/> 식별된 인물 ({aiResults.extractedPeople.length})</h3>
                                        <button onClick={() => setSelectedPeopleIndices(selectedPeopleIndices.size === aiResults.extractedPeople.length ? new Set() : new Set(aiResults.extractedPeople.map((_, i) => i)))} className="text-[10px] font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">전체 선택/해제</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {aiResults.extractedPeople.map((p, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => toggleSelection('PERSON', i)}
                                                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${selectedPeopleIndices.has(i) ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className={`shrink-0 ${selectedPeopleIndices.has(i) ? 'text-blue-600' : 'text-slate-300'}`}>
                                                    {selectedPeopleIndices.has(i) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-black text-slate-800 truncate">{p.name}</div>
                                                    <div className="text-[10px] font-bold text-brand-600 truncate">{p.role}</div>
                                                    <div className="text-[10px] text-slate-400 truncate mt-1">소속: {p.courseName}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center"><FileText size={16} className="mr-2"/> 분석된 업무 기록 ({aiResults.extractedLogs.length})</h3>
                                        <button onClick={() => setSelectedLogIndices(selectedLogIndices.size === aiResults.extractedLogs.length ? new Set() : new Set(aiResults.extractedLogs.map((_, i) => i)))} className="text-[10px] font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">전체 선택/해제</button>
                                    </div>
                                    <div className="space-y-6">
                                        {aiResults.extractedLogs.map((l, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => toggleSelection('LOG', i)}
                                                className={`bg-white border rounded-[2rem] p-8 shadow-soft transition-all cursor-pointer relative overflow-hidden group ${selectedLogIndices.has(i) ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/10' : 'border-slate-200 hover:border-brand-300'}`}
                                            >
                                                {selectedLogIndices.has(i) && <div className="absolute top-0 right-0 p-4 text-brand-600 animate-in zoom-in"><CheckCircle size={32}/></div>}
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg ${selectedLogIndices.has(i) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {selectedLogIndices.has(i) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                                        </div>
                                                        <div>
                                                            <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest mr-3">{l.department || 'INTEL'}</span>
                                                            <span className="text-lg font-black text-slate-900">{l.courseName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex gap-1">{Array.from({length: 5}).map((_, idx) => (<div key={idx} className={`w-2.5 h-2.5 rounded-full ${idx < l.priority ? 'bg-amber-500' : 'bg-slate-100'}`}></div>))}</div>
                                                        <span className="text-[10px] font-mono font-bold text-slate-300">{l.date}</span>
                                                    </div>
                                                </div>

                                                <h4 className="font-black text-slate-800 text-xl mb-6">{l.title}</h4>
                                                
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Summary</h5>
                                                            <p className="text-xs text-slate-800 font-bold leading-relaxed">{l.summary}</p>
                                                        </div>
                                                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line px-1">{l.details}</p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                            <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center"><Target size={12} className="mr-1.5"/> Strategy</h5>
                                                            <p className="text-[11px] text-emerald-900 font-bold">{l.strategy}</p>
                                                        </div>
                                                        {l.risk && (
                                                            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                                                <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 flex items-center"><ShieldAlert size={12} className="mr-1.5"/> Risk</h5>
                                                                <p className="text-[11px] text-red-900 font-bold">{l.risk}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            
                            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col items-center">
                                <button 
                                    onClick={commitAiResults} 
                                    disabled={isSubmitting || (selectedCourseIndices.size + selectedLogIndices.size + selectedPeopleIndices.size === 0)} 
                                    className="w-full max-w-md bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 size={24} className="animate-spin mr-3"/> : <CheckCircle size={24} className="mr-3 text-brand-400" />} 선택된 {selectedCourseIndices.size + selectedLogIndices.size + selectedPeopleIndices.size}개 데이터 최종 승인
                                </button>
                                <p className="text-xs text-slate-400 mt-4 font-bold tracking-tight text-center">승인된 데이터는 즉시 전사 지식 베이스에 통합됩니다.<br/>반영 전 데이터의 정확성을 한 번 더 검토해 주세요.</p>
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
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">대상 골프장 <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-brand-600 hover:underline flex items-center font-bold"><PlusCircle size={12} className="mr-1"/> 신규 등록</button></label>
                        <div className="relative group">
                            <input list="courses-logs-all" className={getInputClass()} value={globalCourses.find(c => c.id === courseId)?.name || ''} onChange={(e) => { const found = globalCourses.find(c => c.name === e.target.value); setCourseId(found ? found.id : ''); }} placeholder="골프장 검색 또는 선택..." />
                            <datalist id="courses-logs-all">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-brand-500 transition-colors"><Search size={18}/></div>
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
                      <h3 className="text-xl font-black text-slate-900 flex items-center">
                        <UserPlus className="mr-3 text-brand-600"/> 
                        {isUpdateMode ? '인물 정보 업데이트' : '인물 마스터 DB 연동 등록'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isUpdateMode && (
                          <button onClick={() => { setIsUpdateMode(false); setPersonForm({ name: '', phone: '', currentRole: '', currentCourseId: '', currentCourseName: '', affinity: AffinityLevel.NEUTRAL, notes: '' }); }} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-all flex items-center">
                             <X size={14} className="mr-1"/> 초기화
                          </button>
                        )}
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel Intelligence Integration</p>
                      </div>
                    </div>

                    <form onSubmit={handlePersonSubmit} className="space-y-10">
                        <section className="space-y-6">
                            <div className="flex items-center justify-between border-b border-brand-100 pb-2">
                                <h4 className="text-[11px] font-black text-brand-700 uppercase tracking-widest">기본 인적 사항</h4>
                                {isUpdateMode && <span className="bg-brand-600 text-white text-[9px] font-black px-2 py-0.5 rounded flex items-center"><UserCheck size={10} className="mr-1"/> EXISTING RECORD MATCHED</span>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">성명 (실명 검색) *</label>
                                  <div className="relative group">
                                    <input list="gm-people-datalist" type="text" className={getInputClass()} value={personForm.name} onChange={e => handlePersonSearch(e.target.value)} required placeholder="이름 입력 (중복 확인)" />
                                    <datalist id="gm-people-datalist">{globalPeople.map(p => <option key={p.id} value={p.name} />)}</datalist>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-brand-500 transition-colors"><Search size={18}/></div>
                                  </div>
                                </div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">공식 연락처</label><input type="text" className={getInputClass()} value={personForm.phone} onChange={e => setPersonForm({...personForm, phone: e.target.value})} placeholder="010-0000-0000" /></div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">당사 협력 친밀도</label>
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

                        <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Building2 size={16} className="mr-2 text-brand-600"/> 현재 소속 골프장 정보</h4>
                                <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-[10px] font-black text-brand-600 hover:underline flex items-center font-bold"><PlusCircle size={12} className="mr-1"/> 마스터 DB 신규 추가</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1">소속 골프장 (마스터 DB 검색)</label>
                                    <div className="relative group">
                                      <input list="courses-person-reg" className={getInputClass()} value={personForm.currentCourseName} onChange={e => handleCourseSelectInPerson(e.target.value)} placeholder="골프장 검색 또는 입력..." />
                                      <datalist id="courses-person-reg">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-brand-500 transition-colors"><Search size={18}/></div>
                                    </div>
                                    {personForm.currentCourseId && <p className="mt-2 text-[10px] text-brand-600 font-bold px-1 flex items-center"><Check size={10} className="mr-1"/> Verified in Master DB (ID: {personForm.currentCourseId})</p>}
                                </div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">현직 공식 직책 *</label><input type="text" className={getInputClass()} required value={personForm.currentRole} onChange={e => setPersonForm({...personForm, currentRole: e.target.value})} placeholder="예: 코스관리팀장" /></div>
                            </div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">인물 전략 특징 및 관계 관리 메모</label><textarea className={getInputClass()} rows={4} value={personForm.notes} onChange={e => setPersonForm({...personForm, notes: e.target.value})} placeholder="성격, 주요 관심사, 비즈니스 공략 포인트 등 상세 메모..." /></div>
                        </section>
                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className={`w-full text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all flex justify-center items-center active:scale-[0.98] ${isUpdateMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-3" /> : <Save className="mr-3" />} 
                                {isUpdateMode ? '기존 인물 정보 마스터 DB 업데이트' : '신규 인물 마스터 DB 등록'}
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
                              <input type="number" className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-brand-500/5" value={newCourseForm.holes} onChange={(e) => setNewCourseForm({...newCourseForm, holes: parseInt(e.target.value)})} />
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
