
import React, { useState, useRef, useEffect } from 'react';
import { Department, GolfCourse, CourseType, GrassType, LogEntry, Person, AffinityLevel, EventType } from '../types';
import { Camera, MapPin, Save, Loader2, FileText, Sparkles, UploadCloud, Plus, X, UserPlus, CalendarPlus, ChevronDown, Cloud, History, Trash2, RotateCcw, FileSpreadsheet, FileIcon, CheckCircle, AlertOctagon, ArrowRight, Building2, User, Search, AlignLeft, Info, Lock, Home } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

const WriteLog: React.FC = () => {
  const { addLog, updateLog, addCourse, updateCourse, addPerson, addExternalEvent, courses: globalCourses, people: globalPeople, navigate, locationState, canViewFullData } = useApp();
  
  // RBAC 차단
  if (!canViewFullData) {
      return (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-center animate-in fade-in">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-sm ring-1 ring-red-100">
                  <Lock size={40}/>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">접근 권한 없음</h1>
              <p className="text-slate-500 mt-2 max-w-xs">직접 등록 및 AI 분석 업로드 기능은<br/>중급자 이상의 권한이 필요합니다.</p>
              <button 
                onClick={() => navigate('/')} 
                className="mt-8 flex items-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                  <Home size={18} className="mr-2"/> 홈으로 이동
              </button>
          </div>
      );
  }

  const editingLog = locationState?.log as LogEntry | undefined;
  const [activeTab, setActiveTab] = useState<'LOG' | 'AI' | 'PERSON' | 'SCHEDULE'>('LOG');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState<string>('영업');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // ... (기존 로직 유지)

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCourse = globalCourses.find(c => c.id === courseId);
    const logData = { department: dept as Department, courseId, courseName: selectedCourse?.name || '미지정', title, content, contactPerson, updatedAt: Date.now(), date: logDate };
    if (editingLog) updateLog({ ...editingLog, ...logData });
    else addLog({ id: `manual-${Date.now()}`, author: 'User', createdAt: Date.now(), ...logData });
    alert('저장되었습니다.'); navigate('/');
  };

  return (
    <div className="space-y-6 relative max-w-4xl mx-auto animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">정보 등록</h1>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-x-auto no-scrollbar">
            {[
                { id: 'LOG', label: '수기 작성', icon: <FileText size={18}/> },
                { id: 'AI', label: 'AI 스마트 업로드', icon: <Sparkles size={18}/> },
                { id: 'PERSON', label: '인물 등록', icon: <UserPlus size={18}/> },
                { id: 'SCHEDULE', label: '일정 등록', icon: <CalendarPlus size={18}/> }
            ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-xl transition-all ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            {activeTab === 'LOG' && (
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">날짜</label>
                            <input type="date" className="w-full rounded-xl border border-slate-200 py-3 px-4 bg-slate-50" value={logDate} onChange={e => setLogDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">부서</label>
                            <select className="w-full rounded-xl border border-slate-200 py-3 px-4 bg-slate-50" value={dept} onChange={e => setDept(e.target.value)}>
                                {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">골프장</label>
                        <select className="w-full rounded-xl border border-slate-200 py-3 px-4 bg-slate-50" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                            <option value="">선택하세요</option>
                            {globalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">제목</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 py-3 px-4 bg-slate-50" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력하세요" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">내용</label>
                        <textarea rows={8} className="w-full rounded-xl border border-slate-200 py-3 px-4 bg-slate-50" value={content} onChange={e => setContent(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 shadow-xl transition-all active:scale-95">저장하기</button>
                </form>
            )}
            
            {activeTab === 'AI' && (
                <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-4"><Sparkles size={32}/></div>
                    <h2 className="text-xl font-bold text-slate-900">AI 스마트 분석 등록</h2>
                    <p className="text-sm text-slate-500">보고서 이미지나 PDF를 업로드하면 자동으로 분석하여 요약 등록합니다.</p>
                    <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700">파일 선택하기</button>
                </div>
            )}
        </div>
    </div>
  );
};

export default WriteLog;
