
import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, UserStatus, Department, UserProfile, SystemLog, GolfCourse, CourseType, GrassType, Region } from '../types';
import { Users, UserPlus, CheckCircle, XCircle, Shield, AlertTriangle, Search, Activity, Ban, RotateCcw, Lock, Unlock, FileText, Siren, X, ChevronDown, Briefcase, List, Calendar, BarChart2, TrendingUp, Clock, Database, Sparkles, Loader2, Upload, BookOpen, MapPin, Zap, Lightbulb, Save, Edit2, Check, AlertCircle, FileUp, Building2, Key, Mail, User as UserIcon, Filter, Info, ChevronRight, FileSearch, ArrowUpDown, CheckSquare, Square, Layers, Merge, Trash2 } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';

interface EnhancedSyncItem {
    id: string;
    original: any;
    editable: {
        courseName: string;
        region: Region;
        address: string;
        holes: number;
        type: string;
        openYear: string;
        description: string;
        issues: string[];
    };
    status: 'pending' | 'success' | 'error';
    conflictType: 'new' | 'update';
    isEditing: boolean;
    error?: string;
}

interface DuplicateGroup {
    key: string;
    courses: GolfCourse[];
    selectedMasterId?: string;
}

type SortField = 'name' | 'region' | 'holes' | 'conflict' | 'status';
type SortDir = 'asc' | 'desc';

const AdminDashboard: React.FC = () => {
  const { user, allUsers, isAdmin, isSeniorOrAdmin, systemLogs, updateUserStatus, updateUserRole, updateUserDepartment, logs, courses, navigate, addCourse, updateCourse, deleteCourse, createUserManually, mergeCourses } = useApp();
  const [activeTab, setActiveTab] = useState<'USERS' | 'LOGS' | 'MASTER' | 'DEDUPLICATION'>('MASTER');

  // Master Catalog Sync State
  const [catalogText, setCatalogText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<EnhancedSyncItem[] | null>(null);
  const [selectedSyncIds, setSelectedSyncIds] = useState<Set<string>>(new Set());
  const [docSummary, setDocSummary] = useState<string | null>(null);
  const [docDetail, setDocDetail] = useState<string | null>(null);
  const [aiReportTab, setAiReportTab] = useState<'SUMMARY' | 'DETAIL'>('SUMMARY');
  
  // Deduplication State
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [editingCourse, setEditingCourse] = useState<GolfCourse | null>(null);

  // Filtering & Sorting States
  const [filterConflict, setFilterConflict] = useState<'ALL' | 'new' | 'update'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'pending' | 'success' | 'error'>('ALL');
  const [masterSearch, setMasterSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: SortField, dir: SortDir }>({ field: 'name', dir: 'asc' });

  const [batchProcessing, setBatchProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Create User State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    department: Department.SALES,
    role: UserRole.INTERMEDIATE
  });

  // Access Control
  React.useEffect(() => {
    if (!isSeniorOrAdmin) {
      alert('접근 권한이 없습니다. 상급자 이상만 접근 가능합니다.');
      navigate('/');
    }
  }, [isSeniorOrAdmin, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSelectedFiles(Array.from(e.target.files));
      }
  };

  const handleCatalogSync = async () => {
      if (!catalogText.trim() && selectedFiles.length === 0) return;
      setIsSyncing(true);
      setSyncResults(null);
      setSelectedSyncIds(new Set());
      setDocSummary(null);
      setDocDetail(null);

      try {
          const inputData: any[] = [];
          
          if (catalogText.trim()) {
              inputData.push({ textData: catalogText });
          }

          if (selectedFiles.length > 0) {
              const fileData = await Promise.all(selectedFiles.map(async (file) => {
                  return new Promise<{ base64Data: string, mimeType: string }>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                          const result = e.target?.result as string;
                          resolve({ base64Data: result.split(',')[1], mimeType: file.type });
                      };
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                  });
              }));
              inputData.push(...fileData);
          }

          const results = await analyzeDocument(inputData, courses.map(c => c.name));
          
          if (results) {
              setDocSummary(results.documentSummary);
              setDocDetail(results.documentDetailedReport);

              if (results.extractedCourses) {
                  const enhanced: EnhancedSyncItem[] = results.extractedCourses.map((item: any, idx: number) => {
                      const existing = courses.find(c => c.name === item.name);
                      return {
                          id: `sync-${Date.now()}-${idx}`,
                          original: item,
                          editable: {
                              courseName: item.name,
                              region: (item.region as Region) || '기타',
                              address: item.address || '',
                              holes: item.holes || 18,
                              type: '대중제',
                              openYear: new Date().getFullYear().toString(),
                              description: item.description || '',
                              issues: item.issues || []
                          },
                          status: 'pending',
                          conflictType: existing ? 'update' : 'new',
                          isEditing: false
                      };
                  });
                  setSyncResults(enhanced);
                  // Auto-select all pending items
                  setSelectedSyncIds(new Set(enhanced.map(i => i.id)));
              }
          }
      } catch (error) {
          console.error(error);
          alert('데이터 분석 중 오류가 발생했습니다.');
      } finally {
          setIsSyncing(false);
          setSelectedFiles([]);
      }
  };

  const processedSyncResults = useMemo(() => {
      if (!syncResults) return [];
      
      // 1. Filter
      let filtered = syncResults.filter(item => {
          const matchConflict = filterConflict === 'ALL' || item.conflictType === filterConflict;
          const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
          
          const searchLower = masterSearch.toLowerCase();
          const matchSearch = masterSearch === '' || 
                             item.editable.courseName.toLowerCase().includes(searchLower) ||
                             item.editable.address.toLowerCase().includes(searchLower) ||
                             item.editable.description.toLowerCase().includes(searchLower) ||
                             item.editable.issues.some(issue => issue.toLowerCase().includes(searchLower));
          
          return matchConflict && matchStatus && matchSearch;
      });

      // 2. Sort
      filtered.sort((a, b) => {
          let valA: any, valB: any;
          switch (sortConfig.field) {
              case 'name': valA = a.editable.courseName; valB = b.editable.courseName; break;
              case 'region': valA = a.editable.region; valB = b.editable.region; break;
              case 'holes': valA = a.editable.holes; valB = b.editable.holes; break;
              case 'conflict': valA = a.conflictType; valB = b.conflictType; break;
              case 'status': valA = a.status; valB = b.status; break;
              default: valA = ''; valB = '';
          }
          
          if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
          return 0;
      });

      return filtered;
  }, [syncResults, filterConflict, filterStatus, masterSearch, sortConfig]);

  const toggleSort = (field: SortField) => {
      setSortConfig(prev => ({
          field,
          dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
      }));
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedSyncIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedSyncIds(newSet);
  };

  const toggleAllSelection = () => {
      if (selectedSyncIds.size === processedSyncResults.length) {
          setSelectedSyncIds(new Set());
      } else {
          setSelectedSyncIds(new Set(processedSyncResults.map(i => i.id)));
      }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdmin) return;
      try {
          await createUserManually({
              name: newUserForm.name,
              email: newUserForm.email,
              department: newUserForm.department,
              role: newUserForm.role
          });
          alert('신규 사용자가 생성되었습니다.');
          setIsCreateModalOpen(false);
          setNewUserForm({ name: '', email: '', password: '', department: Department.SALES, role: UserRole.INTERMEDIATE });
      } catch (err: any) {
          alert(err.message || '사용자 생성에 실패했습니다.');
      }
  };

  const applySyncItem = async (id: string) => {
      const item = syncResults?.find(i => i.id === id);
      if (!item) return;

      try {
          const existing = courses.find(c => c.name === item.editable.courseName);
          
          if (existing) {
              await updateCourse({
                  ...existing,
                  region: item.editable.region,
                  address: item.editable.address,
                  holes: item.editable.holes,
                  description: item.editable.description,
                  type: item.editable.type.includes('회원') ? CourseType.MEMBER : CourseType.PUBLIC,
                  issues: Array.from(new Set([...(existing.issues || []), ...item.editable.issues])).slice(0, 15)
              });
          } else {
              await addCourse({
                  id: `c-auto-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
                  name: item.editable.courseName,
                  region: item.editable.region,
                  holes: item.editable.holes,
                  type: item.editable.type.includes('회원') ? CourseType.MEMBER : CourseType.PUBLIC,
                  address: item.editable.address,
                  openYear: item.editable.openYear,
                  grassType: GrassType.ZOYSIA,
                  area: '정보없음',
                  description: item.editable.description,
                  issues: item.editable.issues
              });
          }

          setSyncResults(prev => prev ? prev.map(i => 
              i.id === id ? { ...i, status: 'success', isEditing: false } : i
          ) : null);
      } catch (err) {
          setSyncResults(prev => prev ? prev.map(i => 
              i.id === id ? { ...i, status: 'error', error: '저장 실패' } : i
          ) : null);
      }
  };

  const handleBulkApply = async () => {
      if (!syncResults) return;
      const itemsToApply = syncResults.filter(i => selectedSyncIds.has(i.id) && i.status !== 'success');
      if (itemsToApply.length === 0) {
          alert('반영할 항목을 선택해주세요.');
          return;
      }

      if (window.confirm(`선택된 ${itemsToApply.length}건의 데이터를 마스터 DB에 일괄 반영하시겠습니까?`)) {
          setBatchProcessing(true);
          for (const item of itemsToApply) {
              await applySyncItem(item.id);
          }
          setBatchProcessing(false);
          alert('일괄 처리가 완료되었습니다.');
      }
  };

  // --- DEDUPLICATION LOGIC ---
  const scanForDuplicates = () => {
      setIsScanningDuplicates(true);
      
      const groups: {[key: string]: GolfCourse[]} = {};
      
      courses.forEach(c => {
          // Normalize name: remove spaces, lowercase, remove common suffixes
          const normalized = c.name.replace(/\s+/g, '')
                                   .replace(/\(주\)|주식회사|cc|gc|countryclub|golfclub|golf|resort|골프장|컨트리클럽|클럽|리조트|&/gi, '')
                                   .toLowerCase();
          
          if (!groups[normalized]) groups[normalized] = [];
          groups[normalized].push(c);
      });

      const duplicates = Object.entries(groups)
          .filter(([_, group]) => group.length > 1)
          .map(([key, group]) => ({
              key,
              courses: group,
              selectedMasterId: group[0].id // Default to first
          }));
      
      setDuplicateGroups(duplicates);
      setIsScanningDuplicates(false);
  };

  const handleMergeGroup = async (group: DuplicateGroup) => {
      if (!group.selectedMasterId) return;
      const sources = group.courses.filter(c => c.id !== group.selectedMasterId).map(c => c.id);
      
      if (window.confirm(`'${group.courses.find(c => c.id === group.selectedMasterId)?.name}'을(를) 기준으로 나머지 ${sources.length}건을 병합하시겠습니까? \n병합 후 나머지 항목은 삭제됩니다.`)) {
          await mergeCourses(group.selectedMasterId, sources);
          // Wait slightly for context update then rescan
          setTimeout(scanForDuplicates, 1000);
      }
  };

  const handleDeleteFromGroup = async (id: string) => {
      if (window.confirm('정말 이 골프장 데이터를 영구 삭제하시겠습니까?')) {
          await deleteCourse(id);
          // Update local state immediately for UI responsiveness
          setDuplicateGroups(prev => prev.map(group => ({
              ...group,
              courses: group.courses.filter(c => c.id !== id)
          })).filter(group => group.courses.length > 1));
      }
  };

  const handleSaveEditedCourse = async () => {
      if (!editingCourse) return;
      await updateCourse(editingCourse);
      setEditingCourse(null);
      setTimeout(scanForDuplicates, 500);
  };

  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

  if (!user || !isSeniorOrAdmin) return null;

  const SortIcon = ({ field }: { field: SortField }) => {
      if (sortConfig.field !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
      return <ArrowUpDown size={12} className={`ml-1 text-brand-600 ${sortConfig.dir === 'desc' ? 'rotate-180' : ''}`} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <Shield className="mr-3 text-brand-700" size={28} /> 
                인텔리전스 마스터 관리
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-10">데이터 정합성 관리 및 {isAdmin ? '사용자 권한 통제' : '업무 로그 감사'}를 수행합니다.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl mt-4 md:mt-0 shadow-inner overflow-x-auto no-scrollbar">
             <button onClick={() => setActiveTab('MASTER')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'MASTER' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Database size={16} className="mr-2"/> 데이터 동기화
             </button>
             <button onClick={() => setActiveTab('DEDUPLICATION')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'DEDUPLICATION' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Layers size={16} className="mr-2"/> 중복 통합 관리
             </button>
             {isAdmin && (
                <button onClick={() => setActiveTab('USERS')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'USERS' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Users size={16} className="mr-2"/> 사용자 계정
                </button>
             )}
             <button onClick={() => setActiveTab('LOGS')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'LOGS' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <List size={16} className="mr-2"/> 감사 로그
             </button>
        </div>
      </div>

      {activeTab === 'MASTER' && (
          <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={200} /></div>
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center">
                        <div className="inline-flex items-center space-x-2 bg-brand-500/20 px-3 py-1 rounded-full text-brand-300 text-xs font-bold mb-4 w-fit border border-brand-500/30">
                            <Zap size={12}/>
                            <span>Mass Data Ingestion</span>
                        </div>
                        <h2 className="text-3xl font-black mb-3 tracking-tight">전국 골프장 지능형 데이터 동기화</h2>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            보고서, PDF, 또는 텍스트 목록을 입력하세요. <br/>
                            AI가 명칭, 지역, 홀수 정보를 자동 추출하여 시스템 DB와 대조합니다.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition-all active:scale-95 border border-slate-700"
                            >
                                <FileUp size={20} className="mr-2"/> 파일 선택
                                <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
                            </button>
                            <button 
                                onClick={handleCatalogSync}
                                disabled={isSyncing || (!catalogText.trim() && selectedFiles.length === 0)}
                                className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-500 transition-all flex items-center disabled:opacity-50 shadow-lg active:scale-95"
                            >
                                {isSyncing ? <Loader2 size={20} className="animate-spin mr-3"/> : <BookOpen size={20} className="mr-3"/>}
                                AI 분석 시작
                            </button>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                          <textarea 
                             className="w-full bg-transparent border-none focus:ring-0 text-slate-100 text-sm h-48 custom-scrollbar placeholder:text-slate-600 font-mono"
                             placeholder="텍스트 목록을 여기에 붙여넣으세요..."
                             value={catalogText}
                             onChange={(e) => setCatalogText(e.target.value)}
                          />
                      </div>
                  </div>
              </div>

              {/* AI Report Section */}
              {(docSummary || docDetail) && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4">
                      <div className="flex border-b border-slate-100">
                          <button 
                            onClick={() => setAiReportTab('SUMMARY')}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${aiReportTab === 'SUMMARY' ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <Zap size={16} className="mr-2"/> 핵심 요약 (Concise Summary)
                          </button>
                          <button 
                            onClick={() => setAiReportTab('DETAIL')}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${aiReportTab === 'DETAIL' ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <FileSearch size={16} className="mr-2"/> 상세 전략 보고서 (Detailed Report)
                          </button>
                      </div>
                      <div className="p-8">
                          {aiReportTab === 'SUMMARY' ? (
                              <div className="animate-in fade-in duration-300">
                                  <div className="flex items-start gap-4">
                                      <div className="p-3 bg-brand-100 text-brand-600 rounded-2xl shrink-0"><Lightbulb size={24}/></div>
                                      <p className="text-slate-700 text-lg font-medium leading-relaxed italic">"{docSummary}"</p>
                                  </div>
                              </div>
                          ) : (
                              <div className="animate-in fade-in duration-300">
                                  <div className="prose prose-slate max-w-none">
                                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner text-slate-800 text-sm leading-loose whitespace-pre-line font-medium">
                                          {docDetail}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {syncResults && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-top-4">
                      <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex items-center gap-4">
                                  <h3 className="font-bold text-slate-800 text-lg flex items-center">
                                      <Activity size={20} className="mr-2 text-brand-600"/>
                                      데이터 동기화 큐 ({processedSyncResults.length} / {syncResults.length}건)
                                  </h3>
                                  <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-black">{selectedSyncIds.size}건 선택됨</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <button onClick={() => { setSyncResults(null); setDocSummary(null); setDocDetail(null); setSelectedSyncIds(new Set()); }} className="px-4 py-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors">Discard All</button>
                                  <button 
                                    onClick={handleBulkApply}
                                    disabled={batchProcessing || selectedSyncIds.size === 0}
                                    className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md flex items-center transition-all disabled:opacity-50"
                                  >
                                      {batchProcessing ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                                      선택 항목 일괄 반영
                                  </button>
                              </div>
                          </div>

                          {/* Advanced Filters for Master Sync */}
                          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Filter size={14} className="mr-1.5"/> Conflict Type</span>
                                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                      {[
                                          {id: 'ALL', label: '전체'},
                                          {id: 'new', label: '신규'},
                                          {id: 'update', label: '기존'}
                                      ].map(t => (
                                          <button key={t.id} onClick={() => setFilterConflict(t.id as any)} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all uppercase ${filterConflict === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{t.label}</button>
                                      ))}
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><CheckCircle size={14} className="mr-1.5"/> Sync Status</span>
                                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                      {[
                                          {id: 'ALL', label: '전체'},
                                          {id: 'pending', label: '대기'},
                                          {id: 'success', label: '성공'},
                                          {id: 'error', label: '오류'}
                                      ].map(s => (
                                          <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all uppercase ${filterStatus === s.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{s.label}</button>
                                      ))}
                                  </div>
                              </div>
                              <div className="flex-1 min-w-[250px] relative">
                                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                                  <input 
                                    type="text" 
                                    placeholder="명칭, 설명, 이슈 키워드 통합 검색..." 
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/5 transition-all"
                                    value={masterSearch}
                                    onChange={(e) => setMasterSearch(e.target.value)}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                          <table className="w-full text-sm text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-20">
                                  <tr>
                                      <th className="px-4 py-4 w-12 text-center">
                                          <button onClick={toggleAllSelection} className="text-brand-600 hover:scale-110 transition-transform">
                                              {selectedSyncIds.size === processedSyncResults.length && processedSyncResults.length > 0 ? <CheckSquare size={20}/> : <Square size={20} className="text-slate-300"/>}
                                          </button>
                                      </th>
                                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => toggleSort('status')}>
                                          <div className="flex items-center">상태 <SortIcon field="status"/></div>
                                      </th>
                                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => toggleSort('name')}>
                                          <div className="flex items-center">골프장 명칭 <SortIcon field="name"/></div>
                                      </th>
                                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => toggleSort('region')}>
                                          <div className="flex items-center">지역/주소 <SortIcon field="region"/></div>
                                      </th>
                                      <th className="px-6 py-4">추출된 특징 및 이슈</th>
                                      <th className="px-6 py-4 text-right">관리</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {processedSyncResults.map((item) => (
                                      <tr key={item.id} className={`transition-all ${item.status === 'success' ? 'bg-green-50/30 opacity-70' : 'hover:bg-slate-50'} ${selectedSyncIds.has(item.id) ? 'bg-brand-50/20' : ''}`}>
                                          <td className="px-4 py-4 text-center">
                                              {item.status !== 'success' && (
                                                  <button onClick={() => toggleSelection(item.id)} className="text-brand-600 hover:scale-110 transition-transform">
                                                      {selectedSyncIds.has(item.id) ? <CheckSquare size={20}/> : <Square size={20} className="text-slate-300"/>}
                                                  </button>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              {item.status === 'success' ? (
                                                  <span className="text-green-600 font-black text-[10px] flex items-center uppercase"><CheckCircle size={14} className="mr-1.5"/> Completed</span>
                                              ) : item.status === 'error' ? (
                                                  <span className="text-red-600 font-black text-[10px] flex items-center uppercase"><AlertTriangle size={14} className="mr-1.5"/> {item.error || 'Failed'}</span>
                                              ) : (
                                                  <span className={`text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider ${item.conflictType === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {item.conflictType === 'update' ? 'UPDATE' : 'NEW'}
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="font-black text-slate-900">{item.editable.courseName}</div>
                                              <div className="text-[10px] text-slate-400 font-bold">{item.editable.holes}H / {item.editable.type}</div>
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-slate-600 text-xs">{item.editable.region}</div>
                                              <div className="text-[10px] text-slate-400 max-w-[200px] truncate" title={item.editable.address}>{item.editable.address}</div>
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="flex flex-wrap gap-1.5">
                                                  {item.editable.issues.slice(0, 2).map((issue, idx) => (
                                                      <span key={idx} className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded border border-slate-200 font-medium">{issue}</span>
                                                  ))}
                                                  {item.editable.issues.length > 2 && <span className="text-[9px] text-slate-400 font-bold">+{item.editable.issues.length - 2}</span>}
                                                  {item.editable.description && (
                                                      <div className="w-full mt-1 text-[10px] text-slate-500 italic truncate max-w-[300px]">
                                                          {item.editable.description}
                                                      </div>
                                                  )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {item.status !== 'success' && (
                                                  <button 
                                                      onClick={() => applySyncItem(item.id)}
                                                      className="bg-brand-600 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-brand-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ml-auto"
                                                  >
                                                      <Check size={14}/> 반영
                                                  </button>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                                  {processedSyncResults.length === 0 && (
                                      <tr>
                                          <td colSpan={6} className="py-24 text-center">
                                              <Search size={48} className="mx-auto text-slate-200 mb-4"/>
                                              <p className="text-slate-400 font-bold">검색 조건에 일치하는 추출 결과가 없습니다.</p>
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Deduplication Tab */}
      {activeTab === 'DEDUPLICATION' && (
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                          <h2 className="text-xl font-bold text-slate-900 flex items-center mb-2">
                              <Layers size={24} className="mr-2 text-brand-600"/> 중복 골프장 자동 탐지 및 통합
                          </h2>
                          <p className="text-slate-500 text-sm">유사한 이름을 가진 골프장을 그룹핑하여 하나로 병합합니다. (예: '태광CC'와 '태광 컨트리클럽')</p>
                      </div>
                      <button 
                          onClick={scanForDuplicates} 
                          disabled={isScanningDuplicates}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center disabled:opacity-70 active:scale-95"
                      >
                          {isScanningDuplicates ? <Loader2 size={18} className="animate-spin mr-2"/> : <Search size={18} className="mr-2"/>}
                          중복 데이터 전체 스캔
                      </button>
                  </div>
              </div>

              {duplicateGroups.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                      {duplicateGroups.map((group) => (
                          <div key={group.key} className="bg-white border border-brand-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500"></div>
                              <div className="flex justify-between items-center mb-6 pl-4">
                                  <h3 className="font-black text-lg text-slate-800 flex items-center">
                                      <AlertCircle size={18} className="mr-2 text-brand-500"/>
                                      중복 의심 그룹: "{group.key}" ({group.courses.length}건)
                                  </h3>
                                  <button 
                                      onClick={() => handleMergeGroup(group)}
                                      className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center shadow-md active:scale-95"
                                  >
                                      <Merge size={14} className="mr-2"/> 선택한 항목으로 병합 (Merge)
                                  </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                                  {group.courses.map(course => (
                                      <div 
                                          key={course.id} 
                                          onClick={() => {
                                              const newGroups = [...duplicateGroups];
                                              const gIndex = newGroups.findIndex(g => g.key === group.key);
                                              if (gIndex >= 0) {
                                                  newGroups[gIndex].selectedMasterId = course.id;
                                                  setDuplicateGroups(newGroups);
                                              }
                                          }}
                                          className={`border-2 rounded-2xl p-4 cursor-pointer transition-all relative group/card ${group.selectedMasterId === course.id ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-200' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                      >
                                          {group.selectedMasterId === course.id && (
                                              <div className="absolute top-3 right-3 text-brand-600 bg-white rounded-full p-1 shadow-sm"><CheckCircle size={16}/></div>
                                          )}
                                          <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                              {group.selectedMasterId !== course.id && (
                                                  <>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingCourse(course); }} className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 rounded-lg shadow-sm"><Edit2 size={14}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFromGroup(course.id); }} className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-lg shadow-sm"><Trash2 size={14}/></button>
                                                  </>
                                              )}
                                          </div>

                                          <h4 className="font-black text-slate-900 text-sm mb-1">{course.name}</h4>
                                          <p className="text-xs text-slate-500 mb-2">{course.address}</p>
                                          <div className="flex flex-wrap gap-2 mt-3">
                                              <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{course.type}</span>
                                              <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{course.holes}H</span>
                                              <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{course.region}</span>
                                          </div>
                                          {course.issues && course.issues.length > 0 && (
                                              <div className="mt-3 pt-3 border-t border-slate-200/50">
                                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Issues ({course.issues.length})</span>
                                                  <div className="flex gap-1 flex-wrap">
                                                      {course.issues.slice(0,2).map((is, i) => <span key={i} className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded truncate max-w-full">{is}</span>)}
                                                  </div>
                                              </div>
                                          )}
                                          <div className="mt-2 text-[9px] text-slate-400 font-mono text-right">{course.id}</div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  !isScanningDuplicates && (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <CheckCircle size={48} className="mx-auto text-slate-300 mb-4"/>
                          <p className="text-slate-500 font-bold">중복된 골프장 데이터가 발견되지 않았습니다.</p>
                      </div>
                  )
              )}
          </div>
      )}

      {activeTab === 'USERS' && isAdmin && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center"><Users className="mr-2" size={20}/> 사용자 계정 권한 관리 ({allUsers.length})</h3>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-slate-800 transition-all shadow-md active:scale-95"
                  >
                      <UserPlus size={18} className="mr-2"/> 신규 사용자 직접 생성
                  </button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4">사용자</th>
                              <th className="px-6 py-4">부서</th>
                              <th className="px-6 py-4">권한 레벨</th>
                              <th className="px-6 py-4">상태</th>
                              <th className="px-6 py-4 text-right">권한 변경</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {allUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-900">
                                      <div className="flex items-center">
                                          <img src={u.avatar} className="w-8 h-8 rounded-full mr-3 border border-slate-200" alt="avatar" />
                                          <div>
                                              <div>{u.name}</div>
                                              <div className="text-xs font-normal text-slate-400">{u.email}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">{u.department}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                          {u.role.split('(')[0]}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${u.status === 'APPROVED' ? 'bg-green-100 text-green-700' : u.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                          {u.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end space-x-2">
                                          <select 
                                              value={u.role}
                                              onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                              className="text-[10px] font-bold border-slate-300 rounded-lg p-1 px-2 focus:ring-brand-500 bg-white"
                                          >
                                              {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                          </select>
                                          {u.status === 'PENDING' && (
                                              <>
                                                  <button onClick={() => updateUserStatus(u.id, 'APPROVED')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg border border-green-200"><Check size={14}/></button>
                                                  <button onClick={() => updateUserStatus(u.id, 'REJECTED')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"><X size={14}/></button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Admin-Only User Creation Modal */}
      {isCreateModalOpen && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center">
                          <UserPlus className="mr-2 text-brand-600" size={24}/> 신규 사용자 생성 (Admin)
                      </h3>
                      <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleCreateUser} className="p-8 space-y-5">
                      {/* ... existing form fields ... */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">이름</label>
                          <input 
                                required
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                placeholder="성함 입력"
                                value={newUserForm.name}
                                onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">이메일 (ID)</label>
                          <input 
                                required
                                type="email" 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                placeholder="email@greenmaster.com"
                                value={newUserForm.email}
                                onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">부서</label>
                              <select 
                                className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                                value={newUserForm.department}
                                onChange={e => setNewUserForm({...newUserForm, department: e.target.value as Department})}
                              >
                                  {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">권한 (Role)</label>
                              <select 
                                className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white font-bold"
                                value={newUserForm.role}
                                onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                              >
                                  <option value={UserRole.JUNIOR}>Junior</option>
                                  <option value={UserRole.INTERMEDIATE}>Intermediate</option>
                                  <option value={UserRole.SENIOR}>Senior</option>
                                  <option value={UserRole.ADMIN}>Admin</option>
                              </select>
                          </div>
                      </div>
                      <div className="pt-4">
                          <button 
                            type="submit"
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl"
                          >
                              사용자 즉시 생성
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit Course Modal for Duplicates */}
      {editingCourse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center">
                          <Edit2 className="mr-2 text-brand-600" size={20}/> 골프장 정보 수정
                      </h3>
                      <button onClick={() => setEditingCourse(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">골프장 명칭</label>
                          <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none" value={editingCourse.name} onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">지역</label>
                              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-white" value={editingCourse.region} onChange={(e) => setEditingCourse({ ...editingCourse, region: e.target.value as Region })}>
                                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">홀 수</label>
                              <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" value={editingCourse.holes} onChange={(e) => setEditingCourse({ ...editingCourse, holes: parseInt(e.target.value) })} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">주소</label>
                          <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" value={editingCourse.address} onChange={(e) => setEditingCourse({ ...editingCourse, address: e.target.value })} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">유형</label>
                          <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-white" value={editingCourse.type} onChange={(e) => setEditingCourse({ ...editingCourse, type: e.target.value as CourseType })}>
                              <option value={CourseType.MEMBER}>회원제</option>
                              <option value={CourseType.PUBLIC}>대중제</option>
                          </select>
                      </div>
                      <button onClick={handleSaveEditedCourse} className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-md active:scale-95 flex items-center justify-center mt-4">
                          <Check size={18} className="mr-2"/> 변경 사항 저장
                      </button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'LOGS' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800 flex items-center"><List className="mr-2" size={20}/> 시스템 보안 감사 로그 ({systemLogs.length})</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4">일시</th>
                              <th className="px-6 py-4">사용자</th>
                              <th className="px-6 py-4">행위</th>
                              <th className="px-6 py-4">대상</th>
                              <th className="px-6 py-4">상세</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {systemLogs.map(sl => (
                              <tr key={sl.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-slate-400 font-mono">{new Date(sl.timestamp).toLocaleString()}</td>
                                  <td className="px-6 py-4 font-bold">{sl.userName}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-1.5 py-0.5 rounded ${sl.actionType === 'DELETE' ? 'bg-red-50 text-red-600' : sl.actionType === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : sl.actionType === 'UPDATE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{sl.actionType}</span>
                                  </td>
                                  <td className="px-6 py-4">{sl.targetType}: {sl.targetName}</td>
                                  <td className="px-6 py-4 text-slate-500">{sl.details || '-'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
