
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Phone, Briefcase, MapPin, HeartHandshake, ChevronDown, Edit2, X, CheckCircle, Trash2, Plus, Calendar } from 'lucide-react';
import { AffinityLevel, Person, CareerRecord } from '../types';
import { useApp } from '../contexts/AppContext';

const PersonDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { people, courses, updatePerson } = useApp();
  
  const person = people.find(p => p.id === id);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Person | null>(null);

  if (!person) return <div className="p-8 text-center">인물 정보를 찾을 수 없습니다.</div>;

  const currentCourse = courses.find(c => c.id === person.currentCourseId);

  const toggleExpanded = (index: number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedItems(newSet);
  };

  const getAffinityColor = (level: AffinityLevel) => {
      if(level >= 1) return "text-green-600 bg-green-50 border-green-200";
      if(level <= -1) return "text-red-600 bg-red-50 border-red-200";
      return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const getAffinityText = (level: AffinityLevel) => {
      if(level === AffinityLevel.ALLY) return "강력한 아군 (Ally)";
      if(level === AffinityLevel.FRIENDLY) return "우호적 (Friendly)";
      if(level === AffinityLevel.NEUTRAL) return "중립 (Neutral)";
      if(level === AffinityLevel.UNFRIENDLY) return "비우호적 (Unfriendly)";
      return "적대적 (Hostile)";
  };

  const openEditModal = () => {
      setEditForm({ ...person });
      setIsEditModalOpen(true);
  };

  const handleEditChange = (field: keyof Person, value: any) => {
      if (editForm) {
          setEditForm({ ...editForm, [field]: value });
      }
  };

  // Helper for Career Management in Edit Mode
  const addCareerToForm = () => {
    if (editForm) {
        const newCareer: CareerRecord = {
            courseId: '',
            courseName: '',
            role: '',
            startDate: '',
            endDate: '',
            description: ''
        };
        setEditForm({...editForm, careers: [...editForm.careers, newCareer]});
    }
  };

  const removeCareerFromForm = (index: number) => {
    if (editForm) {
        const newCareers = [...editForm.careers];
        newCareers.splice(index, 1);
        setEditForm({...editForm, careers: newCareers});
    }
  };

  const updateCareerField = (index: number, field: keyof CareerRecord, value: string) => {
      if (editForm) {
          const newCareers = [...editForm.careers];
          newCareers[index] = { ...newCareers[index], [field]: value };
          setEditForm({...editForm, careers: newCareers});
      }
  };

  const saveEdit = () => {
      if (editForm) {
          updatePerson(editForm);
          setIsEditModalOpen(false);
          alert('인물 정보가 수정되었습니다.');
      }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="bg-brand-900 h-24 relative">
             <button 
                onClick={openEditModal}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                title="인물 정보 수정"
             >
                <Edit2 size={18} />
             </button>
        </div>
        <div className="px-6 pb-6 relative">
            <div className="flex justify-between items-end -mt-10 mb-4">
                <div className="bg-white p-1 rounded-full">
                    <div className="bg-slate-200 rounded-full w-24 h-24 flex items-center justify-center text-slate-500 border-4 border-white">
                        <User size={48} />
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border text-sm font-bold ${getAffinityColor(person.affinity)}`}>
                    {getAffinityText(person.affinity)}
                </div>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900">{person.name}</h1>
            <p className="text-slate-600 font-medium mb-4 flex items-center">
                {person.currentRole} @ {currentCourse?.name || '소속 없음'} 
                {person.currentRoleStartDate && <span className="ml-2 text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500">(입사: {person.currentRoleStartDate})</span>}
            </p>
            
            <div className="flex flex-col space-y-2 text-sm text-slate-500">
                <div className="flex items-center">
                    <Phone size={16} className="mr-3 text-slate-400" />
                    {person.phone}
                </div>
                <div className="flex items-center">
                    <MapPin size={16} className="mr-3 text-slate-400" />
                    {currentCourse?.address || '-'}
                </div>
            </div>
        </div>
      </div>

      {/* Notes & Relationship */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
              <HeartHandshake size={20} className="mr-2 text-brand-600" /> 관계 및 특징
          </h3>
          <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {person.notes}
          </div>
      </div>

      {/* Career Timeline */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
            <Briefcase size={20} className="mr-2 text-brand-600" /> 경력 타임라인
        </h3>
        
        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
            {/* Current Job */}
            <div className="relative pl-8">
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-brand-500 border-4 border-white shadow-sm"></div>
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 shadow-sm">
                    <h4 className="font-bold text-slate-900 text-md">{currentCourse?.name || '현재 소속'}</h4>
                    <p className="text-brand-600 font-medium text-sm">{person.currentRole}</p>
                    <p className="text-slate-400 text-xs mt-1">
                        {person.currentRoleStartDate ? `${person.currentRoleStartDate} ~ 현재` : '현재 재직 중'}
                    </p>
                </div>
            </div>

            {/* Past Jobs */}
            {person.careers.map((career, idx) => {
                 const isExpanded = expandedItems.has(idx);
                 return (
                    <div key={idx} className="relative pl-8">
                        <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
                        
                        <div 
                            onClick={() => toggleExpanded(idx)}
                            className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md ${
                                isExpanded 
                                ? 'bg-white border-slate-300 ring-1 ring-slate-200' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className={`font-bold text-md ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>
                                        {career.courseName}
                                    </h4>
                                    <div className="flex items-center flex-wrap gap-2 mt-1">
                                        <span className="text-slate-600 font-medium text-sm bg-slate-100 px-2 py-0.5 rounded">
                                            {career.role}
                                        </span>
                                        <span className="text-slate-400 text-xs">
                                            {career.startDate} ~ {career.endDate || '현재'}
                                        </span>
                                    </div>
                                </div>
                                <button className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-600' : ''}`}>
                                    <ChevronDown size={20} />
                                </button>
                            </div>
                            
                            {isExpanded && (
                                <div className="mt-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                    <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">주요 성과 및 프로젝트</h5>
                                    {career.description ? (
                                        <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-100">
                                            {career.description}
                                        </p>
                                    ) : (
                                        <p className="text-slate-400 text-sm italic">
                                            등록된 상세 내용이 없습니다.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                 );
            })}
        </div>
      </div>

       {/* Edit Modal */}
       {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-lg text-slate-900">인물 정보 수정</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
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
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">연락처</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                            value={editForm.phone}
                            onChange={(e) => handleEditChange('phone', e.target.value)}
                        />
                    </div>
                    <div className="bg-brand-50 p-4 rounded-lg border border-brand-100">
                        <h4 className="text-xs font-bold text-brand-800 mb-3 border-b border-brand-200 pb-1">현재 근무 정보</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">소속 골프장</label>
                                <select 
                                    className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                    value={editForm.currentCourseId || ''}
                                    onChange={(e) => handleEditChange('currentCourseId', e.target.value)}
                                >
                                    <option value="">소속 없음</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">직책</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                    value={editForm.currentRole}
                                    onChange={(e) => handleEditChange('currentRole', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">입사일</label>
                            <input 
                                type="date"
                                className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                                value={editForm.currentRoleStartDate || ''}
                                onChange={(e) => handleEditChange('currentRoleStartDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">친밀도 (관계)</label>
                        <div className="flex space-x-2 overflow-x-auto pb-1">
                            {[
                                { val: '2', label: 'Ally', color: 'bg-green-100 text-green-800' },
                                { val: '1', label: 'Friendly', color: 'bg-emerald-50 text-emerald-700' },
                                { val: '0', label: 'Neutral', color: 'bg-slate-50 text-slate-600' },
                                { val: '-1', label: 'Unfriendly', color: 'bg-orange-50 text-orange-700' },
                                { val: '-2', label: 'Hostile', color: 'bg-red-50 text-red-700' },
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => handleEditChange('affinity', parseInt(opt.val))}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all whitespace-nowrap ${
                                        editForm.affinity === parseInt(opt.val)
                                        ? `ring-2 ring-offset-1 ring-brand-500 ${opt.color} border-transparent`
                                        : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">특징 및 메모</label>
                        <textarea 
                            rows={3}
                            className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                            value={editForm.notes}
                            onChange={(e) => handleEditChange('notes', e.target.value)}
                        />
                    </div>

                    {/* Career History Edit Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                             <h4 className="text-xs font-bold text-slate-700">이력 관리 (직접 수정)</h4>
                             <button type="button" onClick={addCareerToForm} className="text-[10px] flex items-center bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100">
                                <Plus size={10} className="mr-1"/> 추가
                             </button>
                        </div>
                        {editForm.careers.map((career, idx) => (
                            <div key={idx} className="mb-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0 relative group">
                                <button 
                                    onClick={() => removeCareerFromForm(idx)}
                                    className="absolute right-0 top-0 text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        placeholder="골프장 이름"
                                        className="text-xs border-slate-300 rounded focus:ring-brand-500 py-1"
                                        value={career.courseName}
                                        onChange={(e) => updateCareerField(idx, 'courseName', e.target.value)}
                                    />
                                     <input 
                                        type="text" 
                                        placeholder="직책"
                                        className="text-xs border-slate-300 rounded focus:ring-brand-500 py-1"
                                        value={career.role}
                                        onChange={(e) => updateCareerField(idx, 'role', e.target.value)}
                                    />
                                </div>
                                <div className="flex space-x-2 items-center">
                                    <input 
                                        type="text" 
                                        placeholder="시작일 (YYYY-MM)"
                                        className="text-xs border-slate-300 rounded focus:ring-brand-500 w-24 py-1"
                                        value={career.startDate}
                                        onChange={(e) => updateCareerField(idx, 'startDate', e.target.value)}
                                    />
                                    <span className="text-slate-400 text-xs">~</span>
                                    <input 
                                        type="text" 
                                        placeholder="종료일"
                                        className="text-xs border-slate-300 rounded focus:ring-brand-500 w-24 py-1"
                                        value={career.endDate || ''}
                                        onChange={(e) => updateCareerField(idx, 'endDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                        {editForm.careers.length === 0 && (
                            <div className="text-center text-xs text-slate-400 py-2">등록된 과거 이력이 없습니다.</div>
                        )}
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 shrink-0">
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

export default PersonDetail;
