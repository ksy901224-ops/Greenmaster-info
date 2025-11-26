import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, Users, CheckCircle, AlertCircle, PlusSquare, Zap, AlertTriangle, Clock, Globe, Map, ArrowLeft } from 'lucide-react';
import { analyzeDocument, getCourseDetailsFromAI } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addCourse, courses: globalCourses } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const editingLog = location.state?.log as LogEntry | undefined;
  
  const [activeTab, setActiveTab] = useState<'LOG' | 'PERSON'>('LOG');

  // --- Log Form State ---
  const [dept, setDept] = useState<string>('영업');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [locationData, setLocationData] = useState<{lat: number, lng: number} | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // --- Person Form State ---
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personCourseId, setPersonCourseId] = useState('');
  const [personAffinity, setPersonAffinity] = useState<string>('0');
  const [personNotes, setPersonNotes] = useState('');

  // --- Shared State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  
  // --- Analysis Feedback State ---
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Updated feedback structure for more specific details
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    fields?: { label: string; value: string }[];
    isNewCourse?: boolean;
  } | null>(null);

  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  
  // Pre-fill for Editing
  useEffect(() => {
    if (editingLog) {
      setActiveTab('LOG');
      setTitle(editingLog.title);
      setContent(editingLog.content);
      setDept(editingLog.department);
      setCourseId(editingLog.courseId);
      setTags(editingLog.tags || []);
      // Note: We can't easily pre-fill file or location from existing log unless structured differently, 
      // but this covers the main text content.
    }
  }, [editingLog]);

  // Auto-dismiss success feedback
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 8000); // Dismiss after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  // Dynamic Course List & Modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [newCourse, setNewCourse] = useState<{
    name: string;
    address: string;
    holes: number;
    type: CourseType;
    grassType: GrassType;
  }>({
    name: '',
    address: '',
    holes: 18,
    type: CourseType.PUBLIC,
    grassType: GrassType.ZOYSIA
  });
  
  // Validation State
  const [courseErrors, setCourseErrors] = useState<{name?: string; holes?: string}>({});

  const handleGeoLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocationData({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        alert('현재 위치 정보가 추가되었습니다.');
      }, () => {
        alert('위치 정보를 가져올 수 없습니다.');
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setFileName(e.target.files[0].name);
    }
  };

  const handleAutoFillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset feedback & states
    setFeedback(null);
    setUploadProgress(0);
    setStatusMessage('파일 검증 및 준비 중...');
    setHighlightedFields(new Set());
    
    // 1. Client-side File Type Validation
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    const isMimeValid = file.type ? validTypes.includes(file.type) : true;
    const isExtValid = validExtensions.includes(fileExtension);

    if (!isMimeValid && !isExtValid) {
      setFeedback({
        type: 'error', 
        title: '지원하지 않는 파일 형식',
        message: 'PDF 또는 이미지 파일(JPG, PNG, WEBP, HEIC)만 업로드 가능합니다.'
      });
      e.target.value = '';
      return;
    }

    // 2. Client-side Size Validation (10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
        setFeedback({
            type: 'error',
            title: '파일 크기 초과',
            message: '파일 크기가 10MB를 초과합니다. 더 작은 파일을 업로드해주세요.'
        });
        e.target.value = '';
        return;
    }

    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      let progressInterval: any;

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
           // Upload phase: 0 - 30%
           const percent = Math.round((event.loaded / event.total) * 30);
           setUploadProgress(percent);
           setStatusMessage('파일 업로드 중...');
        }
      };

      reader.onloadend = async () => {
        setUploadProgress(30);
        setStatusMessage('AI 서버로 전송 완료, 분석 시작...');
        const base64String = reader.result as string;
        
        if (!base64String) {
             setFeedback({ type: 'error', title: '읽기 오류', message: '파일을 읽을 수 없습니다.' });
             setIsAnalyzing(false);
             return;
        }
        const base64Data = base64String.split(',')[1];

        // Simulate progress for the API call (Analysis phase: 30 - 90%)
        progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                const increment = prev < 60 ? 5 : prev < 80 ? 2 : 1;
                return prev + increment; 
            });
            setStatusMessage(prev => {
                if (uploadProgress > 70) return '이슈 분석 및 자동 분류 중...';
                if (uploadProgress > 50) return '골프장 정보 및 담당자 확인 중...';
                return 'AI 모델 정밀 분석 진행 중...';
            });
        }, 200);

        try {
          // Pass existing course names for AI Entity Resolution
          const existingCourseNames = globalCourses.map(c => c.name);
          const result = await analyzeDocument(
            base64Data, 
            file.type || 'application/octet-stream',
            existingCourseNames
          );
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          setStatusMessage('데이터 추출 및 분류 완료!');
          
          if (result) {
            const newHighlights = new Set<string>();
            const extractedSummary: {label: string, value: string}[] = [];
            let isNewCourseCreated = false;

            // 1. Title
            if (result.title) {
              setTitle(result.title);
              newHighlights.add('title');
              extractedSummary.push({ label: '제목', value: result.title });
            }

            // 2. Content & Extra Fields
            let enhancedContent = result.content || '';
            const extraDetails = [];
            if (result.project_name) {
                extraDetails.push(`프로젝트명: ${result.project_name}`);
                extractedSummary.push({ label: '프로젝트', value: result.project_name });
            }
            if (result.contact_person) {
                extraDetails.push(`담당자: ${result.contact_person}`);
                extractedSummary.push({ label: '담당자', value: result.contact_person });
            }
            if (result.delivery_date) {
                extraDetails.push(`납품/기한: ${result.delivery_date}`);
                extractedSummary.push({ label: '기한', value: result.delivery_date });
            }
            
            // Add identified key issues to content
            if (result.key_issues && result.key_issues.length > 0) {
                extraDetails.push(`\n[AI 식별 핵심 이슈 및 리스크]\n${result.key_issues.map((issue: string) => `- ${issue}`).join('\n')}`);
                extractedSummary.push({ label: '이슈 분석', value: `${result.key_issues.length}건 식별됨` });
            }

            if (extraDetails.length > 0) {
                enhancedContent += `\n\n[AI 추출 상세 정보]\n${extraDetails.join('\n')}`;
            }

            if (enhancedContent) {
              setContent(enhancedContent);
              newHighlights.add('content');
            }
            
            // 3. Tags
            if (result.tags && result.tags.length > 0) {
                setTags(result.tags);
                newHighlights.add('tags');
                extractedSummary.push({ label: '태그', value: `${result.tags.length}개 (${result.tags.slice(0, 2).join(', ')}...)` });
            }
            
            // 4. Department
            const matchedDept = Object.values(Department).find(d => result.department && result.department.includes(d)) || '영업';
            setDept(matchedDept);
            newHighlights.add('department');
            extractedSummary.push({ label: '부서', value: matchedDept });

            // 5. Course Categorization & Auto Creation Logic
            let courseNameForFeedback = '미지정';
            let targetCourseId = '';
            const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
            
            // Try to find existing course by exact name (since AI now does resolution) OR fuzzy match as fallback
            const matchedCourse = globalCourses.find(c => {
                return normalize(c.name) === normalize(result.courseName || '');
            });

            if (matchedCourse) {
              targetCourseId = matchedCourse.id;
              setCourseId(matchedCourse.id);
              newHighlights.add('courseId');
              courseNameForFeedback = matchedCourse.name;
            } else if (result.courseName && result.courseName !== '미지정') {
              // --- AUTO CREATE NEW COURSE ---
              // If AI returned a name but it wasn't found in globalCourses, it's likely a new one or a variant we didn't catch.
              // The AI prompt now specifically instructs to return new names if not found.
              
              isNewCourseCreated = true;
              const autoCourseId = `auto-course-${Date.now()}`;
              const newAutoCourse: GolfCourse = {
                  id: autoCourseId,
                  name: result.courseName, // Use name from AI
                  address: result.course_info?.address || '주소 정보 없음 (AI 자동생성)',
                  holes: result.course_info?.holes || 18,
                  type: (result.course_info?.type as CourseType) || CourseType.PUBLIC,
                  grassType: GrassType.MIXED, // Default
                  openYear: new Date().getFullYear().toString(),
                  area: '-',
                  description: `AI가 문서 분석 중 자동으로 생성한 골프장입니다. (최초 발견: ${new Date().toLocaleDateString()})`
              };
              
              // Add to global context (Context will handle duplicate checks)
              addCourse(newAutoCourse);
              
              // Select it
              targetCourseId = autoCourseId;
              setCourseId(autoCourseId);
              newHighlights.add('courseId');
              courseNameForFeedback = result.courseName;
              
              extractedSummary.push({ label: '자동등록', value: `${result.courseName} (신규)` });
            }
            
            if (!isNewCourseCreated) {
                extractedSummary.push({ label: '골프장', value: courseNameForFeedback });
            }
            
            setHighlightedFields(newHighlights);

            setFeedback({
                type: 'success', 
                title: isAutoSaveEnabled ? '자동 분류 및 팀 공유 완료' : 'AI 분석 및 자동 입력 성공',
                message: isAutoSaveEnabled 
                   ? `문서가 '${courseNameForFeedback}' 데이터로 자동 분류되어 팀원들과 실시간으로 공유되었습니다.${isNewCourseCreated ? ' (신규 골프장 자동 등록됨)' : ''}` 
                   : `AI가 '${courseNameForFeedback}' 관련 데이터를 추출하여 입력 필드를 채웠습니다.`,
                fields: extractedSummary,
                isNewCourse: isNewCourseCreated
            });

            // --- AUTO SAVE LOGIC (Only if NOT editing an existing log) ---
            if (isAutoSaveEnabled && !editingLog) {
                const newLog: LogEntry = {
                    id: `ai-${Date.now()}`,
                    date: result.date || new Date().toISOString().split('T')[0],
                    author: 'AI 자동등록 (Shared)', 
                    department: matchedDept as Department,
                    courseId: targetCourseId || 'unknown',
                    courseName: courseNameForFeedback || '미지정',
                    title: result.title,
                    content: enhancedContent,
                    tags: result.tags,
                    imageUrls: [] 
                };
                
                addLog(newLog);
            }
            
            // Clear highlights after 15 seconds
            setTimeout(() => setHighlightedFields(new Set()), 15000);
          } else {
            throw new Error('분석 결과가 비어있습니다.');
          }
        } catch (error: any) {
          console.error(error);
          clearInterval(progressInterval);
          setUploadProgress(0);
          
          // More specific error feedback logic based on analyzeDocument errors
          let errorTitle = '분석 실패';
          const msg = error.message || '';
          
          if (msg.includes('파일 크기')) errorTitle = '파일 크기 제한 초과';
          else if (msg.includes('지원하지 않는')) errorTitle = '지원하지 않는 형식';
          else if (msg.includes('API Key') || msg.includes('권한')) errorTitle = '권한/설정 오류';
          else if (msg.includes('안전 정책')) errorTitle = '컨텐츠 정책 위반';
          else if (msg.includes('서버') || msg.includes('500')) errorTitle = '서버 일시적 오류';
          else if (msg.includes('요청이 너무 많아')) errorTitle = '사용량 초과';

          setFeedback({
            type: 'error',
            title: errorTitle,
            message: msg || '문서 분석 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'
          });
        } finally {
          if(progressInterval) clearInterval(progressInterval);
          setIsAnalyzing(false);
          e.target.value = '';
        }
      };

      reader.onerror = () => {
          setFeedback({type: 'error', title: '읽기 오류', message: '파일을 읽는 중 오류가 발생했습니다.'});
          setIsAnalyzing(false);
          e.target.value = '';
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
      setFeedback({type: 'error', title: '시스템 오류', message: '파일 처리 시작 중 오류가 발생했습니다.'});
      e.target.value = '';
    }
  };

  const handleCourseChange = (field: keyof typeof newCourse, value: any) => {
    setNewCourse(prev => ({...prev, [field]: value}));
    // Clear error when user inputs data
    if (field === 'name' || field === 'holes') {
        setCourseErrors(prev => ({...prev, [field]: undefined}));
    }
  };

  const handleAiCourseSearch = async () => {
    if (!newCourse.name) {
      setCourseErrors({ name: '골프장 이름을 먼저 입력해주세요.' });
      return;
    }

    setIsAiSearching(true);
    try {
      const details = await getCourseDetailsFromAI(newCourse.name);
      
      setNewCourse(prev => ({
        ...prev,
        address: details.address || prev.address,
        holes: details.holes || prev.holes,
        type: details.type || prev.type,
        grassType: details.grassType || prev.grassType
      }));
      alert(`AI가 '${newCourse.name}' 정보를 찾아 입력했습니다.`);
    } catch (error) {
      console.error(error);
      alert('AI 검색 중 오류가 발생했습니다. 직접 입력해주세요.');
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleSaveNewCourse = () => {
    // Validation Logic
    const errors: {name?: string; holes?: string} = {};
    if (!newCourse.name.trim()) {
        errors.name = '이름을 입력해주세요';
    }
    if (!newCourse.holes || newCourse.holes < 1) {
        errors.holes = '올바른 홀 수 입력';
    }

    if (Object.keys(errors).length > 0) {
        setCourseErrors(errors);
        return;
    }

    const courseToAdd: GolfCourse = {
      id: `new-${Date.now()}`,
      name: newCourse.name,
      address: newCourse.address || '주소 미입력',
      holes: newCourse.holes,
      type: newCourse.type,
      grassType: newCourse.grassType,
      openYear: new Date().getFullYear().toString(),
      area: '-',
      description: '사용자가 직접 등록한 골프장입니다.'
    };

    addCourse(courseToAdd);
    
    if (activeTab === 'LOG') {
      setCourseId(courseToAdd.id);
    } else {
      setPersonCourseId(courseToAdd.id);
    }

    setIsCourseModalOpen(false);
    setNewCourse({
      name: '',
      address: '',
      holes: 18,
      type: CourseType.PUBLIC,
      grassType: GrassType.ZOYSIA
    });
    setCourseErrors({});
    alert(`${courseToAdd.name} 골프장이 등록되었습니다.`);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedCourse = globalCourses.find(c => c.id === courseId);

    if (editingLog) {
       const updatedLog: LogEntry = {
           ...editingLog,
           department: dept as Department,
           courseId: courseId,
           courseName: selectedCourse?.name || '미지정',
           title: title,
           content: content,
           tags: tags,
       };
       updateLog(updatedLog);
       
       setTimeout(() => {
           setIsSubmitting(false);
           alert('업무 일지가 수정되었습니다.');
           navigate(-1); // Go back
       }, 500);

    } else {
       const newLog: LogEntry = {
           id: `manual-${Date.now()}`,
           date: new Date().toISOString().split('T')[0],
           author: '현재 사용자', // Placeholder
           department: dept as Department,
           courseId: courseId,
           courseName: selectedCourse?.name || '미지정',
           title: title,
           content: content,
           tags: tags,
           // imageUrls would be handled here
       };

       // Save to Shared Context
       addLog(newLog);

       setTimeout(() => {
           setIsSubmitting(false);
           alert('업무 일지가 등록되어 공유되었습니다.');
           // Reset form
           setTitle('');
           setContent('');
           setFileName(null);
           setTags([]);
           setCourseId('');
           setLocationData(null);
           setFeedback(null);
           setHighlightedFields(new Set());
       }, 1000);
    }
  };

  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
        setIsSubmitting(false);
        alert('신규 인물이 등록되었습니다. (데모 버전)');
        setPersonName('');
        setPersonPhone('');
        setPersonRole('');
        setPersonCourseId('');
        setPersonAffinity('0');
        setPersonNotes('');
    }, 1000);
  };

  // Helper functions for granular highlighting with stronger visual cues
  const isFilled = (key: string) => highlightedFields.has(key);
  
  const getInputClass = (key: string) => 
    `w-full rounded-lg border shadow-sm py-2 px-3 transition-all duration-1000 ease-out ${
      isFilled(key) 
        ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
    }`;
  
  const getSelectClass = (key: string) => 
    `w-full rounded-lg border shadow-sm py-2.5 px-3 transition-all duration-1000 ease-out ${
      isFilled(key) 
        ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
    }`;

  return (
    <div className="space-y-6 relative">
      {/* Header with Back Button if editing */}
      {editingLog && (
          <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
                  <ArrowLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-800">일지 수정 모드</h2>
          </div>
      )}

      {/* Tab Navigation (Hide if editing for clarity) */}
      {!editingLog && (
          <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('LOG')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-md transition-all ${
                activeTab === 'LOG' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <FileText className="mr-2" size={18} />
              업무 일지 등록
            </button>
            <button
              onClick={() => setActiveTab('PERSON')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-md transition-all ${
                activeTab === 'PERSON' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="mr-2" size={18} />
              인물 정보 등록
            </button>
          </div>
      )}

      {/* --- Tab 1: Log Registration --- */}
      {activeTab === 'LOG' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* AI Auto-Fill Section (Hide when editing to focus on manual changes) */}
          {!editingLog && (
            <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2 flex items-center">
                <Sparkles className="mr-2 text-yellow-300" size={20} /> 
                AI 스마트 문서 분석 및 공유
              </h2>
              <p className="text-brand-100 text-sm mb-6 opacity-90">
                PDF 보고서나 현장 사진을 올리면 AI가 내용을 분석하여 <strong className="text-white underline decoration-yellow-400 underline-offset-2">골프장별로 자동 분류하고 공유</strong>합니다.
                <br/><span className="text-xs opacity-80 mt-1 inline-block">* 미등록 골프장일 경우 AI가 정보를 파악하여 자동 생성합니다.</span>
              </p>
              
              {/* Enhanced Loading/Progress Indicator */}
              {isAnalyzing && (
                <div className="mb-6 bg-brand-900/50 p-5 rounded-xl border border-brand-500/30 backdrop-blur-md shadow-inner">
                    <div className="flex justify-between text-sm font-bold text-white mb-3">
                        <span className="flex items-center">
                            <Loader2 className="animate-spin mr-2.5 h-4 w-4 text-yellow-400" /> 
                            {statusMessage || '분석 준비 중...'}
                        </span>
                        <span className="text-yellow-400 tabular-nums font-mono text-lg">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-brand-900/50 rounded-full h-3 overflow-hidden border border-white/10">
                        <div 
                            className="bg-gradient-to-r from-brand-400 via-yellow-400 to-brand-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(250,204,21,0.6)] relative animate-shimmer bg-[length:200%_100%]"
                            style={{ width: `${uploadProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-2.5 px-1 text-xs">
                         <span className={`transition-colors ${uploadProgress >= 0 ? 'text-white font-bold' : 'text-brand-400/50'}`}>1. 업로드</span>
                         <span className={`transition-colors ${uploadProgress >= 30 ? 'text-white font-bold' : 'text-brand-400/50'}`}>2. AI 심층 분석</span>
                         <span className={`transition-colors ${uploadProgress >= 90 ? 'text-white font-bold' : 'text-brand-400/50'}`}>3. 분류 및 공유</span>
                    </div>
                </div>
              )}

              {/* Enhanced Feedback & Results Area */}
              {feedback && (
                <div className={`mb-6 p-5 rounded-xl border-l-4 shadow-lg animate-in fade-in slide-in-from-top-4 backdrop-blur-md overflow-hidden relative ${
                    feedback.type === 'success' 
                    ? 'bg-emerald-900/80 border-l-emerald-400 border-y border-r border-emerald-500/30' 
                    : 'bg-rose-900/80 border-l-rose-500 border-y border-r border-rose-500/30'
                }`}>
                    {/* Timer Progress Bar for Auto Dismiss */}
                    {feedback.type === 'success' && (
                      <div className="absolute top-0 left-0 h-1 bg-emerald-400/30 w-full">
                        <div className="h-full bg-emerald-400 animate-[width_8s_linear_forwards] w-full origin-left"></div>
                      </div>
                    )}

                    <div className="flex items-start gap-4 relative z-10">
                        <div className={`p-2.5 rounded-full shrink-0 shadow-sm ${
                            feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                            {feedback.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className={`font-bold text-base mb-1 flex items-center ${feedback.type === 'success' ? 'text-white' : 'text-rose-100'}`}>
                                    {feedback.title}
                                    {isAutoSaveEnabled && feedback.type === 'success' && (
                                        <span className="ml-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center font-normal border border-white/10">
                                            <Globe size={10} className="mr-1" /> Shared
                                        </span>
                                    )}
                                    {feedback.isNewCourse && (
                                        <span className="ml-2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full flex items-center font-bold border border-white/10">
                                            <Map size={10} className="mr-1" /> 신규 골프장 생성
                                        </span>
                                    )}
                                </h4>
                                <button 
                                    onClick={() => setFeedback(null)} 
                                    className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
                                    aria-label="닫기"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className={`text-sm opacity-95 leading-relaxed mb-3 ${feedback.type === 'success' ? 'text-emerald-50' : 'text-rose-50'}`}>
                                {feedback.message}
                            </p>
                            
                            {/* Extracted Fields Visualization - Clearer Success Feedback */}
                            {feedback.fields && (
                                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                                    <h5 className="text-[10px] font-bold text-emerald-300 mb-2 uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center"><Sparkles size={10} className="mr-1" /> 자동 분류 및 입력 항목</span>
                                        <span className="flex items-center text-emerald-400/70 font-normal"><Clock size={10} className="mr-1"/>잠시 후 닫힘</span>
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                        {feedback.fields.map((field, idx) => (
                                            <div key={idx} className="flex items-center space-x-2 text-xs border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                                <span className="text-emerald-100/60 w-16 shrink-0">{field.label}</span>
                                                <span className="text-white font-bold truncate">{field.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                  <label className={`inline-flex items-center justify-center bg-white text-brand-700 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 min-w-[200px] ${isAnalyzing ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin mr-2.5" size={20} />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2.5" size={20} />
                        문서/사진 업로드
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf, .jpg, .jpeg, .png, .webp, .heic, .heif" 
                      className="hidden" 
                      onChange={handleAutoFillUpload}
                      disabled={isAnalyzing}
                    />
                  </label>

                  {/* Auto Save Toggle */}
                  <div className="flex items-center bg-black/20 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-black/30 transition-colors w-full md:w-auto justify-between md:justify-start">
                      <span className="text-sm text-white font-medium flex items-center cursor-pointer select-none mr-3" onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}>
                          <Zap size={16} className={`mr-1.5 ${isAutoSaveEnabled ? 'text-yellow-400' : 'text-slate-400'}`} />
                          자동 분류 및 공유 켜기
                      </span>
                      <button 
                          onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
                          type="button"
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 focus:ring-offset-brand-800 ${isAutoSaveEnabled ? 'bg-yellow-400' : 'bg-slate-600'}`}
                      >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isAutoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                  </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-5 rounded-full pointer-events-none blur-2xl"></div>
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-yellow-400 opacity-10 rounded-full pointer-events-none blur-3xl"></div>
          </div>
          )}

          {/* Main Log Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-colors duration-500 relative">
            <h1 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
              <span className="flex items-center">
                  <FileText className="mr-2 text-slate-400" /> 
                  {editingLog ? '업무 일지 수정' : '수동 일지 작성'}
              </span>
              {highlightedFields.size > 0 && (
                <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full animate-pulse flex items-center shadow-sm border border-yellow-200 ring-1 ring-yellow-300/50">
                  <Sparkles size={12} className="mr-1.5 text-yellow-600" /> AI 자동 입력됨
                </span>
              )}
            </h1>
            
            <form onSubmit={handleLogSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">부서 구분</label>
                      <select 
                          className={getSelectClass('department')}
                          value={dept}
                          onChange={(e) => setDept(e.target.value)}
                      >
                          {Object.values(Department).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                      </select>
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700">골프장 선택</label>
                        <button 
                          type="button"
                          onClick={() => setIsCourseModalOpen(true)}
                          className="text-xs flex items-center text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-md transition-colors"
                        >
                          <Plus size={12} className="mr-1" />
                          신규 추가
                        </button>
                      </div>
                      <select 
                          className={getSelectClass('courseId')}
                          value={courseId}
                          onChange={(e) => setCourseId(e.target.value)}
                          required
                      >
                          <option value="">골프장을 선택하세요</option>
                          {globalCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">제목</label>
                  <input 
                      type="text" 
                      required
                      className={getInputClass('title')}
                      placeholder="예: 00CC 배수공사 견적 제출 건"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">상세 내용</label>
                  <textarea 
                      required
                      rows={6}
                      className={getInputClass('content')}
                      placeholder="업무 내용, 특이사항, 이슈 등을 상세히 기록해주세요."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                  />
              </div>
              
              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">자동 추출된 태그</label>
                  <div className={`flex flex-wrap gap-2 p-3 rounded-lg border border-dashed transition-all duration-700 ${isFilled('tags') ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' : 'bg-slate-50 border-slate-200'}`}>
                    {tags.map((tag, idx) => (
                      <span key={idx} className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${isFilled('tags') ? 'bg-white text-brand-700 border border-brand-100' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                      <Camera className="mx-auto h-8 w-8 text-slate-400 mb-2 group-hover:text-slate-600 transition-colors" />
                      <span className="text-sm text-slate-500 font-medium">{fileName || '현장 사진/추가 파일 첨부'}</span>
                  </div>

                  <button 
                      type="button"
                      onClick={handleGeoLocation}
                      className={`border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors flex flex-col items-center justify-center group ${locationData ? 'bg-green-50 border-green-300' : ''}`}
                  >
                      <MapPin className={`h-8 w-8 mb-2 transition-colors ${locationData ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span className={`text-sm font-medium ${locationData ? 'text-green-700' : 'text-slate-500'}`}>
                          {locationData ? '위치 정보가 포함됨' : '현재 위치 자동 입력'}
                      </span>
                  </button>
              </div>

              <div className="pt-4">
                  <button 
                      type="submit" 
                      disabled={isSubmitting || isAnalyzing}
                      className="w-full flex justify-center items-center bg-brand-600 text-white py-3.5 px-4 rounded-lg hover:bg-brand-700 font-bold shadow-md transition-all disabled:opacity-70 hover:shadow-lg transform active:scale-[0.99]"
                  >
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                      {editingLog ? '수정 내용 저장' : '업무 일지 저장 및 공유'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Tab 2: Person Registration --- */}
      {activeTab === 'PERSON' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in duration-300">
           <h1 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <Users className="mr-2 text-slate-400" />
              신규 인물 등록
           </h1>

           <form onSubmit={handlePersonSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">이름</label>
                   <input 
                      type="text" 
                      required
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                      placeholder="홍길동"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">연락처</label>
                   <input 
                      type="text" 
                      required
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                      placeholder="010-0000-0000"
                      value={personPhone}
                      onChange={(e) => setPersonPhone(e.target.value)}
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-700">소속 골프장</label>
                      <button 
                        type="button"
                        onClick={() => setIsCourseModalOpen(true)}
                        className="text-xs flex items-center text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-md transition-colors"
                      >
                        <Plus size={12} className="mr-1" />
                        신규 추가
                      </button>
                    </div>
                    <select 
                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5"
                        value={personCourseId}
                        onChange={(e) => setPersonCourseId(e.target.value)}
                        required
                    >
                        <option value="">소속을 선택하세요</option>
                        {globalCourses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">직책/직급</label>
                   <input 
                      type="text" 
                      required
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                      placeholder="예: 총지배인, 코스팀장"
                      value={personRole}
                      onChange={(e) => setPersonRole(e.target.value)}
                   />
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">우리 회사와의 관계 (친밀도)</label>
                <div className="flex space-x-2 overflow-x-auto pb-1">
                  {[
                    { val: '2', label: '강력한 아군 (Ally)', color: 'bg-green-100 text-green-800 border-green-200' },
                    { val: '1', label: '우호적 (Friendly)', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { val: '0', label: '중립 (Neutral)', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                    { val: '-1', label: '비우호적 (Unfriendly)', color: 'bg-orange-50 text-orange-700 border-orange-100' },
                    { val: '-2', label: '적대적 (Hostile)', color: 'bg-red-50 text-red-700 border-red-100' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setPersonAffinity(opt.val)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        personAffinity === opt.val 
                          ? `ring-2 ring-offset-1 ring-brand-500 ${opt.color} font-bold` 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">참고 사항 (성향, 특징 등)</label>
                <textarea 
                    rows={4}
                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                    placeholder="예: 경쟁사 제품 선호, 예산 절감 중시, 기술적 조언 선호 등"
                    value={personNotes}
                    onChange={(e) => setPersonNotes(e.target.value)}
                />
             </div>

             <div className="pt-4">
                  <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center bg-brand-600 text-white py-3 px-4 rounded-lg hover:bg-brand-700 font-bold shadow-md transition-all disabled:opacity-70"
                  >
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2" />}
                      인물 정보 등록
                  </button>
              </div>
           </form>
        </div>
      )}

      {/* Shared Add Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center text-lg">
                 <PlusSquare size={20} className="mr-2 text-brand-600"/>
                 신규 골프장 등록
              </h3>
              <button 
                onClick={() => setIsCourseModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Name Field with Validation and AI Search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                    <span>골프장 이름 <span className="text-red-500">*</span></span>
                    {courseErrors.name && <span className="text-red-500 text-xs font-normal flex items-center"><AlertCircle size={10} className="mr-1"/>{courseErrors.name}</span>}
                </label>
                <div className="flex space-x-2">
                    <input 
                      type="text" 
                      className={`flex-1 rounded-lg text-sm py-2.5 px-3 focus:ring-2 focus:ring-offset-0 transition-all ${
                        courseErrors.name 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50' 
                          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                      placeholder="예: 그린밸리 CC"
                      value={newCourse.name}
                      onChange={(e) => handleCourseChange('name', e.target.value)}
                      autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleAiCourseSearch}
                        disabled={isAiSearching || !newCourse.name}
                        className="bg-brand-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                    >
                        {isAiSearching ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} className="mr-1"/>AI 검색</>}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">이름 입력 후 AI 검색을 누르면 정보를 자동으로 채워줍니다.</p>
              </div>
              
              {/* Address Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">주소</label>
                <div className="relative group">
                    <MapPin className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={16} />
                    <input 
                    type="text" 
                    className="w-full pl-10 rounded-lg border-slate-300 text-sm py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                    placeholder="예: 경기도 용인시 처인구..."
                    value={newCourse.address}
                    onChange={(e) => handleCourseChange('address', e.target.value)}
                    />
                </div>
              </div>

              {/* Compact Grid for Details */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">운영 형태</label>
                    <select 
                        className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 py-2.5"
                        value={newCourse.type}
                        onChange={(e) => handleCourseChange('type', e.target.value as CourseType)}
                    >
                        {Object.values(CourseType).map(t => (
                        <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">잔디 종류</label>
                    <select 
                        className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 py-2.5"
                        value={newCourse.grassType}
                        onChange={(e) => handleCourseChange('grassType', e.target.value as GrassType)}
                    >
                        {Object.values(GrassType).map(g => (
                        <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                  </div>
              </div>

              {/* Holes */}
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                    <span>규모 (홀 수)</span>
                    {courseErrors.holes && <span className="text-red-500 text-xs font-normal flex items-center"><AlertCircle size={10} className="mr-1"/>{courseErrors.holes}</span>}
                 </label>
                 <div className="flex items-center gap-2">
                     {[9, 18, 27, 36].map(h => (
                         <button
                           key={h}
                           type="button"
                           onClick={() => handleCourseChange('holes', h)}
                           className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                               newCourse.holes === h 
                               ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500' 
                               : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                           }`}
                         >
                           {h}홀
                         </button>
                     ))}
                     <div className="relative w-20">
                        <input 
                            type="number"
                            className={`w-full rounded-lg text-sm py-2 pl-2 pr-1 text-center focus:ring-2 focus:ring-brand-100 ${
                                courseErrors.holes 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-slate-300 focus:border-brand-500'
                            }`}
                            value={newCourse.holes}
                            onChange={(e) => handleCourseChange('holes', parseInt(e.target.value) || 0)}
                            placeholder="기타"
                        />
                     </div>
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button 
                onClick={() => setIsCourseModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSaveNewCourse}
                className="px-5 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-all shadow-sm hover:shadow-md flex items-center"
              >
                <CheckCircle size={16} className="mr-2" />
                등록 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteLog;