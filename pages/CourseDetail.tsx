
import React, { useState, useEffect, useMemo, useRef } from 'react';
import LogCard from '../components/LogCard';
import { generateCourseSummary, analyzeMaterialInventory, generateCourseRelationshipIntelligence } from '../services/geminiService';
import { Info, FileText, Users, User, Sparkles, History, Edit2, X, CheckCircle, MapPin, Trash2, Globe, Loader2, List, AlertTriangle, Plus, Minus, Lock, Calendar, Ruler, Map, Calculator, ArrowRightLeft, Cloud, Search, ArrowRight, BarChart3, TrendingUp, TrendingDown, Package, Droplets, Sprout, Box, Upload, Camera, Database, DollarSign, PieChart, ClipboardList, Activity, ArrowUpRight, Percent, ArrowDownRight, ChevronDown, ShieldCheck, FileWarning, Target, Lightbulb, UserPlus, UserCheck, UserCog, UserMinus, Trees, ShoppingCart } from 'lucide-react';
import { AffinityLevel, CourseType, GrassType, GolfCourse, FinancialRecord, MaterialRecord, MaterialCategory, UserRole, Region, Person, LogEntry, GolfCoursePerson } from '../types';
import { useApp } from '../contexts/AppContext';

// Utility for smart Korean currency formatting
const formatKRW = (amount: number) => {
    if (amount === 0) return "0원";
    
    // For smaller amounts like unit price, show full number with comma
    if (amount < 1000000) {
        return amount.toLocaleString() + "원";
    }
    
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    const won = amount % 10000;

    let result = "";
    if (eok > 0) result += `${eok.toLocaleString()}억 `;
    if (man > 0) result += `${man.toLocaleString()}만 `;
    if (won > 0 && eok === 0) result += `${won.toLocaleString()}`; 
    
    return result.trim() + "원";
};

