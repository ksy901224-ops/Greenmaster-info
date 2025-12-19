
import React, { useState, useEffect, useMemo, useRef } from 'react';
import LogCard from '../components/LogCard';
import { generateCourseSummary, analyzeMaterialInventory } from '../services/geminiService';
import { Info, FileText, Users, User, Sparkles, History, Edit2, X, CheckCircle, MapPin, Trash2, Globe, Loader2, List, AlertTriangle, Plus, Minus, Lock, Calendar, Ruler, Map, Calculator, ArrowRightLeft, Cloud, Search, ArrowRight, BarChart3, TrendingUp, TrendingDown, Package, Droplets, Sprout, Box, Upload, Camera, Database, DollarSign, PieChart, ClipboardList, Activity, ArrowUpRight, Percent } from 'lucide-react';
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
    if (won > 0 && eok === 0) result += `${won.toLocaleString()}`; // Only show won if less than eok
    
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
        .sort((a, b) => Number(b.year) - Number(a.year));
  }, [financials, id]);

  // Calculate trends
  const financialStats = useMemo(() => {
    if (courseFinancials.length < 1) return null;
    const latest = courseFinancials[0];
    const previous = courseFinancials[1];
    
    const growth = previous ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    const margin = latest.profit ? (latest.profit / latest.revenue) * 100 : 0;
    
    return { latest, growth, margin };
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
      setEditForm({ ...course, issues: course.issues ? [...course.issues] : [] });
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
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 opacity-40"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="space-y-1">
                          <h3 className="text-xl font-bold text-slate-900 flex items-center">
                              <DollarSign size={24} className="mr-2 text-blue-600 bg-blue-50 p-1 rounded-lg"/> 경영 실적 대시보드
                          </h3>
                          <p className="text-sm text-slate-500">최근 연간 매출액 및 수익성 지표를 관리합니다.</p>
                      </div>

                      {isAdmin && (
                          <button 
                            onClick={() => { setEditingFin(null); setFinForm({ year: new Date().getFullYear(), revenue: 0, profit: 0 }); setIsFinModalOpen(true); }}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center shadow-lg active:scale-95"
                          >
                              <Plus size={18} className="mr-2"/> 실적 추가
                          </button>
                      )}
                  </div>

                  {financialStats ? (
                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">최근 매출 ({financialStats.latest.year})</span>
                                  <ArrowUpRight size={14} className="text-blue-400" />
                              </div>
                              <div className="text-2xl font-black text-slate-900 leading-none">
                                  {formatKRW(financialStats.latest.revenue)}
                              </div>
                          </div>
                          
                          <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">영업이익률</span>
                                  <Percent size={14} className="text-emerald-400" />
                              </div>
                              <div className="flex items-end gap-2">
                                  <div className="text-2xl font-black text-slate-900 leading-none">
                                      {financialStats.margin.toFixed(1)}%
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 mb-1">({formatKRW(financialStats.latest.profit || 0)})</span>
                              </div>
                          </div>

                          <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">매출 성장률 (YoY)</span>
                                  <TrendingUp size={14} className="text-amber-400" />
                              </div>
                              <div className={`text-2xl font-black leading-none ${financialStats.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {financialStats.growth >= 0 ? '+' : ''}{financialStats.growth.toFixed(1)}%
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="mt-8 py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Activity size={32} className="mx-auto text-slate-300 mb-2"/>
                          <p className="text-slate-400 text-sm font-medium">등록된 재무 데이터가 없습니다.</p>
                      </div>
                  )}

                  {/* Trend Chart (Simple CSS implementation) */}
                  {courseFinancials.length > 1 && (
                      <div className="mt-8 pt-6 border-t border-slate-100">
                          <div className="flex items-end justify-between h-32 px-4">
                              {courseFinancials.slice(0, 5).reverse().map((fin, idx) => {
                                  const maxRev = Math.max(...courseFinancials.map(f => f.revenue));
                                  const height = (fin.revenue / maxRev) * 100;
                                  return (
                                      <div key={idx} className="flex flex-col items-center group w-full">
                                          <div className="relative w-12 bg-blue-100 rounded-t-lg transition-all group-hover:bg-blue-600 group-hover:shadow-lg" style={{ height: `${height}%` }}>
                                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                  {formatKRW(fin.revenue)}
                                              </div>
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-400 mt-2">{fin.year}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}
              </div>

              {/* Financial Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courseFinancials.map(fin => (
                      <div key={fin.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative">
                          <div className="flex justify-between items-start mb-4">
                              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-wider">{fin.year}년 경영 실적</div>
                              {isAdmin && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                      <button onClick={() => { setEditingFin(fin); setFinForm({ year: fin.year, revenue: fin.revenue, profit: fin.profit || 0 }); setIsFinModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                                      <button onClick={() => deleteFinancial(fin.id)} className="p-2 text-slate-400 hover:text-red-600 bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                                  </div>
                              )}
                          </div>
                          
                          <div className="space-y-4">
                              <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">매출액 (Revenue)</div>
                                  <div className="text-xl font-black text-slate-800">{formatKRW(fin.revenue)}</div>
                              </div>
                              <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                                  <div>
                                      <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">영업이익</div>
                                      <div className="text-sm font-bold text-emerald-600">{formatKRW(fin.profit || 0)}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">이익률</div>
                                      <div className="text-sm font-bold text-slate-700">{fin.revenue > 0 ? ((fin.profit || 0) / fin.revenue * 100).toFixed(1) : 0}%</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              {/* Material Inventory Section */}
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                      <div className="space-y-1">
                          <h3 className="text-xl font-bold text-slate-900 flex items-center">
                              <Package size={24} className="mr-2 text-emerald-600 bg-emerald-50 p-1 rounded-lg"/> 코스 관리 자재 인벤토리
                          </h3>
                          <p className="text-sm text-slate-500">농약, 비료 등 투입 자재의 연도별 사용 및 재고량을 관리합니다.</p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                          {canUseAI && (
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingMat}
                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center shadow-lg disabled:opacity-50 active:scale-95"
                              >
                                  {isUploadingMat ? <Loader2 size={16} className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2 text-amber-300"/>}
                                  AI 스마트 등록
                                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                              </button>
                          )}
                          {isAdmin && (
                              <button 
                                onClick={() => { setEditingMat(null); setMatForm({ category: matCategory, name: '', quantity: 0, unit: 'kg', supplier: '', notes: '', year: matYearFilter }); setIsMatModalOpen(true); }}
                                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center shadow-lg active:scale-95"
                              >
                                  <Plus size={18} className="mr-2"/> 자재 추가
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
                          {Object.values(MaterialCategory).map(cat => (
                              <button 
                                key={cat} 
                                onClick={() => setMatCategory(cat)} 
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${matCategory === cat ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                              >
                                  {cat}
                              </button>
                          ))}
                      </div>
                      <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">연도 선택</span>
                        <select 
                            value={matYearFilter} 
                            onChange={(e) => setMatYearFilter(Number(e.target.value))}
                            className="text-sm font-bold bg-white border border-slate-300 rounded-xl py-1.5 px-3 focus:ring-emerald-500 outline-none shadow-sm"
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                        </select>
                      </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                              <tr>
                                  <th className="px-6 py-4">자재명 / 품목</th>
                                  <th className="px-6 py-4">공급업체</th>
                                  <th className="px-6 py-4">총 수량</th>
                                  <th className="px-6 py-4">특이사항</th>
                                  {isAdmin && <th className="px-6 py-4 text-right">Action</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredMaterials.map(mat => (
                                  <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-slate-800">{mat.name}</div>
                                          <div className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">{mat.category}</div>
                                      </td>
                                      <td className="px-6 py-4 text-slate-500 text-xs font-medium">{mat.supplier || '-'}</td>
                                      <td className="px-6 py-4">
                                          <span className="text-base font-black text-emerald-600">{mat.quantity.toLocaleString()}</span>
                                          <span className="ml-1 text-xs font-bold text-slate-400">{mat.unit}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <p className="text-xs text-slate-500 leading-relaxed max-w-[200px] truncate" title={mat.notes}>{mat.notes || '-'}</p>
                                      </td>
                                      {isAdmin && (
                                          <td className="px-6 py-4 text-right">
                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end space-x-2">
                                                  <button onClick={() => { setEditingMat(mat); setMatForm({ ...mat }); setIsMatModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shadow-sm"><Edit2 size={14}/></button>
                                                  <button onClick={() => deleteMaterial(mat.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg shadow-sm"><Trash2 size={14}/></button>
                                              </div>
                                          </td>
                                      )}
                                  </tr>
                              ))}
                              {filteredMaterials.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="py-24 text-center">
                                          <Package size={40} className="mx-auto text-slate-200 mb-4"/>
                                          <p className="text-slate-400 text-sm font-medium">해당 조건의 기록이 없습니다.</p>
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </section>
          </div>
        )}

        {/* Other Tabs (LOGS, PEOPLE) */}
        {activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="col-span-full mb-2">
                    <div className="relative">
                        <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                            placeholder="일지 내용, 제목, 태그 검색..."
                            value={logSearchTerm}
                            onChange={(e) => setLogSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {relatedLogs.map(log => <LogCard key={log.id} log={log} />)}
                {relatedLogs.length === 0 && <div className="col-span-full py-24 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <Search size={32} className="mx-auto mb-3 opacity-20"/>
                    검색 결과가 없습니다.
                </div>}
            </div>
        )}

        {activeTab === 'PEOPLE' && (
            <div className="space-y-10 animate-in fade-in duration-500">
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                            <Users size={20} className="mr-2 text-brand-600"/> 현재 재직 중인 인물 <span className="ml-2 text-xs font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{currentStaff.length}</span>
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {currentStaff.map(person => (
                            <div key={person.id} onClick={() => navigate(`/people/${person.id}`)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all cursor-pointer flex items-center group">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mr-4 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shadow-inner"><User size={24}/></div>
                                <div>
                                    <div className="font-bold text-slate-900 text-base">{person.name}</div>
                                    <div className="text-xs font-bold text-brand-600">{person.currentRole}</div>
                                </div>
                                <div className="ml-auto text-slate-300 group-hover:text-brand-500 transition-colors"><ArrowRight size={18}/></div>
                            </div>
                        ))}
                    </div>
                </section>

                {formerStaff.length > 0 && (
                    <section>
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                            <History size={20} className="mr-2 text-slate-500"/> 전직 인사 정보 <span className="ml-2 text-xs font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{formerStaff.length}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {formerStaff.map(person => (
                                <div key={person.id} onClick={() => navigate(`/people/${person.id}`)} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all cursor-pointer flex items-center grayscale-[0.5] hover:grayscale-0">
                                    <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center mr-4 text-slate-400"><User size={24}/></div>
                                    <div>
                                        <div className="font-bold text-slate-700 text-base">{person.name}</div>
                                        <div className="text-xs font-medium text-slate-500 italic">이전 근무자</div>
                                    </div>
                                    <div className="ml-auto text-slate-300"><ArrowRight size={18}/></div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-900 flex items-center"><Calculator size={20} className="mr-2 text-blue-600"/> {editingFin ? '재무 실적 수정' : '신규 실적 등록'}</h3>
                      <button onClick={() => setIsFinModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">연도 (Year)</label>
                          <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:ring-blue-500 focus:border-blue-500" value={finForm.year} onChange={(e) => setFinForm({...finForm, year: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">연 매출액 (KRW)</label>
                          <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:ring-blue-500 focus:border-blue-500" value={finForm.revenue} onChange={(e) => setFinForm({...finForm, revenue: Number(e.target.value)})} placeholder="0" />
                          <p className="mt-1 text-[10px] text-blue-600 font-bold">{formatKRW(finForm.revenue)}</p>
                      </div>
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">영업 이익 (KRW)</label>
                          <input type="number" className="w-full border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:ring-blue-500 focus:border-blue-500" value={finForm.profit} onChange={(e) => setFinForm({...finForm, profit: Number(e.target.value)})} placeholder="0" />
                          <p className="mt-1 text-[10px] text-emerald-600 font-bold">{formatKRW(finForm.profit)}</p>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 flex justify-end space-x-3 border-t border-slate-100">
                      <button onClick={() => setIsFinModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">취소</button>
                      <button onClick={handleSaveFinancial} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">실적 저장 완료</button>
                  </div>
              </div>
          </div>
      )}

      {/* Material Modal */}
      {isMatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-900 flex items-center"><Box size={20} className="mr-2 text-emerald-600"/> {editingMat ? '자재 정보 수정' : '신규 자재 등록'}</h3>
                      <button onClick={() => setIsMatModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">카테고리</label>
                            <select className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold bg-white" value={matForm.category} onChange={(e) => setMatForm({...matForm, category: e.target.value as MaterialCategory})}>
                                {Object.values(MaterialCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">기준 연도</label>
                            <input type="number" className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold" value={matForm.year} onChange={(e) => setMatForm({...matForm, year: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">자재명 / 모델명</label>
                          <input type="text" className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold" value={matForm.name} onChange={(e) => setMatForm({...matForm, name: e.target.value})} placeholder="예: 벤트그라스 씨앗, 다이아톤 등" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">수량</label>
                            <input type="number" className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold" value={matForm.quantity} onChange={(e) => setMatForm({...matForm, quantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">단위</label>
                            <input type="text" className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold" value={matForm.unit} onChange={(e) => setMatForm({...matForm, unit: e.target.value})} placeholder="kg, L, 개 등" />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">공급 및 제조사</label>
                          <input type="text" className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold" value={matForm.supplier} onChange={(e) => setMatForm({...matForm, supplier: e.target.value})} placeholder="공급업체 명칭" />
                      </div>
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase mb-1.5 block">관리 비고</label>
                          <textarea className="w-full border-slate-200 rounded-xl p-3 text-sm h-24" value={matForm.notes} onChange={(e) => setMatForm({...matForm, notes: e.target.value})} placeholder="재고 현황이나 사용 목적 등" />
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 flex justify-end space-x-3 border-t border-slate-100">
                      <button onClick={() => setIsMatModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">취소</button>
                      <button onClick={handleSaveMaterial} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95">정보 저장 완료</button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Material Preview Modal */}
      {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
                      <div className="flex items-center">
                          <div className="bg-white/20 p-2 rounded-xl mr-4 shadow-inner">
                              <Sparkles className="text-amber-300" size={24}/>
                          </div>
                          <div>
                              <h3 className="font-bold text-lg leading-tight">AI 지능형 자재 분석 결과</h3>
                              <p className="text-xs text-indigo-200 opacity-80">문서에서 추출된 자재 내역을 검토하십시오.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/60 hover:text-white transition-colors"><X size={28}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-4">
                          {previewMaterials.map((item, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 80}ms` }}>
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-500 border border-slate-100 shadow-inner">
                                          <Package size={20}/>
                                      </div>
                                      <div>
                                          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.category}</div>
                                          <div className="font-bold text-slate-800 text-base">{item.name}</div>
                                          <div className="text-xs text-slate-400 font-medium flex items-center mt-1">
                                              <ArrowRightLeft size={10} className="mr-1"/> {item.supplier || '제조사 미상'}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-xl font-black text-slate-900">
                                          {item.quantity.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">{item.unit}</span>
                                      </div>
                                      <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">{item.year}년 기준</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center text-slate-500 text-sm">
                          <CheckCircle size={18} className="mr-2 text-green-500"/>
                          총 <span className="font-bold text-slate-900 mx-1">{previewMaterials.length}건</span>의 자재가 분석되었습니다.
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={() => setIsPreviewModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">닫기</button>
                        <button onClick={applyPreviewMaterials} className="bg-indigo-600 text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center active:scale-95">
                            <CheckCircle size={20} className="mr-2"/> 마스터 DB에 전체 반영
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Course Info Modal (Standard) */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center"><Database size={20} className="mr-2 text-brand-600"/> 골프장 마스터 정보 수정</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={28} /></button>
                </div>
                <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar">
                    
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center border-b pb-2"><Info size={14} className="mr-2"/> 기본 시설 데이터</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">골프장 공식 명칭</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">행정 구역 (지역)</label>
                                <select className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500 bg-white" value={editForm.region} onChange={(e) => setEditForm({...editForm, region: e.target.value as Region})}>
                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">개장 년도</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.openYear} onChange={(e) => setEditForm({...editForm, openYear: e.target.value})} placeholder="2004" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">코스 규모 (홀)</label>
                                <input type="number" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.holes} onChange={(e) => setEditForm({...editForm, holes: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">운영 형태</label>
                                <select className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500 bg-white" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value as CourseType})}>
                                    <option value={CourseType.MEMBER}>회원제</option>
                                    <option value={CourseType.PUBLIC}>대중제</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">상세 주소</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Grass Specs */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center border-b pb-2"><Sprout size={14} className="mr-2"/> 코스 잔디 스펙</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">그린 잔디</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.grassInfo?.green || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'green', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">티 잔디</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.grassInfo?.tee || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'tee', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">페어웨이 잔디</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.grassInfo?.fairway || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'fairway', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">대표 잔디 타입</label>
                                <select className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500 bg-white" value={editForm.grassType} onChange={(e) => setEditForm({...editForm, grassType: e.target.value as GrassType})}>
                                    <option value={GrassType.BENTGRASS}>벤트그라스</option>
                                    <option value={GrassType.ZOYSIA}>한국잔디</option>
                                    <option value={GrassType.KENTUCKY}>캔터키블루그라스</option>
                                    <option value={GrassType.MIXED}>혼합</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Area Specs */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center border-b pb-2"><Map size={14} className="mr-2"/> 면적 데이터</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">총 부지 면적</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.areaInfo?.total || ''} onChange={(e) => { setEditForm({...editForm, area: e.target.value}); handleNestedEditChange('areaInfo', 'total', e.target.value); }} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">그린 총 면적</label>
                                <input type="text" className="w-full rounded-xl border-slate-200 text-sm font-bold focus:ring-brand-500" value={editForm.areaInfo?.green || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'green', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* History & Issues */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center border-b pb-2"><History size={14} className="mr-2"/> 연혁 및 히스토리 관리</h4>
                        <div className="space-y-3">
                            {editForm.issues?.map((issue, idx) => (
                                <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-right-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 rounded-xl border-slate-200 text-sm font-medium focus:ring-brand-500" 
                                        value={issue} 
                                        onChange={(e) => handleUpdateIssue(idx, e.target.value)} 
                                        placeholder="이슈 또는 역사적 이정표를 입력하세요."
                                    />
                                    <button 
                                        onClick={() => handleRemoveIssue(idx)} 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={handleAddIssue}
                                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center justify-center font-bold text-sm"
                            >
                                <Plus size={18} className="mr-2"/> 히스토리 항목 추가
                            </button>
                        </div>
                    </div>

                    {/* Extra */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center border-b pb-2"><ClipboardList size={14} className="mr-2"/> 골프장 상세 개요</h4>
                        <div>
                            <textarea rows={8} className="w-full rounded-xl border-slate-200 text-sm font-medium focus:ring-brand-500 leading-relaxed" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="골프장 특징, 연혁, 주요 이슈 등을 서술형으로 입력하세요." />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 shrink-0 shadow-inner">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">취소</button>
                    <button onClick={() => { updateCourse(editForm); setIsEditModalOpen(false); alert('골프장 정보가 성공적으로 반영되었습니다.'); }} className="px-10 py-3 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 flex items-center shadow-lg transform active:scale-95 transition-all"><CheckCircle size={20} className="mr-2" />마스터 DB 업데이트</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
