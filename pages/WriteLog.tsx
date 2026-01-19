
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region, CareerRecord } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database, HeartHandshake, MinusCircle, Clock, PlusCircle, Trash, ExternalLink, Info, Check, AlertTriangle, Briefcase, Calendar, Target, ShieldAlert, Zap, Filter, CheckSquare, Square, UserCheck, Edit, PenTool, Layers, ArrowRightLeft, Lightbulb, Link2, MessageSquare } from 'lucide-react';
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
  const [contextHint, setContextHint] = useState(''); 
  const [aiResults, setAiResults] = useState<{
      extractedCourses: any[],
      extractedLogs: any[],
      extractedPeople: any[],
      documentSummary?: string,
      documentDetailedReport?: string
  } | null>(null);

  // --- AI Editing State ---
  const [editingAiCourseIdx, setEditingAiCourseIdx] = useState<number | null>(null);
  const [tempAiCourseData, setTempAiCourseData] = useState<any>(null);
  
  // NEW: Editing State for Logs (Content)
  const [editingAiLogIdx, setEditingAiLogIdx] = useState<number | null>(null);
  const [tempAiLogData, setTempAiLogData] = useState<any>(null);
  
  // Tracks user-corrected course IDs for logs. Key: log index, Value: { id, name }
  const [aiLogCourseMappings, setAiLogCourseMappings] = useState<Record<number, {id: string, name: string}>>({});

  // Selection States
  const [selectedCourseIndices, setSelectedCourseIndices] = useState<Set<number>>(new Set());
  const [selectedLogIndices, setSelectedLogIndices] = useState<Set<number>>(new Set());
  const [selectedPeopleIndices, setSelectedPeopleIndices] = useState<Set<number>>(new Set());

  // --- Quick Add Course State ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({
      name: '',
      region: '경기' as Region,
      holes: 18,
      type: CourseType.PUBLIC,
      address: '',
      description: ''
  });

  // --- Manual Log State ---
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<Department>(user?.department || Department.SALES);
  
  // Multi-Course Selection State
  const [selectedCourses, setSelectedCourses] = useState<{id: string, name: string}[]>([]);
  const [courseSearchInput, setCourseSearchInput] = useState('');
  
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
      
      // Load courses
      if (editingLog.relatedCourses && editingLog.relatedCourses.length > 0) {
          setSelectedCourses(editingLog.relatedCourses);
      } else {
          // Fallback for old logs
          setSelectedCourses([{ id: editingLog.courseId, name: editingLog.courseName }]);
      }
    } else if (locationState?.personId) {
        // Auto-fill from Person Detail Navigation
        const person = globalPeople.find(p => p.id === locationState.personId);
        if (person) {
            if (person.currentCourseId) {
                const course = globalCourses.find(c => c.id === person.currentCourseId);
                if (course) {
                    setSelectedCourses([{ id: course.id, name: course.name }]);
                }
            }
            // Smart Dept Suggestion based on Role
            const roleLower = (person.currentRole || '').toLowerCase();
            if (roleLower.includes('코스') || roleLower.includes('그린') || roleLower.includes('관리')) setDept(Department.CONSTRUCTION);
            else if (roleLower.includes('대표') || roleLower.includes('지배인') || roleLower.includes('이사')) setDept(Department.MANAGEMENT);
            else if (roleLower.includes('영업') || roleLower.includes('마케팅')) setDept(Department.SALES);
            
            setTitle(`${person.name} ${person.currentRole} 미팅`);
        }
    }
  }, [editingLog, locationState, globalPeople, globalCourses]);

  // --- Helper: Find Best Course Match ---
  const findBestMatch = (extractedName: string, courses: GolfCourse[]) => {
      // 1. Exact match
      let match = courses.find(c => c.name === extractedName);
      if (match) return match;

      // 2. Normalized match (remove spaces, ignore case)
      const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
      const target = normalize(extractedName);
      match = courses.find(c => normalize(c.name) === target);
      if (match) return match;

      // 3. Keyword match (if extracted name contains core name like "Taereung" but missing "CC")
      const coreName = extractedName.replace(/CC|GC|컨트리클럽|골프장|골프클럽/gi, '').trim();
      if (coreName.length > 2) {
          match = courses.find(c => c.name.includes(coreName));
          if (match) return match;
      }

      return null;
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourses.length === 0 || !title || !content) {
      alert('골프장(최소 1개), 제목, 내용은 필수 입력 정보입니다.');
      return;
    }
    setIsSubmitting(true);
    try {
      const primaryCourse = selectedCourses[0];
      const logData: LogEntry = {
        id: editingLog?.id || `log-${Date.now()}`,
        date: logDate,
        author: user?.name || '익명',
        department: dept,
        courseId: primaryCourse.id,
        courseName: primaryCourse.name,
        relatedCourses: selectedCourses,
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
      navigate('/work-logs');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCourseToSelection = (courseName: string) => {
      const matched = globalCourses.find(c => c.name === courseName);
      if (matched) {
          if (!selectedCourses.some(c => c.id === matched.id)) {
              setSelectedCourses([...selectedCourses, { id: matched.id, name: matched.name }]);
          }
          setCourseSearchInput('');
      }
  };

  const handleRemoveCourseFromSelection = (id: string) => {
      setSelectedCourses(selectedCourses.filter(c => c.id !== id));
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
        address: newCourseForm.address || `${newCourseForm.region} 신규 등록 골프장`,
        grassType: GrassType.ZOYSIA,
        area: '정보없음',
        description: newCourseForm.description || '작업 중 즉시 추가됨',
        issues: []
      };
      await addCourse(courseData);
      
      if (activeTab === 'LOG') {
          handleAddCourseToSelection(courseData.name);
      } else if (activeTab === 'PERSON') {
          setPersonForm(prev => ({ ...prev, currentCourseId: newId, currentCourseName: courseData.name }));
      }
      
      setIsCourseModalOpen(false);
      setNewCourseForm({ name: '', region: '경기', holes: 18, type: CourseType.PUBLIC, address: '', description: '' });
      alert('새로운 골프장이 등록되었습니다.');
    } catch (error) {
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  // --- Inline Editing Handlers (Course) ---
  const startEditingAiCourse = (index: number, data: any) => {
      setEditingAiCourseIdx(index);
      setTempAiCourseData({ ...data });
  };

  const cancelEditingAiCourse = () => {
      setEditingAiCourseIdx(null);
      setTempAiCourseData(null);
  };

  const saveAiCourseEdit = () => {
      if (!aiResults || editingAiCourseIdx === null) return;
      const newCourses = [...aiResults.extractedCourses];
      newCourses[editingAiCourseIdx] = tempAiCourseData;
      setAiResults({ ...aiResults, extractedCourses: newCourses });
      setEditingAiCourseIdx(null);
      setTempAiCourseData(null);
  };

  // --- Inline Editing Handlers (Log) ---
  const startEditingAiLog = (index: number, data: any) => {
      setEditingAiLogIdx(index);
      setTempAiLogData({ ...data });
  };

  const cancelEditingAiLog = () => {
      setEditingAiLogIdx(null);
      setTempAiLogData(null);
  };

  const saveAiLogEdit = () => {
      if (!aiResults || editingAiLogIdx === null) return;
      const newLogs = [...aiResults.extractedLogs];
      newLogs[editingAiLogIdx] = tempAiLogData;
      setAiResults({ ...aiResults, extractedLogs: newLogs });
      setEditingAiLogIdx(null);
      setTempAiLogData(null);
  };

  const startAiAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    setIsAnalyzing(true);
    setAiResults(null);
    setSelectedCourseIndices(new Set());
    setSelectedLogIndices(new Set());
    setSelectedPeopleIndices(new Set());
    setAiLogCourseMappings({});
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
      // Pass the contextHint to the service
      const results = await analyzeDocument(inputData, existingNames, contextHint);
      if (results) {
          setAiResults(results);
          const highConfCourses = new Set<number>();
          results.extractedCourses.forEach((c: any, i: number) => { 
              const exists = globalCourses.some(gc => gc.name === c.name);
              if(c.confidence > 0.8) highConfCourses.add(i); 
          });
          setSelectedCourseIndices(highConfCourses);

          // Auto-match courses for logs using 3-Step Matching
          const initialLogMappings: Record<number, {id: string, name: string}> = {};
          const highConfLogs = new Set<number>();
          results.extractedLogs.forEach((l: any, i: number) => { 
              if(l.confidence > 0.7) highConfLogs.add(i);
              
              const matched = findBestMatch(l.courseName, globalCourses);
              if (matched) {
                  initialLogMappings[i] = { id: matched.id, name: matched.name };
              }
          });
          setSelectedLogIndices(highConfLogs);
          setAiLogCourseMappings(initialLogMappings);

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

  const handleAiLogCourseChange = (logIndex: number, courseName: string) => {
      const matched = globalCourses.find(c => c.name === courseName);
      // If matched, use ID. If not, use empty ID (will create unlinked log or handle later)
      setAiLogCourseMappings(prev => ({
          ...prev,
          [logIndex]: { id: matched ? matched.id : '', name: courseName }
      }));
  };

  const clearAnalysis = () => {
      if (window.confirm('현재 분석 결과를 초기화하시겠습니까?')) {
          setAiResults(null);
          setSelectedFiles([]);
          setSelectedCourseIndices(new Set());
          setSelectedLogIndices(new Set());
          setSelectedPeopleIndices(new Set());
          setAiLogCourseMappings({});
          if (fileInputRef.current) fileInputRef.current.value = '';
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
          let updatedCount = 0;
          let createdCount = 0;

          // Process Courses
          for (let idx of Array.from(selectedCourseIndices)) {
              const c = aiResults.extractedCourses[idx];
              const existing = globalCourses.find(gc => gc.name === c.name);
              
              if (existing) {
                  await updateCourse({
                      ...existing,
                      region: (c.region as Region) || existing.region,
                      address: c.address || existing.address,
                      holes: c.holes || existing.holes,
                      type: (c.type === '회원제' ? CourseType.MEMBER : c.type === '대중제' ? CourseType.PUBLIC : existing.type),
                      openYear: c.openYear || existing.openYear,
                      description: c.description ? (existing.description + "\n\n[AI Update]: " + c.description) : existing.description
                  });
                  updatedCount++;
              } else {
                  await addCourse({ 
                      id: `c-ai-${Date.now()}-${idx}`, 
                      name: c.name, 
                      region: (c.region as Region) || '기타', 
                      address: c.address || '', 
                      holes: c.holes || 18, 
                      type: c.type === '회원제' ? CourseType.MEMBER : CourseType.PUBLIC, 
                      grassType: GrassType.ZOYSIA, 
                      area: '정보없음', 
                      description: c.description || 'AI 추출 정보', 
                      openYear: c.openYear || '미상', 
                      issues: [] 
                  });
                  createdCount++;
              }
          }

          // Process People
          for (let idx of Array.from(selectedPeopleIndices)) {
              const p = aiResults.extractedPeople[idx];
              const course = globalCourses.find(gc => gc.name === p.courseName);
              await addPerson({ id: `p-ai-${Date.now()}-${idx}`, name: p.name, phone: '정보없음', currentRole: p.role, currentCourseId: course?.id, affinity: p.affinity as AffinityLevel, notes: p.notes || '', careers: [] });
          }

          // Process Logs (Enhanced with specific Course Mappings)
          for (let idx of Array.from(selectedLogIndices)) {
              const l = aiResults.extractedLogs[idx];
              const mapping = aiLogCourseMappings[idx];
              
              // Determine course details. If mapping exists, use it. Otherwise use raw AI output.
              const finalCourseId = mapping?.id || '';
              const finalCourseName = mapping?.name || l.courseName;
              
              // Combined content: Summary + Details + Strategy/Risk
              // Strictly formatted for clarity per course
              const combinedContent = `[요약]\n${l.summary || l.content || ''}\n\n[상세 내용]\n${l.details || ''}\n\n[전략 가치]\n${l.strategy || ''}\n\n[리스크]\n${l.risk || ''}`;
              
              await addLog({ 
                  id: `l-ai-${Date.now()}-${idx}`, 
                  date: l.date || new Date().toISOString().split('T')[0], 
                  author: 'AI Intelligence', 
                  department: (l.department as Department) || Department.SALES, 
                  courseId: finalCourseId, 
                  courseName: finalCourseName, 
                  relatedCourses: finalCourseId ? [{id: finalCourseId, name: finalCourseName}] : [],
                  title: l.title, 
                  content: combinedContent, 
                  tags: ['AI추출', ...(l.tags || [])], 
                  createdAt: Date.now() 
              });
          }
          
          alert(`총 ${totalToCommit}건의 데이터 처리 완료.\n(신규 골프장: ${createdCount}건, 업데이트: ${updatedCount}건)`);
          navigate('/work-logs');
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
                            {/* AI Upload UI */}
                            <div className="text-center max-w-2xl mx-auto">
                                <div className="inline-flex p-6 bg-indigo-50 text-indigo-600 rounded-[2rem] mb-6 shadow-soft ring-1 ring-indigo-100"><Sparkles size={48} className="animate-pulse" /></div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">AI 지능형 데이터 분석 및 선택적 반영</h2>
                                <p className="text-slate-500 leading-relaxed font-medium">분석된 결과 중 시스템에 반영할 항목을 직접 선택할 수 있습니다. <br/>기존 골프장 데이터와 매칭되면 업데이트 모드로 자동 전환됩니다.</p>
                            </div>
                            
                            {/* NEW: Context Hint Input */}
                            <div className="max-w-xl mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                                    <MessageSquare size={12} className="mr-1"/> 분석 정확도를 높이는 힌트 (선택)
                                </label>
                                <textarea 
                                    className="w-full rounded-xl border-slate-200 p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none h-20"
                                    placeholder="예: 2024년 5월 공사 진행 관련 보고서 3건입니다. 태릉CC와 남서울CC 관련 내용이 포함되어 있습니다."
                                    value={contextHint}
                                    onChange={(e) => setContextHint(e.target.value)}
                                />
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
                        // AI Results UI
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div className="flex justify-end mb-4">
                                <button 
                                    onClick={clearAnalysis}
                                    className="flex items-center text-slate-500 hover:text-red-600 text-xs font-bold px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-red-50 transition-all shadow-sm"
                                >
                                    <RotateCcw size={14} className="mr-2"/> 분석 결과 초기화
                                </button>
                            </div>

                            {/* 1. Summary Section */}
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 mb-10 shadow-inner">
                                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center"><Lightbulb size={20} className="mr-2 text-brand-600"/> AI Document Summary</h3>
                                <p className="text-slate-700 font-medium leading-relaxed mb-6">{aiResults.documentSummary}</p>
                                <div className="p-5 bg-white rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed shadow-sm">
                                    {aiResults.documentDetailedReport}
                                </div>
                            </div>

                            {/* 2. Extracted Courses */}
                            {aiResults.extractedCourses?.length > 0 && (
                                <div className="mb-10">
                                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center"><Building2 size={24} className="mr-3 text-brand-600"/> 골프장 정보 추출 ({aiResults.extractedCourses.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {aiResults.extractedCourses.map((course: any, idx: number) => {
                                            const existing = globalCourses.find(gc => gc.name === course.name);
                                            const isSelected = selectedCourseIndices.has(idx);
                                            const isEditing = editingAiCourseIdx === idx;
                                            const displayData = isEditing ? tempAiCourseData : course;

                                            return (
                                                <div key={idx} className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${isSelected ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-white hover:border-brand-200'}`} onClick={() => !isEditing && toggleSelection('COURSE', idx)}>
                                                    {existing && (
                                                        <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center">
                                                            <RotateCcw size={10} className="mr-1.5"/> Update Mode
                                                        </div>
                                                    )}
                                                    {!existing && (
                                                        <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center">
                                                            <Plus size={10} className="mr-1.5"/> New Entry
                                                        </div>
                                                    )}
                                                    
                                                    {isEditing ? (
                                                        <div className="space-y-4" onClick={e => e.stopPropagation()}>
                                                            <input type="text" className="w-full font-bold text-lg p-2 border rounded" value={displayData.name} onChange={e => setTempAiCourseData({...displayData, name: e.target.value})} />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input type="text" className="text-sm p-2 border rounded" value={displayData.region} onChange={e => setTempAiCourseData({...displayData, region: e.target.value})} placeholder="지역" />
                                                                <input type="number" className="text-sm p-2 border rounded" value={displayData.holes} onChange={e => setTempAiCourseData({...displayData, holes: parseInt(e.target.value)})} placeholder="홀수" />
                                                            </div>
                                                            <input type="text" className="w-full text-sm p-2 border rounded" value={displayData.address} onChange={e => setTempAiCourseData({...displayData, address: e.target.value})} placeholder="주소" />
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <button onClick={cancelEditingAiCourse} className="px-3 py-1.5 bg-slate-200 rounded text-xs font-bold">Cancel</button>
                                                                <button onClick={saveAiCourseEdit} className="px-3 py-1.5 bg-brand-600 text-white rounded text-xs font-bold">Save</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-black text-lg text-slate-800">{displayData.name}</h4>
                                                                <button onClick={(e) => { e.stopPropagation(); startEditingAiCourse(idx, course); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg"><Edit size={14}/></button>
                                                            </div>
                                                            <div className="space-y-2 text-sm text-slate-600 mb-4">
                                                                <div className="flex items-center"><MapPin size={14} className="mr-2 opacity-50"/> {displayData.region} | {displayData.address}</div>
                                                                <div className="flex items-center"><Info size={14} className="mr-2 opacity-50"/> {displayData.holes} Holes | {displayData.type || '구분없음'}</div>
                                                                {displayData.openYear && <div className="flex items-center"><Calendar size={14} className="mr-2 opacity-50"/> 개장: {displayData.openYear}</div>}
                                                            </div>
                                                            {existing && (
                                                                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800">
                                                                    <div className="font-bold mb-1 flex items-center"><ArrowRightLeft size={12} className="mr-1"/> 기존 데이터와 병합 예정</div>
                                                                    <div className="opacity-70">기존: {existing.region}, {existing.holes}H → 변경: {displayData.region}, {displayData.holes}H</div>
                                                                </div>
                                                            )}
                                                            <div className="mt-4 flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confidence: {(displayData.confidence * 100).toFixed(0)}%</span>
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                                                                    {isSelected && <Check size={12} className="text-white"/>}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 3. Extracted Logs */}
                            {aiResults.extractedLogs?.length > 0 && (
                                <div className="mb-10">
                                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center"><FileText size={24} className="mr-3 text-brand-600"/> 업무 기록 추출 ({aiResults.extractedLogs.length})</h3>
                                    <div className="space-y-4">
                                        {aiResults.extractedLogs.map((log: any, idx: number) => {
                                            const currentMapping = aiLogCourseMappings[idx];
                                            const isMapped = !!currentMapping?.id;
                                            const displayCourseName = currentMapping?.name || log.courseName;
                                            const isRawMatchDifferent = log.rawCourseName && log.rawCourseName !== log.courseName;
                                            const isExactMatch = isMapped && log.rawCourseName === currentMapping?.name;
                                            const isEditing = editingAiLogIdx === idx;
                                            const displayData = isEditing ? tempAiLogData : log;

                                            return (
                                            <div key={idx} onClick={() => !isEditing && toggleSelection('LOG', idx)} className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 ${selectedLogIndices.has(idx) ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-1 shrink-0 ${selectedLogIndices.has(idx) ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                                                    {selectedLogIndices.has(idx) && <Check size={12} className="text-white"/>}
                                                </div>
                                                <div className="flex-1 w-full">
                                                    {/* Course Selector for Logs */}
                                                    <div className="mb-3" onClick={e => e.stopPropagation()}>
                                                        <div className="relative group">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {isMapped ? (
                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded flex items-center ${isExactMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                        <CheckCircle size={10} className="mr-1"/> {isExactMatch ? 'Exact Match' : 'Smart Match'}
                                                                        {isRawMatchDifferent && <span className="ml-1 opacity-75">(원본: {log.rawCourseName})</span>}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center"><AlertTriangle size={10} className="mr-1"/> Unmatched (Raw Text)</span>
                                                                )}
                                                            </div>
                                                            <input 
                                                                list={`log-course-${idx}`} 
                                                                className={`w-full text-xs font-bold border rounded-lg p-2 pr-8 ${isMapped ? 'border-emerald-200 bg-emerald-50/30' : 'border-orange-200 bg-orange-50/30'}`}
                                                                value={displayCourseName}
                                                                onChange={(e) => handleAiLogCourseChange(idx, e.target.value)}
                                                                placeholder="골프장 연결 (검색)..."
                                                            />
                                                            <datalist id={`log-course-${idx}`}>
                                                                {globalCourses.map(c => <option key={c.id} value={c.name} />)}
                                                            </datalist>
                                                            {isMapped && <Link2 size={14} className="absolute right-2 top-8 text-emerald-500"/>}
                                                        </div>
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="space-y-3 bg-white p-3 rounded-xl border border-brand-200 shadow-sm" onClick={e => e.stopPropagation()}>
                                                            <input type="text" className="w-full font-bold text-sm p-2 border rounded" value={displayData.title} onChange={e => setTempAiLogData({...displayData, title: e.target.value})} placeholder="제목" />
                                                            <textarea className="w-full text-sm p-2 border rounded h-32" value={displayData.details} onChange={e => setTempAiLogData({...displayData, details: e.target.value})} placeholder="상세 내용" />
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={cancelEditingAiLog} className="px-3 py-1.5 bg-slate-100 rounded text-xs font-bold">Cancel</button>
                                                                <button onClick={saveAiLogEdit} className="px-3 py-1.5 bg-brand-600 text-white rounded text-xs font-bold">Update Content</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start mb-2 group/edit">
                                                                <h4 className="font-bold text-slate-900">{displayData.title}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">{displayData.date}</span>
                                                                    <button onClick={(e) => { e.stopPropagation(); startEditingAiLog(idx, log); }} className="p-1 text-slate-400 hover:text-brand-600 rounded bg-slate-50 opacity-0 group-hover/edit:opacity-100 transition-opacity"><Edit size={12}/></button>
                                                                </div>
                                                            </div>

                                                            <div className="bg-white/60 p-3 rounded-xl border border-slate-100 text-sm text-slate-700 mb-2 font-medium">
                                                                <span className="text-[10px] text-slate-400 font-black uppercase mr-2">Summary</span>
                                                                {displayData.summary || displayData.content?.substring(0, 100)}
                                                            </div>
                                                            
                                                            {displayData.details && (
                                                                <details className="text-xs text-slate-500 mt-2 cursor-pointer group/details" onClick={e => e.stopPropagation()}>
                                                                    <summary className="font-bold hover:text-brand-600 transition-colors list-none flex items-center">
                                                                        <ChevronDown size={14} className="mr-1 group-open/details:rotate-180 transition-transform"/> 상세 내용 보기 (Course Specific)
                                                                    </summary>
                                                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                                                                        {displayData.details}
                                                                    </div>
                                                                </details>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            )}

                            {/* 4. Extracted People */}
                            {aiResults.extractedPeople?.length > 0 && (
                                <div className="mb-10">
                                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center"><UserPlus size={24} className="mr-3 text-brand-600"/> 관련 인물 추출 ({aiResults.extractedPeople.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {aiResults.extractedPeople.map((person: any, idx: number) => (
                                            <div key={idx} onClick={() => toggleSelection('PERSON', idx)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${selectedPeopleIndices.has(idx) ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black"><User size={20}/></div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{person.name}</div>
                                                        <div className="text-xs text-slate-500">{person.role} | {person.courseName}</div>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPeopleIndices.has(idx) ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                                                    {selectedPeopleIndices.has(idx) && <Check size={12} className="text-white"/>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col items-center">
                                <button 
                                    onClick={commitAiResults} 
                                    disabled={isSubmitting || (selectedCourseIndices.size + selectedLogIndices.size + selectedPeopleIndices.size === 0)} 
                                    className="w-full max-w-md bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 size={24} className="animate-spin mr-3"/> : <CheckCircle size={24} className="mr-3 text-brand-400" />} 선택된 데이터 최종 승인
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-8 animate-in fade-in duration-300">
                    {/* ... (Existing Manual Log Form) ... */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-6 mb-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center"><FileText className="mr-3 text-brand-600"/> 업무 기록 작성</h3>
                    </div>
                    
                    {/* Easy Department Change */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">작성 날짜</label>
                                <input type="date" required className={getInputClass()} value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">담당 부서 (Department)</label>
                                <div className="relative">
                                    <select 
                                        className={`${getSelectClass()} bg-white border-brand-200 text-brand-900`} 
                                        value={dept} 
                                        onChange={(e) => setDept(e.target.value as Department)}
                                    >
                                        {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none" size={16}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Course Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">관련 골프장 (다중 선택 가능)</label>
                            <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-brand-600 hover:underline flex items-center font-bold text-xs">
                                <PlusCircle size={14} className="mr-1"/> 신규 골프장 등록
                            </button>
                        </div>
                        <div className="relative group">
                            <input 
                                list="courses-logs-all" 
                                className={getInputClass()} 
                                value={courseSearchInput} 
                                onChange={(e) => setCourseSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCourseToSelection(courseSearchInput);
                                    }
                                }}
                                onClick={(e) => {
                                    // If clicking an item from datalist, it fills value then fires click/change
                                    // We'll rely on the change handler primarily or button add
                                }}
                                placeholder="골프장 검색 후 엔터..." 
                            />
                            <datalist id="courses-logs-all">{globalCourses.map(c => <option key={c.id} value={c.name} />)}</datalist>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button type="button" onClick={() => handleAddCourseToSelection(courseSearchInput)} className="text-brand-600 hover:bg-brand-50 p-1 rounded transition-colors"><Plus size={18}/></button>
                                <Search size={18} className="text-slate-300 pointer-events-none"/>
                            </div>
                        </div>
                        
                        {/* Selected Courses Chips */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {selectedCourses.map((c, idx) => (
                                <div key={c.id} className={`flex items-center pl-3 pr-2 py-1.5 rounded-lg border text-sm font-bold shadow-sm ${idx === 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                    {idx === 0 && <span className="mr-1.5 text-[9px] bg-brand-600 text-white px-1.5 rounded uppercase">MAIN</span>}
                                    {c.name}
                                    <button type="button" onClick={() => handleRemoveCourseFromSelection(c.id)} className="ml-2 text-slate-400 hover:text-red-500"><X size={14}/></button>
                                </div>
                            ))}
                            {selectedCourses.length === 0 && (
                                <span className="text-xs text-slate-400 italic py-1">선택된 골프장이 없습니다.</span>
                            )}
                        </div>
                    </div>

                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">업무 제목</label><input type="text" required className={getInputClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="핵심 제목을 입력하세요" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 내용</label><textarea required rows={10} className={getInputClass()} value={content} onChange={(e) => setContent(e.target.value)} placeholder="구체적인 업무 수행 내역 및 현장 특이사항..." /></div>
                    
                    <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 flex justify-center items-center active:scale-[0.99] transition-all">{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 업무 기록 저장</button></div>
                </form>
            )}

            {activeTab === 'PERSON' && (
                <div className="animate-in fade-in duration-300">
                    {/* ... Person Tab Content (Same as before) ... */}
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
                        {/* ... Person Form (Same as before) ... */}
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

      {/* Quick Add Course Modal (Same as before) */}
      {isCourseModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-50">
                      <h4 className="font-black text-lg text-brand-900 flex items-center tracking-tight"><Building2 size={24} className="mr-3 text-brand-600"/> 신규 골프장 마스터 등록</h4>
                      <button onClick={() => { setIsCourseModalOpen(false); setNewCourseForm({ name: '', region: '경기', holes: 18, type: CourseType.PUBLIC, address: '', description: '' }); }} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-white rounded-full"><X size={28}/></button>
                  </div>
                  <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      {/* ... Course Add Form Fields ... */}
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
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">상세 주소</label>
                          <input type="text" className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" value={newCourseForm.address} onChange={e => setNewCourseForm({...newCourseForm, address: e.target.value})} placeholder="상세 주소 입력 (선택)" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">운영 형태</label>
                          <select className="w-full rounded-2xl border-slate-200 p-4 text-sm font-black shadow-sm bg-white focus:ring-4 focus:ring-brand-500/5" value={newCourseForm.type} onChange={e => setNewCourseForm({...newCourseForm, type: e.target.value as CourseType})}>
                              <option value={CourseType.PUBLIC}>대중제</option>
                              <option value={CourseType.MEMBER}>회원제</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">개요 및 설명</label>
                          <textarea className="w-full rounded-2xl border-slate-200 p-4 text-sm font-medium shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500" rows={3} value={newCourseForm.description} onChange={e => setNewCourseForm({...newCourseForm, description: e.target.value})} placeholder="골프장 설명 입력 (선택)" />
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