const CourseDetail: React.FC = () => {
  const { user, courses, logs, updateCourse, deleteCourse, people, canUseAI, canViewFullData, isAdmin, navigate, routeParams, locationState, financials, materials, addFinancial, updateFinancial, deleteFinancial, addMaterial, updateMaterial, deleteMaterial, updatePerson } = useApp();
  const id = routeParams.id;
  
  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGS' | 'PEOPLE' | 'MANAGEMENT'>('INFO');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<GolfCourse | null>(null);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [isFinModalOpen, setIsFinModalOpen] = useState(false);
  const [editingFin, setEditingFin] = useState<FinancialRecord | null>(null);
  const [finForm, setFinForm] = useState({ year: new Date().getFullYear(), revenue: 0, profit: 0 });
  
  // --- Material State Updates ---
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState<MaterialRecord | null>(null);
  const [matCategory, setMatCategory] = useState<MaterialCategory>(MaterialCategory.PESTICIDE);
  const currentYear = new Date().getFullYear();
  const [matYearFilter, setMatYearFilter] = useState<number>(currentYear);
  const [matForm, setMatForm] = useState({
      supplyDate: new Date().toISOString().split('T')[0],
      category: MaterialCategory.PESTICIDE,
      name: '',
      standard: '',
      quantity: 0,
      unit: '',
      unitPrice: 0,
      manager: '',
      notes: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMat, setIsUploadingMat] = useState(false);
  const [previewMaterials, setPreviewMaterials] = useState<Omit<MaterialRecord, 'id' | 'courseId' | 'lastUpdated'>[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // --- Intelligence States ---
  const [isAnalyzingIntelligence, setIsAnalyzingIntelligence] = useState(false);
  const [intelReport, setIntelReport] = useState<string | null>(null);

  // --- Link Person Modal ---
  const [isLinkPersonModalOpen, setIsLinkPersonModalOpen] = useState(false);
  const [linkPersonSearch, setLinkPersonSearch] = useState('');

  // --- Manager Assignment Modal ---
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');

  // Derived Values via useMemo
  const course = useMemo(() => courses.find(c => c.id === id), [courses, id]);
  
  const manager = useMemo(() => 
    course?.managerId ? people.find(p => p.id === course.managerId) : null
  , [course, people]);

  const relatedLogs = useMemo(() => {
    return logs
      .filter(l => l.courseId === id)
      .filter(l => {
          if (!logSearchTerm) return true;
          const term = logSearchTerm.toLowerCase();
          return (
              l.title.toLowerCase().includes(term) ||
              l.content.toLowerCase().includes(term) ||
              l.tags?.some(t => t.toLowerCase().includes(term))
          );
      });
  }, [logs, id, logSearchTerm]);

  const courseFinancials = useMemo(() => {
      return financials
        .filter(f => f.courseId === id)
        .sort((a, b) => Number(a.year) - Number(b.year)); 
  }, [financials, id]);

  const displayFinancials = useMemo(() => [...courseFinancials].reverse(), [courseFinancials]);

  const financialStats = useMemo(() => {
    if (courseFinancials.length < 1) return null;
    const latest = courseFinancials[courseFinancials.length - 1];
    const previous = courseFinancials.length > 1 ? courseFinancials[courseFinancials.length - 2] : null;
    const growth = previous ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    const margin = latest.profit ? (latest.profit / latest.revenue) * 100 : 0;
    const prevMargin = (previous && previous.profit) ? (previous.profit / previous.revenue) * 100 : 0;
    const marginDiff = previous ? margin - prevMargin : 0;
    return { latest, previous, growth, margin, marginDiff };
  }, [courseFinancials]);

  const courseMaterials = useMemo(() => {
      return materials.filter(m => m.courseId === id);
  }, [materials, id]);

  const availableYears = useMemo(() => {
      const years = new Set(courseMaterials.map(m => new Date(m.supplyDate).getFullYear()));
      years.add(currentYear);
      return Array.from(years).sort((a: number, b: number) => b - a);
  }, [courseMaterials, currentYear]);

  const filteredMaterials = useMemo(() => {
    return courseMaterials
      .filter(m => m.category === matCategory)
      .filter(m => new Date(m.supplyDate).getFullYear() === matYearFilter)
      .sort((a, b) => new Date(b.supplyDate).getTime() - new Date(a.supplyDate).getTime());
  }, [courseMaterials, matCategory, matYearFilter]);

  const currentStaff = useMemo(() => 
    course?.associatedPeople?.filter(p => p.isCurrent) || [], 
    [course]
  );
  
  const formerStaff = useMemo(() => 
    course?.associatedPeople?.filter(p => !p.isCurrent) || [], 
    [course]
  );

  useEffect(() => {
      if (locationState?.filterIssue && canViewFullData) {
          setActiveTab('LOGS');
          setLogSearchTerm(locationState.filterIssue);
      }
  }, [locationState, canViewFullData]);

  if (!course) return <div className="p-8 text-center">골프장을 찾을 수 없습니다.</div>;

  // --- Handlers ---
  const handleAnalyzeIntelligence = async () => {
    if (!course) return;
    setIsAnalyzingIntelligence(true);
    setIntelReport(null);
    const fullCurrentStaff = people.filter(p => p.currentCourseId === id);
    try {
        const report = await generateCourseRelationshipIntelligence(course, fullCurrentStaff, relatedLogs);
        setIntelReport(report);
    } catch (error) {
        alert('분석 중 오류가 발생했습니다.');
    } finally {
        setIsAnalyzingIntelligence(false);
    }
  };

  const handleLinkPerson = async () => {
    const matched = people.find(p => p.name === linkPersonSearch);
    if (!matched) {
        alert('존재하지 않는 인물입니다. 먼저 인물을 등록해 주세요.');
        return;
    }
    if (matched.currentCourseId === id) {
        alert('이미 본 골프장에 소속된 인물입니다.');
        return;
    }
    
    if (window.confirm(`'${matched.name}' 인물을 '${course.name}' 소속으로 변경하시겠습니까?`)) {
        await updatePerson({
            ...matched,
            currentCourseId: id,
            notes: (matched.notes || '') + `\n[소속 변경] ${new Date().toISOString().split('T')[0]} - ${course.name}으로 발령`
        });
        alert('소속 정보가 성공적으로 업데이트되었습니다.');
        setLinkPersonSearch('');
        setIsLinkPersonModalOpen(false);
    }
  };

  const handleAssignManager = async () => {
      const target = people.find(p => p.name === managerSearch);
      if (!target) {
          alert('존재하지 않는 인물입니다. 신규 등록 후 지정해 주세요.');
          return;
      }
      if (window.confirm(`'${target.name}' 님을 ${course.name}의 담당자(Manager)로 지정하시겠습니까?`)) {
          updateCourse({ ...course, managerId: target.id });
          setIsManagerModalOpen(false);
          setManagerSearch('');
      }
  };

  const handleRemoveManager = async () => {
      if (window.confirm('담당자 지정을 해제하시겠습니까?')) {
          updateCourse({ ...course, managerId: undefined });
      }
  };

  const handleDeleteCourse = () => {
    if (window.confirm(`정말로 '${course.name}' 골프장 정보를 영구적으로 삭제하시겠습니까? 관련 재무 및 자재 데이터도 함께 삭제되며, 업무 일지와의 연결이 해제됩니다.`)) {
        deleteCourse(course.id);
        navigate('/courses');
    }
  };

  const handleSaveFinancial = () => {
    if (editingFin) {
        updateFinancial({ ...editingFin, ...finForm, updatedAt: Date.now() });
    } else {
        addFinancial({ id: `fin-${Date.now()}`, courseId: id!, ...finForm, updatedAt: Date.now() });
    }
    setIsFinModalOpen(false);
    setEditingFin(null);
  };

  const handleSaveMaterial = () => {
    if (editingMat) {
        updateMaterial({ ...editingMat, ...matForm, lastUpdated: new Date().toISOString() });
    } else {
        addMaterial({ id: `mat-${Date.now()}`, courseId: id!, ...matForm, lastUpdated: new Date().toISOString() });
    }
    setIsMatModalOpen(false);
    setEditingMat(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingMat(true);
      try {
          const reader = new FileReader();
          reader.onload = async (event) => {
              const base64Data = (event.target?.result as string).split(',')[1];
              const results = await analyzeMaterialInventory({ base64Data, mimeType: file.type });
              setPreviewMaterials(results);
              setIsPreviewModalOpen(true);
          };
          reader.readAsDataURL(file);
      } catch (error) {
          alert('분석 중 오류가 발생했습니다.');
      } finally {
          setIsUploadingMat(false);
      }
  };

  const applyPreviewMaterials = () => {
      previewMaterials.forEach(item => {
          addMaterial({
              ...item,
              id: `mat-ai-${Math.random()}`,
              courseId: id!,
              lastUpdated: new Date().toISOString()
          } as MaterialRecord);
      });
      setPreviewMaterials([]);
      setIsPreviewModalOpen(false);
      alert(`${previewMaterials.length}개의 자재 항목이 등록되었습니다.`);
  };

  const openEditModal = () => {
      setEditForm({ 
        ...course, 
        issues: course.issues ? [...course.issues] : [],
        grassInfo: course.grassInfo || { green: '', tee: '', fairway: '' },
        areaInfo: course.areaInfo || { total: course.area, green: '', tee: '', fairway: '' }
      });
      setIsEditModalOpen(true);
  };

  const handleNestedEditChange = (category: 'grassInfo' | 'areaInfo', field: string, value: any) => {
    if (editForm) {
        setEditForm({
            ...editForm,
            [category]: {
                ...(editForm[category] || {}),
                [field]: value
            }
        });
    }
  };

  const handleAddIssue = () => {
    if (editForm) {
      setEditForm({ ...editForm, issues: [...(editForm.issues || []), ""] });
    }
  };

  const handleUpdateIssue = (index: number, value: string) => {
    if (editForm && editForm.issues) {
      const newIssues = [...editForm.issues];
      newIssues[index] = value;
      setEditForm({ ...editForm, issues: newIssues });
    }
  };

  const handleRemoveIssue = (index: number) => {
    if (editForm && editForm.issues) {
      const newIssues = editForm.issues.filter((_, i) => i !== index);
      setEditForm({ ...editForm, issues: newIssues });
    }
  };

  const getAffinityColor = (level: AffinityLevel) => {
      if(level >= 1) return "text-emerald-600 bg-emerald-50 border-emerald-100";
      if(level <= -1) return "text-red-600 bg-red-50 border-red-100";
      return "text-slate-500 bg-slate-50 border-slate-200";
  };

  const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
        <div className="flex justify-between items-start mb-1 relative z-10">
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <div className="flex space-x-2">
                <button onClick={openEditModal} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-colors" title="정보 수정"><Edit2 size={18} /></button>
                {isAdmin && (
                  <button onClick={handleDeleteCourse} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="골프장 삭제"><Trash2 size={18} /></button>
                )}
            </div>
        </div>
        
        {/* Manager Section */}
        <div className="flex items-center gap-4 mb-4 relative z-10">
            <p className="text-slate-500 text-sm flex items-center">
              <span className="mr-3 flex items-center font-medium"><MapPin size={14} className="mr-1 text-brand-500"/> {course.address}</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold border border-slate-200 uppercase tracking-wider">{course.type}</span>
            </p>
            <div className="flex items-center">
                {manager ? (
                    <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-lg pl-2 pr-1 py-0.5 group">
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center mr-2 cursor-pointer" onClick={() => navigate(`/people/${manager.id}`)}>
                            <UserCog size={12} className="mr-1"/> {manager.name}
                        </span>
                        <button onClick={handleRemoveManager} className="p-1 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded transition-colors" title="담당자 해제"><UserMinus size={12}/></button>
                        <button onClick={() => setIsManagerModalOpen(true)} className="p-1 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded transition-colors" title="담당자 변경"><Edit2 size={12}/></button>
                    </div>
                ) : (
                    <button onClick={() => setIsManagerModalOpen(true)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 hover:border-indigo-300 rounded-lg px-2 py-1 flex items-center transition-all">
                        <UserPlus size={12} className="mr-1"/> 담당자 지정
                    </button>
                )}
            </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4 border-slate-100 relative z-10">
          <div><span className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5 tracking-tight">규모 / 면적</span><span className="font-bold text-slate-800">{course.holes}홀 / {course.area || '-'}</span></div>
          <div><span className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5 tracking-tight">관리 인원</span><span className="font-bold text-slate-800">{course.staffCount || 0}명</span></div>
          <div><span className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5 tracking-tight">주요 잔디</span><span className="font-bold text-brand-700">{course.grassType}</span></div>
          <div><span className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5 tracking-tight">개장 년도</span><span className="font-bold text-slate-800">{course.openYear}년</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex">
        {[
            { id: 'INFO', label: '기본 정보', icon: <Info size={16}/> },
            { id: 'MANAGEMENT', label: '재무/운영', icon: <BarChart3 size={16}/> },
            { id: 'LOGS', label: '업무 일지', icon: <FileText size={16}/> },
            { id: 'PEOPLE', label: '인맥 네트워크', icon: <Users size={16}/> }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                {tab.icon} <span className="ml-2 hidden sm:inline">{tab.label}</span>
                {tab.id === 'LOGS' && <span className="ml-1.5 text-[10px] opacity-70">({relatedLogs.length})</span>}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'INFO' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-6 flex items-center"><Database size={18} className="mr-2 text-brand-600"/> 상세 코스 스펙 (Specification)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Grass Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center"><Sprout size={14} className="mr-2"/> 잔디 식재 정보</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: '그린 (Green)', value: course.grassInfo?.green || '벤트그라스' },
                                { label: '티 (Tee)', value: course.grassInfo?.tee || '켄터키 블루그라스' },
                                { label: '페어웨이 (Fairway)', value: course.grassInfo?.fairway || '중지 (한국잔디)' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-500">{item.label}</span>
                                    <span className="text-sm font-bold text-slate-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Area Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center"><Map size={14} className="mr-2"/> 구역별 면적 정보</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: '총 면적', value: course.areaInfo?.total || course.area },
                                { label: '그린 면적', value: course.areaInfo?.green || '정보없음' },
                                { label: '티 면적', value: course.areaInfo?.tee || '정보없음' },
                                { label: '페어웨이 면적', value: course.areaInfo?.fairway || '정보없음' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-500">{item.label}</span>
                                    <span className="text-sm font-bold text-slate-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4 flex items-center"><ClipboardList size={18} className="mr-2 text-brand-600"/> 골프장 개요</h3>
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-8 shadow-inner">
                    {course.description}
                </div>

                <h3 className="font-bold text-lg mb-4 flex items-center"><History size={18} className="mr-2 text-brand-600"/>연혁 및 주요 히스토리</h3>
                <div className="space-y-4 relative ml-3 border-l-2 border-slate-100 pl-6 pb-2">
                    {course.issues && course.issues.length > 0 ? (
                        course.issues.map((issue, idx) => (
                            <div key={idx} className="relative group">
                                <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 group-hover:bg-brand-500 transition-colors border-2 border-white"></div>
                                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                    <p className="text-slate-800 text-sm font-medium leading-relaxed">{issue}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">기록된 이슈나 연혁 정보가 없습니다.</div>
                    )}
                </div>
            </div>
          </div>
        )}

        {canViewFullData && activeTab === 'MANAGEMENT' && (
          <div className="space-y-8 animate-in fade-in duration-300">
              {/* Financial Stats */}
              {financialStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp size={100} /></div>
                          <div className="relative z-10">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue Growth (YoY)</p>
                              <div className="flex items-end">
                                  <h3 className={`text-4xl font-black ${financialStats.growth >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{financialStats.growth.toFixed(1)}%</h3>
                                  <span className="mb-2 ml-2 text-xs font-bold text-slate-400">vs Previous Year</span>
                              </div>
                              <div className={`mt-4 inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase ${financialStats.growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                  {financialStats.growth >= 0 ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                                  {financialStats.growth >= 0 ? 'Positive Trend' : 'Negative Trend'}
                              </div>
                          </div>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden text-white">
                          <div className="absolute top-0 right-0 p-6 opacity-10"><PieChart size={100} /></div>
                          <div className="relative z-10">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operating Profit Margin</p>
                              <div className="flex items-end">
                                  <h3 className="text-4xl font-black text-white">{financialStats.margin.toFixed(1)}%</h3>
                                  <span className={`mb-2 ml-2 text-xs font-bold ${financialStats.marginDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {financialStats.marginDiff >= 0 ? '+' : ''}{financialStats.marginDiff.toFixed(1)}%p
                                  </span>
                              </div>
                              <div className="mt-4 inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase bg-white/10 text-slate-200">
                                  <Activity size={12} className="mr-1"/> {financialStats.latest.year} Fiscal Year
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Financial Records */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-black text-slate-800 flex items-center"><BarChart3 size={20} className="mr-2 text-brand-600"/> 재무 실적 현황 (Financials)</h3>
                      <button onClick={() => { setEditingFin(null); setFinForm({ year: new Date().getFullYear(), revenue: 0, profit: 0 }); setIsFinModalOpen(true); }} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-sm flex items-center"><Plus size={14} className="mr-1"/> 실적 추가</button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-white text-slate-400 font-bold border-b border-slate-100">
                              <tr>
                                  <th className="px-6 py-4">연도 (Year)</th>
                                  <th className="px-6 py-4">매출액 (Revenue)</th>
                                  <th className="px-6 py-4">영업이익 (Profit)</th>
                                  <th className="px-6 py-4">이익률 (Margin)</th>
                                  <th className="px-6 py-4 text-right">관리</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {displayFinancials.length > 0 ? (
                                  displayFinancials.map(fin => {
                                      const margin = fin.revenue ? (fin.profit || 0) / fin.revenue * 100 : 0;
                                      return (
                                          <tr key={fin.id} className="group hover:bg-slate-50 transition-colors">
                                              <td className="px-6 py-4 font-black text-slate-900">{fin.year}</td>
                                              <td className="px-6 py-4 font-bold text-slate-600">{formatKRW(fin.revenue)}</td>
                                              <td className={`px-6 py-4 font-bold ${(fin.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatKRW(fin.profit || 0)}</td>
                                              <td className="px-6 py-4 text-xs font-black text-slate-400">{margin.toFixed(1)}%</td>
                                              <td className="px-6 py-4 text-right">
                                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => { setEditingFin(fin); setFinForm({ year: fin.year, revenue: fin.revenue, profit: fin.profit || 0 }); setIsFinModalOpen(true); }} className="p-2 bg-white border border-slate-200 rounded-lg hover:text-brand-600 shadow-sm"><Edit2 size={14}/></button>
                                                      <button onClick={() => { if(window.confirm('삭제하시겠습니까?')) deleteFinancial(fin.id); }} className="p-2 bg-white border border-slate-200 rounded-lg hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                                                  </div>
                                              </td>
                                          </tr>
                                      )
                                  })
                              ) : (
                                  <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-medium">등록된 재무 데이터가 없습니다.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Material Management */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <h3 className="font-black text-slate-800 flex items-center"><Package size={20} className="mr-2 text-brand-600"/> 코스 자재 및 재고 관리 (Inventory)</h3>
                          <div className="flex gap-2">
                              {canUseAI && (
                                  <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center active:scale-95">
                                      {isUploadingMat ? <Loader2 size={14} className="animate-spin mr-1.5"/> : <Upload size={14} className="mr-1.5"/>} AI 명세서 스캔
                                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                                  </button>
                              )}
                              <button onClick={() => { setEditingMat(null); setMatForm({ supplyDate: new Date().toISOString().split('T')[0], category: MaterialCategory.PESTICIDE, name: '', standard: '', quantity: 0, unit: 'ea', unitPrice: 0, manager: '', notes: '' }); setIsMatModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md flex items-center active:scale-95"><Plus size={14} className="mr-1.5"/> 자재 등록</button>
                          </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto overflow-x-auto no-scrollbar">
                              {[
                                  { id: MaterialCategory.PESTICIDE, label: '농약 (Pesticide)', icon: <Droplets size={14}/> },
                                  { id: MaterialCategory.FERTILIZER, label: '비료 (Fertilizer)', icon: <Sprout size={14}/> },
                                  { id: MaterialCategory.GRASS, label: '잔디/종자 (Grass)', icon: <Trees size={14}/> },
                                  { id: MaterialCategory.MATERIAL, label: '기타자재 (Others)', icon: <Box size={14}/> },
                              ].map(tab => (
                                  <button 
                                      key={tab.id} 
                                      onClick={() => setMatCategory(tab.id as MaterialCategory)}
                                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center whitespace-nowrap transition-all ${matCategory === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                  >
                                      <span className="mr-1.5">{tab.icon}</span> {tab.label}
                                  </button>
                              ))}
                          </div>
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                              <Calendar size={14} className="text-slate-400 mr-2"/>
                              <select value={matYearFilter} onChange={(e) => setMatYearFilter(parseInt(e.target.value))} className="bg-transparent text-xs font-bold text-slate-700 outline-none">
                                  {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                              </select>
                          </div>
                      </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-white text-slate-400 font-bold border-b border-slate-100 text-xs">
                              <tr>
                                  <th className="px-6 py-4">공급일 (Date)</th>
                                  <th className="px-6 py-4">제품명 (Item)</th>
                                  <th className="px-6 py-4">규격 (Std)</th>
                                  <th className="px-6 py-4 text-right">수량 (Qty)</th>
                                  <th className="px-6 py-4 text-right">단가/총액 (Price)</th>
                                  <th className="px-6 py-4">담당자 (Mgr)</th>
                                  <th className="px-6 py-4 text-right">관리</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {filteredMaterials.length > 0 ? (
                                  filteredMaterials.map(mat => (
                                      <tr key={mat.id} className="group hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{mat.supplyDate}</td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-slate-900">{mat.name}</div>
                                              <div className="text-[10px] text-slate-400">{mat.category}</div>
                                          </td>
                                          <td className="px-6 py-4 text-xs text-slate-600">{mat.standard || '-'}</td>
                                          <td className="px-6 py-4 text-right">
                                              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-black whitespace-nowrap">
                                                  {mat.quantity.toLocaleString()} {mat.unit}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="text-xs font-bold text-slate-700">{formatKRW(mat.quantity * mat.unitPrice)}</div>
                                              <div className="text-[10px] text-slate-400">(@{formatKRW(mat.unitPrice)})</div>
                                          </td>
                                          <td className="px-6 py-4 text-xs font-bold text-slate-600 flex items-center">
                                              <User size={10} className="mr-1 text-slate-400"/> {mat.manager || '-'}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => { setEditingMat(mat); setMatForm({ supplyDate: mat.supplyDate, category: mat.category, name: mat.name, standard: mat.standard || '', quantity: mat.quantity, unit: mat.unit, unitPrice: mat.unitPrice || 0, manager: mat.manager || '', notes: mat.notes || '' }); setIsMatModalOpen(true); }} className="p-2 bg-white border border-slate-200 rounded-lg hover:text-brand-600 shadow-sm"><Edit2 size={14}/></button>
                                                  <button onClick={() => { if(window.confirm('삭제하시겠습니까?')) deleteMaterial(mat.id); }} className="p-2 bg-white border border-slate-200 rounded-lg hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50">등록된 자재 내역이 없습니다.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
        )}
        
        {activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
                <div className="col-span-full mb-2">
                    <div className="relative group">
                        <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20}/>
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none text-sm font-bold transition-all"
                            placeholder="일지 내용, 제목, 태그 검색..."
                            value={logSearchTerm}
                            onChange={(e) => setLogSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {relatedLogs.map(log => <LogCard key={log.id} log={log} />)}
                {relatedLogs.length === 0 && <div className="col-span-full py-32 text-center text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                    <Search size={48} className="mx-auto mb-4 opacity-10"/>
                    <p className="font-bold">일치하는 업무 기록이 없습니다.</p>
                </div>}
            </div>
        )}

        {activeTab === 'PEOPLE' && (
            <div className="space-y-10 animate-in fade-in duration-500">
                {/* ... People Tab Content ... */}
                <section>
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h3 className="text-xl font-black text-slate-900 flex items-center tracking-tight">
                            <Users size={24} className="mr-3 text-brand-600 bg-brand-50 p-1 rounded-lg"/> 현재 소속 주요 인맥 <span className="ml-3 text-xs font-black text-brand-600 bg-brand-100 px-3 py-1 rounded-full shadow-sm">{currentStaff.length}</span>
                        </h3>
                        <div className="flex items-center gap-3">
                          <button 
                              onClick={() => setIsLinkPersonModalOpen(true)}
                              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md flex items-center"
                          >
                              <ArrowRightLeft size={18} className="mr-2"/> 인물 소속 연동
                          </button>
                          <button 
                              onClick={() => navigate('/write', { activeTab: 'PERSON', currentCourseId: course.id })}
                              className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-md flex items-center"
                          >
                              <UserPlus size={18} className="mr-2"/> 신규 인물 등록
                          </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentStaff.map(assoc => (
                            <div key={assoc.personId} onClick={() => navigate(`/people/${assoc.personId}`)} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-xl transition-all cursor-pointer flex items-center group active:scale-[0.98]">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mr-5 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shadow-inner shrink-0 font-black text-xl">{assoc.name[0]}</div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="font-black text-slate-900 text-lg group-hover:text-brand-700 transition-colors truncate">{assoc.name}</div>
                                    <div className="text-[10px] font-black text-brand-600 tracking-widest uppercase mt-0.5 truncate">{assoc.role}</div>
                                    <div className={`mt-2 inline-flex px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-tighter ${getAffinityColor(assoc.affinity)}`}>
                                        {assoc.affinity > 0 ? '우호적' : assoc.affinity < 0 ? '리스크' : '중립'}
                                    </div>
                                </div>
                                <div className="ml-2 text-slate-200 group-hover:text-brand-500 transition-all group-hover:translate-x-1 shrink-0"><ArrowRight size={20}/></div>
                            </div>
                        ))}
                    </div>
                </section>
                {/* ... Former Staff Content ... */}
            </div>
        )}
      </div>

      {isLinkPersonModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><ArrowRightLeft size={24} className="mr-3 text-indigo-600"/> 기존 인물 소속 연동</h3>
                    <button onClick={() => setIsLinkPersonModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={24}/></button>
                </div>
                <div className="p-10 space-y-8">
                    <p className="text-sm text-slate-500 font-medium">마스터 DB에 이미 등록된 인물을 검색하여 본 골프장으로 소속 정보를 업데이트합니다.</p>
                    <div className="relative group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">인물 성명 검색 (Master DB)</label>
                        <input 
                            list="master-people-link-list"
                            className="w-full border-slate-200 rounded-2xl p-4 font-black text-lg text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm" 
                            value={linkPersonSearch} 
                            onChange={(e) => setLinkPersonSearch(e.target.value)}
                            placeholder="이름 입력..."
                        />
                        <datalist id="master-people-link-list">
                            {people.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                        <div className="absolute right-4 bottom-4 text-slate-300 group-focus-within:text-indigo-500"><Search size={20}/></div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 flex justify-end space-x-4 border-t border-slate-100">
                    <button onClick={() => setIsLinkPersonModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors">취소</button>
                    <button onClick={handleLinkPerson} className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center">
                        <UserCheck size={18} className="mr-2"/> 현재 코스로 소속 업데이트
                    </button>
                </div>
            </div>
        </div>
      )}

      {isManagerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><UserCog size={24} className="mr-3 text-indigo-600"/> 담당자(Manager) 지정</h3>
                    <button onClick={() => setIsManagerModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={24}/></button>
                </div>
                <div className="p-10 space-y-8">
                    <p className="text-sm text-slate-500 font-medium">본 골프장의 메인 담당자(Manager)를 지정합니다.</p>
                    <div className="relative group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">인물 성명 검색</label>
                        <input 
                            list="manager-people-list"
                            className="w-full border-slate-200 rounded-2xl p-4 font-black text-lg text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm" 
                            value={managerSearch} 
                            onChange={(e) => setManagerSearch(e.target.value)}
                            placeholder="이름 입력..."
                        />
                        <datalist id="manager-people-list">
                            {people.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                        <div className="absolute right-4 bottom-4 text-slate-300 group-focus-within:text-indigo-500"><Search size={20}/></div>
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                        * 목록에 없는 경우 '신규 인물 등록' 메뉴를 먼저 이용해주세요.
                    </div>
                </div>
                <div className="p-8 bg-slate-50 flex justify-end space-x-4 border-t border-slate-100">
                    <button onClick={() => setIsManagerModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors">취소</button>
                    <button onClick={handleAssignManager} className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center">
                        <CheckCircle size={18} className="mr-2"/> 담당자로 지정
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Financial Record Modal */}
      {isFinModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h4 className="font-black text-lg text-slate-800">{editingFin ? '실적 수정' : '실적 추가'}</h4>
                      <button onClick={() => setIsFinModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">연도</label>
                          <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={finForm.year} onChange={e => setFinForm({...finForm, year: parseInt(e.target.value)})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">매출액 (원)</label>
                          <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={finForm.revenue} onChange={e => setFinForm({...finForm, revenue: parseInt(e.target.value)})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">영업이익 (원)</label>
                          <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={finForm.profit} onChange={e => setFinForm({...finForm, profit: parseInt(e.target.value)})} />
                      </div>
                      <button onClick={handleSaveFinancial} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm mt-2 hover:bg-slate-800 transition-colors">저장하기</button>
                  </div>
              </div>
          </div>
      )}

      {/* Material Modal */}
      {isMatModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h4 className="font-black text-lg text-slate-800">{editingMat ? '자재 정보 수정' : '신규 자재 등록'}</h4>
                      <button onClick={() => setIsMatModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">공급일자</label>
                              <input type="date" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900" value={matForm.supplyDate} onChange={e => setMatForm({...matForm, supplyDate: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">카테고리</label>
                              <select className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm bg-white" value={matForm.category} onChange={e => setMatForm({...matForm, category: e.target.value as MaterialCategory})}>
                                  {Object.values(MaterialCategory).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">제품명 (Product Name)</label>
                          <input type="text" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={matForm.name} onChange={e => setMatForm({...matForm, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">규격 (Standard)</label>
                          <input type="text" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={matForm.standard} onChange={e => setMatForm({...matForm, standard: e.target.value})} placeholder="예: 500ml, 20kg..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">수량</label>
                              <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={matForm.quantity} onChange={e => setMatForm({...matForm, quantity: parseInt(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">단위</label>
                              <input type="text" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={matForm.unit} onChange={e => setMatForm({...matForm, unit: e.target.value})} placeholder="box, ea..." />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">단가 (Unit Price)</label>
                              <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={matForm.unitPrice} onChange={e => setMatForm({...matForm, unitPrice: parseInt(e.target.value)})} />
                          </div>
                          <div className="flex flex-col justify-end pb-3">
                              <p className="text-xs text-slate-400 font-medium">총액 예상</p>
                              <p className="text-sm font-black text-brand-700">{formatKRW(matForm.quantity * matForm.unitPrice)}</p>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">담당자 (Manager)</label>
                          <input type="text" className="w-full border-slate-200 rounded-xl p-3 font-bold text-sm" value={matForm.manager} onChange={e => setMatForm({...matForm, manager: e.target.value})} placeholder="입고 담당자 성명" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">비고</label>
                          <textarea className="w-full border-slate-200 rounded-xl p-3 font-medium text-sm" rows={2} value={matForm.notes} onChange={e => setMatForm({...matForm, notes: e.target.value})} />
                      </div>
                      <button onClick={handleSaveMaterial} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm mt-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95">저장하기</button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Preview Modal */}
      {isPreviewModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                      <h4 className="font-black text-lg text-indigo-900 flex items-center"><Sparkles size={20} className="mr-2 text-indigo-600"/> AI 스캔 결과 확인 (Preview)</h4>
                      <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                      <p className="text-sm text-slate-500 mb-4 font-bold flex items-center"><Info size={14} className="mr-1.5"/> 문서에서 추출된 다음 항목들을 자재 목록에 추가합니다. 정보를 확인하세요.</p>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 font-bold text-slate-500 text-xs uppercase tracking-wider">
                                  <tr>
                                      <th className="px-4 py-3">공급일</th>
                                      <th className="px-4 py-3">품명</th>
                                      <th className="px-4 py-3">규격</th>
                                      <th className="px-4 py-3 text-right">수량</th>
                                      <th className="px-4 py-3 text-right">단가</th>
                                      <th className="px-4 py-3 text-right">총액</th>
                                      <th className="px-4 py-3">담당자</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {previewMaterials.map((m, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                          <td className="px-4 py-3 text-xs font-mono">{m.supplyDate}</td>
                                          <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                                          <td className="px-4 py-3 text-xs text-slate-600">{m.standard}</td>
                                          <td className="px-4 py-3 text-right font-bold">{m.quantity.toLocaleString()} {m.unit}</td>
                                          <td className="px-4 py-3 text-right text-xs">{m.unitPrice?.toLocaleString()}</td>
                                          <td className="px-4 py-3 text-right font-bold text-brand-700">{formatKRW((m.quantity || 0) * (m.unitPrice || 0))}</td>
                                          <td className="px-4 py-3 text-xs">{m.manager}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                      <button onClick={() => setIsPreviewModalOpen(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">취소</button>
                      <button onClick={applyPreviewMaterials} className="px-8 py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg transition-all active:scale-95 flex items-center">
                          <CheckCircle size={16} className="mr-2"/> 모두 반영하기
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><Database size={24} className="mr-3 text-brand-600"/> 골프장 마스터 정보 관리</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={28} /></button>
                </div>
                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                    {/* ... (Existing Course Edit Form) ... */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><Info size={14} className="mr-2 text-brand-500"/> Core Infrastructure Data</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Official Golf Course Name</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-lg font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Administrative Region</label>
                                <select className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 bg-white shadow-sm appearance-none" value={editForm.region} onChange={(e) => setEditForm({...editForm, region: e.target.value as Region})}>
                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Year of Establishment</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.openYear} onChange={(e) => setEditForm({...editForm, openYear: e.target.value})} placeholder="예: 2004" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">관리 인원 (수)</label>
                                <input type="number" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.staffCount || 0} onChange={(e) => setEditForm({...editForm, staffCount: Number(e.target.value)})} placeholder="0" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><Sprout size={14} className="mr-2 text-brand-500"/> Grass & Vegetation Spec</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">그린 잔디</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.grassInfo?.green || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'green', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">티 잔디</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.grassInfo?.tee || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'tee', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">페어웨이 잔디</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.grassInfo?.fairway || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'fairway', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><Map size={14} className="mr-2 text-brand-500"/> Site and Scale Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Detailed Address</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Total Holes</label>
                                <input type="number" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.holes} onChange={(e) => setEditForm({...editForm, holes: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Membership Type</label>
                                <select className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 bg-white shadow-sm appearance-none" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value as CourseType})}>
                                    <option value={CourseType.MEMBER}>회원제</option>
                                    <option value={CourseType.PUBLIC}>대중제</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">총 면적</label>
                                    <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.areaInfo?.total || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'total', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">그린 면적</label>
                                    <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.areaInfo?.green || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'green', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">티 면적</label>
                                    <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.areaInfo?.tee || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'tee', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">페어웨이 면적</label>
                                    <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold p-3" value={editForm.areaInfo?.fairway || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'fairway', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><FileText size={14} className="mr-2 text-brand-500"/> Operational Context</h4>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Strategic Course Summary</label>
                            <textarea className="w-full rounded-2xl border-slate-200 text-sm font-medium h-32 p-4 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm leading-relaxed" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center"><History size={14} className="mr-2 text-brand-500"/> Key Timeline / Issues</h4>
                            <button onClick={handleAddIssue} className="text-[10px] font-black bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl border border-brand-100 hover:bg-brand-100 transition-colors flex items-center"><Plus size={14} className="mr-1"/> ADD EVENT</button>
                        </div>
                        <div className="space-y-3">
                            {editForm.issues?.map((issue, idx) => (
                                <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                    <input 
                                        type="text" 
                                        className="flex-1 rounded-xl border-slate-200 text-sm p-3 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm" 
                                        value={issue} 
                                        onChange={(e) => handleUpdateIssue(idx, e.target.value)} 
                                        placeholder="이벤트 또는 이슈 입력..."
                                    />
                                    <button onClick={() => handleRemoveIssue(idx)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end space-x-4 shrink-0 shadow-inner">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-3.5 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest">DISCARD</button>
                    <button onClick={() => { updateCourse(editForm); setIsEditModalOpen(false); alert('골프장 정보가 마스터 DB에 성공적으로 반영되었습니다.'); }} className="px-12 py-3.5 text-sm font-black text-white bg-brand-600 rounded-2xl hover:bg-brand-700 flex items-center shadow-xl transform active:scale-95 transition-all uppercase tracking-[0.1em]"><CheckCircle size={20} className="mr-3" />SYNC WITH MASTER DB</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
