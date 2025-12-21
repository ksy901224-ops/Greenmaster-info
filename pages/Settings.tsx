
import React, { useState, useEffect } from 'react';
import { Bell, Monitor, User, Save, Moon, Sun, LogOut, Shield, Lock, Users, CheckCircle, XCircle, Edit2, X, Database, RotateCcw, Download, ShieldCheck, FileJson, LockIcon, AlertTriangle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Department, UserRole, UserStatus } from '../types';

const Settings: React.FC = () => {
  const { user, allUsers, updateUserStatus, updateUserRole, updateUser, logout, resetData, exportAllData, isAdmin } = useApp();
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [marketingNotif, setMarketingNotif] = useState(false);
  const [defaultView, setDefaultView] = useState('list');
  const [theme, setTheme] = useState('light');
  const [isExporting, setIsExporting] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
      name: '',
      department: Department.SALES,
      role: UserRole.INTERMEDIATE
  });

  useEffect(() => {
      if (user) {
          setProfileForm({
              name: user.name,
              department: user.department,
              role: user.role
          });
      }
  }, [user]);

  const handleUpdateProfile = async () => {
      if (!user || !isAdmin) return;
      try {
          await updateUser(user.id, profileForm);
          setIsEditingProfile(false);
          alert('프로필 정보가 수정되었습니다.');
      } catch (e: any) {
          console.error(e);
          alert(e.message || '수정 중 오류가 발생했습니다.');
      }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportAllData();
        setIsExporting(false);
    }, 800);
  };

  const cancelEditProfile = () => {
      if (user) {
          setProfileForm({
              name: user.name,
              department: user.department,
              role: user.role
          });
      }
      setIsEditingProfile(false);
  };

  const handleSaveSettings = () => {
    alert('환경 설정이 저장되었습니다.');
  };

  const getStatusBadge = (status: UserStatus) => {
    switch(status) {
        case 'APPROVED': return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">승인됨</span>;
        case 'PENDING': return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">승인 대기</span>;
        case 'REJECTED': return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">거절됨</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">환경 설정</h1>
        <p className="text-slate-500 text-sm">앱의 동작 방식과 계정을 관리합니다.</p>
      </div>

      <div className="grid gap-6">
        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
           <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
               <h2 className="text-lg font-bold text-slate-900 flex items-center">
                    <Shield className="mr-2 text-brand-600" size={20} /> 
                    내 계정 정보
               </h2>
               {isAdmin && !isEditingProfile && (
                   <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="text-slate-400 hover:text-brand-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    title="프로필 수정 (관리자 전용)"
                   >
                       <Edit2 size={18} />
                   </button>
               )}
           </div>
          
          {!isAdmin && (
              <div className="absolute top-4 right-4 flex items-center text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <LockIcon size={10} className="mr-1"/> Read Only
              </div>
          )}

          <div className={`bg-slate-50 p-4 rounded-lg border border-slate-100 transition-all ${isEditingProfile ? 'ring-2 ring-brand-100 bg-white' : ''}`}>
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex items-center space-x-4 flex-1">
                     <div className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                         {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="profile"/> : <User size={28} />}
                     </div>
                     
                     {isEditingProfile ? (
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase">이름</label>
                                 <input 
                                    type="text" 
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                    className="w-full text-sm border-slate-300 rounded-lg px-2 py-1.5 focus:ring-brand-500 focus:border-brand-500"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase">부서</label>
                                 <select 
                                    value={profileForm.department}
                                    onChange={(e) => setProfileForm({...profileForm, department: e.target.value as Department})}
                                    className="w-full text-sm border-slate-300 rounded-lg px-2 py-1.5 focus:ring-brand-500 focus:border-brand-500 bg-white"
                                 >
                                     {Object.values(Department).map(d => (
                                         <option key={d} value={d}>{d}</option>
                                     ))}
                                 </select>
                             </div>
                             <div className="md:col-span-2">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase">직책 (Role)</label>
                                 <select 
                                    value={profileForm.role}
                                    onChange={(e) => setProfileForm({...profileForm, role: e.target.value as UserRole})}
                                    className="w-full text-sm border-slate-300 rounded-lg px-2 py-1.5 focus:ring-brand-500 focus:border-brand-500 bg-white"
                                 >
                                     <option value={UserRole.JUNIOR}>하급자 (Junior)</option>
                                     <option value={UserRole.INTERMEDIATE}>중급자 (Intermediate)</option>
                                     <option value={UserRole.SENIOR}>상급자 (Senior)</option>
                                     <option value={UserRole.ADMIN}>관리자 (Admin)</option>
                                 </select>
                             </div>
                         </div>
                     ) : (
                         <div>
                             <div className="flex items-center">
                                <h3 className="font-bold text-slate-900 mr-2 text-lg">{user?.name}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${user?.role === UserRole.ADMIN ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                    {user?.role}
                                </span>
                             </div>
                             <p className="text-sm text-slate-500">{user?.email}</p>
                             <p className="text-xs font-bold text-brand-600 mt-0.5">{user?.department}</p>
                         </div>
                     )}
                 </div>

                 {isEditingProfile ? (
                     <div className="flex flex-col space-y-2 shrink-0 min-w-[100px]">
                         <button onClick={handleUpdateProfile} className="bg-brand-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-brand-700 flex items-center justify-center">
                             <Save size={14} className="mr-1.5"/> 저장
                         </button>
                         <button onClick={cancelEditProfile} className="bg-white border border-slate-300 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-center">
                             <X size={14} className="mr-1.5"/> 취소
                         </button>
                     </div>
                 ) : (
                     <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600 font-medium border border-slate-300 bg-white px-4 py-2 rounded-lg transition-colors flex items-center hover:border-red-200 hover:bg-red-50 shrink-0">
                         <LogOut size={16} className="mr-2" /> 로그아웃
                     </button>
                 )}
             </div>
          </div>
          {!isAdmin && (
              <p className="mt-4 text-[10px] text-slate-400 font-medium text-center bg-slate-50 py-2 rounded-lg border border-slate-100 border-dashed">
                  본인의 계정 정보 및 권한 수정은 시스템 관리자(Admin)만 가능합니다.
              </p>
          )}
        </div>

        {/* --- ADMIN ONLY: User Management --- */}
        {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-brand-500">
                <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center">
                    <Users className="mr-2 text-brand-600" size={20} /> 
                    사용자 통합 관리 (Admin)
                </h2>
                <p className="text-sm text-slate-500 mb-6">시스템의 모든 사용자 정보를 직접 수정하거나 승인 절차를 관리합니다.</p>
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">사용자</th>
                                <th className="px-4 py-3">부서</th>
                                <th className="px-4 py-3">권한 레벨</th>
                                <th className="px-4 py-3">상태</th>
                                <th className="px-4 py-3 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-white transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-800">{u.name}</div>
                                        <div className="text-xs text-slate-500">{u.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{u.department}</td>
                                    <td className="px-4 py-3">
                                        <select 
                                            value={u.role}
                                            onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                            className="text-[10px] font-bold border-slate-200 rounded p-1 bg-white"
                                        >
                                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(u.status)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end space-x-2">
                                            {u.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => updateUserStatus(u.id, 'APPROVED')} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm" title="승인"><CheckCircle size={14}/></button>
                                                    <button onClick={() => updateUserStatus(u.id, 'REJECTED')} className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm" title="거절"><XCircle size={14}/></button>
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

        {/* Intelligence Data Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center pb-2 border-b border-slate-100">
                <Database className="mr-2 text-brand-600" size={20} /> 
                인텔리전스 데이터 관리
            </h2>
            
            <div className="space-y-6">
                {/* Export Backup Option */}
                <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex-1 mr-6">
                        <div className="flex items-center mb-1">
                            <Download size={18} className="mr-2 text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-800">전체 데이터 백업 (Export JSON)</h3>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            전국 골프장 정보, 인맥 네트워크, 매출 및 자재 현황 등 시스템의 모든 데이터베이스를 단일 JSON 파일로 내려받습니다. 로컬 백업 및 오프라인 분석 용도로 활용하세요.
                        </p>
                    </div>
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-50 shrink-0"
                    >
                        {isExporting ? <RotateCcw size={14} className="mr-2 animate-spin"/> : <Download size={14} className="mr-2"/>}
                        {isExporting ? '생성 중...' : 'JSON 다운로드'}
                    </button>
                </div>

                {/* Reset Debug Option */}
                <div className="flex items-center justify-between p-5 bg-red-50/30 rounded-2xl border border-red-100 border-dashed">
                    <div className="flex-1 mr-6">
                        <div className="flex items-center mb-1">
                            <AlertTriangle size={18} className="mr-2 text-red-500" />
                            <h3 className="text-sm font-bold text-slate-800">로컬 목(Mock) 데이터 초기화 (Debug Tool)</h3>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            브라우저 캐시에 저장된 모든 로컬 데이터를 삭제하고 공장 초기화 상태로 되돌립니다. <span className="font-bold text-red-600">이 작업은 복구할 수 없는 개발용 디버그 도구입니다.</span>
                        </p>
                    </div>
                    <button 
                        onClick={resetData} 
                        className="flex items-center bg-white border border-red-200 text-red-600 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors shadow-sm active:scale-95 shrink-0"
                    >
                        <RotateCcw size={14} className="mr-2" />
                        시스템 리셋
                    </button>
                </div>
            </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center pb-2 border-b border-slate-100">
            <Monitor className="mr-2 text-brand-600" size={20} /> 
            시스템 테마 설정
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">기본 대시보드 보기</label>
                  <select value={defaultView} onChange={(e) => setDefaultView(e.target.value)} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm py-2.5">
                      <option value="list">목록형 (리스트)</option>
                      <option value="calendar">달력형 (캘린더)</option>
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">테마 모드</label>
                  <div className="flex space-x-2">
                      <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition-all ${theme === 'light' ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          <Sun size={16} className="mr-2" /> 라이트
                      </button>
                      <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-900 text-white ring-1 ring-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          <Moon size={16} className="mr-2" /> 다크
                      </button>
                  </div>
              </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
            <button onClick={handleSaveSettings} className="flex items-center bg-brand-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-brand-700 transition-all">
                <Save size={18} className="mr-2" />
                설정 저장
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
