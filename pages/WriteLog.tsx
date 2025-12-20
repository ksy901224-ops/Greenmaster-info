
import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType, Region } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, ListChecks, Database } from 'lucide-react';
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
  
  // --- Person Form State ---
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personStartDate, setPersonStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [personCourseId, setPersonCourseId] = useState('');
  const [personAffinity, setPersonAffinity] = useState<string>('0');
  const [personNotes, setPersonNotes] = useState('');

  // --- Quick Person Add State (For Log Tab) ---
  const [isQuickPersonModalOpen, setIsQuickPersonModalOpen] = useState(false);
  const [quickPerson, setQuickPerson] = useState({ name: '', role: '', phone: '', affinity: '0' });

  // --- Schedule Form State ---
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedSource, setSchedSource] = useState<'Manual' | 'Google' | 'Outlook'>('Manual');
  const [schedType, setSchedType] = useState<EventType>('MEETING');
  const [schedCourseId, setSchedCourseId] = useState('');
  const [schedPersonId, setSchedPersonId] = useState('');

  // --- AI Upload State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]); // Results from Gemini
  const [processedIndices, setProcessedIndices] = useState<Set<number>>(new Set()); // Track saved items

  // --- Shared State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  
  // --- Dynamic Course List & Modal State ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<any>({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });

  // --- Filtered People for Log Form ---
  const filteredPeopleForLog = globalPeople.filter(p => 
    courseId ? p.currentCourseId === courseId : true
  );

  // --- Initial Data Loading (Draft Check) ---
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
    } else {
        // Check for drafts
        const savedLogDraft = localStorage.getItem('GM_DRAFT_LOG');
        if (savedLogDraft) {
            setHasDraft(true);
            setShowDraftModal(true);
        }
    }
  }, [editingLog]);

  const loadDrafts = () => {
        const savedLogDraft = localStorage.getItem('GM_DRAFT_LOG');
        if (savedLogDraft) {
            try {
                const p = JSON.parse(savedLogDraft);
                setLogDate(p.logDate || new Date().toISOString().split('T')[0]);
                setDept(p.dept || '영업');
                setCourseId(p.courseId || '');
                setTitle(p.title || '');
                setContent(p.content || '');
                setTags(p.tags || []);
                setContactPerson(p.contactPerson || '');
                setActiveTab('LOG');
            } catch(e) {}
        }
        setShowDraftModal(false);
  };

  const discardDrafts = () => {
      localStorage.removeItem('GM_DRAFT_LOG');
      localStorage.removeItem('GM_DRAFT_PERSON');
      localStorage.removeItem('GM_DRAFT_SCHED');
      setHasDraft(false);
      setShowDraftModal(false);
      setLastSavedTime(null);
  };

  // --- Autosave Effect ---
  useEffect(() => {
      if (editingLog || !isAutoSaveEnabled || activeTab === 'AI') return; 

      const timer = setTimeout(() => {
          if (title || content || courseId) {
            const logDraft = { logDate, dept, courseId, title, content, tags, contactPerson };
            localStorage.setItem('GM_DRAFT_LOG', JSON.stringify(logDraft));
            setLastSavedTime(new Date().toLocaleTimeString());
            setHasDraft(true);
          }
      }, 2000);

      return () => clearTimeout(timer);
  }, [logDate, dept, courseId, title, content, tags, contactPerson, editingLog, isAutoSaveEnabled, activeTab]);

  // --- Handlers ---

  const handleCourseChange = (f: string, v: any) => { setNewCourse((p: any) => ({...p, [f]: v})) };
  
  const handleSaveNewCourse = () => { 
      const newId = `course-${Date.now()}`;
      addCourse({ ...newCourse, id: newId }); 
      setIsCourseModalOpen(false);
      // Auto select the new course if in manual mode
      if (activeTab === 'LOG') setCourseId(newId);
      
      alert(`${newCourse.name} 골프장이 등록되었습니다.`);
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
    
    localStorage.removeItem('GM_DRAFT_LOG');
    
    setTimeout(() => { 
        setIsSubmitting(false); alert('저장되었습니다.'); 
        if(!editingLog) window.history.back();
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
    localStorage.removeItem('GM_DRAFT_PERSON');
    setTimeout(() => { 
        setIsSubmitting(false); 
        alert('인물 등록 완료'); 
        // Reset form
        setPersonName(''); setPersonPhone(''); setPersonRole(''); setPersonCourseId(''); setPersonNotes('');
    }, 500);
  };

  const handleQuickPersonSubmit = () => {
      if (!quickPerson.name) {
          alert('이름을 입력해주세요.');
          return;
      }
      addPerson({
          id: `person-q-${Date.now()}`,
          name: quickPerson.name,
          phone: quickPerson.phone,
          currentRole: quickPerson.role,
          currentCourseId: courseId, // Automatically link to the selected course in Log tab
          affinity: parseInt(quickPerson.affinity) as AffinityLevel,
          notes: '업무 일지 작성 중 간편 등록됨',
          careers: []
      });
      setContactPerson(quickPerson.name); // Auto-fill the input
      setIsQuickPersonModalOpen(false);
      setQuickPerson({ name: '', role: '', phone: '', affinity: '0' });
      alert('인물이 등록되었습니다.');
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    addExternalEvent({
        id: `sched-${Date.now()}`, title: schedTitle, date: schedDate, time: schedTime, location: schedLocation, source: schedSource,
        type: schedType, courseId: schedCourseId, personId: schedPersonId
    });
    localStorage.removeItem('GM_DRAFT_SCHED');
    setTimeout(() => { setIsSubmitting(false); alert('일정 등록 완료'); }, 500);
  };

  // --- AI Analysis Logic ---
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSelectedFiles(Array.from(e.target.files));
      }
  };

  const startAnalysis = async () => {
      if (selectedFiles.length === 0) return;
      setIsAnalyzing(true);
      setAnalysisResults([]);

      try {
          // Prepare data for Gemini Service
          const inputData = await Promise.all(selectedFiles.map(async (file) => {
              return new Promise<{ base64Data: string, mimeType: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      const result = e.target?.result as string;
                      resolve({
                          base64Data: result.split(',')[1],
                          mimeType: file.type
                      });
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
              });
          }));

          const existingNames = globalCourses.map(c => c.name);
          const results = await analyzeDocument(inputData, existingNames);
          
          if (results) {
              setAnalysisResults(results);
          }
      } catch (error: any) {
          alert(`분석 중 오류 발생: ${error.message}`);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const saveAnalyzedItem = (idx: number, item: any) => {
      const existingCourse = globalCourses.find(c => c.name === item.courseName);
      
      if (!existingCourse) {
          alert(`'${item.courseName}' 골프장이 시스템에 없습니다. 먼저 '골프장 신규 등록' 버튼을 눌러 등록해주세요.`);
          return;
      }

      const integratedContent = `
[AI 핵심 요약]
${item.brief_summary}

[상세 분석 내용]
${item.detailed_content}

[전략 분석]
- 주요 이슈: ${item.strategic_analysis?.issues?.join(', ') || '없음'}
- 기회 요인: ${item.strategic_analysis?.opportunities?.join(', ') || '없음'}
      `.trim();

      addLog({
          id: `ai-log-${Date.now()}-${idx}`,
          author: 'AI Assistant',
          department: item.department as Department || Department.SALES,
          courseId: existingCourse.id,
          courseName: item.courseName,
          title: item.title,
          content: integratedContent,
          tags: item.tags || [],
          contactPerson: item.contact_person || '',
          date: item.date,
          createdAt: Date.now(),
          updatedAt: Date.now()
      });

      setProcessedIndices(prev => new Set(prev).add(idx));
  };

  // --- Bulk Handlers ---
  const handleBulkRegisterCourses = async () => {
    const newItems = analysisResults.filter((item, idx) => 
        !processedIndices.has(idx) && !globalCourses.some(c => c.name === item.courseName)
    );

    if (newItems.length === 0) return;

    if (window.confirm(`분석 결과에서 발견된 ${newItems.length}개의 신규 골프장을 일괄 등록하시겠습니까?`)) {
        newItems.forEach(item => {
            const detectedRegion = mapRegion(item.course_info?.region || item.course_info?.address);
            addCourse({
                id: `c-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                name: item.courseName,
                region: detectedRegion,
                address: item.course_info?.address || '',
                holes: item.course_info?.holes || 18,
                type: item.course_info?.type?.includes('회원') ? CourseType.MEMBER : CourseType.PUBLIC,
                grassType: GrassType.ZOYSIA,
                area: item.course_info?.area || '',
                description: item.description || 'AI 일괄 등록됨',
                openYear: item.course_info?.openYear || new Date().getFullYear().toString()
            });
        });
        alert('신규 골프장 일괄 등록이 완료되었습니다.');
    }
  };

  const handleBulkSaveLogs = () => {
    const pendingLogs = analysisResults.filter((item, idx) => 
        !processedIndices.has(idx) && globalCourses.some(c => c.name === item.courseName)
    );

    if (pendingLogs.length === 0) return;

    if (window.confirm(`${pendingLogs.length}개의 업무 일지를 일괄 저장하시겠습니까?`)) {
        pendingLogs.forEach((item, idx) => {
            saveAnalyzedItem(analysisResults.indexOf(item), item);
        });
        alert('업무 일지 일괄 저장이 완료되었습니다.');
    }
  };

  const mapRegion = (input: string): Region => {
      if (!input) return '경기';
      const clean = input.trim().replace(/\s/g, '').replace(/[시도]$/, '');
      const strictMatch = regions.find(r => r === clean);
      if (strictMatch) return strictMatch;
      const partialMatch = regions.find(r => clean.includes(r));
      if (partialMatch) return partialMatch;
      return '경기';
  };

  const openNewCourseModal = (item: any) => {
      const detectedRegion = mapRegion(item.course_info?.region || item.course_info?.address);
      setNewCourse({
          name: item.courseName,
          region: detectedRegion,
          address: item.course_info?.address || '',
          holes: item.course_info?.holes || 18,
          type: item.course_info?.type?.includes('회원') ? CourseType.MEMBER : CourseType.PUBLIC,
          grassType: GrassType.ZOYSIA,
          area: item.course_info?.area || '',
          description: 'AI 자동 분석을 통해 발견된 신규 골프장입니다.',
          openYear: item.course_info?.openYear || new Date().getFullYear().toString()
      });
      setIsCourseModalOpen(true);
  };

  const getInputClass = (key: string) => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 border-slate-200`;
  const getSelectClass = (key: string) => `w-full rounded-xl border py-3 px-4 transition-all outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 appearance-none bg-white border-slate-200`;

  return (
    <div className="space-y-6 relative max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Draft Recovery Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
               <div className="bg-brand-50 p-6 flex flex-col items-center justify-center border-b border-brand-100">
                   <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                       <History size={32} className="text-brand-600"/>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800">작성 중인 초안 발견</h3>
                   <p className="text-sm text-slate-500 mt-1 text-center">이전에 작성하던 내용이 저장되어 있습니다.<br/>계속 작성하시겠습니까?</p>
               </div>
               <div className="p-4 grid grid-cols-2 gap-3">
                   <button onClick={discardDrafts} className="py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center">
                       <Trash2 size={18} className="mr-2"/> 폐기
                   </button>
                   <button onClick={loadDrafts} className="py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-lg flex items-center justify-center">
                       <RotateCcw size={18} className="mr-2"/> 불러오기
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* Tabs */}
      {!editingLog && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-x-auto no-scrollbar">
            {[
                { id: 'LOG', label: '수기 작성', icon: <FileText size={18}/> },
                { id: 'AI', label: 'AI 스마트 업로드', icon: <Sparkles size={18}/> },
                { id: 'PERSON', label: '인물 등록', icon: <UserPlus size={18}/> },
                { id: 'SCHEDULE', label: '일정 등록', icon: <CalendarPlus size={18}/> }
            ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
            ))}
          </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 relative min-h-[500px]">
            
            {/* AI SMART UPLOAD TAB */}
            {activeTab === 'AI' && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3"><Sparkles size={32} /></div>
                        <h2 className="text-xl font-bold text-slate-900">AI 지능형 데이터 일괄 등록</h2>
                        <p className="text-sm text-slate-500 mt-1">골프장 목록이나 업무 보고서(PDF, Excel 캡처)를 업로드하면 AI가 신규 골프장 마스터 정보와 업무 일지를 자동으로 추출합니다.</p>
                        <p className="text-xs text-indigo-500 mt-2 font-bold">* 대량의 데이터도 한 번에 분석하여 시스템에 반영할 수 있습니다.</p>
                    </div>

                    {!isAnalyzing && analysisResults.length === 0 && (
                        <div 
                            className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-indigo-500 hover:bg-indigo-50/10 transition-all cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                            <UploadCloud size={48} className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-4 transition-colors" />
                            <p className="font-bold text-slate-700">클릭하여 파일 업로드 (PDF, 이미지 지원)</p>
                            <p className="text-xs text-slate-400 mt-1">엑셀 파일은 표 캡처 이미지로 업로드하시면 정확도가 높습니다.</p>
                            
                            {selectedFiles.length > 0 && (
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    {selectedFiles.map((f, i) => (
                                        <div key={i} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center shadow-sm">
                                            {f.type.includes('pdf') ? <FileText size={12} className="mr-1 text-red-500"/> : <FileIcon size={12} className="mr-1 text-indigo-600"/>}
                                            {f.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedFiles.length > 0 && !isAnalyzing && analysisResults.length === 0 && (
                        <button 
                            onClick={startAnalysis}
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg flex justify-center items-center"
                        >
                            <Sparkles size={20} className="mr-2" /> 분석 및 일괄 추출 시작 ({selectedFiles.length}개 파일)
                        </button>
                    )}

                    {isAnalyzing && (
                        <div className="py-20 text-center">
                            <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-slate-800">AI가 문서를 심층 분석 중입니다...</h3>
                            <p className="text-slate-500 text-sm">골프장 마스터 정보 및 업무 내역 추출 중</p>
                        </div>
                    )}

                    {analysisResults.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 flex items-center"><CheckCircle size={18} className="text-green-500 mr-2"/> 추출 데이터 ({analysisResults.length}건)</h3>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={handleBulkRegisterCourses}
                                        className="flex-1 sm:flex-none px-3 py-2 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 shadow-sm flex items-center justify-center transition-all"
                                    >
                                        <Building2 size={14} className="mr-1.5"/> 신규 골프장 일괄 등록
                                    </button>
                                    <button 
                                        onClick={handleBulkSaveLogs}
                                        className="flex-1 sm:flex-none px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center justify-center transition-all"
                                    >
                                        <Save size={14} className="mr-1.5"/> 일지 일괄 저장
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {analysisResults.map((item, idx) => {
                                    const isProcessed = processedIndices.has(idx);
                                    const existsInSystem = globalCourses.some(c => c.name === item.courseName);
                                    const isNewCourse = !existsInSystem;

                                    return (
                                        <div key={idx} className={`border rounded-xl p-6 transition-all ${isProcessed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-indigo-100 shadow-sm hover:shadow-md'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{item.date}</span>
                                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded">{item.department}</span>
                                                    
                                                    {isNewCourse && !isProcessed && (
                                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded flex items-center border border-yellow-200 uppercase tracking-tighter">
                                                            <AlertOctagon size={10} className="mr-1"/> New Course Identified
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {!isProcessed && (
                                                    <div className="flex gap-2">
                                                        {isNewCourse ? (
                                                            <button onClick={() => openNewCourseModal(item)} className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors" title="골프장 등록">
                                                                <Database size={16}/>
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => saveAnalyzedItem(idx, item)} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors" title="일지 저장">
                                                                <Save size={16}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {isProcessed && <span className="text-green-600 text-xs font-bold flex items-center"><CheckCircle size={14} className="mr-1"/> 처리됨</span>}
                                            </div>
                                            
                                            <h4 className="font-bold text-slate-900 text-base mb-3">
                                                {item.courseName} <span className="text-slate-300 mx-1">|</span> {item.title}
                                            </h4>

                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{item.brief_summary}</p>
                                            </div>

                                            {isNewCourse && item.course_info && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-yellow-50/30 p-3 rounded-lg border border-yellow-100">
                                                    <div className="text-[10px]"><span className="text-slate-400 block">지역</span><span className="font-bold text-slate-700">{item.course_info.region}</span></div>
                                                    <div className="text-[10px]"><span className="text-slate-400 block">홀수</span><span className="font-bold text-slate-700">{item.course_info.holes}H</span></div>
                                                    <div className="text-[10px]"><span className="text-slate-400 block">주소</span><span className="font-bold text-slate-700 truncate block">{item.course_info.address}</span></div>
                                                    <div className="text-[10px]"><span className="text-slate-400 block">구분</span><span className="font-bold text-slate-700">{item.course_info.type}</span></div>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-1">
                                                {item.tags?.map((tag: string, i: number) => (
                                                    <span key={i} className="text-[9px] bg-white text-slate-400 px-1.5 py-0.5 rounded border border-slate-100">#{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MANUAL LOG TAB */}
            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><FileText className="mr-2 text-slate-400"/> 업무 일지 작성 (수기)</h3>
                    
                    {/* Date & Dept */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">날짜</label>
                            <input type="date" required className={getInputClass('date')} value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">부서</label>
                            <div className="relative">
                                <select className={getSelectClass('department')} value={dept} onChange={(e) => setDept(e.target.value)}>
                                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16}/>
                            </div>
                        </div>
                    </div>

                    {/* Course Selection */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">골프장</label>
                        <button type="button" onClick={() => {
                            setNewCourse({ name: '', region: '경기', address: '', holes: 18, type: CourseType.PUBLIC, grassType: GrassType.ZOYSIA, area: '', length: '', description: '' });
                            setIsCourseModalOpen(true);
                        }} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold hover:bg-brand-100 transition-colors">+ 신규 등록</button>
                      </div>
                      <div className="relative">
                        <select className={getSelectClass('courseId')} value={courseId} onChange={(e) => {
                            setCourseId(e.target.value);
                            setContactPerson(''); // Reset contact when course changes
                        }} required>
                            <option value="">선택하세요</option>
                            {globalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16}/>
                      </div>
                    </div>

                    {/* Contact Person */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">관련 인물 (선택)</label>
                            <button 
                                type="button" 
                                onClick={() => setIsQuickPersonModalOpen(true)}
                                disabled={!courseId}
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200 transition-colors flex items-center disabled:opacity-50"
                            >
                                <UserPlus size={10} className="mr-1"/> 간편 인물 등록
                            </button>
                        </div>
                        <div className="relative">
                            <input 
                                list="people-list" 
                                className={getInputClass('contactPerson')} 
                                value={contactPerson} 
                                onChange={(e) => setContactPerson(e.target.value)} 
                                placeholder={courseId ? "골프장 관련 인물 검색 또는 직접 입력" : "골프장을 먼저 선택하세요"}
                                disabled={!courseId}
                            />
                            <datalist id="people-list">
                                {filteredPeopleForLog.map(p => (
                                    <option key={p.id} value={p.name}>{p.currentRole}</option>
                                ))}
                            </datalist>
                            <User className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16}/>
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">제목</label>
                        <input type="text" required className={getInputClass('title')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 요약 제목" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">상세 내용</label>
                        <textarea required rows={8} className={getInputClass('content')} value={content} onChange={(e) => setContent(e.target.value)} placeholder="상세 업무 내용을 입력하세요." />
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex justify-center items-center active:scale-[0.99]">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 저장하기
                        </button>
                    </div>
                </form>
            )}

            {/* PERSON TAB & SCHEDULE TAB maintained for consistency */}
            {activeTab === 'PERSON' && (
                <form onSubmit={handlePersonSubmit} className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><UserPlus className="mr-2 text-slate-400"/> 인물 등록</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">이름 <span className="text-red-500">*</span></label>
                            <input type="text" required className={getInputClass('personName')} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="홍길동" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">직책</label>
                            <input type="text" className={getInputClass('personRole')} value={personRole} onChange={(e) => setPersonRole(e.target.value)} placeholder="예: 코스팀장" />
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 flex justify-center items-center">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2" />} 인물 저장
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'SCHEDULE' && (
                <form onSubmit={handleScheduleSubmit} className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><CalendarPlus className="mr-2 text-slate-400"/> 일정 등록</h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">일정 제목 <span className="text-red-500">*</span></label>
                        <input type="text" required className={getInputClass('schedTitle')} value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} placeholder="미팅, 공사 일정 등" />
                    </div>
                    <div className="pt-6 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 flex justify-center items-center">
                             {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CalendarPlus className="mr-2" />} 일정 저장
                        </button>
                    </div>
                </form>
            )}
      </div>

      {/* Quick Person Modal maintained */}
      {isQuickPersonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
             <div className="flex justify-between items-center mb-4 border-b pb-3">
                 <h3 className="font-bold text-lg flex items-center"><UserPlus size={18} className="mr-2 text-brand-600"/>간편 인물 등록</h3>
                 <button onClick={() => setIsQuickPersonModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
             </div>
             <div className="space-y-4">
                 <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">이름 <span className="text-red-500">*</span></label>
                     <input type="text" className="w-full border rounded-lg p-2" value={quickPerson.name} onChange={(e) => setQuickPerson({...quickPerson, name: e.target.value})} placeholder="홍길동" autoFocus />
                 </div>
                 <div className="flex justify-end space-x-2 mt-6 pt-3 border-t border-slate-100">
                     <button onClick={() => setIsQuickPersonModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">취소</button>
                     <button onClick={handleQuickPersonSubmit} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-brand-700">등록 완료</button>
                 </div>
             </div>
          </div>
        </div>
      )}

      {/* Course Modal (Preserved & Enhanced for Bulk Registration Support) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="font-bold text-lg flex items-center">
                     <Building2 size={20} className="mr-2 text-brand-600"/>
                     신규 골프장 등록
                 </h3>
                 <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
             </div>
             <div className="space-y-4">
                 <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">골프장 이름</label>
                     <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-brand-500 border-slate-200" value={newCourse.name} onChange={(e) => handleCourseChange('name', e.target.value)} placeholder="예: 그린마스터 CC" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">지역</label>
                        <select className="w-full border rounded-lg p-2.5 bg-white border-slate-200" value={newCourse.region} onChange={(e) => handleCourseChange('region', e.target.value as Region)}>
                            {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">홀 수</label>
                        <input type="number" className="w-full border rounded-lg p-2.5 focus:ring-brand-500 border-slate-200" value={newCourse.holes} onChange={(e) => handleCourseChange('holes', parseInt(e.target.value))} />
                    </div>
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">상세 주소</label>
                     <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-brand-500 border-slate-200" value={newCourse.address} onChange={(e) => handleCourseChange('address', e.target.value)} placeholder="도로명 주소 등" />
                 </div>
                 <div className="flex justify-end space-x-2 mt-8 pt-4 border-t border-slate-100">
                     <button onClick={() => setIsCourseModalOpen(false)} className="px-5 py-2.5 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">취소</button>
                     <button onClick={handleSaveNewCourse} className="px-8 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-brand-700 transition-all flex items-center">
                         <CheckCircle size={18} className="mr-2"/> 등록 완료
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
