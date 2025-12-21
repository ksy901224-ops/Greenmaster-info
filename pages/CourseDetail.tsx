
import React, { useState, useEffect, useMemo, useRef } from 'react';
import LogCard from '../components/LogCard';
import { generateCourseSummary, analyzeMaterialInventory } from '../services/geminiService';
// Removed duplicate imports and added TrendingDown
import { 
  Info, FileText, Users, User, Sparkles, History, Edit2, X, CheckCircle, MapPin, Trash2, 
  Globe, Loader2, List, AlertTriangle, Plus, Minus, Lock, Calendar, Ruler, Map, 
  Calculator, ArrowRightLeft, Cloud, Search, ArrowRight, BarChart3, TrendingUp, 
  Clock, Activity, AlertOctagon, Send, RotateCcw, Package, Droplets, 
  Sprout, Box, Upload, Camera, Database, DollarSign, PieChart, ClipboardList, 
  ArrowUpRight, Percent, ArrowDownRight, ChevronDown, TrendingDown 
} from 'lucide-react';
import { AffinityLevel, CourseType, GrassType, GolfCourse, FinancialRecord, MaterialRecord, MaterialCategory, UserRole, Region } from '../types';
import { useApp } from '../contexts/AppContext';

// Utility for smart Korean currency formatting
const formatKRW = (amount: number) => {
    if (amount === 0) return "0원";
    
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
  const { user, courses, logs, updateCourse, deleteCourse, people, canUseAI, canViewFullData, isAdmin, navigate, routeParams, locationState, financials, materials, addFinancial, updateFinancial, deleteFinancial, addMaterial, updateMaterial, deleteMaterial } = useApp();
  const id = routeParams.id;
  
  const course = courses.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGS' | 'PEOPLE' | 'MANAGEMENT'>('INFO');
  
  // Edit State for Course Info
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<GolfCourse | null>(null);
  
  // Search state for logs tab
  const [logSearchTerm, setLogSearchTerm] = useState('');

  // --- Financial & Material States ---
  const [isFinModalOpen, setIsFinModalOpen] = useState(false);
  const [editingFin, setEditingFin] = useState<FinancialRecord | null>(null);
  const [finForm, setFinForm] = useState({ year: new Date().getFullYear(), revenue: 0, profit: 0 });

  // Material States
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState<MaterialRecord | null>(null);
  const [matCategory, setMatCategory] = useState<MaterialCategory>(MaterialCategory.PESTICIDE);
  const currentYear = new Date().getFullYear();
  const [matYearFilter, setMatYearFilter] = useState<number>(currentYear);
  
  const [matForm, setMatForm] = useState({
      category: MaterialCategory.PESTICIDE,
      name: '',
      quantity: 0,
      unit: 'kg',
      supplier: '',
      notes: '',
      year: currentYear
  });

  // AI Material Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMat, setIsUploadingMat] = useState(false);
  const [previewMaterials, setPreviewMaterials] = useState<Omit<MaterialRecord, 'id' | 'courseId' | 'lastUpdated'>[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
      if (locationState?.filterIssue && canViewFullData) {
          setActiveTab('LOGS');
          setLogSearchTerm(locationState.filterIssue);
      }
  }, [locationState, canViewFullData]);

  if (!course) return <div className="p-8 text-center">골프장을 찾을 수 없습니다.</div>;

  const relatedLogs = logs
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

  const courseFinancials = useMemo(() => {
      return financials
        .filter(f => f.courseId === id)
        .sort((a, b) => Number(a.year) - Number(b.year)); 
  }, [financials, id]);

  const displayFinancials = useMemo(() => [...courseFinancials].reverse(), [courseFinancials]);

  // Calculate trends
  const financialStats = useMemo(() => {
    if (courseFinancials.length < 1) return null;
    const latest = courseFinancials[courseFinancials.length - 1];
    const previous = courseFinancials.length > 1 ? courseFinancials[courseFinancials.length - 2] : null;
    
    const growth = previous ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    const margin = latest.profit ? (latest.profit / latest.revenue) * 100 : 0;
    const prevMargin = previous?.profit ? (previous.profit / previous.revenue) * 100 : 0;
    const marginDiff = previous ? margin - prevMargin : 0;
    
    return { latest, previous, growth, margin, marginDiff };
  }, [courseFinancials]);

  const courseMaterials = useMemo(() => {
      return materials.filter(m => m.courseId === id);
  }, [materials, id]);

  const availableYears = useMemo(() => {
      const years = new Set(courseMaterials.map(m => m.year || currentYear));
      years.add(currentYear);
      return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [courseMaterials, currentYear]);

  const filteredMaterials = courseMaterials
    .filter(m => m.category === matCategory)
    .filter(m => (m.year || currentYear) === matYearFilter);

  const currentStaff = people.filter(p => p.currentCourseId === id);
  const formerStaff = people.filter(p => p.careers.some(c => c.courseId === id) && p.currentCourseId !== id);

  // --- Handlers ---
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
        grassInfo: course.grassInfo ? { ...course.grassInfo } : { green: '', tee: '', fairway: '' },
        areaInfo: course.areaInfo ? { ...course.areaInfo } : { total: '', green: '', tee: '', fairway: '' }
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
            </div>
        </div>
        <p className="text-slate-500 text-sm flex items-center mb-4 relative z-10">
          <span className="mr-3 flex items-center font-medium"><MapPin size={14} className="mr-1 text-brand-500"/> {course.address}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold border border-slate-200 uppercase tracking-wider">{course.type}</span>
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4 border-slate-100 relative z-10">
          <div><span className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5 tracking-tight">규모 / 면적</span><span className="font-bold text-slate-800">{course.holes}홀 / {course.area || '-'}</span></div>
          <div><span className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5 tracking-tight">코스 전장</span><span className="font-bold text-slate-800">{course.length || '-'}</span></div>
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
            { id: 'PEOPLE', label: '인맥 정보', icon: <Users size={16}/> }
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
              {/* Financial Dashboard Header */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 mb-8">
                      <div className="space-y-1">
                          <h3 className="text-2xl font-black text-slate-900 flex items-center tracking-tight">
                              <PieChart size={28} className="mr-3 text-blue-600 bg-blue-50 p-1.5 rounded-xl"/> 경영 실적 및 수익성 추이
                          </h3>
                          <p className="text-sm text-slate-500 font-medium">연도별 매출 성적과 이익률 변동 현황을 비교 분석합니다.</p>
                      </div>

                      {isAdmin && (
                          <button 
                            onClick={() => { setEditingFin(null); setFinForm({ year: new Date().getFullYear(), revenue: 0, profit: 0 }); setIsFinModalOpen(true); }}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center shadow-lg active:scale-95"
                          >
                              <Plus size={18} className="mr-2"/> 연간 실적 추가
                          </button>
                      )}
                  </div>

                  {financialStats ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 mb-10">
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">당기 매출액 ({financialStats.latest.year})</span>
                                  <ArrowUpRight size={14} className="text-blue-400" />
                              </div>
                              <div className="text-2xl font-black text-slate-900 leading-none">
                                  {formatKRW(financialStats.latest.revenue)}
                              </div>
                          </div>
                          
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">영업이익률</span>
                                  <Percent size={14} className="text-emerald-400" />
                              </div>
                              <div className="flex items-end gap-2">
                                  <div className="text-2xl font-black text-slate-900 leading-none">
                                      {financialStats.margin.toFixed(1)}%
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 mb-1">({formatKRW(financialStats.latest.profit || 0)})</span>
                              </div>
                          </div>

                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">매출 성장률 (YoY)</span>
                                  {financialStats.growth >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                              </div>
                              <div className={`text-2xl font-black leading-none ${financialStats.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {financialStats.growth >= 0 ? '+' : ''}{financialStats.growth.toFixed(1)}%
                              </div>
                          </div>

                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">이익률 변동</span>
                                  {financialStats.marginDiff >= 0 ? <ArrowUpRight size={14} className="text-blue-500" /> : <ArrowDownRight size={14} className="text-amber-500" />}
                              </div>
                              <div className={`text-2xl font-black leading-none ${financialStats.marginDiff >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                  {financialStats.marginDiff >= 0 ? '+' : ''}{financialStats.marginDiff.toFixed(1)}%p
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="py-16 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 mb-10">
                          <Activity size={40} className="mx-auto text-slate-200 mb-3"/>
                          <p className="text-slate-400 text-sm font-bold tracking-tight">등록된 재무 데이터가 없습니다.</p>
                      </div>
                  )}

                  {/* Performance Trend Analysis Chart */}
                  {courseFinancials.length > 0 && (
                      <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-100">
                          <div className="flex justify-between items-center mb-10">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                                  <BarChart3 size={14} className="mr-2"/> Performance Trend Analysis
                              </h4>
                              <div className="flex gap-4">
                                  <div className="flex items-center gap-1.5">
                                      <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                                      <span className="text-[10px] font-bold text-slate-500">매출액</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                      <div className="w-3 h-px bg-emerald-500 border-t-2 border-emerald-500"></div>
                                      <span className="text-[10px] font-bold text-slate-500">영업이익률(%)</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="relative h-64 flex items-end justify-between px-4 pb-8 group/chart">
                              <div className="absolute inset-0 flex flex-col justify-between py-8 px-2 opacity-50 pointer-events-none">
                                  {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-slate-200 border-dashed"></div>)}
                              </div>

                              {courseFinancials.map((fin, idx) => {
                                  const maxRev = Math.max(...courseFinancials.map(f => f.revenue));
                                  const heightPercent = (fin.revenue / (maxRev || 1)) * 100;
                                  const margin = fin.revenue > 0 ? ((fin.profit || 0) / fin.revenue) * 100 : 0;
                                  
                                  return (
                                      <div key={idx} className="relative flex flex-col items-center w-full max-w-[60px] h-full group z-10">
                                          <div 
                                              className="w-full bg-blue-100 rounded-t-lg transition-all duration-500 group-hover:bg-blue-600 group-hover:shadow-glow relative mt-auto" 
                                              style={{ height: `${heightPercent}%` }}
                                          >
                                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20 pointer-events-none">
                                                  {formatKRW(fin.revenue)}
                                                  <div className="text-emerald-400 mt-0.5">이익률: {margin.toFixed(1)}%</div>
                                                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                              </div>
                                          </div>
                                          <span className="absolute -bottom-6 text-[11px] font-black text-slate-400 group-hover:text-slate-900 transition-colors">{fin.year}</span>
                                      </div>
                                  );
                              })}

                              {courseFinancials.length > 1 && (
                                <svg className="absolute inset-0 w-full h-full pointer-events-none py-8 px-4 z-20 overflow-visible" preserveAspectRatio="none">
                                    <path 
                                        d={courseFinancials.map((fin, i) => {
                                            const margin = fin.revenue > 0 ? ((fin.profit || 0) / fin.revenue) * 100 : 0;
                                            const maxMargin = Math.max(...courseFinancials.map(f => f.revenue > 0 ? (f.profit || 0)/f.revenue*100 : 0), 20);
                                            const x = (i / (courseFinancials.length - 1)) * 100;
                                            const y = 100 - ((margin / (maxMargin || 1)) * 100);
                                            return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-md transition-all duration-1000"
                                    />
                                    {courseFinancials.map((fin, i) => {
                                            const margin = fin.revenue > 0 ? ((fin.profit || 0) / fin.revenue) * 100 : 0;
                                            const maxMargin = Math.max(...courseFinancials.map(f => f.revenue > 0 ? (f.profit || 0)/f.revenue*100 : 0), 20);
                                            const x = (i / (courseFinancials.length - 1)) * 100;
                                            const y = 100 - ((margin / (maxMargin || 1)) * 100);
                                            return (
                                                <circle key={i} cx={`${x}%`} cy={`${y}%`} r="4" fill="white" stroke="#10b981" strokeWidth="2" />
                                            );
                                    })}
                                </svg>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              {/* Data Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayFinancials.map((fin, idx) => {
                      const prev = idx < displayFinancials.length - 1 ? displayFinancials[idx + 1] : null;
                      const growth = prev ? ((fin.revenue - prev.revenue) / prev.revenue) * 100 : 0;
                      const margin = fin.revenue > 0 ? ((fin.profit || 0) / fin.revenue) * 100 : 0;
                      
                      return (
                        <div key={fin.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all group relative animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-[0.1em]">{fin.year} PERFORMANCE</div>
                                {isAdmin && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                        <button onClick={() => { setEditingFin(fin); setFinForm({ year: fin.year, revenue: fin.revenue, profit: fin.profit || 0 }); setIsFinModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-blue-50 rounded-xl transition-colors"><Edit2 size={14}/></button>
                                        <button onClick={() => deleteFinancial(fin.id)} className="p-2 text-slate-400 hover:text-red-600 bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">연간 매출액</span>
                                        {prev && (
                                            <span className={`text-[10px] font-black ${growth >= 0 ? 'text-emerald-500' : 'text-red-500'} flex items-center`}>
                                                {growth >= 0 ? <TrendingUp size={10} className="mr-0.5"/> : <TrendingDown size={10} className="mr-0.5"/>}
                                                {Math.abs(growth).toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-black text-slate-900 tracking-tight">{formatKRW(fin.revenue)}</div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">영업이익</div>
                                        <div className="text-sm font-black text-emerald-600">{formatKRW(fin.profit || 0)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">이익률(Margin)</div>
                                        <div className="text-sm font-black text-slate-800">{margin.toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                      );
                  })}
              </div>

              {/* Material Inventory Section */}
              <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                      <div className="space-y-1">
                          <h3 className="text-2xl font-black text-slate-900 flex items-center tracking-tight">
                              <Box size={28} className="mr-3 text-emerald-600 bg-emerald-50 p-1.5 rounded-xl"/> 코스 관리 자재 인벤토리
                          </h3>
                          <p className="text-sm text-slate-500 font-medium">연도별 주요 자재(농약, 비료 등) 투입 및 재고 현황을 파악합니다.</p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                          {canUseAI && (
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingMat}
                                className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center shadow-lg disabled:opacity-50 active:scale-95"
                              >
                                  {isUploadingMat ? <Loader2 size={16} className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2 text-amber-400"/>}
                                  AI 스마트 등록
                                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                              </button>
                          )}
                          {isAdmin && (
                              <button 
                                onClick={() => { setEditingMat(null); setMatForm({ category: matCategory, name: '', quantity: 0, unit: 'kg', supplier: '', notes: '', year: matYearFilter }); setIsMatModalOpen(true); }}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center shadow-lg active:scale-95"
                              >
                                  <Plus size={18} className="mr-2"/> 신규 자재 추가
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                          {Object.values(MaterialCategory).map(cat => (
                              <button 
                                key={cat} 
                                onClick={() => setMatCategory(cat)} 
                                className={`px-5 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${matCategory === cat ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                              >
                                  {cat}
                              </button>
                          ))}
                      </div>
                      <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                      <div className="flex items-center gap-3 ml-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Year</span>
                        <div className="relative">
                            <select 
                                value={matYearFilter} 
                                onChange={(e) => setMatYearFilter(Number(e.target.value))}
                                className="appearance-none text-sm font-black bg-white border border-slate-200 rounded-xl py-2 pl-4 pr-10 focus:ring-emerald-500 outline-none shadow-sm cursor-pointer"
                            >
                                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                      </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-[0.15em] border-b border-slate-100">
                              <tr>
                                  <th className="px-8 py-5">자재 명칭 / 품목군</th>
                                  <th className="px-8 py-5">공급사/제조사</th>
                                  <th className="px-8 py-5 text-right">총 수량</th>
                                  <th className="px-8 py-5">관리 메모</th>
                                  {isAdmin && <th className="px-8 py-5 text-right">Actions</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredMaterials.map(mat => (
                                  <tr key={mat.id} className="hover:bg-slate-50 transition-colors group">
                                      <td className="px-8 py-5">
                                          <div className="font-black text-slate-800 text-base">{mat.name}</div>
                                          <div className="text-[9px] font-black text-emerald-500 uppercase mt-1 tracking-wider">{mat.category}</div>
                                      </td>
                                      <td className="px-8 py-5 text-slate-500 text-xs font-bold">{mat.supplier || '-'}</td>
                                      <td className="px-8 py-5 text-right">
                                          <span className="text-lg font-black text-emerald-600 leading-none">{mat.quantity.toLocaleString()}</span>
                                          <span className="ml-1 text-[10px] font-black text-slate-400 uppercase">{mat.unit}</span>
                                      </td>
                                      <td className="px-8 py-5">
                                          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px] truncate" title={mat.notes}>{mat.notes || '-'}</p>
                                      </td>
                                      {isAdmin && (
                                          <td className="px-8 py-5 text-right">
                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end space-x-2">
                                                  <button onClick={() => { 
                                                      setEditingMat(mat); 
                                                      setMatForm({ 
                                                          category: mat.category,
                                                          name: mat.name,
                                                          quantity: mat.quantity,
                                                          unit: mat.unit,
                                                          supplier: mat.supplier || '',
                                                          notes: mat.notes || '',
                                                          year: mat.year
                                                      }); 
                                                      setIsMatModalOpen(true); 
                                                  }} className="p-2.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all active:scale-90"><Edit2 size={14}/></button>
                                                  <button onClick={() => deleteMaterial(mat.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all active:scale-90"><Trash2 size={14}/></button>
                                              </div>
                                          </td>
                                      )}
                                  </tr>
                              ))}
                              {filteredMaterials.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="py-32 text-center">
                                          <Package size={48} className="mx-auto text-slate-100 mb-4"/>
                                          <p className="text-slate-400 text-sm font-bold tracking-tight">해당 연도의 필터링된 기록이 없습니다.</p>
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </section>
          </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <section>
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h3 className="text-xl font-black text-slate-900 flex items-center tracking-tight">
                            <Users size={24} className="mr-3 text-brand-600 bg-brand-50 p-1 rounded-lg"/> 현재 재직 중인 주요 인맥 <span className="ml-3 text-xs font-black text-brand-600 bg-brand-100 px-3 py-1 rounded-full shadow-sm">{currentStaff.length}</span>
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentStaff.map(person => (
                            <div key={person.id} onClick={() => navigate(`/people/${person.id}`)} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-xl transition-all cursor-pointer flex items-center group active:scale-[0.98]">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mr-5 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shadow-inner shrink-0 font-black text-xl">{person.name[0]}</div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="font-black text-slate-900 text-lg group-hover:text-brand-700 transition-colors truncate">{person.name}</div>
                                    <div className="text-[10px] font-black text-brand-600 tracking-widest uppercase mt-0.5 truncate">{person.currentRole}</div>
                                </div>
                                <div className="ml-2 text-slate-200 group-hover:text-brand-500 transition-all group-hover:translate-x-1 shrink-0"><ArrowRight size={20}/></div>
                            </div>
                        ))}
                    </div>
                </section>

                {formerStaff.length > 0 && (
                    <section className="pt-10 border-t border-slate-100">
                        <h3 className="text-xl font-black text-slate-500 mb-8 px-2 flex items-center tracking-tight">
                            <History size={24} className="mr-3 text-slate-400 bg-slate-50 p-1 rounded-lg"/> 과거 이력 관계 <span className="ml-3 text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full shadow-sm">{formerStaff.length}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {formerStaff.map(person => (
                                <div key={person.id} onClick={() => navigate(`/people/${person.id}`)} className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:border-slate-400 hover:bg-white transition-all cursor-pointer flex items-center grayscale-[0.5] hover:grayscale-0 group active:scale-[0.98]">
                                    <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center mr-5 text-slate-400 shrink-0 font-black text-xl">{person.name[0]}</div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-black text-slate-700 text-lg truncate">{person.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 italic tracking-wide mt-0.5 truncate">이전 소속원</div>
                                    </div>
                                    <div className="ml-2 text-slate-200 transition-all shrink-0"><ArrowRight size={20}/></div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        )}
      </div>

      {/* --- Modals --- */}
      
      {/* Financial Modal */}
      {isFinModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><Calculator size={24} className="mr-3 text-blue-600"/> {editingFin ? '경영 실적 수정' : '신규 실적 등록'}</h3>
                      <button onClick={() => setIsFinModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={24}/></button>
                  </div>
                  <div className="p-10 space-y-8">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">연도 (Fiscal Year)</label>
                          <input type="number" className="w-full border-slate-200 rounded-2xl p-4 font-black text-xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm" value={finForm.year} onChange={(e) => setFinForm({...finForm, year: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">연간 총 매출액 (Revenue)</label>
                          <input type="number" className="w-full border-slate-200 rounded-2xl p-4 font-black text-xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm" value={finForm.revenue} onChange={(e) => setFinForm({...finForm, revenue: Number(e.target.value)})} placeholder="0" />
                          <p className="mt-3 text-xs text-blue-600 font-bold ml-1 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">{formatKRW(finForm.revenue)}</p>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">연간 영업 이익 (Profit)</label>
                          <input type="number" className="w-full border-slate-200 rounded-2xl p-4 font-black text-xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm" value={finForm.profit} onChange={(e) => setFinForm({...finForm, profit: Number(e.target.value)})} placeholder="0" />
                          <p className="mt-3 text-xs text-emerald-600 font-bold ml-1 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">{formatKRW(finForm.profit)}</p>
                      </div>
                  </div>
                  <div className="p-8 bg-slate-50 flex justify-end space-x-4 border-t border-slate-100">
                      <button onClick={() => setIsFinModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest">CANCEL</button>
                      <button onClick={handleSaveFinancial} className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-[0.1em]">SAVE RECORD</button>
                  </div>
              </div>
          </div>
      )}

      {/* Material Modal */}
      {isMatModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><Box size={24} className="mr-3 text-emerald-600"/> {editingMat ? '자재 정보 수정' : '신규 자재 등록'}</h3>
                      <button onClick={() => setIsMatModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={24}/></button>
                  </div>
                  <div className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">자재 분류</label>
                            <select className="w-full border-slate-200 rounded-2xl p-4 text-sm font-black bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm" value={matForm.category} onChange={(e) => setMatForm({...matForm, category: e.target.value as MaterialCategory})}>
                                {Object.values(MaterialCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">기준 연도</label>
                            <input type="number" className="w-full border-slate-200 rounded-2xl p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-emerald-500/10" value={matForm.year} onChange={(e) => setMatForm({...matForm, year: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">자재/모델 공식 명칭</label>
                          <input type="text" className="w-full border-slate-200 rounded-2xl p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-emerald-500/10" value={matForm.name} onChange={(e) => setMatForm({...matForm, name: e.target.value})} placeholder="예: 벤트그라스 007 씨앗" />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">보유 수량</label>
                            <input type="number" className="w-full border-slate-200 rounded-2xl p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-emerald-500/10" value={matForm.quantity} onChange={(e) => setMatForm({...matForm, quantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">단위 (Unit)</label>
                            <input type="text" className="w-full border-slate-200 rounded-2xl p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-emerald-500/10" value={matForm.unit} onChange={(e) => setMatForm({...matForm, unit: e.target.value})} placeholder="kg, L, PKG 등" />
                        </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">공급/제조 업체</label>
                          <input type="text" className="w-full border-slate-200 rounded-2xl p-4 text-sm font-black shadow-sm focus:ring-4 focus:ring-emerald-500/10" value={matForm.supplier} onChange={(e) => setMatForm({...matForm, supplier: e.target.value})} placeholder="제조사 또는 납품 업체명" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">관리 특이사항</label>
                          <textarea className="w-full border-slate-200 rounded-2xl p-4 text-sm font-medium h-28 leading-relaxed focus:ring-4 focus:ring-emerald-500/10 shadow-sm" value={matForm.notes} onChange={(e) => setMatForm({...matForm, notes: e.target.value})} placeholder="사용 현황, 보관 위치, 보관 기한 등" />
                      </div>
                  </div>
                  <div className="p-8 bg-slate-50 flex justify-end space-x-4 border-t border-slate-100">
                      <button onClick={() => setIsMatModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest">CANCEL</button>
                      <button onClick={handleSaveMaterial} className="px-10 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-[0.1em]">APPLY CHANGES</button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Material Preview Modal */}
      {isPreviewModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                      <h3 className="font-black text-xl text-indigo-900 flex items-center tracking-tight"><Sparkles size={24} className="mr-3 text-indigo-600"/> AI 추출 자재 목록 검토</h3>
                      <button onClick={() => setIsPreviewModalOpen(false)} className="text-indigo-400 hover:text-indigo-900 transition-colors p-1.5 hover:bg-indigo-100 rounded-xl"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                      <p className="text-sm text-slate-500 mb-6 font-medium">AI가 문서에서 추출한 항목들입니다. 저장 전 데이터를 확인하세요.</p>
                      <div className="space-y-4">
                          {previewMaterials.map((item, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center group">
                                  <div>
                                      <div className="text-lg font-black text-slate-900">{item.name}</div>
                                      <div className="flex gap-3 mt-1 items-center">
                                          <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">{item.category}</span>
                                          <span className="text-xs text-slate-400 font-bold">{item.supplier || '제조사 미상'}</span>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-xl font-black text-indigo-600">{item.quantity.toLocaleString()}<span className="text-xs ml-1 text-slate-400">{item.unit}</span></div>
                                      <div className="text-[10px] font-bold text-slate-400">{item.year}년 인벤토리</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100 flex justify-end space-x-4 shrink-0">
                      <button onClick={() => setIsPreviewModalOpen(false)} className="px-8 py-3.5 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest">DISCARD</button>
                      <button onClick={applyPreviewMaterials} className="px-12 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.1em]">COMMIT TO DATABASE</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Course Info Modal */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><Database size={24} className="mr-3 text-brand-600"/> 골프장 마스터 정보 관리</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={28} /></button>
                </div>
                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
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
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><Sprout size={14} className="mr-2 text-brand-500"/> Grass Specification</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Green Grass</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.grassInfo?.green} onChange={(e) => handleNestedEditChange('grassInfo', 'green', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tee Grass</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.grassInfo?.tee} onChange={(e) => handleNestedEditChange('grassInfo', 'tee', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fairway Grass</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.grassInfo?.fairway} onChange={(e) => handleNestedEditChange('grassInfo', 'fairway', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><Map size={14} className="mr-2 text-brand-500"/> Area Breakdown</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Total Site Area</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.areaInfo?.total} onChange={(e) => { 
                                    handleNestedEditChange('areaInfo', 'total', e.target.value);
                                    setEditForm(prev => prev ? {...prev, area: e.target.value} : null);
                                }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Green Total Area</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.areaInfo?.green} onChange={(e) => handleNestedEditChange('areaInfo', 'green', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tee Total Area</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.areaInfo?.tee} onChange={(e) => handleNestedEditChange('areaInfo', 'tee', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fairway Total Area</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.areaInfo?.fairway} onChange={(e) => handleNestedEditChange('areaInfo', 'fairway', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center border-b border-slate-100 pb-3"><FileText size={14} className="mr-2 text-brand-500"/> Operational Context</h4>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Detailed Address</label>
                                <input type="text" className="w-full rounded-2xl border-slate-200 text-sm font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4 shadow-sm" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Strategic Course Summary</label>
                                <textarea className="w-full rounded-2xl border-slate-200 text-sm font-medium h-32 p-4 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 shadow-sm leading-relaxed" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                            </div>
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
