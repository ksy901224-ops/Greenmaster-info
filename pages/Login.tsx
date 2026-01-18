
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Department } from '../types';
import { Shield, Lock, ArrowRight, UserPlus, Mail, AlertTriangle, CheckCircle, Loader2, Copy, Wifi, WifiOff, HelpCircle, ExternalLink, X, Code, Database, Key } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register, isOfflineMode, toggleOfflineMode } = useApp();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [showGuide, setShowGuide] = useState(false);
  
  // Login State - Pre-filled with requested admin credentials for convenience
  const [loginEmail, setLoginEmail] = useState('soonyong90@gmail.com');
  const [loginPassword, setLoginPassword] = useState('rnjstnsdyd1!');
  
  // Signup State
  const [regName, setRegName] = useState('권순용');
  const [regEmail, setRegEmail] = useState('soonyong90@gmail.com');
  const [regPassword, setRegPassword] = useState('rnjstnsdyd1!');
  const [regDept, setRegDept] = useState<Department>(Department.MANAGEMENT);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [registeredUid, setRegisteredUid] = useState<string | null>(null);

  // Clear messages when switching modes
  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setRegisteredUid(null);
  }, [mode]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail.trim() || (!loginPassword.trim() && !isOfflineMode)) {
        setErrorMsg("이메일과 비밀번호를 입력해주세요.");
        return;
    }

    setIsLoading(true);
    
    try {
        const error = await login(loginEmail, loginPassword);
        if (error) {
            setErrorMsg(error);
        }
    } catch (e) {
        setErrorMsg("로그인 시스템 오류가 발생했습니다.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
        setErrorMsg("모든 정보를 입력해주세요.");
        return;
    }

    if (!isValidEmail(regEmail)) {
        setErrorMsg("올바른 이메일 형식이 아닙니다.");
        return;
    }

    if (regPassword.length < 6) {
        setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
    }

    setIsLoading(true);
    try {
      const uid = await register(regName, regEmail, regPassword, regDept);
      
      // Auto switch to login with success message including UID
      setMode('LOGIN');
      setLoginEmail(regEmail);
      setRegisteredUid(uid);
      setSuccessMsg("가입 요청이 성공적으로 전송되었습니다! 관리자 승인 후 로그인 가능합니다.");
      
      // Reset form
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegDept(Department.SALES);

    } catch (e: any) {
      setErrorMsg(e.message || "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyUid = () => {
      if(registeredUid) {
          navigator.clipboard.writeText(registeredUid);
          alert('UID가 클립보드에 복사되었습니다.');
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-brand-900 rounded-b-[3rem] shadow-2xl z-0"></div>
      <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute top-20 right-20 w-64 h-64 bg-brand-500 opacity-10 rounded-full blur-3xl"></div>

      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20 flex gap-2">
          {isOfflineMode && (
              <button 
                onClick={() => setShowGuide(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md border bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-600 animate-pulse"
              >
                  <HelpCircle size={14} />
                  <span>초보자를 위한 Firebase 연동 가이드</span>
              </button>
          )}
          <button 
            onClick={toggleOfflineMode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md border ${isOfflineMode ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}
          >
              {isOfflineMode ? <WifiOff size={14} /> : <Wifi size={14} />}
              <span>{isOfflineMode ? 'Local Mode (Offline)' : 'Live Server Mode'}</span>
          </button>
      </div>

      {/* Firebase Setup Guide Modal */}
      {showGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative">
                  <div className="p-6 bg-brand-900 text-white border-b border-brand-800 flex justify-between items-center shrink-0">
                      <div className="flex items-center">
                          <div className="p-2 bg-white/10 rounded-lg mr-3"><Database size={24} className="text-brand-300"/></div>
                          <div>
                              <h3 className="font-bold text-xl">Firebase 연동 가이드 (초보자용)</h3>
                              <p className="text-brand-200 text-xs">5분 만에 나만의 데이터 서버를 구축하세요.</p>
                          </div>
                      </div>
                      <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50">
                      <div className="space-y-8 max-w-3xl mx-auto">
                          
                          {/* Step 1 */}
                          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-center mb-4">
                                  <span className="bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 shrink-0">1</span>
                                  <h4 className="font-bold text-lg text-slate-800">Firebase 프로젝트 생성</h4>
                              </div>
                              <p className="text-sm text-slate-600 mb-4 pl-11">
                                  Firebase는 구글이 제공하는 무료 백엔드 서비스입니다. 먼저 프로젝트를 만드세요.
                              </p>
                              <div className="pl-11">
                                  <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors mb-2">
                                      <ExternalLink size={14} className="mr-2"/> Firebase Console 바로가기
                                  </a>
                                  <ul className="list-disc list-inside text-xs text-slate-500 space-y-1 mt-2 bg-slate-50 p-3 rounded-lg">
                                      <li>위 버튼을 눌러 콘솔로 이동 후 <strong>"프로젝트 추가"</strong>를 클릭하세요.</li>
                                      <li>프로젝트 이름(예: golf-manager)을 입력하고 계속 진행하세요. (Google Analytics는 꺼도 됩니다.)</li>
                                  </ul>
                              </div>
                          </section>

                          {/* Step 2 */}
                          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-center mb-4">
                                  <span className="bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 shrink-0">2</span>
                                  <h4 className="font-bold text-lg text-slate-800">앱 등록 및 설정값 복사</h4>
                              </div>
                              <div className="pl-11 space-y-3">
                                  <p className="text-sm text-slate-600">프로젝트 개요 화면 중앙의 <strong>웹 아이콘 (<span className="text-xs bg-slate-100 border px-1 rounded">&lt;/&gt;</span>)</strong>을 클릭하세요.</p>
                                  <ul className="list-disc list-inside text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg">
                                      <li>앱 닉네임 입력 (예: WebApp) 후 <strong>"앱 등록"</strong> 클릭.</li>
                                      <li>화면에 <code>const firebaseConfig = ...</code> 코드가 나타납니다.</li>
                                      <li>이 코드를 복사해서, 현재 앱 코드의 <strong>`firebaseConfig.ts`</strong> 파일 내용과 교체하세요.</li>
                                  </ul>
                              </div>
                          </section>

                          {/* Step 3 */}
                          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-center mb-4">
                                  <span className="bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 shrink-0">3</span>
                                  <h4 className="font-bold text-lg text-slate-800">Authentication (로그인) 활성화</h4>
                              </div>
                              <div className="pl-11">
                                  <p className="text-sm text-slate-600 mb-2">왼쪽 메뉴에서 <strong>빌드 {'>'} Authentication</strong>을 클릭하세요.</p>
                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                                      <p>1. <strong>"시작하기"</strong> 버튼 클릭</p>
                                      <p>2. <strong>"Sign-in method"</strong> 탭에서 <strong>"이메일/비밀번호"</strong> 선택</p>
                                      <p>3. <strong>"사용 설정"</strong> 스위치를 켜고 <strong>"저장"</strong> 클릭</p>
                                  </div>
                              </div>
                          </section>

                          {/* Step 4 */}
                          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-center mb-4">
                                  <span className="bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 shrink-0">4</span>
                                  <h4 className="font-bold text-lg text-slate-800">Firestore (데이터베이스) 생성 및 규칙 설정</h4>
                              </div>
                              <div className="pl-11 space-y-4">
                                  <p className="text-sm text-slate-600">왼쪽 메뉴에서 <strong>빌드 {'>'} Firestore Database</strong>를 클릭하세요.</p>
                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                                      <p>1. <strong>"데이터베이스 만들기"</strong> 클릭</p>
                                      <p>2. 위치는 기본값(미국 등) 또는 서울(asia-northeast3) 선택 후 <strong>"다음"</strong></p>
                                      <p>3. <strong>"테스트 모드에서 시작"</strong> 선택 후 <strong>"만들기"</strong> (개발 편의를 위해)</p>
                                  </div>
                                  
                                  <div className="mt-4">
                                      <p className="text-sm font-bold text-slate-700 mb-2 flex items-center"><Key size={14} className="mr-1"/> [중요] 보안 규칙 설정</p>
                                      <p className="text-xs text-slate-500 mb-2">데이터베이스 상단 <strong>"규칙(Rules)"</strong> 탭을 클릭하고 아래 코드로 덮어쓰세요.</p>
                                      <div className="bg-slate-800 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto relative">
                                          <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // 로그인한 사용자만 읽고 쓰기 가능
      allow read, write: if request.auth != null; 
    }
  }
}`}</pre>
                                          <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}`);
                                                alert('규칙 코드가 복사되었습니다.');
                                            }}
                                            className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded transition-colors" title="코드 복사"
                                          >
                                              <Copy size={14}/>
                                          </button>
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-1">* 규칙을 붙여넣은 후 반드시 <strong>"게시"</strong> 버튼을 누르세요.</p>
                                  </div>
                              </div>
                          </section>

                          {/* Final */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                              <h4 className="text-emerald-800 font-bold text-lg mb-2">준비 완료!</h4>
                              <p className="text-emerald-700 text-sm mb-4">
                                  이제 <code>firebaseConfig.ts</code> 파일에 설정값을 넣고 저장하면,<br/> 
                                  자동으로 'Live Server Mode'로 전환되어 실제 데이터를 사용할 수 있습니다.
                              </p>
                              <button onClick={() => setShowGuide(false)} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-md">
                                  닫기
                              </button>
                          </div>

                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-xl mb-5 transform hover:scale-105 transition-transform duration-300">
             <div className="bg-brand-50 p-2.5 rounded-xl border border-brand-100">
               <Shield size={36} className="text-brand-600" />
             </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">GreenMaster Info</h1>
          <p className="text-brand-200 text-sm font-medium tracking-wide">골프장 통합 정보 관리 시스템</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100/50 backdrop-blur-sm">
          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8 relative">
            <button
              onClick={() => setMode('LOGIN')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 relative z-10 ${mode === 'LOGIN' ? 'bg-white text-brand-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('SIGNUP')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 relative z-10 ${mode === 'SIGNUP' ? 'bg-white text-brand-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              회원가입
            </button>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 shadow-sm">
                <div className="flex items-start">
                    <CheckCircle size={18} className="mr-2 mt-0.5 shrink-0 text-green-600"/>
                    <span className="font-medium">{successMsg}</span>
                </div>
                {registeredUid && (
                    <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between">
                        <code className="text-xs bg-white px-2 py-1 rounded border border-green-100 font-mono text-slate-500 truncate max-w-[200px]">{registeredUid}</code>
                        <button onClick={copyUid} className="text-xs flex items-center font-bold text-green-700 hover:underline"><Copy size={12} className="mr-1"/> UID 복사</button>
                    </div>
                )}
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start animate-in fade-in slide-in-from-top-2 shadow-sm">
                <AlertTriangle size={18} className="mr-2 mt-0.5 shrink-0 text-red-500"/>
                <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {mode === 'LOGIN' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
               <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">직원 로그인</h2>
               <p className="text-sm text-slate-500 mb-8 text-center">{isOfflineMode ? '로컬 데이터로 접속합니다. (비밀번호 불필요)' : '승인된 계정 이메일과 비밀번호로 접속하세요.'}</p>
               
               <form onSubmit={handleLogin} className="space-y-5">
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">이메일</label>
                   <div className="relative group">
                     <Mail className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                     <input 
                       type="email" 
                       className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" 
                       placeholder="user@greenmaster.com"
                       value={loginEmail}
                       onChange={(e) => setLoginEmail(e.target.value)}
                       autoComplete="email"
                     />
                   </div>
                 </div>
                 
                 {!isOfflineMode && (
                     <div>
                       <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">비밀번호</label>
                       <div className="relative group">
                         <Lock className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                         <input 
                           type="password" 
                           className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" 
                           placeholder="••••••••"
                           value={loginPassword}
                           onChange={(e) => setLoginPassword(e.target.value)}
                           autoComplete="current-password"
                         />
                       </div>
                     </div>
                 )}

                 {/* Demo Hint */}
                 <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-center">
                    <span className="font-bold mr-1">Admin Demo:</span> soonyong90@gmail.com / rnjstnsdyd1!
                 </div>
                 
                 <div className="pt-2">
                   <button 
                     type="submit" 
                     disabled={isLoading}
                     className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-lg hover:shadow-xl transform active:scale-[0.98] ${
                       isLoading
                         ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                         : 'bg-brand-900 text-white hover:bg-brand-800'
                     }`}
                   >
                     {isLoading ? (
                       <>
                        <Loader2 className="animate-spin mr-2" size={20} />
                        인증 중...
                       </>
                     ) : (
                       <>
                         로그인 <ArrowRight size={20} className="ml-2" />
                       </>
                     )}
                   </button>
                 </div>
               </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">신규 계정 신청</h2>
              <p className="text-sm text-slate-500 mb-6 text-center">{isOfflineMode ? '로컬 모드에서는 회원가입이 자동으로 승인됩니다.' : '관리자 승인 절차가 필요합니다.'}</p>
              
              <form onSubmit={handleSignup} className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">이름 (실명)</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" 
                     placeholder="예: 홍길동"
                     value={regName}
                     onChange={(e) => setRegName(e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">이메일</label>
                   <input 
                     type="email" 
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" 
                     placeholder="user@example.com"
                     value={regEmail}
                     onChange={(e) => setRegEmail(e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">비밀번호 (6자 이상)</label>
                   <input 
                     type="password" 
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" 
                     placeholder="••••••••"
                     value={regPassword}
                     onChange={(e) => setRegPassword(e.target.value)}
                   />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">소속 부서</label>
                     <div className="relative">
                        <select 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all appearance-none"
                          value={regDept}
                          onChange={(e) => setRegDept(e.target.value as Department)}
                        >
                            {Object.values(Department).map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">▼</div>
                     </div>
                 </div>
                 
                 <div className="text-xs text-orange-700 bg-orange-50 p-3 rounded-xl flex items-start border border-orange-100">
                    <AlertTriangle size={16} className="mr-2 mt-0.5 shrink-0"/>
                    <span className="leading-relaxed">
                        {isOfflineMode ? '오프라인 모드는 로컬 저장소를 사용하므로 보안에 유의하세요.' : <span>회원가입 후 <strong>관리자의 승인</strong>이 완료되어야 시스템을 이용하실 수 있습니다.</span>}
                    </span>
                 </div>

                 <div className="pt-2">
                   <button 
                     type="submit" 
                     disabled={isLoading}
                     className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                   >
                     {isLoading ? (
                        <>
                            <Loader2 className="animate-spin mr-2" size={20} />
                            처리 중...
                        </>
                     ) : (
                        <>
                            <UserPlus className="mr-2" size={20}/> 가입 신청하기
                        </>
                     )}
                   </button>
                 </div>
              </form>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center uppercase tracking-widest font-bold">
              <Lock size={10} className="mr-1.5" /> Secure Connection Established
            </p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-center text-slate-400 text-xs font-medium">
        © 2024 GreenMaster Info System. All rights reserved.
      </div>
    </div>
  );
};

export default Login;
