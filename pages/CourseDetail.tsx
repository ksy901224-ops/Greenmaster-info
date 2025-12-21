
import React, { useState, useEffect, useMemo, useRef } from 'react';
import LogCard from '../components/LogCard';
import { generateCourseSummary, analyzeMaterialInventory } from '../services/geminiService';
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

  if (!course) return <div className="p-8 text-center font-bold text-slate-400">골프장을 찾을 수 없습니다.</div>;

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

  const courseMaterials = useMemo(() => materials.filter(m => m.courseId === id), [materials, id]);

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
    if (editingFin) updateFinancial({ ...editingFin, ...finForm, updatedAt: Date.now() });
    else addFinancial({ id: `fin-${Date.now()}`, courseId: id!, ...finForm, updatedAt: Date.now() });
    setIsFinModalOpen(false);
    setEditingFin(null);
  };

  const handleSaveMaterial = () => {
    if (editingMat) updateMaterial({ ...editingMat, ...matForm, lastUpdated: new Date().toISOString() });
    else addMaterial({ id: `mat-${Date.now()}`, courseId: id!, ...matForm, lastUpdated: new Date().toISOString() });
    setIsMatModalOpen(false);
    setEditingMat(null);
  };

  const handleDeleteCourse = () => {
    if (window.confirm(`정말로 '${course.name}' 골프장 정보를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        deleteCourse(course.id);
        navigate('/courses');
    }
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
    if (editForm) setEditForm({ ...editForm, issues: [...(editForm.issues || []), ""] });
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
            <div className="flex space-x-1">
                <button onClick={openEditModal} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-colors" title="정보 수정"><Edit2 size={18} /></button>
                <button onClick={handleDeleteCourse} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="삭제"><Trash2 size={18} /></button>
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
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center"><Sprout size={14} className="mr-2"/> 잔디 식재 정보</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: '그린 (Green)', value: course.grassInfo?.green || '정보없음' },
                                { label: '티 (Tee)', value: course.grassInfo?.tee || '정보없음' },
                                { label: '페어웨이 (Fairway)', value: course.grassInfo?.fairway || '정보없음' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-500">{item.label}</span>
                                    <span className="text-sm font-bold text-slate-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-8 shadow-inner italic">
                    {course.description || '상세 설명이 없습니다.'}
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
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 mb-8">
                      <div className="space-y-1">
                          <h3 className="text-2xl font-black text-slate-900 flex items-center tracking-tight">
                              <PieChart size={28} className="mr-3 text-blue-600 bg-blue-50 p-1.5 rounded-xl"/> 경영 실적 및 수익성 추이
                          </h3>
                      </div>
                      {isAdmin && (
                          <button onClick={() => { setEditingFin(null); setFinForm({ year: new Date().getFullYear(), revenue: 0, profit: 0 }); setIsFinModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center shadow-lg active:scale-95"><Plus size={18} className="mr-2"/> 실적 추가</button>
                      )}
                  </div>

                  {financialStats ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">당기 매출액</span>
                              <div className="text-2xl font-black text-slate-900 leading-none">{formatKRW(financialStats.latest.revenue)}</div>
                          </div>
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">영업이익률</span>
                              <div className="text-2xl font-black text-slate-900 leading-none">{financialStats.margin.toFixed(1)}%</div>
                          </div>
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">매출 성장률</span>
                              <div className={`text-2xl font-black leading-none ${financialStats.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{financialStats.growth >= 0 ? '+' : ''}{financialStats.growth.toFixed(1)}%</div>
                          </div>
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">이익률 변동</span>
                              <div className={`text-2xl font-black leading-none ${financialStats.marginDiff >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{financialStats.marginDiff >= 0 ? '+' : ''}{financialStats.marginDiff.toFixed(1)}%p</div>
                          </div>
                      </div>
                  ) : (
                      <div className="py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 text-sm font-bold">등록된 재무 데이터가 없습니다.</p>
                      </div>
                  )}
              </div>

              <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                      <h3 className="text-2xl font-black text-slate-900 flex items-center tracking-tight">
                          <Box size={28} className="mr-3 text-emerald-600 bg-emerald-50 p-1.5 rounded-xl"/> 자재 인벤토리 관리
                      </h3>
                      {isAdmin && (
                          <button onClick={() => { setEditingMat(null); setMatForm({ category: matCategory, name: '', quantity: 0, unit: 'kg', supplier: '', notes: '', year: matYearFilter }); setIsMatModalOpen(true); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center shadow-lg"><Plus size={18} className="mr-2"/> 자재 추가</button>
                      )}
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                              <tr><th className="px-6 py-4">품목명</th><th className="px-6 py-4">분류</th><th className="px-6 py-4 text-right">수량</th><th className="px-6 py-4 text-right">관리</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredMaterials.map(mat => (
                                  <tr key={mat.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 font-bold">{mat.name}</td>
                                      <td className="px-6 py-4 text-xs">{mat.category}</td>
                                      <td className="px-6 py-4 text-right font-black">{mat.quantity.toLocaleString()} {mat.unit}</td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end space-x-1">
                                              {/* Fix: Explicitly set matForm fields to resolve TS error with optional properties */}
                                              <button onClick={() => { setEditingMat(mat); setMatForm({ category: mat.category, name: mat.name, quantity: mat.quantity, unit: mat.unit, supplier: mat.supplier || '', notes: mat.notes || '', year: mat.year }); setIsMatModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit2 size={14}/></button>
                                              <button onClick={() => deleteMaterial(mat.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </section>
          </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="col-span-full mb-2">
                    <div className="relative group">
                        <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20}/>
                        <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none text-sm font-bold" placeholder="일지 검색..." value={logSearchTerm} onChange={(e) => setLogSearchTerm(e.target.value)} />
                    </div>
                </div>
                {relatedLogs.map(log => <LogCard key={log.id} log={log} />)}
                {relatedLogs.length === 0 && <div className="col-span-full py-32 text-center text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 font-bold">일치하는 업무 기록이 없습니다.</div>}
            </div>
        )}

        {activeTab === 'PEOPLE' && (
            <div className="space-y-10 animate-in fade-in duration-500">
                <section>
                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center"><Users size={24} className="mr-3 text-brand-600 bg-brand-50 p-1 rounded-lg"/> 현재 재직 중인 인맥</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentStaff.map(person => (
                            <div key={person.id} onClick={() => navigate(`/people/${person.id}`)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-lg transition-all cursor-pointer flex items-center group">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mr-4 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 font-black">{person.name[0]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-slate-900 truncate">{person.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{person.currentRole}</div>
                                </div>
                                <ArrowRight size={18} className="text-slate-200 group-hover:text-brand-500 transition-colors ml-2"/>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        )}
      </div>

      {/* Edit Course Info Modal */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-black text-xl text-slate-900 flex items-center tracking-tight"><Database size={24} className="mr-3 text-brand-600"/> 골프장 마스터 정보 관리</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-200 rounded-xl"><X size={28} /></button>
                </div>
                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">공식 명칭</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 text-lg font-black focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 p-4" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">행정 구역</label>
                            <select className="w-full rounded-2xl border-slate-200 text-sm font-black p-4 bg-white" value={editForm.region} onChange={(e) => setEditForm({...editForm, region: e.target.value as Region})}>
                                {regions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">홀 수</label>
                            <input type="number" className="w-full rounded-2xl border-slate-200 text-sm font-black p-4" value={editForm.holes} onChange={(e) => setEditForm({...editForm, holes: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">Grass Specification</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Green</label><input type="text" className="w-full rounded-xl border-slate-200 p-3 text-sm font-bold" value={editForm.grassInfo?.green} onChange={(e) => handleNestedEditChange('grassInfo', 'green', e.target.value)} /></div>
                            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Tee</label><input type="text" className="w-full rounded-xl border-slate-200 p-3 text-sm font-bold" value={editForm.grassInfo?.tee} onChange={(e) => handleNestedEditChange('grassInfo', 'tee', e.target.value)} /></div>
                            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Fairway</label><input type="text" className="w-full rounded-xl border-slate-200 p-3 text-sm font-bold" value={editForm.grassInfo?.fairway} onChange={(e) => handleNestedEditChange('grassInfo', 'fairway', e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline / Issues</h4>
                            <button onClick={handleAddIssue} className="text-[10px] font-black bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl border border-brand-100 hover:bg-brand-100 flex items-center"><Plus size={14} className="mr-1"/> 추가</button>
                        </div>
                        <div className="space-y-2">
                            {editForm.issues?.map((issue, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input type="text" className="flex-1 rounded-xl border-slate-200 text-sm p-3" value={issue} onChange={(e) => handleUpdateIssue(idx, e.target.value)} />
                                    <button onClick={() => handleRemoveIssue(idx)} className="p-3 text-red-400 hover:text-red-600 bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end space-x-4 shrink-0">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-3.5 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest">취소</button>
                    <button onClick={() => { updateCourse(editForm); setIsEditModalOpen(false); alert('수정되었습니다.'); }} className="px-12 py-3.5 text-sm font-black text-white bg-brand-600 rounded-2xl hover:bg-brand-700 shadow-xl transition-all uppercase tracking-widest">저장 완료</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
