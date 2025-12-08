
import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, ExternalEvent, EventType } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, Users, CheckCircle, AlertCircle, PlusSquare, Zap, AlertTriangle, Clock, Globe, Map, ArrowLeft, Calendar, FileType, AlignLeft, CalendarPlus, ListChecks, RefreshCcw, Layers, ChevronDown, Briefcase, Phone, User, CalendarDays, Link as LinkIcon, Building, Calculator } from 'lucide-react';
import { analyzeDocument, getCourseDetailsFromAI } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addCourse, updateCourse, addPerson, addExternalEvent, courses: globalCourses, people: globalPeople } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const editingLog = location.state?.log as LogEntry | undefined;
  
  const [activeTab, setActiveTab] = useState<'LOG' | 'PERSON' | 'SCHEDULE'>('LOG');

  // --- Log Form State ---
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]); // Added Date State
  const [dept, setDept] = useState<string>('영업');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [locationData, setLocationData] = useState<{lat: number, lng: number} | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [contactPerson, setContactPerson] = useState('');
  
  // --- Person Form State ---
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personStartDate, setPersonStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [personCourseId, setPersonCourseId] = useState('');
  const [personAffinity, setPersonAffinity] = useState<string>('0');
  const [personNotes, setPersonNotes] = useState('');
  const [similarPeople, setSimilarPeople] = useState<Person[]>([]);

  // --- Schedule Form State ---
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedSource, setSchedSource] = useState<'Manual' | 'Google' | 'Outlook'>('Manual');
  const [schedType, setSchedType] = useState<EventType>('MEETING');
  const [schedCourseId, setSchedCourseId] = useState('');
  const [schedPersonId, setSchedPersonId] = useState('');

  // --- Shared State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  
  // --- AI Input Mode State ---
  const [aiInputMode, setAiInputMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [aiTextInput, setAiTextInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 

  // --- Analysis Feedback State ---
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    fields?: { label: string; value: string }[];
    isNewCourse?: boolean;
    multiLogCount?: number; 
    summaryReport?: string; 
    retryAction?: () => void; 
  } | null>(null);

  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (editingLog) {
      setActiveTab('LOG');
      setLogDate(editingLog.date); // Load date
      setTitle(editingLog.title);
      setContent(editingLog.content);
      setDept(editingLog.department);
      setCourseId(editingLog.courseId);
      setTags(editingLog.tags || []);
      setContactPerson(editingLog.contactPerson || '');
    }
  }, [editingLog]);

  useEffect(() => {
    if (feedback?.type === 'success' && !feedback.summaryReport) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 12000); 
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Real-time Duplicate Check for Person
  useEffect(() => {
      if (personName.length >= 2) {
          const matches = globalPeople.filter(p => p.name.includes(personName));
          setSimilarPeople(matches);
      } else {
          setSimilarPeople([]);
      }
  }, [personName, globalPeople]);

  // Smart Location Auto-fill for Schedule
  useEffect(() => {
      if (schedCourseId) {
          const c = globalCourses.find(c => c.id === schedCourseId);
          if (c && (!schedLocation || schedLocation === '')) {
              setSchedLocation(c.address);
          }
      }
  }, [schedCourseId, globalCourses, schedLocation]);
  
  // Dynamic Course List & Modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [newCourse, setNewCourse] = useState<{
    name: string;
    address: string;
    holes: number;
    type: CourseType;
    grassType: GrassType;
    area: string;
    length: string;
  }>({
    name: '',
    address: '',
    holes: 18,
    type: CourseType.PUBLIC,
    grassType: GrassType.ZOYSIA,
    area: '',
    length: ''
  });
  
  // Course Calculator State
  const [newCoursePyeong, setNewCoursePyeong] = useState('');
  const [newCourseM2, setNewCourseM2] = useState('');
  const [newCourseYard, setNewCourseYard] = useState('');

  const handlePyeongChange = (val: string) => {
      setNewCoursePyeong(val);
      if (val && !isNaN(parseFloat(val))) {
          const m2 = (parseFloat(val) * 3.305785).toFixed(0);
          setNewCourseM2(m2);
          setNewCourse(prev => ({...prev, area: `${Number(val).toLocaleString()}평 (${Number(m2).toLocaleString()} m²)`}));
      } else {
          setNewCourseM2('');
      }
  };

  const handleYardChange = (val: string) => {
      setNewCourseYard(val);
      if (val && !isNaN(parseFloat(val))) {
          setNewCourse(prev => ({...prev, length: `${Number(val).toLocaleString()} yds`}));
      }
  };
  
  const [courseErrors, setCourseErrors] = useState<{name?: string; holes?: string}>({});

  const processAndRegisterPerson = (rawString: string, linkedCourseId: string) => {
      // (Implementation same as provided)
      if (!rawString || rawString.trim().length < 2) return;
      const cleanStr = rawString.trim();
      const parts = cleanStr.split(/\s+/);
      let name = cleanStr;
      let role = '담당자'; 
      if (parts.length > 1) {
          role = parts[parts.length - 1];
          name = parts.slice(0, parts.length - 1).join(' ');
      } 
      const newPerson: Person = {
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name,
          phone: '', 
          currentRole: role,
          currentCourseId: linkedCourseId,
          currentRoleStartDate: new Date().toISOString().split('T')[0],
          affinity: AffinityLevel.NEUTRAL,
          notes: `[AI 자동등록] 업무 일지 분석을 통해 등록됨 (${new Date().toISOString().split('T')[0]})`,
          careers: []
      };
      addPerson(newPerson); 
  };

  // Re-use logic from previous implementation
  const performAiAnalysis = async (files?: File[], text?: string) => {
    // (Implementation same as provided in prompt)
    if ((!files || files.length === 0) && !text) return;
    setFeedback(null);
    setUploadProgress(0);
    setStatusMessage('데이터 준비 중...');
    setHighlightedFields(new Set());
    setIsAnalyzing(true);
    setContactPerson(''); 

    let progressInterval: any;

    try {
        const payload: { base64Data?: string, mimeType?: string, textData?: string }[] = [];
        if (files && files.length > 0) {
            const readPromises = files.map(file => {
                return new Promise<{base64: string, type: string}>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        if(result) resolve({base64: result.split(',')[1], type: file.type || 'application/octet-stream'});
                        else reject(new Error(`File read failed: ${file.name}`));
                    };
                    reader.readAsDataURL(file);
                });
            });
            setStatusMessage(`${files.length}개 파일 처리 중...`);
            const fileResults = await Promise.all(readPromises);
            fileResults.forEach(res => { payload.push({ base64Data: res.base64, mimeType: res.type }); });
            setUploadProgress(30);
        } else if (text) {
            payload.push({ textData: text });
            setUploadProgress(30);
        }

        progressInterval = setInterval(() => {
            setUploadProgress(prev => (prev >= 90 ? prev : prev + 2));
            setStatusMessage(prev => uploadProgress > 60 ? 'AI 정밀 분석 중...' : '데이터 구조화 중...');
        }, 300);

        const existingCourseNames = globalCourses.map(c => c.name);
        const results = await analyzeDocument(payload, existingCourseNames);
        
        clearInterval(progressInterval);
        setUploadProgress(100); 
        setStatusMessage('완료!');
        
        if (results && results.length > 0) {
            // (Same result handling logic as provided)
            const isMultiLog = results.length > 1;
            const extractedSummary: {label: string, value: string}[] = [];
            let isNewCourseCreated = false;
            let logCount = 0;
            let summaryReportText = ''; 
            let registeredPersonCount = 0;

            for (const result of results) {
                logCount++;
                let targetCourseId = '';
                let courseNameForFeedback = '미지정';
                let enhancedContent = "";
                if (result.summary_report) {
                    enhancedContent += `[AI 요약 보고]\n${result.summary_report}\n\n`;
                    summaryReportText += `[${result.courseName} 요약] ${result.summary_report}\n\n`;
                }
                enhancedContent += `[상세 업무 내용]\n${result.content || '본문 내용 없음'}\n\n`;
                const extraDetails = [];
                if (result.project_name) extraDetails.push(`프로젝트명: ${result.project_name}`);
                if (result.contact_person) extraDetails.push(`담당자: ${result.contact_person}`);
                if (result.key_issues && result.key_issues.length > 0) extraDetails.push(`[주요 이슈]\n${result.key_issues.map((issue: string) => `- ${issue}`).join('\n')}`);
                if (extraDetails.length > 0) enhancedContent += `[AI 추출 데이터]\n${extraDetails.join('\n')}`;

                const matchedDept = Object.values(Department).find(d => result.department && result.department.includes(d)) || '영업';
                const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
                const matchedCourse = globalCourses.find(c => normalize(c.name) === normalize(result.courseName || ''));

                if (matchedCourse) {
                    targetCourseId = matchedCourse.id;
                    courseNameForFeedback = matchedCourse.name;
                } else if (result.courseName && result.courseName !== '미지정') {
                    isNewCourseCreated = true;
                    const autoCourseId = `auto-course-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    const newAutoCourse: GolfCourse = {
                        id: autoCourseId, name: result.courseName, address: result.course_info?.address || '주소 정보 없음', holes: result.course_info?.holes || 18,
                        type: (result.course_info?.type as CourseType) || CourseType.PUBLIC, grassType: GrassType.MIXED, openYear: new Date().getFullYear().toString(),
                        area: '-', description: `AI 자동생성`, issues: []
                    };
                    addCourse(newAutoCourse);
                    targetCourseId = autoCourseId;
                    courseNameForFeedback = result.courseName;
                    getCourseDetailsFromAI(result.courseName).then((details) => {
                        updateCourse({ ...newAutoCourse, ...details });
                    }).catch(err => console.error(err));
                }

                if (results.length <= 3) extractedSummary.push({ label: `[${logCount}] 골프장`, value: courseNameForFeedback });
                if (result.contact_person && targetCourseId) { processAndRegisterPerson(result.contact_person, targetCourseId); registeredPersonCount++; }

                if (isAutoSaveEnabled || isMultiLog) {
                    const newLog: LogEntry = {
                        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        date: result.date || new Date().toISOString().split('T')[0],
                        author: 'AI 자동등록', department: matchedDept as Department,
                        courseId: targetCourseId || 'unknown', courseName: courseNameForFeedback || '미지정',
                        title: result.title, content: enhancedContent, tags: result.tags,
                        contactPerson: result.contact_person, createdAt: Date.now(), updatedAt: Date.now()
                    };
                    addLog(newLog);
                } else {
                    if (results.length === 1) {
                        const r = results[0];
                        setTitle(r.title); setContent(enhancedContent); setDept(matchedDept); setCourseId(targetCourseId); setTags(r.tags || []);
                        if (r.date) setLogDate(r.date); // Update Date from AI
                        if (r.contact_person) { setContactPerson(r.contact_person); setHighlightedFields(prev => new Set(prev).add('contactPerson')); }
                        setHighlightedFields(new Set(['title', 'content', 'department', 'courseId', 'tags']));
                    }
                }
            }

            setFeedback({
                type: 'success', 
                title: isMultiLog ? `${results.length}건 자동 등록 완료` : '분석 성공',
                message: isMultiLog ? '다중 문서가 자동 분류되어 저장되었습니다.' : '필드가 자동으로 입력되었습니다.',
                fields: extractedSummary,
                isNewCourse: isNewCourseCreated,
                multiLogCount: results.length,
                summaryReport: summaryReportText
            });
            setAiTextInput(''); setSelectedFiles([]);
            setTimeout(() => setHighlightedFields(new Set()), 15000);
        }
    } catch (error: any) {
        if(progressInterval) clearInterval(progressInterval);
        setFeedback({ type: 'error', title: '분석 실패', message: error.message || '오류 발생', retryAction: () => performAiAnalysis(files, text) });
    } finally {
        if(progressInterval) clearInterval(progressInterval);
        setIsAnalyzing(false);
    }
  };

  const handleAutoFillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        const fileList = Array.from(files) as File[];
        setSelectedFiles(fileList);
        performAiAnalysis(fileList);
        e.target.value = '';
    }
  };

  const handleAiTextSubmit = () => {
      if (!aiTextInput.trim()) { alert("내용을 입력하세요."); return; }
      performAiAnalysis(undefined, aiTextInput);
  };

  const handleCourseChange = (field: keyof typeof newCourse, value: any) => {
    setNewCourse(prev => ({...prev, [field]: value}));
    if (field === 'name' || field === 'holes') setCourseErrors(prev => ({...prev, [field]: undefined}));
  };

  const handleAiCourseSearch = async () => {
    if (!newCourse.name) { setCourseErrors({ name: '입력 필요' }); return; }
    setIsAiSearching(true);
    try {
      const details = await getCourseDetailsFromAI(newCourse.name);
      setNewCourse(prev => ({ ...prev, ...details }));
      alert(`정보 업데이트: ${newCourse.name}`);
    } catch (error) { alert('AI 검색 오류'); } 
    finally { setIsAiSearching(false); }
  };

  const handleSaveNewCourse = () => {
    const courseToAdd: GolfCourse = {
      id: `new-${Date.now()}`, name: newCourse.name, address: newCourse.address || '', holes: newCourse.holes,
      type: newCourse.type, grassType: newCourse.grassType, openYear: new Date().getFullYear().toString(),
      area: newCourse.area || '-', length: newCourse.length || '-', description: '직접 등록', issues: []
    };
    addCourse(courseToAdd);
    getCourseDetailsFromAI(newCourse.name).then((details) => updateCourse({ ...courseToAdd, ...details })).catch(err => console.error(err));
    if (activeTab === 'LOG') setCourseId(courseToAdd.id);
    else if (activeTab === 'PERSON') setPersonCourseId(courseToAdd.id);
    else setSchedCourseId(courseToAdd.id);
    setIsCourseModalOpen(false);
  };

  // ... (Log Submit, Person Submit, Schedule Submit Logic - No changes needed)
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const selectedCourse = globalCourses.find(c => c.id === courseId);
    if (contactPerson && courseId) processAndRegisterPerson(contactPerson, courseId);

    const logData = {
        department: dept as Department, courseId, courseName: selectedCourse?.name || '미지정',
        title, content, tags, contactPerson, updatedAt: Date.now(), date: logDate
    };

    if (editingLog) updateLog({ ...editingLog, ...logData });
    else addLog({ id: `manual-${Date.now()}`, author: '사용자', createdAt: Date.now(), ...logData });
    
    setTimeout(() => { 
        setIsSubmitting(false); alert('저장되었습니다.'); 
        if(!editingLog) { setTitle(''); setContent(''); setTags([]); setCourseId(''); setContactPerson(''); setLogDate(new Date().toISOString().split('T')[0]); }
        else navigate(-1);
    }, 500);
  };

  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    addPerson({
        id: `person-${Date.now()}`, name: personName, phone: personPhone, currentRole: personRole,
        currentRoleStartDate: personStartDate, currentCourseId: personCourseId, affinity: parseInt(personAffinity) as AffinityLevel,
        notes: personNotes, careers: [] 
    });
    setTimeout(() => { setIsSubmitting(false); alert('인물 등록 완료'); setPersonName(''); setPersonPhone(''); setPersonRole(''); setPersonNotes(''); }, 500);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    addExternalEvent({
        id: `sched-${Date.now()}`, 
        title: schedTitle, 
        date: schedDate, 
        time: schedTime, 
        location: schedLocation, 
        source: schedSource,
        // Linkage fields
        type: schedType,
        courseId: schedCourseId,
        personId: schedPersonId
    });
    setTimeout(() => { setIsSubmitting(false); alert('일정 등록 완료'); setSchedTitle(''); setSchedLocation(''); }, 500);
  };

  const isFilled = (key: string) => highlightedFields.has(key);
  const getInputClass = (key: string) => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${isFilled(key) ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200' : 'bg-slate-50 border-slate-200'}`;
  const getSelectClass = (key: string) => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 appearance-none bg-white ${isFilled(key) ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200' : 'border-slate-200'}`;
  const isNewPerson = contactPerson && contactPerson.length > 1 && !globalPeople.some(p => p.name.includes(contactPerson.split(' ')[0]));

  const getAffinityColor = (val: string) => {
      const v = parseInt(val);
      if (v >= 1) return 'bg-green-100 text-green-700 ring-green-500';
      if (v <= -1) return 'bg-red-100 text-red-700 ring-red-500';
      return 'bg-slate-100 text-slate-700 ring-slate-400';
  };

  // Helper to render event type badge
  const renderEventTypeBadge = (type: EventType) => {
      switch(type) {
          case 'MEETING': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">미팅</span>;
          case 'VISIT': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">현장 방문</span>;
          case 'CONSTRUCTION': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">공사/작업</span>;
          default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">기타</span>;
      }
  };

  return (
    <div className="space-y-6 relative max-w-4xl mx-auto">
      {editingLog && (
          <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100"><ArrowLeft size={20} /></button>
              <h2 className="text-xl font-bold text-slate-800">기록 수정</h2>
          </div>
      )}

      {/* ... (Tabs and Log Form UI - largely unchanged) ... */}
      {!editingLog && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6">
            {['LOG', 'PERSON', 'SCHEDULE'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center ${activeTab === tab ? 'bg-brand-600 text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {tab === 'LOG' && <FileText className="mr-2" size={18} />}
                  {tab === 'PERSON' && <UserPlus className="mr-2" size={18} />}
                  {tab === 'SCHEDULE' && <CalendarPlus className="mr-2" size={18} />}
                  {tab === 'LOG' ? '업무 일지' : tab === 'PERSON' ? '인물 등록' : '일정 등록'}
                </button>
            ))}
          </div>
      )}

      {activeTab === 'LOG' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           {/* ... (AI Upload Section - Unchanged) ... */}
           {!editingLog && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                
                <h2 className="text-2xl font-bold mb-3 flex items-center relative z-10"><Sparkles className="mr-3 text-amber-400" size={24} /> Smart AI Import</h2>
                <p className="text-slate-400 text-sm mb-6 relative z-10">PDF, 이미지, 텍스트를 드래그하여 업로드하세요. AI가 자동으로 내용을 분석하고 분류합니다.</p>
                
                {isAnalyzing && (
                    <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700 relative overflow-hidden">
                        <div className="flex justify-between text-xs font-bold text-brand-300 mb-2">
                            <span>{statusMessage}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-brand-500 h-2 rounded-full transition-all duration-300 relative" style={{ width: `${uploadProgress}%` }}>
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {feedback && (
                    <div className={`mb-6 p-5 rounded-xl border relative z-10 ${feedback.type === 'success' ? 'bg-emerald-900/40 border-emerald-500/50' : 'bg-red-900/40 border-red-500/50'}`}>
                        <div className="font-bold flex items-center justify-between text-white">
                            <span className="flex items-center text-lg">{feedback.type === 'success' ? <CheckCircle className="mr-2 text-emerald-400"/> : <AlertTriangle className="mr-2 text-red-400"/>} {feedback.title}</span>
                        </div>
                        <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-line">{feedback.message}</p>
                        {feedback.summaryReport && (
                            <div className="mt-4 bg-black/30 p-4 rounded-lg text-xs text-slate-200 leading-relaxed border border-white/5">
                                {feedback.summaryReport}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex space-x-2 mb-4 bg-slate-800/50 p-1 rounded-lg w-fit relative z-10">
                  <button onClick={() => setAiInputMode('FILE')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${aiInputMode === 'FILE' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}>파일 업로드</button>
                  <button onClick={() => setAiInputMode('TEXT')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${aiInputMode === 'TEXT' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}>텍스트 입력</button>
                </div>

                {aiInputMode === 'FILE' ? (
                    <label className={`relative z-10 flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isAnalyzing ? 'border-slate-600 bg-slate-800/50 opacity-50 cursor-not-allowed' : 'border-slate-600 bg-slate-800/30 hover:bg-slate-800/80 hover:border-brand-400'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className={`w-12 h-12 mb-3 ${isAnalyzing ? 'text-slate-500' : 'text-brand-400'}`} />
                            <p className="mb-2 text-sm text-slate-300 font-bold">클릭하여 파일 선택 <span className="font-normal text-slate-400">또는 드래그 앤 드롭</span></p>
                            <p className="text-xs text-slate-500">PDF, PNG, JPG (최대 10MB)</p>
                        </div>
                        <input type="file" multiple className="hidden" onChange={handleAutoFillUpload} disabled={isAnalyzing} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"/>
                    </label>
                ) : (
                    <div className="relative z-10 space-y-3">
                        <textarea className="w-full h-32 rounded-xl p-4 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none" placeholder="내용을 여기에 붙여넣으세요..." value={aiTextInput} onChange={e => setAiTextInput(e.target.value)} disabled={isAnalyzing}/>
                        <button onClick={handleAiTextSubmit} disabled={isAnalyzing || !aiTextInput} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-500 transition-colors shadow-lg">분석 시작</button>
                    </div>
                )}
                
                <div className="mt-6 flex items-center justify-between relative z-10">
                    <div className="flex items-center cursor-pointer group" onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}>
                        <div className={`w-11 h-6 rounded-full relative mr-3 transition-colors duration-300 ${isAutoSaveEnabled ? 'bg-brand-500' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${isAutoSaveEnabled ? 'left-6' : 'left-1'}`}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">자동 분류 및 저장 (Smart Save)</span>
                    </div>
                </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><FileText className="mr-2 text-slate-400"/> 세부 정보 입력</h3>
            <form onSubmit={handleLogSubmit} className="space-y-6">
              {/* Date Input Added */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">업무 날짜</label>
                  <input type="date" required className={getInputClass('date')} value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">부서</label>
                      <div className="relative">
                        <select className={getSelectClass('department')} value={dept} onChange={(e) => setDept(e.target.value)}>
                            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16}/>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">골프장</label>
                        <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold hover:bg-brand-100 transition-colors">+ 신규 등록</button>
                      </div>
                      <div className="relative">
                        <select className={getSelectClass('courseId')} value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                            <option value="">선택하세요</option>
                            {globalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16}/>
                      </div>
                  </div>
              </div>

              {/* ... (Rest of Log Form) ... */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">제목</label>
                  <input type="text" required className={getInputClass('title')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 요약 제목" />
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">상세 내용</label>
                  <textarea required rows={8} className={getInputClass('content')} value={content} onChange={(e) => setContent(e.target.value)} placeholder="상세 업무 내용을 입력하세요." />
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>관련 담당자</span>
                      {contactPerson && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center ${isNewPerson ? 'text-brand-700 bg-brand-50 ring-1 ring-brand-200' : 'text-slate-600 bg-slate-100'}`}>
                              <UserPlus size={10} className="mr-1"/> {isNewPerson ? '신규 등록 예정' : '기존 인물'}
                          </span>
                      )}
                  </label>
                  <input type="text" className={getInputClass('contactPerson')} placeholder="예: 김철수 팀장" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>

              <div className="pt-6 border-t border-slate-100">
                  <button type="submit" disabled={isSubmitting || isAnalyzing} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex justify-center items-center active:scale-[0.99]">
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 저장하기
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Person Form (unchanged) --- */}
      {activeTab === 'PERSON' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
            {/* Left: Preview Card */}
            <div className="lg:col-span-2 space-y-4">
                 <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm sticky top-24 text-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">프로필 미리보기</h4>
                    
                    <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-4 text-3xl text-slate-400 font-bold border-4 border-white shadow-lg">
                        {personName ? personName[0] : <User size={40} />}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{personName || '이름 미입력'}</h3>
                    <div className="flex justify-center items-center space-x-2 text-sm text-slate-500 mb-4">
                        <Briefcase size={14} />
                        <span>{personRole || '직책'}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>{globalCourses.find(c => c.id === personCourseId)?.name || '소속 골프장'}</span>
                    </div>

                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-6 ${getAffinityColor(personAffinity)} ring-1`}>
                        {personAffinity === '2' ? '강력한 아군 (Ally)' : 
                         personAffinity === '1' ? '우호적 (Friendly)' : 
                         personAffinity === '0' ? '중립 (Neutral)' : 
                         personAffinity === '-1' ? '비우호적 (Unfriendly)' : '적대적 (Hostile)'}
                    </div>

                    {personCourseId && (
                        <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500">
                            <div className="flex items-start mb-1">
                                <MapPin size={12} className="mr-2 mt-0.5 text-brand-600"/>
                                <span className="flex-1">{globalCourses.find(c => c.id === personCourseId)?.address}</span>
                            </div>
                        </div>
                    )}
                 </div>

                 {similarPeople.length > 0 && (
                     <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                         <h5 className="text-xs font-bold text-amber-800 flex items-center mb-2">
                             <AlertTriangle size={14} className="mr-1.5"/> 유사 인물 발견 ({similarPeople.length})
                         </h5>
                         <ul className="space-y-2">
                             {similarPeople.map(p => (
                                 <li key={p.id} className="text-xs text-amber-900 bg-white/50 p-2 rounded border border-amber-100/50 flex justify-between">
                                     <span>{p.name} ({p.currentRole})</span>
                                     <span className="text-slate-500">{globalCourses.find(c=>c.id===p.currentCourseId)?.name}</span>
                                 </li>
                             ))}
                         </ul>
                     </div>
                 )}
            </div>

            {/* Right: Input Form */}
            <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <form onSubmit={handlePersonSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">이름 <span className="text-red-500">*</span></label>
                            <input type="text" required className={getInputClass('personName')} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="홍길동" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">연락처</label>
                            <input type="text" className={getInputClass('personPhone')} value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} placeholder="010-0000-0000" />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">소속 골프장</label>
                            <button type="button" onClick={() => setIsCourseModalOpen(true)} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold hover:bg-brand-100 transition-colors">+ 신규 등록</button>
                        </div>
                        <div className="relative">
                            <select className={getSelectClass('personCourseId')} value={personCourseId} onChange={(e) => setPersonCourseId(e.target.value)}>
                                <option value="">소속 선택</option>
                                {globalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16}/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">직책</label>
                            <input type="text" className={getInputClass('personRole')} value={personRole} onChange={(e) => setPersonRole(e.target.value)} placeholder="예: 코스팀장" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">입사일 (선택)</label>
                            <input type="date" className={getInputClass('personStartDate')} value={personStartDate} onChange={(e) => setPersonStartDate(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">친밀도 (관계)</label>
                        <div className="grid grid-cols-5 gap-2">
                            {['2','1','0','-1','-2'].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setPersonAffinity(val)}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${personAffinity === val ? getAffinityColor(val) + ' ring-2 ring-offset-1 border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {val === '2' ? 'Ally' : val === '1' ? 'Friendly' : val === '0' ? 'Neutral' : val === '-1' ? 'Unfriendly' : 'Hostile'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">메모 / 특징</label>
                        <textarea rows={4} className={getInputClass('personNotes')} value={personNotes} onChange={(e) => setPersonNotes(e.target.value)} placeholder="인물의 성격, 선호도, 특이사항 등을 기록하세요." />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex justify-center items-center active:scale-[0.99]">
                             {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2" />} 인물 등록 완료
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- Schedule Form (unchanged) --- */}
      {activeTab === 'SCHEDULE' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
            {/* Left: Schedule Preview */}
             <div className="lg:col-span-2 space-y-4">
                 <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm sticky top-24">
                     <div className="flex justify-between items-start mb-4">
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">일정 미리보기</div>
                         {renderEventTypeBadge(schedType)}
                     </div>
                     
                     <div className="flex items-start space-x-4 mb-6">
                         <div className="bg-red-50 text-red-600 rounded-xl p-3 flex flex-col items-center justify-center min-w-[60px] border border-red-100">
                             <span className="text-xs font-bold uppercase">{new Date(schedDate).toLocaleString('en-US', {month: 'short'})}</span>
                             <span className="text-xl font-bold">{new Date(schedDate).getDate()}</span>
                         </div>
                         <div>
                             <h3 className="font-bold text-slate-900 text-lg leading-tight">{schedTitle || '일정 제목'}</h3>
                             <div className="text-sm text-slate-500 mt-1 flex items-center">
                                 <Clock size={14} className="mr-1.5"/> {schedTime}
                             </div>
                         </div>
                     </div>

                     <div className="space-y-3 pt-4 border-t border-slate-100">
                         <div className="flex items-start text-sm text-slate-600">
                             <MapPin size={16} className="mr-3 mt-0.5 text-slate-400 shrink-0"/>
                             <span>{schedLocation || '장소 미지정'}</span>
                         </div>
                         {schedCourseId && (
                             <div className="flex items-start text-sm text-slate-600">
                                 <Building size={16} className="mr-3 mt-0.5 text-brand-500 shrink-0"/>
                                 <span className="font-medium text-brand-700">{globalCourses.find(c => c.id === schedCourseId)?.name}</span>
                             </div>
                         )}
                         {schedPersonId && (
                             <div className="flex items-start text-sm text-slate-600">
                                 <User size={16} className="mr-3 mt-0.5 text-slate-400 shrink-0"/>
                                 <span>{globalPeople.find(p => p.id === schedPersonId)?.name} (관련 인물)</span>
                             </div>
                         )}
                     </div>
                 </div>
             </div>

             {/* Right: Input Form */}
             <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <form onSubmit={handleScheduleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">일정 제목 <span className="text-red-500">*</span></label>
                        <input type="text" required className={getInputClass('schedTitle')} value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} placeholder="미팅, 공사 일정 등" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">날짜</label>
                            <input type="date" required className={getInputClass('schedDate')} value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">시간</label>
                            <input type="time" required className={getInputClass('schedTime')} value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                        </div>
                    </div>

                    {/* Context Linking Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h5 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                            <LinkIcon size={12} className="mr-1.5"/> 연관 정보 (Context)
                        </h5>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">골프장 (장소 자동완성)</label>
                                <select className="w-full text-sm rounded-lg border-slate-300 py-2 px-3" value={schedCourseId} onChange={(e) => setSchedCourseId(e.target.value)}>
                                    <option value="">선택 안함</option>
                                    {globalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">관련 인물</label>
                                <select className="w-full text-sm rounded-lg border-slate-300 py-2 px-3" value={schedPersonId} onChange={(e) => setSchedPersonId(e.target.value)}>
                                    <option value="">선택 안함</option>
                                    {globalPeople
                                        .filter(p => !schedCourseId || p.currentCourseId === schedCourseId) // Filter by course if selected
                                        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                    }
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">장소 (직접 입력 가능)</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 text-slate-400" size={16} />
                            <input type="text" className={`w-full rounded-xl border py-3 pl-10 pr-4 transition-all outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${isFilled('schedLocation') ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-slate-200'}`} value={schedLocation} onChange={(e) => setSchedLocation(e.target.value)} placeholder="주소 또는 장소명" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">일정 유형</label>
                            <select className={getSelectClass('schedType')} value={schedType} onChange={(e) => setSchedType(e.target.value as EventType)}>
                                <option value="MEETING">미팅 (Meeting)</option>
                                <option value="VISIT">현장 방문 (Visit)</option>
                                <option value="CONSTRUCTION">공사/작업 (Construction)</option>
                                <option value="OTHER">기타 (Other)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">출처 소스</label>
                            <select className={getSelectClass('schedSource')} value={schedSource} onChange={(e) => setSchedSource(e.target.value as any)}>
                                <option value="Manual">직접 입력</option>
                                <option value="Google">Google Calendar</option>
                                <option value="Outlook">Outlook</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex justify-center items-center active:scale-[0.99]">
                             {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CalendarPlus className="mr-2" />} 일정 등록 완료
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}
      
      {/* New Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center text-lg">
                 <PlusSquare size={20} className="mr-2 text-brand-600"/> 신규 골프장 등록
              </h3>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">골프장 이름 <span className="text-red-500">*</span></label>
                <div className="flex space-x-2">
                    <input type="text" className={`flex-1 rounded-xl border py-3 px-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${courseErrors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} placeholder="예: 그린밸리 CC" value={newCourse.name} onChange={(e) => handleCourseChange('name', e.target.value)} autoFocus />
                    <button type="button" onClick={handleAiCourseSearch} disabled={isAiSearching || !newCourse.name} className="bg-slate-900 text-white px-4 rounded-xl text-xs font-bold flex items-center whitespace-nowrap hover:bg-slate-800 disabled:opacity-50">{isAiSearching ? <Loader2 size={14} className="animate-spin" /> : <><Map size={14} className="mr-1"/>AI 검색</>}</button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">주소</label>
                <input type="text" className="w-full rounded-xl border border-slate-200 py-3 px-4 outline-none focus:border-brand-500" value={newCourse.address} onChange={(e) => handleCourseChange('address', e.target.value)} />
              </div>
              
              {/* Area & Length with Calculators */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center">
                        <Calculator size={14} className="mr-1.5"/> 면적 및 전장 (Calculator)
                   </h4>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1 font-bold">총 면적 (평 ↔ m² 자동변환)</label>
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="number" 
                                        placeholder="평"
                                        className="w-full rounded-lg border-slate-300 text-sm pr-8 focus:border-brand-500 focus:ring-brand-500"
                                        value={newCoursePyeong}
                                        onChange={(e) => handlePyeongChange(e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">평</span>
                                </div>
                                <div className="relative flex-1">
                                    <input 
                                        type="number" 
                                        placeholder="m²"
                                        className="w-full rounded-lg border-slate-200 bg-slate-100 text-sm pr-8 focus:border-brand-500 focus:ring-brand-500 text-slate-500"
                                        value={newCourseM2}
                                        readOnly
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">m²</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1 font-bold">코스 전장 (Length)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    placeholder="Yard"
                                    className="w-full rounded-lg border-slate-300 text-sm pr-12 focus:border-brand-500 focus:ring-brand-500"
                                    value={newCourseYard}
                                    onChange={(e) => handleYardChange(e.target.value)}
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">yds</span>
                            </div>
                        </div>
                   </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">운영 형태</label>
                    <select className="w-full rounded-xl border border-slate-200 py-3 px-4 outline-none bg-white" value={newCourse.type} onChange={(e) => handleCourseChange('type', e.target.value as CourseType)}>
                        {Object.values(CourseType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">잔디 종류</label>
                    <select className="w-full rounded-xl border border-slate-200 py-3 px-4 outline-none bg-white" value={newCourse.grassType} onChange={(e) => handleCourseChange('grassType', e.target.value as GrassType)}>
                        {Object.values(GrassType).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3 shrink-0">
              <button onClick={() => setIsCourseModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleSaveNewCourse} className="px-6 py-3 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-lg hover:shadow-xl transition-all"><CheckCircle size={16} className="inline mr-2" /> 등록 완료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteLog;
