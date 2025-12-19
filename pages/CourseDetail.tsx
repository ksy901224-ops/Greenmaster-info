
import React, { useState, useEffect, useMemo, useRef } from 'react';
import LogCard from '../components/LogCard';
import { generateCourseSummary, analyzeMaterialInventory } from '../services/geminiService';
import { Info, FileText, Users, Sparkles, History, Edit2, X, CheckCircle, MapPin, Trash2, Globe, Loader2, List, AlertTriangle, Plus, Lock, Calculator, Cloud, Search, BarChart3, TrendingUp, TrendingDown, Package, Droplets, Sprout, Box, Camera } from 'lucide-react';
import { AffinityLevel, CourseType, GrassType, GolfCourse, FinancialRecord, MaterialRecord, MaterialCategory } from '../types';
import { useApp } from '../contexts/AppContext';

const CourseDetail: React.FC = () => {
  const { courses, logs, updateCourse, deleteCourse, people, canUseAI, canViewFullData, isAdmin, navigate, routeParams, locationState, financials, materials, addFinancial, updateFinancial, deleteFinancial, addMaterial, updateMaterial, deleteMaterial } = useApp();
  const id = routeParams.id;
  const course = courses.find(c => c.id === id);

  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGS' | 'PEOPLE' | 'MANAGEMENT'>('INFO');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<GolfCourse | null>(null);

  if (!course) return <div className="p-8 text-center">골프장을 찾을 수 없습니다.</div>;

  const currentStaff = people.filter(p => p.currentCourseId === id);
  const formerStaff = people.filter(p => p.careers.some(c => c.courseId === id) && p.currentCourseId !== id);
  const relatedLogs = logs.filter(l => l.courseId === id);

  const handleAiAnalysis = async () => {
    setIsSummarizing(true);
    const summary = await generateCourseSummary(course, relatedLogs, [...currentStaff, ...formerStaff]);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <div className="flex space-x-2">
                {canViewFullData && <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-slate-400 hover:text-brand-600"><Edit2 size={18} /></button>}
                {isAdmin && <button onClick={() => { if(window.confirm('삭제하시겠습니까?')) { deleteCourse(course.id); navigate('/courses'); } }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>}
            </div>
        </div>
        <p className="text-slate-500 text-sm mt-1 flex items-center"><MapPin size={14} className="mr-1"/> {course.address}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-6 border-t pt-4 border-slate-50">
            <div><span className="text-slate-400 block mb-0.5">홀 수</span><span className="font-bold">{course.holes}홀</span></div>
            <div><span className="text-slate-400 block mb-0.5">운영형태</span><span className="font-bold">{course.type}</span></div>
            <div><span className="text-slate-400 block mb-0.5">잔디</span><span className="font-bold">{course.grassType}</span></div>
            <div><span className="text-slate-400 block mb-0.5">개장</span><span className="font-bold">{course.openYear}년</span></div>
        </div>
      </div>

      {canUseAI && !aiSummary && (
          <button onClick={handleAiAnalysis} disabled={isSummarizing} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center shadow-lg disabled:opacity-50">
              {isSummarizing ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
              AI 종합 현황 진단 및 전략 리포트 생성
          </button>
      )}
      {aiSummary && <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-sm leading-relaxed whitespace-pre-line shadow-inner">{aiSummary}</div>}

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('INFO')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm ${activeTab === 'INFO' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400'}`}>기본정보/이슈</button>
          <button onClick={() => setActiveTab('MANAGEMENT')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm ${activeTab === 'MANAGEMENT' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400'}`}>운영관리</button>
          <button onClick={() => setActiveTab('LOGS')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm ${activeTab === 'LOGS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400'}`}>업무일지</button>
          <button onClick={() => setActiveTab('PEOPLE')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm ${activeTab === 'PEOPLE' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400'}`}>인맥/관계</button>
        </nav>
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'INFO' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg mb-4">특이사항</h3>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl mb-6">{course.description}</p>
            <h3 className="font-bold text-lg mb-4 flex items-center"><History size={18} className="mr-2 text-brand-600"/> 주요 연혁 및 이슈</h3>
            <div className="space-y-3">
                {course.issues?.map((issue, i) => (
                    <div key={i} className="flex items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <AlertTriangle size={14} className="text-amber-500 mr-3 mt-1 shrink-0"/>
                        <p className="text-sm text-slate-700">{issue}</p>
                    </div>
                ))}
            </div>
          </div>
        )}

        {activeTab !== 'INFO' && !canViewFullData && (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Lock size={32}/></div>
                <h3 className="font-bold text-lg text-slate-900">조회 권한 제한</h3>
                <p className="text-slate-500 text-sm mt-1">상세 업무 데이터 및 인물 정보는 중급자 이상의 권한이 필요합니다.</p>
            </div>
        )}

        {canViewFullData && activeTab === 'MANAGEMENT' && (
            <div className="p-4 text-center text-slate-400 italic">재무 및 자재 데이터 모듈 준비 중...</div>
        )}

        {canViewFullData && activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {relatedLogs.map(log => <LogCard key={log.id} log={log} />)}
                {relatedLogs.length === 0 && <div className="col-span-full py-20 text-center text-slate-400">등록된 일지가 없습니다.</div>}
            </div>
        )}

        {canViewFullData && activeTab === 'PEOPLE' && (
            <div className="grid gap-4 md:grid-cols-2">
                {currentStaff.map(p => (
                    <div key={p.id} onClick={() => navigate(`/people/${p.id}`)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-500 transition-all">
                        <div className="flex justify-between items-center">
                            <div><h4 className="font-bold text-slate-900">{p.name}</h4><p className="text-xs text-slate-500">{p.currentRole}</p></div>
                            <span className={`w-2 h-2 rounded-full ${p.affinity > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
