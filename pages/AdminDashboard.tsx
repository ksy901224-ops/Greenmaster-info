
import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, UserStatus, Department, UserProfile, SystemLog, GolfCourse, CourseType, GrassType, Region } from '../types';
import { Users, UserPlus, CheckCircle, XCircle, Shield, AlertTriangle, Search, Activity, Ban, RotateCcw, Lock, Unlock, FileText, Siren, X, ChevronDown, Briefcase, List, Calendar, BarChart2, TrendingUp, Clock, Database, Sparkles, Loader2, Upload, BookOpen, MapPin, Zap, Lightbulb, Save, Edit2, Check, AlertCircle, FileUp, Building2 } from 'lucide-react';
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

const AdminDashboard: React.FC = () => {
  const { user, allUsers, systemLogs, updateUserStatus, updateUserRole, updateUserDepartment, logs, courses, navigate, addCourse, updateCourse } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'USERS' | 'LOGS' | 'MASTER'>('MASTER');

  // Master Catalog Sync State
  const [catalogText, setCatalogText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<EnhancedSyncItem[] | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Access Control
  React.useEffect(() => {
    if (user && (user.role !== UserRole.ADMIN && user.role !== UserRole.SENIOR)) {
      alert('접근 권한이 없습니다. 관리자/상급자만 접근 가능합니다.');
      navigate('/');
    }
  }, [user, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSelectedFiles(Array.from(e.target.files));
      }
  };

  const handleCatalogSync = async () => {
      if (!catalogText.trim() && selectedFiles.length === 0) return;
      setIsSyncing(true);
      setSyncResults(null);

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
              const enhanced: EnhancedSyncItem[] = results.map((item, idx) => {
                  const existing = courses.find(c => c.name === item.courseName);
                  return {
                      id: `sync-${Date.now()}-${idx}`,
                      original: item,
                      editable: {
                          courseName: item.courseName,
                          region: (item.course_info?.region as Region) || '기타',
                          address: item.course_info?.address || '',
                          holes: item.course_info?.holes || 18,
                          type: item.course_info?.type || '대중제',
                          openYear: item.course_info?.openYear || new Date().getFullYear().toString(),
                          description: item.description || '',
                          issues: item.strategic_analysis?.issues || []
                      },
                      status: 'pending',
                      conflictType: existing ? 'update' : 'new',
                      isEditing: false
                  };
              });
              setSyncResults(enhanced);
          }
      } catch (error) {
          console.error(error);
          alert('데이터 분석 중 오류가 발생했습니다.');
      } finally {
          setIsSyncing(false);
          setSelectedFiles([]);
      }
  };

  const toggleEdit = (id: string) => {
      setSyncResults(prev => prev ? prev.map(item => 
          item.id === id ? { ...item, isEditing: !item.isEditing } : item
      ) : null);
  };

  const updateEditableField = (id: string, field: string, value: any) => {
      setSyncResults(prev => prev ? prev.map(item => 
          item.id === id ? { ...item, editable: { ...item.editable, [field]: value } } : item
      ) : null);
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
                  area: item.original.course_info?.area || '정보없음',
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
      const pendingItems = syncResults.filter(i => i.status !== 'success');
      if (pendingItems.length === 0) return;

      if (window.confirm(`${pendingItems.length}건의 데이터를 일괄 반영하시겠습니까?`)) {
          setBatchProcessing(true);
          for (const item of pendingItems) {
              await applySyncItem(item.id);
          }
          setBatchProcessing(false);
          alert('일괄 처리가 완료되었습니다.');
      }
  };

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SENIOR)) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <Shield className="mr-3 text-brand-700" size={28} /> 
                시스템 마스터 통합 관리
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-10">전국 골프장 데이터 정합성 관리 및 파일 기반 일괄 업로드를 지원합니다.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl mt-4 md:mt-0 shadow-inner">
             <button onClick={() => setActiveTab('MASTER')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'MASTER' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Database size={16} className="mr-2"/> 데이터 동기화
             </button>
             <button onClick={() => setActiveTab('USERS')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'USERS' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Users size={16} className="mr-2"/> 사용자 계정
             </button>
             <button onClick={() => setActiveTab('LOGS')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'LOGS' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <List size={16} className="mr-2"/> 감사 로그
             </button>
        </div>
      </div>

      {activeTab === 'MASTER' && (
          <div className="space-y-6">
              <div className="bg-indigo-950 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={200} /></div>
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center">
                        <div className="inline-flex items-center space-x-2 bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-300 text-xs font-bold mb-4 w-fit border border-indigo-500/30">
                            <Sparkles size={12}/>
                            <span>Next-Gen Data Ingestion</span>
                        </div>
                        <h2 className="text-3xl font-black mb-3 tracking-tight">전국 골프장 지능형 데이터 동기화</h2>
                        <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                            PDF 문서, 엑셀 캡처, 또는 텍스트 목록을 업로드하세요. <br/>
                            AI가 지역, 주소, 홀수, 개장일 등 핵심 정보를 자동 추출하여 기존 DB와 대조합니다.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition-all active:scale-95 border border-indigo-400/30"
                            >
                                <FileUp size={20} className="mr-2"/> 파일 선택 (PDF/IMG)
                                <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
                            </button>
                            <button 
                                onClick={handleCatalogSync}
                                disabled={isSyncing || (!catalogText.trim() && selectedFiles.length === 0)}
                                className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center disabled:opacity-50 shadow-lg active:scale-95"
                            >
                                {isSyncing ? <Loader2 size={20} className="animate-spin mr-3"/> : <BookOpen size={20} className="mr-3"/>}
                                분석 및 동기화 시작
                            </button>
                        </div>
                        {selectedFiles.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedFiles.map((f, i) => (
                                    <span key={i} className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/20">{f.name}</span>
                                ))}
                            </div>
                        )}
                      </div>
                      
                      <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 focus-within:border-indigo-400 transition-colors shadow-inner">
                          <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-widest">Text Input Area</label>
                          <textarea 
                             className="w-full bg-transparent border-none focus:ring-0 text-indigo-50 text-sm h-48 custom-scrollbar placeholder:text-indigo-300/30 font-mono"
                             placeholder="[전북] 상떼힐 CC, 익산시 춘포면, 6홀, 2009년... [전북] 태인CC, 회원제, 18홀, 1997년..."
                             value={catalogText}
                             onChange={(e) => setCatalogText(e.target.value)}
                          />
                      </div>
                  </div>
              </div>

              {syncResults && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-top-4">
                      <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg flex items-center">
                                <Activity size={20} className="mr-2 text-indigo-600"/>
                                추출 데이터 분석 결과 ({syncResults.length}건)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">시스템에서 자동으로 매칭된 결과를 검토하세요.</p>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                              <button onClick={() => setSyncResults(null)} className="flex-1 sm:flex-none px-4 py-2 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors uppercase tracking-widest">Discard</button>
                              <button 
                                onClick={handleBulkApply}
                                disabled={batchProcessing || syncResults.every(i => i.status === 'success')}
                                className="flex-1 sm:flex-none bg-indigo-600 text-white px-10 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center transition-all disabled:opacity-50"
                              >
                                  {batchProcessing ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                                  일괄 데이터 반영
                              </button>
                          </div>
                      </div>

                      <div className="overflow-x-auto max-h-[800px] custom-scrollbar">
                          <table className="w-full text-sm text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-20">
                                  <tr>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4">Name & Region</th>
                                      <th className="px-6 py-4">Address</th>
                                      <th className="px-6 py-4">Scale</th>
                                      <th className="px-6 py-4">Summary</th>
                                      <th className="px-6 py-4 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {syncResults.map((item) => (
                                      <tr key={item.id} className={`transition-all ${item.status === 'success' ? 'bg-green-50/30' : 'hover:bg-slate-50'}`}>
                                          <td className="px-6 py-4">
                                              {item.status === 'success' ? (
                                                  <div className="flex items-center text-green-600 font-bold">
                                                      <Check size={16} className="mr-1"/> Synced
                                                  </div>
                                              ) : (
                                                  <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-wider ${item.conflictType === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {item.conflictType === 'update' ? 'UPDATE' : 'NEW'}
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              {item.isEditing ? (
                                                  <div className="space-y-2">
                                                    <input type="text" className="w-full text-xs p-1 border rounded" value={item.editable.courseName} onChange={e => updateEditableField(item.id, 'courseName', e.target.value)} />
                                                    <select className="w-full text-[10px] p-1 border rounded bg-white" value={item.editable.region} onChange={e => updateEditableField(item.id, 'region', e.target.value)}>
                                                        {['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종', '기타'].map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                  </div>
                                              ) : (
                                                  <div>
                                                      <div className="font-bold text-slate-900">{item.editable.courseName}</div>
                                                      <div className="text-[10px] text-slate-500 font-bold uppercase">{item.editable.region}</div>
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              {item.isEditing ? (
                                                  <input type="text" className="w-full text-xs p-1 border rounded" value={item.editable.address} onChange={e => updateEditableField(item.id, 'address', e.target.value)} />
                                              ) : (
                                                  <div className="text-xs text-slate-600 max-w-xs truncate">{item.editable.address}</div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="flex items-center space-x-2">
                                                {item.isEditing ? (
                                                    <input type="number" className="w-16 text-xs p-1 border rounded" value={item.editable.holes} onChange={e => updateEditableField(item.id, 'holes', parseInt(e.target.value))} />
                                                ) : (
                                                    <span className="font-bold text-slate-700">{item.editable.holes}H</span>
                                                )}
                                                <span className="text-[10px] text-slate-400">({item.editable.type})</span>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="text-xs text-slate-500 italic max-w-sm line-clamp-2">"{item.editable.description}"</div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {item.status !== 'success' && (
                                                  <div className="flex justify-end space-x-2">
                                                      <button 
                                                          onClick={() => toggleEdit(item.id)}
                                                          className={`p-2 rounded-lg border transition-all ${item.isEditing ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 shadow-sm'}`}
                                                      >
                                                          {item.isEditing ? <Check size={16}/> : <Edit2 size={16}/>}
                                                      </button>
                                                      <button 
                                                          onClick={() => applySyncItem(item.id)}
                                                          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm"
                                                      >
                                                          반영
                                                      </button>
                                                  </div>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'USERS' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800 flex items-center"><Users className="mr-2" size={20}/> 사용자 계정 관리 ({allUsers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4">사용자</th>
                              <th className="px-6 py-4">부서</th>
                              <th className="px-6 py-4">권한 레벨</th>
                              <th className="px-6 py-4">상태</th>
                              <th className="px-6 py-4 text-right">관리</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {allUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-900">{u.name}<div className="text-xs font-normal text-slate-500">{u.email}</div></td>
                                  <td className="px-6 py-4">{u.department}</td>
                                  <td className="px-6 py-4">
                                      <select 
                                          value={u.role}
                                          onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                          className="text-xs border-slate-300 rounded-lg p-1.5 focus:ring-brand-500"
                                      >
                                          {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                      </select>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${u.status === 'APPROVED' ? 'bg-green-100 text-green-700' : u.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                          {u.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      {u.status === 'PENDING' && (
                                          <div className="flex justify-end space-x-1">
                                              <button onClick={() => updateUserStatus(u.id, 'APPROVED')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={16}/></button>
                                              <button onClick={() => updateUserStatus(u.id, 'REJECTED')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><XCircle size={16}/></button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
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
                                      <span className={`px-1.5 py-0.5 rounded ${sl.actionType === 'DELETE' ? 'bg-red-50 text-red-600' : sl.actionType === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{sl.actionType}</span>
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
