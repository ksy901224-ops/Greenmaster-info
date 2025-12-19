
import React, { useState, useRef } from 'react';
import { Department, LogEntry, Person, AffinityLevel, CourseType, GrassType } from '../types';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  X, 
  UserPlus, 
  CalendarPlus, 
  Loader2, 
  CheckCircle, 
  ArrowRight, 
  User, 
  Lock, 
  Home, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap,
  Phone,
  Briefcase
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addPerson, globalCourses, navigate, canViewFullData, courses } = useApp();
  
  if (!canViewFullData) {
      return (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-center animate-in fade-in">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-sm ring-1 ring-red-100"><Lock size={40}/></div>
              <h1 className="text-2xl font-bold text-slate-900">접근 권한 없음</h1>
              <p className="text-slate-500 mt-2">인텔리전스 등록 기능은 중급자 이상의 권한이 필요합니다.</p>
              <button onClick={() => navigate('/')} className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">홈으로 이동</button>
          </div>
      );
  }

  const [activeTab, setActiveTab] = useState<'LOG' | 'PERSON' | 'SCHEDULE'>('LOG');
  
  // Log State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<Department>(Department.SALES);
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Person State (Extended for Consulting)
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personCourseId, setPersonCourseId] = useState('');
  const [personAffinity, setPersonAffinity] = useState<AffinityLevel>(AffinityLevel.NEUTRAL);
  const [personInfluence, setPersonInfluence] = useState(3);
  const [personIsDM, setPersonIsDM] = useState(false);
  const [personInterests, setPersonInterests] = useState<string>('');
  const [personNotes, setPersonNotes] = useState('');

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCourse = courses.find(c => c.id === courseId);
    addLog({
        id: `log-${Date.now()}`,
        date: logDate,
        author: 'User',
        department: dept,
        courseId,
        courseName: selectedCourse?.name || '미지정',
        title,
        content,
        contactPerson,
        createdAt: Date.now()
    });
    alert('업무 인텔리전스가 등록되었습니다.');
    navigate('/');
  };

  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPerson({
        id: `p-${Date.now()}`,
        name: personName,
        phone: personPhone,
        currentRole: personRole,
        currentCourseId: personCourseId,
        affinity: personAffinity,
        notes: personNotes,
        careers: [],
        influenceLevel: personInfluence,
        isDecisionMaker: personIsDM,
        keyInterests: personInterests.split(',').map(s => s.trim()).filter(s => s !== ''),
    });
    alert('인물 전략 데이터가 등록되었습니다.');
    navigate('/relationship-map');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Input</h1>
                <p className="text-slate-500 text-sm mt-1">현장의 데이터를 전략적으로 수집합니다.</p>
            </div>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200">
            {[
                { id: 'LOG', label: '업무 일지', icon: <FileText size={18}/> },
                { id: 'PERSON', label: '인물/네트워크', icon: <UserPlus size={18}/> },
                { id: 'SCHEDULE', label: '일정/방문', icon: <CalendarPlus size={18}/> }
            ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center py-3.5 text-xs font-black rounded-2xl transition-all ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-8 md:p-12 overflow-hidden relative">
            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">기록 날짜</label>
                            <input type="date" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={logDate} onChange={e => setLogDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">관련 부서</label>
                            <select className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={dept} onChange={e => setDept(e.target.value as Department)}>
                                {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">대상 골프장</label>
                        <select className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                            <option value="">선택하세요</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">인텔리전스 제목</label>
                        <input type="text" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={title} onChange={e => setTitle(e.target.value)} placeholder="현장의 핵심 내용을 한 문장으로 요약" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">상세 보고 내용</label>
                        <textarea rows={10} className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all resize-none" value={content} onChange={e => setContent(e.target.value)} placeholder="컨설팅 분석에 필요한 수치, 정황, 인물 발언 등을 상세히 기술하세요." required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">접촉 인물 (선택)</label>
                        <input type="text" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="이름 입력" />
                    </div>
                    <button type="submit" className="w-full bg-brand-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-brand-800 shadow-xl transition-all transform active:scale-[0.98] mt-4">데이터 저장 및 동기화</button>
                </form>
            )}

            {activeTab === 'PERSON' && (
                <form onSubmit={handlePersonSubmit} className="space-y-8">
                    {/* 상단 기본 정보 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">성명</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="홍길동" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={personPhone} onChange={e => setPersonPhone(e.target.value)} placeholder="010-0000-0000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">현재 소속 골프장</label>
                            <select className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={personCourseId} onChange={e => setPersonCourseId(e.target.value)}>
                                <option value="">선택하세요</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">직책</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all" value={personRole} onChange={e => setPersonRole(e.target.value)} placeholder="예: 코스관리 팀장, 지배인 등" required />
                        </div>
                    </div>

                    {/* 컨설팅 전략 정보 (Proposed Fields) */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-brand-600 rounded-lg text-white"><Target size={14}/></div>
                            <h3 className="text-sm font-black text-slate-800">전략적 인물 분석 (Consulting Intelligence)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">사내 영향력 <span>Level: {personInfluence}</span></label>
                                <input type="range" min="1" max="5" className="w-full accent-brand-600" value={personInfluence} onChange={e => setPersonInfluence(parseInt(e.target.value))} />
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1"><span>일반 직원</span><span>강력한 실권자</span></div>
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="flex items-center space-x-3 cursor-pointer p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-300 transition-all">
                                    <input type="checkbox" checked={personIsDM} onChange={e => setPersonIsDM(e.target.checked)} className="w-5 h-5 rounded-md text-brand-600 focus:ring-brand-500 border-slate-300" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-800">의사결정권자(Decision Maker)</span>
                                        <span className="text-[9px] text-slate-400">최종 승인 및 예산 집행권 보유 여부</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">핵심 관심사 (콤마로 구분)</label>
                            <input type="text" className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-white text-sm focus:ring-2 focus:ring-brand-500 transition-all" value={personInterests} onChange={e => setPersonInterests(e.target.value)} placeholder="예: 비용절감, 코스품질, 배수문제, 인력관리 등" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">관계 및 정치적 특이사항</label>
                            <textarea rows={3} className="w-full rounded-2xl border-slate-200 py-3.5 px-5 bg-white text-sm focus:ring-2 focus:ring-brand-500 transition-all resize-none" value={personNotes} onChange={e => setPersonNotes(e.target.value)} placeholder="예: 소유주와의 관계, 타 부서와의 갈등 요소, 당사와의 우호적 히스토리 등" />
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">당사와의 친밀도</label>
                             <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                {[
                                    {v: AffinityLevel.ALLY, l: '강력한 우군'},
                                    {v: AffinityLevel.FRIENDLY, l: '우호적'},
                                    {v: AffinityLevel.NEUTRAL, l: '중립'},
                                    {v: AffinityLevel.UNFRIENDLY, l: '비우호'},
                                    {v: AffinityLevel.HOSTILE, l: '적대적'},
                                ].map(opt => (
                                    <button
                                        key={opt.v}
                                        type="button"
                                        onClick={() => setPersonAffinity(opt.v)}
                                        className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${personAffinity === opt.v ? 'bg-brand-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        {opt.l}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl transition-all transform active:scale-[0.98]">인물 전략 프로필 저장</button>
                </form>
            )}

            {activeTab === 'SCHEDULE' && (
                <div className="py-32 text-center space-y-4">
                    <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-600 mb-6"><CalendarPlus size={36}/></div>
                    <h2 className="text-xl font-black text-slate-900">일정 및 방문 기록</h2>
                    <p className="text-sm text-slate-500">외부 캘린더 연동 및 방문 일지 모듈 업데이트 중입니다.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default WriteLog;
