
import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, UserStatus, Department, UserProfile, SystemLog, GolfCourse, CourseType, GrassType } from '../types';
import { Users, UserPlus, CheckCircle, XCircle, Shield, AlertTriangle, Search, Activity, Ban, RotateCcw, Lock, Unlock, FileText, Siren, X, ChevronDown, Briefcase, List, Calendar, BarChart2, TrendingUp, Clock, Database, Sparkles, Loader2, Upload, BookOpen, MapPin, Zap, Lightbulb, Save, FileUp, Files, RefreshCw } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { MOCK_COURSES } from '../constants';
import { seedCollection } from '../services/firestoreService';

const AdminDashboard: React.FC = () => {
  const { user, allUsers, systemLogs, updateUserStatus, updateUserRole, updateUserDepartment, logs, courses, navigate, addCourse, updateCourse } = useApp();
  const [activeTab, setActiveTab] = useState<'USERS' | 'LOGS' | 'MASTER'>('MASTER');

  // Master Catalog Sync State
  const [catalogText, setCatalogText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Refresh State
  const [isRefreshingMaster, setIsRefreshingMaster] = useState(false);

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

  const handleSyncMasterData = async () => {
      if (window.confirm(`최신 마스터 데이터(${MOCK_COURSES.length}개소)를 기반으로 데이터베이스를 동기화하시겠습니까?\n기존 골프장 정보가 마스터 데이터로 업데이트되거나 신규 등록됩니다.`)) {
          setIsRefreshingMaster(true);
          try {
              await seedCollection('courses', MOCK_COURSES);
              alert('마스터 데이터 동기화가 완료되었습니다.');
          } catch (e) {
              console.error(e);
              alert('동기화 중 오류가 발생했습니다.');
          } finally {
              setIsRefreshingMaster(false);
          }
      }
  };

  const handleCatalogSync = async () => {
      if (!catalogText.trim() && selectedFiles.length === 0) return;
      setIsSyncing(true);
      try {
          const inputData: any[] = [];
          
          if (catalogText.trim()) {
              inputData.push({ textData: catalogText });
          }

          // Process files
          if (selectedFiles.length > 0) {
              const fileResults = await Promise.all(selectedFiles.map(async (file) => {
                  return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                          const result = e.target?.result as string;
                          resolve({
                              base64Data: result.split(',')[1],
                              mimeType: file.type
                          });
                      };
                      reader.readAsDataURL(file);
                  });
              }));
              inputData.push(...(fileResults as any[]));
          }

          const results = await analyzeDocument(inputData, courses.map(c => c.name));
          setSyncResults(results);
      } catch (error) {
          console.error(error);
          alert('데이터 분석 중 오류가 발생했습니다. (파일 크기나 형식을 확인하세요)');
      } finally {
          setIsSyncing(false);
      }
  };

  const applySyncItem = (item: any, silent = false) => {
      const existing = courses.find(c => c.name === item.courseName);
      const combinedIssues = [
          ...(existing?.issues || []),
          ...(item.strategic_analysis?.issues || [])
      ].slice(0, 10);

      if (existing) {
          updateCourse({
              ...existing,
              address: item.course_info?.address || existing.address,
              holes: item.course_info?.holes || existing.holes,
              description: item.description || item.summary_report || existing.description,
              issues: Array.from(new Set(combinedIssues))
          });
          if(!silent) alert(`${item.courseName} 정보가 업데이트되었습니다.`);
      } else {
          const newId = `c-auto-${Date.now()}-${Math.random().toString(36).substr(2,4)}`;
          addCourse({
              id: newId,
              name: item.courseName,
              region: (item.course_info?.address?.split(' ')[0] as any) || '기타',
              holes: item.course_info?.holes || 18,
              type: item.course_info?.type?.includes('회원') ? CourseType.MEMBER : item.course_info?.type?.includes('체력') ? CourseType.MILITARY : CourseType.PUBLIC,
              address: item.course_info?.address || '주소 미상',
              openYear: '2024',
              grassType: GrassType.ZOYSIA,
              area: '정보없음',
              description: item.description || item.summary_report,
              issues: item.strategic_analysis?.issues || []
          });
          if(!silent) alert(`${item.courseName} 골프장이 신규 등록되었습니다.`);
      }
  };

  const handleBulkApply = () => {
      if (!syncResults) return;
      if (window.confirm(`${syncResults.length}건의 데이터를 한 번에 반영하시겠습니까?`)) {
          syncResults.forEach(item => applySyncItem(item, true));
          alert('모든 데이터가 반영되었습니다.');
          setSyncResults(null);
          setCatalogText('');
          setSelectedFiles([]);
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
            <p className="text-slate-500 text-sm mt-1 ml-10">사용자 권한 및 전국 골프장 마스터 DB 대량 연동을 관리합니다.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg mt-4 md:mt-0">
             <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'USERS' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Users size={16} className="mr-2"/> 사용자
             </button>
             <button onClick={() => setActiveTab('MASTER')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'MASTER' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Database size={16} className="mr-2"/> 마스터 DB 관리
             </button>
             <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'LOGS' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>
                 <List size={16} className="mr-2"/> 감사 로그
             </button>
        </div>
      </div>

      {activeTab === 'MASTER' && (
          <div className="space-y-6">
              {/* 1. Master Data Synchronization Tool */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-700 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><RefreshCw size={120} className="animate-spin-slow" /></div>
                  <div className="relative z-10">
                      <h2 className="text-xl font-bold mb-2 flex items-center">
                          <Database size={20} className="mr-2 text-brand-400" /> 
                          전국 골프장 마스터 DB 동기화
                      </h2>
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-2xl">
                          시스템에 정의된 약 590여 개의 최신 골프장 마스터 데이터를 데이터베이스에 반영합니다.<br/>
                          최초 실행 또는 데이터 일괄 갱신이 필요할 때 사용하세요. (실시간 업데이트 메커니즘)
                      </p>
                      <button 
                        onClick={handleSyncMasterData}
                        disabled={isRefreshingMaster}
                        className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-500 transition-all flex items-center shadow-lg disabled:opacity-50"
                      >
                          {isRefreshingMaster ? <Loader2 size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
                          마스터 데이터 일괄 동기화 시작
                      </button>
                  </div>
              </div>

              {/* 2. AI Bulk Sync Section */}
              <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={160} /></div>
                  <div className="relative z-10 max-w-4xl">
                      <h2 className="text-2xl font-bold mb-3 flex items-center"><Database size={24} className="mr-3 text-indigo-300"/> 파일/텍스트 기반 지능형 일괄 등록</h2>
                      <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                          외부 골프장 리스트(PDF, 엑셀 스크린샷, 텍스트)를 AI가 분석하여 DB와 대조합니다.
                      </p>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10">
                              <label className="block text-[10px] font-bold text-indigo-300 mb-2 uppercase tracking-widest">텍스트 직접 입력</label>
                              <textarea 
                                className="w-full bg-transparent border-none focus:ring-0 text-indigo-50 text-xs h-32 custom-scrollbar"
                                placeholder="예: [안양 CC] 18홀, 경기 군포 소재..."
                                value={catalogText}
                                onChange={(e) => setCatalogText(e.target.value)}
                              />
                          </div>
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-900/50 p-4 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-800/30 transition-all group"
                          >
                              <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                              <FileUp className="text-indigo-300 mb-2 group-hover:scale-110 transition-transform" size={32} />
                              <p className="text-xs font-bold text-indigo-100">파일 업로드 (PDF, 이미지)</p>
                          </div>
                      </div>

                      <button 
                        onClick={handleCatalogSync}
                        disabled={isSyncing || (!catalogText.trim() && selectedFiles.length === 0)}
                        className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center disabled:opacity-50 shadow-lg"
                      >
                          {isSyncing ? <Loader2 size={20} className="animate-spin mr-3"/> : <BookOpen size={20} className="mr-3"/>}
                          지능형 추출 및 동기화 시작
                      </button>
                  </div>
              </div>

              {syncResults && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-top-4">
                      <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-lg">추출 결과 ({syncResults.length}건)</h3>
                          <div className="flex items-center gap-3">
                              <button onClick={() => setSyncResults(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                              <button onClick={handleBulkApply} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md flex items-center transition-all"><Save size={18} className="mr-2"/> 일괄 반영</button>
                          </div>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                          {syncResults.map((item, idx) => {
                              const exists = courses.some(c => c.name === item.courseName);
                              return (
                                  <div key={idx} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-slate-50 transition-colors">
                                      <div className="flex-1 space-y-3">
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-slate-900 text-xl">{item.courseName}</span>
                                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${exists ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{exists ? '기존' : '신규'}</span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                              <div className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                  <div className="text-[10px] font-bold text-slate-400 mb-2 flex items-center"><MapPin size={10} className="mr-1"/> 정보</div>
                                                  <p className="font-medium">{item.course_info?.address || '주소 미상'}</p>
                                                  <p className="text-xs text-slate-500 mt-1">{item.course_info?.holes || '??'}홀 | {item.course_info?.type || '형태 미상'}</p>
                                              </div>
                                          </div>
                                      </div>
                                      <button onClick={() => applySyncItem(item)} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md transition-all active:scale-95 flex items-center shrink-0"><CheckCircle size={16} className="mr-2"/> 반영</button>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'USERS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">사용자 계정 관리 ({allUsers.length})</h3>
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">시스템 보안 감사 로그 ({systemLogs.length})</h3>
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
