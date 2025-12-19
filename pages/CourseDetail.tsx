
import React, { useState, useEffect, useMemo, useRef } from 'react';
import LogCard from '../components/LogCard';
import { generateCourseSummary, analyzeMaterialInventory } from '../services/geminiService';
import { Info, FileText, Users, User, Sparkles, History, Edit2, X, CheckCircle, MapPin, Trash2, Globe, Loader2, List, AlertTriangle, Plus, Minus, Lock, Calendar, Ruler, Map, Calculator, ArrowRightLeft, Cloud, Search, ArrowRight, BarChart3, TrendingUp, TrendingDown, Package, Droplets, Sprout, Box, Upload, Camera, Database, DollarSign, PieChart, ClipboardList } from 'lucide-react';
import { AffinityLevel, CourseType, GrassType, GolfCourse, FinancialRecord, MaterialRecord, MaterialCategory, UserRole, Region } from '../types';
import { useApp } from '../contexts/AppContext';

const CourseDetail: React.FC = () => {
  const { user, courses, logs, updateCourse, deleteCourse, people, canUseAI, canViewFullData, isAdmin, navigate, routeParams, locationState, financials, materials, addFinancial, updateFinancial, deleteFinancial, addMaterial, updateMaterial, deleteMaterial } = useApp();
  const id = routeParams.id;
  
  const course = courses.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGS' | 'PEOPLE' | 'MANAGEMENT'>('INFO');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
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
      return financials.filter(f => f.courseId === id).sort((a, b) => Number(b.year) - Number(a.year));
  }, [financials, id]);

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

  // --- Issue Management Handlers ---
  const handleAddIssue = () => {
    if (editForm) {
      setEditForm({
        ...editForm,
        issues: [...(editForm.issues || []), ""]
      });
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
        <div className="flex justify-between items-start mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <div className="flex space-x-2">
                <button onClick={openEditModal} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-colors" title="정보 수정"><Edit2 size={18} /></button>
            </div>
        </div>
        <p className="text-slate-500 text-sm flex items-center mb-4">
          <span className="mr-3 flex items-center"><MapPin size={14} className="mr-1"/> {course.address}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs border border-slate-200">{course.type}</span>
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4 border-slate-100">
          <div><span className="block text-slate-400 text-xs mb-0.5">규모 / 면적</span><span className="font-medium text-slate-700">{course.holes}홀 / {course.area || '-'}</span></div>
          <div><span className="block text-slate-400 text-xs mb-0.5">코스 전장</span><span className="font-medium text-slate-700">{course.length || '-'}</span></div>
          <div><span className="block text-slate-400 text-xs mb-0.5">주요 잔디</span><span className="font-medium text-slate-700">{course.grassType}</span></div>
          <div><span className="block text-slate-400 text-xs mb-0.5">개장 년도</span><span className="font-medium text-slate-700">{course.openYear}년</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('INFO')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${activeTab === 'INFO' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Info size={16} className="mr-2" /> 기본 정보/스펙</button>
          {canViewFullData && (
              <>
                  <button onClick={() => setActiveTab('MANAGEMENT')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${activeTab === 'MANAGEMENT' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><BarChart3 size={16} className="mr-2" /> 운영 관리</button>
                  <button onClick={() => setActiveTab('LOGS')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${activeTab === 'LOGS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><FileText size={16} className="mr-2" /> 업무 일지 ({relatedLogs.length})</button>
                  <button onClick={() => setActiveTab('PEOPLE')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${activeTab === 'PEOPLE' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Users size={16} className="mr-2" /> 인맥 ({currentStaff.length + formerStaff.length})</button>
              </>
          )}
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'INFO' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4 flex items-center"><Database size={18} className="mr-2 text-brand-600"/> 상세 코스 스펙 (Specification)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Grass Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center"><Sprout size={14} className="mr-2"/> 잔디 식재 정보</h4>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">그린 (Green)</span>
                                <span className="font-bold text-slate-700">{course.grassInfo?.green || '벤트그라스'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">티 (Tee)</span>
                                <span className="font-bold text-slate-700">{course.grassInfo?.tee || '켄터키 블루그라스'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">페어웨이 (Fairway)</span>
                                <span className="font-bold text-slate-700">{course.grassInfo?.fairway || '중지 (한국잔디)'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Area Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center"><Map size={14} className="mr-2"/> 구역별 면적 정보</h4>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">총 면적</span>
                                <span className="font-bold text-slate-700">{course.areaInfo?.total || course.area}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">그린 면적</span>
                                <span className="font-bold text-slate-700">{course.areaInfo?.green || '정보없음'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">티 면적</span>
                                <span className="font-bold text-slate-700">{course.areaInfo?.tee || '정보없음'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">페어웨이 면적</span>
                                <span className="font-bold text-slate-700">{course.areaInfo?.fairway || '정보없음'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4">특이사항 및 개요</h3>
                <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">{course.description}</p>
                <h3 className="font-bold text-lg mb-4 flex items-center"><History size={18} className="mr-2 text-slate-500"/>연혁 및 주요 이슈</h3>
                <div className="space-y-4">
                    {course.issues && course.issues.length > 0 ? (
                        course.issues.map((issue, idx) => (
                            <div key={idx} className="flex group">
                                <div className="flex-shrink-0 w-4 h-4 mt-1 mr-3 rounded-full bg-slate-200 border-2 border-white shadow-sm group-hover:bg-brand-500 transition-colors"></div>
                                <div className="pb-2 border-l-2 border-slate-100 pl-4 -ml-5 pt-0.5 w-full">
                                    <p className="text-slate-800 text-sm">{issue}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">기록된 이슈가 없습니다.</div>
                    )}
                </div>
            </div>
          </div>
        )}

        {canViewFullData && activeTab === 'MANAGEMENT' && (
          <div className="space-y-8 animate-in fade-in duration-300">
              {/* Financial Records Section */}
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center">
                          <DollarSign size={20} className="mr-2 text-blue-600"/> 매출 및 재무 현황
                      </h3>
                      {isAdmin && (
                          <button 
                            onClick={() => { setEditingFin(null); setFinForm({ year: new Date().getFullYear(), revenue: 0, profit: 0 }); setIsFinModalOpen(true); }}
                            className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center"
                          >
                              <Plus size={14} className="mr-1"/> 데이터 추가
                          </button>
                      )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {courseFinancials.length > 0 ? courseFinancials.slice(0, 3).map(fin => (
                          <div key={fin.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between group relative">
                              <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-slate-400">{fin.year}년 실적</span>
                                  {isAdmin && (
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                          <button onClick={() => { setEditingFin(fin); setFinForm({ year: fin.year, revenue: fin.revenue, profit: fin.profit || 0 }); setIsFinModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={12}/></button>
                                          <button onClick={() => deleteFinancial(fin.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12}/></button>
                                      </div>
                                  )}
                              </div>
                              <div className="mt-2">
                                  <div className="text-2xl font-black text-slate-800">{(fin.revenue / 100000000).toFixed(1)}<span className="text-sm font-bold ml-1">억 원</span></div>
                                  <div className="text-xs text-slate-500 mt-1">이익: {(fin.profit || 0 / 100000000).toFixed(1)}억 원</div>
                              </div>
                          </div>
                      )) : (
                          <div className="col-span-full py-12 text-center text-slate-400 text-sm border-2 border-dashed rounded-2xl">등록된 재무 데이터가 없습니다.</div>
                      )}
                  </div>
              </section>

              {/* Material Inventory Section */}
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center">
                              <Package size={20} className="mr-2 text-emerald-600"/> 코스 자재 사용 및 재고
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">농약, 비료 등 코스 관리에 투입된 자재 내역입니다.</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                          {canUseAI && (
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingMat}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center shadow-md disabled:opacity-50"
                              >
                                  {isUploadingMat ? <Loader2 size={14} className="animate-spin mr-2"/> : <Sparkles size={14} className="mr-2 text-amber-300"/>}
                                  AI 자재분석 등록
                                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                              </button>
                          )}
                          {isAdmin && (
                              <button 
                                onClick={() => { setEditingMat(null); setMatForm({ category: matCategory, name: '', quantity: 0, unit: 'kg', supplier: '', notes: '', year: matYearFilter }); setIsMatModalOpen(true); }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center shadow-md"
                              >
                                  <Plus size={14} className="mr-1"/> 수기 등록
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-1">
                          {Object.values(MaterialCategory).map(cat => (
                              <button 
                                key={cat} 
                                onClick={() => setMatCategory(cat)} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${matCategory === cat ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200' : 'text-slate-500 hover:text-slate-800'}`}
                              >
                                  {cat}
                              </button>
                          ))}
                      </div>
                      <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                      <select 
                        value={matYearFilter} 
                        onChange={(e) => setMatYearFilter(Number(e.target.value))}
                        className="text-xs font-bold bg-white border border-slate-200 rounded-lg py-1 px-2 focus:ring-emerald-500"
                      >
                          {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                      </select>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                              <tr>
                                  <th className="px-4 py-3">자재명</th>
                                  <th className="px-4 py-3">공급처</th>
                                  <th className="px-4 py-3">수량</th>
                                  <th className="px-4 py-3">비고</th>
                                  {isAdmin && <th className="px-4 py-3 text-right">관리</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredMaterials.map(mat => (
                                  <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-700">{mat.name}</td>
                                      <td className="px-4 py-3 text-slate-500 text-xs">{mat.supplier || '-'}</td>
                                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{mat.quantity.toLocaleString()}{mat.unit}</td>
                                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]">{mat.notes || '-'}</td>
                                      {isAdmin && (
                                          <td className="px-4 py-3 text-right space-x-2">
                                              <button onClick={() => { setEditingMat(mat); setMatForm({ ...mat }); setIsMatModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                              <button onClick={() => deleteMaterial(mat.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                          </td>
                                      )}
                                  </tr>
                              ))}
                              {filteredMaterials.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="py-20 text-center text-slate-400 text-xs italic">해당 카테고리의 기록이 없습니다.</td>
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
                {relatedLogs.map(log => <LogCard key={log.id} log={log} />)}
                {relatedLogs.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed">관련 업무 일지가 없습니다.</div>}
            </div>
        )}

        {activeTab === 'PEOPLE' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Users size={20} className="mr-2 text-brand-600"/> 현재 재직 중 ({currentStaff.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentStaff.map(person => (
                            <div key={person.id} onClick={() => navigate(`/people/${person.id}`)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-brand-500 transition-all cursor-pointer flex items-center">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-3 text-slate-500"><User size={20}/></div>
                                <div><div className="font-bold text-slate-900">{person.name}</div><div className="text-xs text-brand-600">{person.currentRole}</div></div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        )}
      </div>

      {/* --- Modals --- */}
      
      {/* Financial Modal */}
      {isFinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg">{editingFin ? '재무 실적 수정' : '신규 실적 등록'}</h3>
                      <button onClick={() => setIsFinModalOpen(false)}><X/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">연도</label>
                          <input type="number" className="w-full border rounded-lg p-2" value={finForm.year} onChange={(e) => setFinForm({...finForm, year: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">연 매출액 (원)</label>
                          <input type="number" className="w-full border rounded-lg p-2" value={finForm.revenue} onChange={(e) => setFinForm({...finForm, revenue: Number(e.target.value)})} placeholder="예: 5000000000" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">영업 이익 (원)</label>
                          <input type="number" className="w-full border rounded-lg p-2" value={finForm.profit} onChange={(e) => setFinForm({...finForm, profit: Number(e.target.value)})} placeholder="예: 1000000000" />
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 flex justify-end space-x-2">
                      <button onClick={() => setIsFinModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">취소</button>
                      <button onClick={handleSaveFinancial} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md">저장 완료</button>
                  </div>
              </div>
          </div>
      )}

      {/* Material Modal */}
      {isMatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg">{editingMat ? '자재 정보 수정' : '신규 자재 등록'}</h3>
                      <button onClick={() => setIsMatModalOpen(false)}><X/></button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">카테고리</label>
                            <select className="w-full border rounded-lg p-2 text-sm" value={matForm.category} onChange={(e) => setMatForm({...matForm, category: e.target.value as MaterialCategory})}>
                                {Object.values(MaterialCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">기준 연도</label>
                            <input type="number" className="w-full border rounded-lg p-2 text-sm" value={matForm.year} onChange={(e) => setMatForm({...matForm, year: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">자재명</label>
                          <input type="text" className="w-full border rounded-lg p-2 text-sm" value={matForm.name} onChange={(e) => setMatForm({...matForm, name: e.target.value})} placeholder="예: 바로싹 입제" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">수량</label>
                            <input type="number" className="w-full border rounded-lg p-2 text-sm" value={matForm.quantity} onChange={(e) => setMatForm({...matForm, quantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">단위</label>
                            <input type="text" className="w-full border rounded-lg p-2 text-sm" value={matForm.unit} onChange={(e) => setMatForm({...matForm, unit: e.target.value})} placeholder="kg, L, box 등" />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">공급업체</label>
                          <input type="text" className="w-full border rounded-lg p-2 text-sm" value={matForm.supplier} onChange={(e) => setMatForm({...matForm, supplier: e.target.value})} placeholder="예: (주)농경" />
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 flex justify-end space-x-2">
                      <button onClick={() => setIsMatModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">취소</button>
                      <button onClick={handleSaveMaterial} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md">저장 완료</button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Material Preview Modal */}
      {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
                      <div className="flex items-center">
                          <Sparkles className="mr-3 text-amber-300" size={24}/>
                          <div>
                              <h3 className="font-bold text-lg">AI 자재 분석 결과</h3>
                              <p className="text-xs text-indigo-200">추출된 데이터를 검토하고 최종 승인하세요.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/70 hover:text-white"><X/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-3">
                          {previewMaterials.map((item, idx) => (
                              <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                                  <div>
                                      <div className="text-[10px] font-bold text-indigo-500 uppercase">{item.category}</div>
                                      <div className="font-bold text-slate-800">{item.name}</div>
                                      <div className="text-xs text-slate-500">{item.supplier || '공급처 미상'}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-lg font-black text-indigo-600">{item.quantity}{item.unit}</div>
                                      <div className="text-[10px] text-slate-400">{item.year}년 기준</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs text-slate-500">총 {previewMaterials.length}건의 자재 항목이 감지되었습니다.</p>
                      <div className="flex space-x-3">
                        <button onClick={() => setIsPreviewModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500">취소</button>
                        <button onClick={applyPreviewMaterials} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center">
                            <CheckCircle size={18} className="mr-2"/> 전체 등록하기
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Course Info Modal (Expanded to All Fields) */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center"><Database size={20} className="mr-2 text-brand-600"/> 골프장 상세 정보 수정</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                    
                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center border-b pb-2"><Info size={14} className="mr-2"/> 기본 정보</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">골프장 명</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">지역</label>
                                <select className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.region} onChange={(e) => setEditForm({...editForm, region: e.target.value as Region})}>
                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">개장 연도</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.openYear} onChange={(e) => setEditForm({...editForm, openYear: e.target.value})} placeholder="예: 2004" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">홀 수</label>
                                <input type="number" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.holes} onChange={(e) => setEditForm({...editForm, holes: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">운영 형태</label>
                                <select className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value as CourseType})}>
                                    <option value={CourseType.MEMBER}>회원제</option>
                                    <option value={CourseType.PUBLIC}>대중제</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">주소</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Grass Specs */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center border-b pb-2"><Sprout size={14} className="mr-2"/> 잔디 식재 스펙</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">그린 잔디</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.grassInfo?.green || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'green', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">티 잔디</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.grassInfo?.tee || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'tee', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">페어웨이 잔디</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.grassInfo?.fairway || ''} onChange={(e) => handleNestedEditChange('grassInfo', 'fairway', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">주요 잔디 타입 (대표)</label>
                                <select className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.grassType} onChange={(e) => setEditForm({...editForm, grassType: e.target.value as GrassType})}>
                                    <option value={GrassType.BENTGRASS}>벤트그라스</option>
                                    <option value={GrassType.ZOYSIA}>한국잔디</option>
                                    <option value={GrassType.KENTUCKY}>캔터키블루그라스</option>
                                    <option value={GrassType.MIXED}>혼합</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Area Specs */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center border-b pb-2"><Map size={14} className="mr-2"/> 면적 정보 (Area)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">총 면적</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.areaInfo?.total || ''} onChange={(e) => { setEditForm({...editForm, area: e.target.value}); handleNestedEditChange('areaInfo', 'total', e.target.value); }} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">그린 면적</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.areaInfo?.green || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'green', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">티 면적</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.areaInfo?.tee || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'tee', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">페어웨이 면적</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.areaInfo?.fairway || ''} onChange={(e) => handleNestedEditChange('areaInfo', 'fairway', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: History & Issues */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center border-b pb-2"><History size={14} className="mr-2"/> 연혁 및 주요 이슈</h4>
                        <div className="space-y-3">
                            {editForm.issues?.map((issue, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        className="flex-1 rounded-lg border-slate-300 text-sm focus:ring-brand-500" 
                                        value={issue} 
                                        onChange={(e) => handleUpdateIssue(idx, e.target.value)} 
                                        placeholder="이슈 내용을 입력하세요."
                                    />
                                    <button 
                                        onClick={() => handleRemoveIssue(idx)} 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={handleAddIssue}
                                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-brand-600 hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center justify-center font-bold text-sm"
                            >
                                <Plus size={16} className="mr-1"/> 새로운 이슈 추가
                            </button>
                        </div>
                    </div>

                    {/* Section 5: Extra */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center border-b pb-2"><ClipboardList size={14} className="mr-2"/> 상세 설명 및 비고</h4>
                        <div>
                            <textarea rows={6} className="w-full rounded-lg border-slate-300 text-sm focus:ring-brand-500" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="골프장 특징, 연혁, 주요 이슈 등을 입력하세요." />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 shrink-0">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100">취소</button>
                    <button onClick={() => { updateCourse(editForm); setIsEditModalOpen(false); alert('모든 정보가 성공적으로 수정되었습니다.'); }} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 flex items-center shadow-lg transform active:scale-95 transition-all"><CheckCircle size={16} className="mr-2" />수정사항 반영</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
