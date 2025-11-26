import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Department } from '../types';
import { Shield, Lock, ArrowRight, UserPlus, Mail, AlertTriangle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  
  // Signup State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState<Department>(Department.SALES);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginEmail) return;

    setIsLoading(true);
    
    try {
        const error = await login(loginEmail);
        if (error) {
            setErrorMsg(error);
        }
    } catch (e) {
        setErrorMsg("로그인 중 오류가 발생했습니다.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName || !regEmail) return;

    setIsLoading(true);
    try {
      await register(regName, regEmail, regDept);
      setSuccessMsg("회원가입 요청이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.");
      setMode('LOGIN'); // Switch back to login view
      setLoginEmail(regEmail); // Pre-fill email
    } catch (e: any) {
      setErrorMsg(e.message || "가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-brand-900 rounded-b-[3rem] shadow-2xl z-0"></div>
      <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
      <div className="absolute top-20 right-20 w-64 h-64 bg-brand-500 opacity-10 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg mb-4">
             <div className="bg-brand-100 p-2 rounded-xl">
               <Shield size={32} className="text-brand-600" />
             </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">GreenMaster Info</h1>
          <p className="text-brand-100">골프장 통합 정보 관리 시스템</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setMode('LOGIN'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-white text-brand-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              로그인
            </button>
            <button
              onClick={() => { setMode('SIGNUP'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'SIGNUP' ? 'bg-white text-brand-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              회원가입
            </button>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start">
                <div className="mr-2 mt-0.5"><Shield size={16}/></div>
                {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start">
                <div className="mr-2 mt-0.5"><AlertTriangle size={16}/></div>
                {errorMsg}
            </div>
          )}

          {mode === 'LOGIN' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
               <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">직원 로그인</h2>
               <p className="text-sm text-slate-500 mb-6 text-center">등록된 이메일로 접속하세요.</p>
               
               <form onSubmit={handleLogin} className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">이메일</label>
                   <div className="relative">
                     <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                     <input 
                       type="email" 
                       className="w-full pl-10 rounded-lg border-slate-300 focus:ring-brand-500 focus:border-brand-500 py-2.5" 
                       placeholder="user@greenmaster.com"
                       value={loginEmail}
                       onChange={(e) => setLoginEmail(e.target.value)}
                       required
                     />
                   </div>
                 </div>

                 {/* Demo Hint */}
                 <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="font-bold">Test Admin:</span> admin@greenmaster.com
                 </div>
                 
                 <div className="pt-4">
                   <button 
                     type="submit" 
                     disabled={isLoading}
                     className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-lg ${
                       isLoading
                         ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                         : 'bg-brand-900 text-white hover:bg-brand-800 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                     }`}
                   >
                     {isLoading ? (
                       <span className="flex items-center">확인 중...</span>
                     ) : (
                       <span className="flex items-center">
                         로그인 <ArrowRight size={20} className="ml-2" />
                       </span>
                     )}
                   </button>
                 </div>
               </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">신규 계정 신청</h2>
              <form onSubmit={handleSignup} className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">이름</label>
                   <input 
                     type="text" 
                     className="w-full rounded-lg border-slate-300 focus:ring-brand-500 focus:border-brand-500" 
                     placeholder="홍길동"
                     value={regName}
                     onChange={(e) => setRegName(e.target.value)}
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">이메일</label>
                   <input 
                     type="email" 
                     className="w-full rounded-lg border-slate-300 focus:ring-brand-500 focus:border-brand-500" 
                     placeholder="user@example.com"
                     value={regEmail}
                     onChange={(e) => setRegEmail(e.target.value)}
                     required
                   />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-slate-700 mb-1">부서</label>
                     <select 
                       className="w-full rounded-lg border-slate-300 focus:ring-brand-500 focus:border-brand-500 text-sm py-2.5"
                       value={regDept}
                       onChange={(e) => setRegDept(e.target.value as Department)}
                     >
                        {Object.values(Department).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                     </select>
                 </div>
                 
                 <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-start">
                    <AlertTriangle size={14} className="mr-1 mt-0.5 shrink-0"/>
                    관리자 승인 후 시스템 이용 권한이 부여됩니다.
                 </div>

                 <div className="pt-2">
                   <button 
                     type="submit" 
                     disabled={isLoading}
                     className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl"
                   >
                     {isLoading ? '처리 중...' : <><UserPlus className="mr-2" size={20}/> 가입 신청하기</>}
                   </button>
                 </div>
              </form>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center">
              <Lock size={12} className="mr-1" /> 보안 접속 연결됨
            </p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-center text-slate-400 text-xs">
        © 2024 GreenMaster Info System. All rights reserved.
      </div>
    </div>
  );
};

export default Login;