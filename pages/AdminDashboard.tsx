
import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, UserStatus, Department, UserProfile, SystemLog, GolfCourse, CourseType, GrassType, Region } from '../types';
import { Users, UserPlus, CheckCircle, XCircle, Shield, AlertTriangle, Search, Activity, Ban, RotateCcw, Lock, Unlock, FileText, Siren, X, ChevronDown, Briefcase, List, Calendar, BarChart2, TrendingUp, Clock, Database, Sparkles, Loader2, Upload, BookOpen, MapPin, Zap, Lightbulb, Save, Edit2, Check, AlertCircle, FileUp, Building2, Key, Mail, User as UserIcon } from 'lucide-react';
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
  const { user, allUsers, isAdmin, isSeniorOrAdmin, systemLogs, updateUserStatus, updateUserRole, updateUserDepartment, logs, courses, navigate, addCourse, updateCourse, createUserManually } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'USERS' | 'LOGS' | 'MASTER'>('MASTER');

  // Master Catalog Sync State
  const [catalogText, setCatalogText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<EnhancedSyncItem[] | null>(null);
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
          
          if (results && results.extractedCourses) {
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
                          issues: []
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

  if (!user || !isSeniorOrAdmin) return null;

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
        
        <div className="flex bg-slate-100 p-1 rounded-xl mt-4 md:mt-0 shadow-inner">
             <button onClick={() => setActiveTab('MASTER')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'MASTER' ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Database size={16} className="mr-2"/> 데이터 동기화
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

              {syncResults && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-top-4">
                      <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <h3 className="font-bold text-slate-800 text-lg flex items-center">
                              <Activity size={20} className="mr-2 text-brand-600"/>
                              분석 결과 ({syncResults.length}건)
                          </h3>
                          <div className="flex items-center gap-3">
                              <button onClick={() => setSyncResults(null)} className="px-4 py-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors">Discard</button>
                              <button 
                                onClick={handleBulkApply}
                                disabled={batchProcessing || syncResults.every(i => i.status === 'success')}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md flex items-center transition-all disabled:opacity-50"
                              >
                                  {batchProcessing ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                                  일괄 반영
                              </button>
                          </div>
                      </div>

                      <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                          <table className="w-full text-sm text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-20">
                                  <tr>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4">Name</th>
                                      <th className="px-6 py-4">Region</th>
                                      <th className="px-6 py-4">Address</th>
                                      <th className="px-6 py-4">Holes</th>
                                      <th className="px-6 py-4 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {syncResults.map((item) => (
                                      <tr key={item.id} className={`transition-all ${item.status === 'success' ? 'bg-green-50/30' : 'hover:bg-slate-50'}`}>
                                          <td className="px-6 py-4">
                                              {item.status === 'success' ? (
                                                  <span className="text-green-600 font-bold flex items-center"><Check size={14} className="mr-1"/> Synced</span>
                                              ) : (
                                                  <span className={`text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider ${item.conflictType === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {item.conflictType === 'update' ? 'UPDATE' : 'NEW'}
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 font-bold text-slate-900">{item.editable.courseName}</td>
                                          <td className="px-6 py-4">{item.editable.region}</td>
                                          <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{item.editable.address}</td>
                                          <td className="px-6 py-4 font-bold">{item.editable.holes}H</td>
                                          <td className="px-6 py-4 text-right">
                                              {item.status !== 'success' && (
                                                  <button 
                                                      onClick={() => applySyncItem(item.id)}
                                                      className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 shadow-sm transition-all"
                                                  >
                                                      반영
                                                  </button>
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
