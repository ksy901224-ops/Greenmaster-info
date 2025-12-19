
import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, UserStatus, Department, UserProfile, SystemLog, GolfCourse, CourseType, GrassType } from '../types';
import { Users, UserPlus, CheckCircle, XCircle, Shield, AlertTriangle, Search, Activity, Ban, RotateCcw, Lock, Unlock, FileText, Siren, X, ChevronDown, Briefcase, List, Calendar, BarChart2, TrendingUp, Clock, Database, Sparkles, Loader2, Upload, BookOpen, MapPin, Zap, Lightbulb, Save, FileUp, Files, RefreshCw, AlignLeft } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { MOCK_COURSES } from '../constants';
import { seedCollection } from '../services/firestoreService';

const AdminDashboard: React.FC = () => {
  const { user, allUsers, systemLogs, updateUserStatus, updateUserRole, updateUserDepartment, logs, courses, navigate, addCourse, updateCourse } = useApp();
  const [activeTab, setActiveTab] = useState<'USERS' | 'LOGS' | 'MASTER'>('MASTER');

  const [catalogText, setCatalogText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRefreshingMaster, setIsRefreshingMaster] = useState(false);

  React.useEffect(() => {
    if (user && (user.role !== UserRole.ADMIN && user.role !== UserRole.SENIOR)) {
      alert('접근 권한이 없습니다. 관리자/상급자만 접근 가능합니다.');
      navigate('/');
    }
  }, [user, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { setSelectedFiles(Array.from(e.target.files)); } };

  const handleSyncMasterData = async () => {
      if (window.confirm(`최신 마스터 데이터(${MOCK_COURSES.length}개소)를 기반으로 데이터베이스를 동기화하시겠습니까?`)) {
          setIsRefreshingMaster(true);
          try { await seedCollection('courses', MOCK_COURSES); alert('마스터 데이터 동기화가 완료되었습니다.'); } catch (e) { alert('동기화 중 오류가 발생했습니다.'); } finally { setIsRefreshingMaster(false); }
      }
  };

  const handleCatalogSync = async () => {
      if (!catalogText.trim() && selectedFiles.length === 0) return;
      setIsSyncing(true);
      try {
          const inputData: any[] = [];
          if (catalogText.trim()) { inputData.push({ textData: catalogText }); }
          if (selectedFiles.length > 0) {
              const fileResults = await Promise.all(selectedFiles.map(async (file) => {
                  return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (e) => { resolve({ base64Data: (e.target?.result as string).split(',')[1], mimeType: file.type }); };
                      reader.readAsDataURL(file);
                  });
              }));
              inputData.push(...(fileResults as any[]));
          }
          const results = await analyzeDocument(inputData, courses.map(c => c.name));
          setSyncResults(results);
      } catch (error) { alert('데이터 분석 중 오류가 발생했습니다.'); } finally { setIsSyncing(false); }
  };

  const applySyncItem = (item: any, silent = false) => {
      const existing = courses.find(c => c.name === item.courseName);
      const combinedIssues = [...(existing?.issues || []), ...(item.strategic_analysis?.issues || [])].slice(0, 10);
      if (existing) {
          updateCourse({ ...existing, address: item.course_info?.address || existing.address, holes: item.course_info?.holes || existing.holes, description: item.detailed_analysis || item.summary_report || existing.description, issues: Array.from(new Set(combinedIssues)) });
          if(!silent) alert(`${item.courseName} 정보가 업데이트되었습니다.`);
      } else {
          addCourse({ id: `c-auto-${Date.now()}`, name: item.courseName, region: (item.course_info?.address?.split(' ')[0] as any) || '기타', holes: item.course_info?.holes || 18, type: item.course_info?.type?.includes('회원') ? CourseType.MEMBER : item.course_info?.type?.includes('체력') ? CourseType.MILITARY : CourseType.PUBLIC, address: item.course_info?.address || '주소 미상', openYear: '2024', grassType: GrassType.ZOYSIA, area: '정보없음', description: item.detailed_analysis || item.summary_report, issues: item.strategic_analysis?.issues || [] });
          if(!silent) alert(`${item.courseName} 골프장이 신규 등록되었습니다.`);
      }
  };

  const handleBulkApply = () => {
      if (!syncResults) return;
      if (window.confirm(`${syncResults.length}건의 데이터를 한 번에 반영하시겠습니까?`)) {
          syncResults.forEach(item => applySyncItem(item, true));
          alert('모든 데이터가 반영되었습니다.'); setSyncResults(null); setCatalogText(''); setSelectedFiles([]);
      }
  };

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SENIOR)) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center"><Shield className="mr-3 text-brand-700" size={28} /> 시스템 통합 관리자</h1>
            <p className="text-slate-500 text-sm mt-1 ml-10">사용자 권한 및 전국 골프장 마스터 DB 대량 연동을 관리합니다.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg mt-4 md:mt-0">
             <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'USERS' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16} className="mr-2"/> 사용자</button>
             <button onClick={() => setActiveTab('MASTER')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'MASTER' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}><Database size={16} className="mr-2"/> 마스터 DB 관리</button>
             <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'LOGS' ? 'bg-white shadow text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}><List size={16} className="mr-2"/> 감사 로그</button>
        </div>
      </div>

      {activeTab === 'MASTER' && (
          <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-700 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><RefreshCw size={120} className="animate-spin-slow" /></div>
                  <div className="relative z-10">
                      <h2 className="text-xl font-bold mb-2 flex items-center"><Database size={20} className="mr-2 text-brand-400" /> 전국 골프장 마스터 DB 동기화</h2>
                      <p className="text-slate-400 text-sm mb-6 max-w-2xl">최초 실행 또는 데이터 일괄 갱신이 필요할 때 사용하세요.</p>
                      <button onClick={handleSyncMasterData} disabled={isRefreshingMaster} className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-500 transition-all flex items-center shadow-lg disabled:opacity-50">{isRefreshingMaster ? <Loader2 size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>} 마스터 데이터 일괄 동기화 시작</button>
                  </div>
              </div>

              <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={160} /></div>
                  <div className="relative z-10 max-w-4xl">
                      <h2 className="text-2xl font-bold mb-3 flex items-center"><Database size={24} className="mr-3 text-indigo-300"/> 파일/텍스트 기반 지능형 일괄 등록</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10"><textarea className="w-full bg-transparent border-none focus:ring-0 text-indigo-50 text-xs h-32 custom-scrollbar" placeholder="텍스트 입력..." value={catalogText} onChange={(e) => setCatalogText(e.target.value)}/></div>
                          <div onClick={() => fileInputRef.current?.click()} className="bg-slate-900/50 p-4 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-800/30 transition-all"><input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect}/><FileUp className="text-indigo-300 mb-2" size={32} /><p className="text-xs font-bold text-indigo-100">파일 업로드</p></div>
                      </div>
                      <button onClick={handleCatalogSync} disabled={isSyncing || (!catalogText.trim() && selectedFiles.length === 0)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center shadow-lg">{isSyncing ? <Loader2 size={20} className="animate-spin mr-3"/> : <BookOpen size={20} className="mr-3"/>} 지능형 추출 시작</button>
                  </div>
              </div>

              {syncResults && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-top-4">
                      <div className="p-5 bg-slate-50 border-b flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg">추출 결과 ({syncResults.length}건)</h3><div className="flex gap-3"><button onClick={() => setSyncResults(null)}><X size={20}/></button><button onClick={handleBulkApply} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center transition-all"><Save size={18} className="mr-2"/> 일괄 반영</button></div></div>
                      <div className="divide-y divide-slate-100 max-h-[800px] overflow-y-auto custom-scrollbar">
                          {syncResults.map((item, idx) => {
                              const exists = courses.some(c => c.name === item.courseName);
                              return (
                                  <div key={idx} className="p-8 flex flex-col md:flex-row md:items-start justify-between gap-8 hover:bg-slate-50 transition-colors">
                                      <div className="flex-1 space-y-4">
                                          <div className="flex items-center gap-3"><span className="font-bold text-slate-900 text-2xl">{item.courseName}</span><span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${exists ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{exists ? '기존' : '신규'}</span></div>
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                              <div className="space-y-3">
                                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                      <div className="flex items-center text-indigo-600 font-bold text-xs mb-2"><Sparkles size={14} className="mr-2"/> 핵심 요약</div>
                                                      <p className="text-slate-700 text-sm leading-relaxed">{item.summary_report}</p>
                                                  </div>
                                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                      <div className="flex items-center text-slate-600 font-bold text-xs mb-2"><AlignLeft size={14} className="mr-2"/> 상세 진단</div>
                                                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{item.detailed_analysis}</p>
                                                  </div>
                                              </div>
                                              <div className="space-y-3">
                                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                      <div className="flex items-center text-red-600 font-bold text-xs mb-2"><AlertTriangle size={14} className="mr-2"/> 리스크 및 이슈</div>
                                                      <ul className="space-y-1">{item.strategic_analysis?.issues?.map((issue: string, i: number) => (<li key={i} className="text-slate-600 text-[11px]">• {issue}</li>))}</ul>
                                                  </div>
                                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                      <div className="flex items-center text-emerald-600 font-bold text-xs mb-2"><Lightbulb size={14} className="mr-2"/> 비즈니스 기회</div>
                                                      <ul className="space-y-1">{item.strategic_analysis?.opportunities?.map((opp: string, i: number) => (<li key={i} className="text-slate-600 text-[11px]">• {opp}</li>))}</ul>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                      <button onClick={() => applySyncItem(item)} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95 shrink-0">개별 반영</button>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      )}
      {/* ... 나머지 USERS, LOGS 탭 UI 기존 유지 ... */}
    </div>
  );
};

export default AdminDashboard;
