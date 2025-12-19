
import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, UserStatus, Department, UserProfile, SystemLog, GolfCourse, CourseType, GrassType } from '../types';
import { Users, UserPlus, CheckCircle, XCircle, Shield, AlertTriangle, Search, Activity, Ban, RotateCcw, Lock, Unlock, FileText, Siren, X, ChevronDown, Briefcase, List, Calendar, BarChart2, TrendingUp, Clock, Database, Sparkles, Loader2, Upload, BookOpen, MapPin, Zap, Lightbulb, Save, Edit2, Check, AlertCircle } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';

interface EnhancedSyncItem {
    id: string;
    original: any;
    editable: {
        courseName: string;
        address: string;
        holes: number;
        type: string;
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

  // Access Control
  React.useEffect(() => {
    if (user && (user.role !== UserRole.ADMIN && user.role !== UserRole.SENIOR)) {
      alert('접근 권한이 없습니다. 관리자/상급자만 접근 가능합니다.');
      navigate('/');
    }
  }, [user, navigate]);

  const handleCatalogSync = async () => {
      if (!catalogText.trim()) return;
      setIsSyncing(true);
      setSyncResults(null);
      try {
          const results = await analyzeDocument([{ textData: catalogText }], courses.map(c => c.name));
          
          if (results) {
              const enhanced: EnhancedSyncItem[] = results.map((item, idx) => {
                  const existing = courses.find(c => c.name === item.courseName);
                  return {
                      id: `sync-${Date.now()}-${idx}`,
                      original: item,
                      editable: {
                          courseName: item.courseName,
                          address: item.course_info?.address || '',
                          holes: item.course_info?.holes || 18,
                          type: item.course_info?.type || '대중제',
                          description: item.description || item.summary_report || '',
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
          alert('카다로그 분석 중 오류가 발생했습니다.');
      } finally {
          setIsSyncing(false);
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
              const combinedIssues = Array.from(new Set([
                  ...(existing.issues || []),
                  ...item.editable.issues
              ])).slice(0, 15);

              await updateCourse({
                  ...existing,
                  address: item.editable.address,
                  holes: item.editable.holes,
                  description: item.editable.description,
                  type: item.editable.type.includes('회원') ? CourseType.MEMBER : CourseType.PUBLIC,
                  issues: combinedIssues
              });
          } else {
              const newId = `c-auto-${Date.now()}-${Math.random().toString(36).substr(2,4)}`;
              await addCourse({
                  id: newId,
                  name: item.editable.courseName,
                  region: (item.editable.address.split(' ')[0] as any) || '기타',
                  holes: item.editable.holes,
                  type: item.editable.type.includes('회원') ? CourseType.MEMBER : CourseType.PUBLIC,
                  address: item.editable.address,
                  openYear: new Date().getFullYear().toString(),
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

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SENIOR)) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <Shield className="mr-3 text-brand-700" size={28} /> 
                시스템 통합 관리자
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-10">시스템 권한 제어 및 전국 마스터 DB 정합성을 관리합니다.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg mt-4 md:mt-0">
             <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${activeTab === 'USERS' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Users size={16} className="mr-2"/> 사용자
             </button>
             <button onClick={() => setActiveTab('MASTER')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${activeTab === 'MASTER' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Database size={16} className="mr-2"/> 마스터 DB 연동
             </button>
             <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${activeTab === 'LOGS' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <List size={16} className="mr-2"/> 감사 로그
             </button>
        </div>
      </div>

      {activeTab === 'MASTER' && (
          <div className="space-y-6">
              <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={160} /></div>
                  <div className="relative z-10 max-w-3xl">
                      <h2 className="text-2xl font-bold mb-3 flex items-center"><Database size={24} className="mr-3 text-indigo-300"/> 전국 골프장 데이터베이스 지능형 동기화</h2>
                      <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                          전국 590여 개소의 골프장 카다로그나 최신 시설 정보를 텍스트로 붙여넣으세요. 
                          AI가 기존 DB와 대조하여 누락된 골프장을 신규 등록하거나 기존 정보를 최신화하고, 핵심 비즈니스 인사이트를 추출합니다.
                      </p>
                      
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/10 mb-6 group focus-within:border-indigo-400 transition-colors">
                          <textarea 
                             className="w-full bg-transparent border-none focus:ring-0 text-indigo-50 text-sm h-40 custom-scrollbar placeholder:text-indigo-300/50"
                             placeholder="예: [안양 CC] 18홀, 경기 군포 소재, 벤트그라스... [신규 골프장 등록] 전남 해남 파인링크스 18홀..."
                             value={catalogText}
                             onChange={(e) => setCatalogText(e.target.value)}
                          />
                      </div>
                      <button 
                        onClick={handleCatalogSync}
                        disabled={isSyncing || !catalogText.trim()}
                        className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center disabled:opacity-50 shadow-lg active:scale-95"
                      >
                          {isSyncing ? <Loader2 size={20} className="animate-spin mr-3"/> : <BookOpen size={20} className="mr-3"/>}
                          지능형 분석 시작
                      </button>
                  </div>
              </div>

              {syncResults && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-top-4">
                      <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg flex items-center">
                                <Activity size={20} className="mr-2 text-indigo-600"/>
                                AI 분석 및 업데이트 제안 ({syncResults.length}건)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">저장 전 데이터를 수정하거나 일괄 반영할 수 있습니다.</p>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                              <button onClick={() => setSyncResults(null)} className="flex-1 sm:flex-none px-4 py-2 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors">닫기</button>
                              <button 
                                onClick={handleBulkApply}
                                disabled={batchProcessing || syncResults.every(i => i.status === 'success')}
                                className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center transition-all disabled:opacity-50"
                              >
                                  {batchProcessing ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                                  전체 일괄 반영
                              </button>
                          </div>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[800px] overflow-y-auto custom-scrollbar">
                          {syncResults.map((item) => (
                              <div key={item.id} className={`p-6 transition-all ${item.status === 'success' ? 'bg-green-50/30' : 'hover:bg-slate-50'}`}>
                                  <div className="flex flex-col lg:flex-row gap-6">
                                      <div className="flex-grow space-y-4">
                                          {/* Status Header */}
                                          <div className="flex items-center flex-wrap gap-2">
                                              {item.status === 'success' ? (
                                                  <span className="flex items-center text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full border border-green-200">
                                                      <Check size={14} className="mr-1"/> 반영 완료
                                                  </span>
                                              ) : (
                                                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.conflictType === 'update' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                                      {item.conflictType === 'update' ? '기존 정보 매칭' : '신규 발견'}
                                                  </span>
                                              )}
                                              {item.status === 'error' && (
                                                  <span className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full border border-red-200">
                                                      {item.error}
                                                  </span>
                                              )}
                                          </div>

                                          {item.isEditing ? (
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-indigo-200 shadow-inner">
                                                  <div className="md:col-span-2">
                                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">골프장명</label>
                                                      <input type="text" className="w-full text-lg font-bold border-slate-200 rounded-xl focus:ring-indigo-500" value={item.editable.courseName} onChange={e => updateEditableField(item.id, 'courseName', e.target.value)} />
                                                  </div>
                                                  <div>
                                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">주소</label>
                                                      <input type="text" className="w-full text-sm border-slate-200 rounded-xl" value={item.editable.address} onChange={e => updateEditableField(item.id, 'address', e.target.value)} />
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                      <div>
                                                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">홀수</label>
                                                          <input type="number" className="w-full text-sm border-slate-200 rounded-xl" value={item.editable.holes} onChange={e => updateEditableField(item.id, 'holes', parseInt(e.target.value))} />
                                                      </div>
                                                      <div>
                                                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">구분</label>
                                                          <input type="text" className="w-full text-sm border-slate-200 rounded-xl" value={item.editable.type} onChange={e => updateEditableField(item.id, 'type', e.target.value)} />
                                                      </div>
                                                  </div>
                                                  <div className="md:col-span-2">
                                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">상세 설명</label>
                                                      <textarea className="w-full text-sm border-slate-200 rounded-xl h-20" value={item.editable.description} onChange={e => updateEditableField(item.id, 'description', e.target.value)} />
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="space-y-4">
                                                  <h4 className="text-xl font-bold text-slate-900">{item.editable.courseName}</h4>
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                          <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase flex items-center"><MapPin size={10} className="mr-1"/> Facility Details</div>
                                                          <p className="text-sm font-medium">{item.editable.address}</p>
                                                          <p className="text-xs text-slate-500 mt-1">{item.editable.holes}홀 | {item.editable.type}</p>
                                                      </div>
                                                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                          <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase flex items-center"><Zap size={10} className="mr-1"/> Strategic Points</div>
                                                          <div className="flex flex-wrap gap-1 mt-1">
                                                              {item.editable.issues.slice(0, 3).map((issue, i) => (
                                                                  <span key={i} className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">{issue}</span>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <p className="text-xs text-slate-500 bg-slate-100 p-3 rounded-xl border border-slate-200 italic line-clamp-2">"{item.editable.description}"</p>
                                              </div>
                                          )}
                                      </div>

                                      <div className="shrink-0 flex flex-row lg:flex-col justify-end gap-2">
                                          {item.status !== 'success' && (
                                              <>
                                                  <button 
                                                      onClick={() => toggleEdit(item.id)}
                                                      className={`p-3 rounded-xl border transition-all ${item.isEditing ? 'bg-brand-900 text-white border-brand-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'}`}
                                                      title={item.isEditing ? "편집 완료" : "정보 수정"}
                                                  >
                                                      {item.isEditing ? <Check size={20}/> : <Edit2 size={20}/>}
                                                  </button>
                                                  <button 
                                                      onClick={() => applySyncItem(item.id)}
                                                      className="flex-grow lg:flex-none bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md transition-all active:scale-95 flex items-center justify-center"
                                                  >
                                                      <CheckCircle size={18} className="mr-2"/> 반영
                                                  </button>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
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
