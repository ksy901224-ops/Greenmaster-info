import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_PEOPLE } from '../constants';
import LogCard from '../components/LogCard';
import { generateCourseSummary } from '../services/geminiService';
import { Info, FileText, Users, Sparkles, History, Edit2, X, CheckCircle, MapPin } from 'lucide-react';
import { AffinityLevel, CourseType, GrassType, GolfCourse } from '../types';
import { useApp } from '../contexts/AppContext';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { courses, logs, updateCourse, people } = useApp(); // Get data from context
  
  const course = courses.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGS' | 'PEOPLE'>('INFO');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<GolfCourse | null>(null);

  if (!course) return <div className="p-8 text-center">골프장을 찾을 수 없습니다.</div>;

  const relatedLogs = logs.filter(l => l.courseId === id);
  // Use people from context instead of MOCK_PEOPLE
  const relatedPeople = people.filter(p => 
    p.currentCourseId === id || p.careers.some(c => c.courseId === id)
  );

  const handleAiAnalysis = async () => {
    setIsSummarizing(true);
    const summary = await generateCourseSummary(course, relatedLogs, relatedPeople);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  const getAffinityBadge = (level: AffinityLevel) => {
    if (level >= 1) return <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">우호적</span>;
    if (level <= -1) return <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">적대적</span>;
    return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">중립</span>;
  };

  const openEditModal = () => {
      setEditForm({ ...course });
      setIsEditModalOpen(true);
  };

  const handleEditChange = (field: keyof GolfCourse, value: any) => {
      if (editForm) {
          setEditForm({ ...editForm, [field]: value });
      }
  };

  const saveEdit = () => {
      if (editForm) {
          updateCourse(editForm);
          setIsEditModalOpen(false);
          alert('골프장 정보가 수정되었습니다.');
      }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
        <div className="flex justify-between items-start mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <button 
                onClick={openEditModal}
                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-colors"
                title="정보 수정"
            >
                <Edit2 size={18} />
            </button>
        </div>
        <p className="text-slate-500 text-sm flex items-center mb-4">
          <span className="mr-3">{course.address}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{course.type}</span>
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4 border-slate-100">
          <div>
            <span className="block text-slate-400 text-xs">규모</span>
            <span className="font-medium">{course.holes}홀 / {course.area}</span>
          </div>
          <div>
            <span className="block text-slate-400 text-xs">잔디</span>
            <span className="font-medium">{course.grassType}</span>
          </div>
          <div>
            <span className="block text-slate-400 text-xs">오픈</span>
            <span className="font-medium">{course.openYear}년</span>
          </div>
           <div>
            <span className="block text-slate-400 text-xs">데이터 수</span>
            <span className="font-medium">로그 {relatedLogs.length}건 / 인물 {relatedPeople.length}명</span>
          </div>
        </div>
      </div>

      {/* AI Summary Card */}
      <div className="bg-brand-50 rounded-xl border border-brand-100 p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-brand-800 font-bold flex items-center">
            <Sparkles size={18} className="mr-2 text-brand-600" /> AI 스마트 요약
          </h3>
          {!aiSummary && (
            <button 
              onClick={handleAiAnalysis}
              disabled={isSummarizing}
              className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700 disabled:opacity-50 flex items-center"
            >
              {isSummarizing ? '분석 중...' : '지금 분석하기'}
            </button>
          )}
        </div>
        {aiSummary ? (
          <div className="text-sm text-brand-900 leading-relaxed whitespace-pre-line">
            {aiSummary}
          </div>
        ) : (
          <p className="text-sm text-brand-700 opacity-70">
            버튼을 누르면 최근 업무 일지와 인물 관계를 종합 분석하여 보고서를 생성합니다.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'INFO'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Info size={16} className="mr-2" /> 기본 정보/특이사항
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'LOGS'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText size={16} className="mr-2" /> 업무 일지 ({relatedLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('PEOPLE')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'PEOPLE'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users size={16} className="mr-2" /> 인맥/관계도 ({relatedPeople.length})
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-[300px]">
        {activeTab === 'INFO' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg mb-4">특이사항 및 개요</h3>
            <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-line">{course.description}</p>
            
            <h3 className="font-bold text-lg mb-4">연혁 및 주요 이슈</h3>
            <div className="space-y-4">
                {/* Mock History Data */}
                <div className="flex">
                    <div className="flex-shrink-0 w-20 text-sm text-slate-500 font-medium pt-1">2023.10</div>
                    <div className="border-l-2 border-slate-200 pl-4 pb-2">
                        <p className="text-slate-800 text-sm">클럽하우스 리모델링 완료</p>
                    </div>
                </div>
                 <div className="flex">
                    <div className="flex-shrink-0 w-20 text-sm text-slate-500 font-medium pt-1">2022.05</div>
                    <div className="border-l-2 border-slate-200 pl-4 pb-2">
                        <p className="text-slate-800 text-sm">그린 서브에어 시스템 도입</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="space-y-4">
             {relatedLogs.length > 0 ? (
                 relatedLogs.map(log => <LogCard key={log.id} log={log} />)
             ) : (
                 <div className="text-center py-12 text-slate-400">등록된 업무 일지가 없습니다.</div>
             )}
          </div>
        )}

        {activeTab === 'PEOPLE' && (
          <div className="grid gap-4 md:grid-cols-2">
            {relatedPeople.map(person => (
              <Link to={`/people/${person.id}`} key={person.id} className="block">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-slate-900">{person.name} <span className="text-sm font-normal text-slate-500">({person.currentRole})</span></h4>
                        <p className="text-xs text-slate-500">{person.id === 'p1' ? '현재 재직중' : '과거 근무 이력'}</p>
                    </div>
                    {getAffinityBadge(person.affinity)}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-2 bg-slate-50 p-2 rounded">
                    "{person.notes}"
                  </p>
                </div>
              </Link>
            ))}
            {relatedPeople.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">관련된 인물 정보가 없습니다.</div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-900">골프장 정보 수정</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">이름</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                            value={editForm.name}
                            onChange={(e) => handleEditChange('name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">주소</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                            <input 
                                type="text" 
                                className="w-full rounded-lg border-slate-300 text-sm pl-10 focus:border-brand-500 focus:ring-brand-500"
                                value={editForm.address}
                                onChange={(e) => handleEditChange('address', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">운영 형태</label>
                            <select 
                                className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                value={editForm.type}
                                onChange={(e) => handleEditChange('type', e.target.value as CourseType)}
                            >
                                {Object.values(CourseType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">잔디 종류</label>
                            <select 
                                className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                value={editForm.grassType}
                                onChange={(e) => handleEditChange('grassType', e.target.value as GrassType)}
                            >
                                {Object.values(GrassType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">규모 (홀)</label>
                            <input 
                                type="number" 
                                className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                value={editForm.holes}
                                onChange={(e) => handleEditChange('holes', parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">면적</label>
                            <input 
                                type="text" 
                                className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                value={editForm.area}
                                onChange={(e) => handleEditChange('area', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">개장 연도</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                            value={editForm.openYear}
                            onChange={(e) => handleEditChange('openYear', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">특이사항 및 설명</label>
                        <textarea 
                            rows={4}
                            className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                            value={editForm.description}
                            onChange={(e) => handleEditChange('description', e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                    <button 
                        onClick={() => setIsEditModalOpen(false)}
                        className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                    >
                        취소
                    </button>
                    <button 
                        onClick={saveEdit}
                        className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 flex items-center"
                    >
                        <CheckCircle size={16} className="mr-2" />
                        수정 완료
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;