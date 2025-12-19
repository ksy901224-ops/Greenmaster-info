
import React, { useState, useMemo } from 'react';
import { Search, MapPin, ArrowRight, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Region } from '../types';

const CourseList: React.FC = () => {
  const { courses, navigate } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region | '전체'>('전체');

  const regions: (Region | '전체')[] = ['전체', '서울', '경기', '강원', '충청', '전라', '경상', '제주'];

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = c.name.includes(searchTerm) || c.address.includes(searchTerm);
      const matchRegion = selectedRegion === '전체' || c.region === selectedRegion;
      return matchSearch && matchRegion;
    });
  }, [courses, searchTerm, selectedRegion]);

  const getGradient = (id: string) => {
      const colors = ['from-emerald-500 to-teal-700', 'from-green-600 to-emerald-800', 'from-teal-500 to-cyan-700', 'from-lime-600 to-green-800'];
      const index = id.charCodeAt(id.length - 1) % colors.length;
      return colors[index];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">전국 골프장 마스터 DB</h1>
            <p className="text-slate-500 text-sm">전국 590여 개소 골프장의 상세 정보를 통합 관리합니다.</p>
        </div>
        <div className="relative w-full md:w-80 shadow-sm">
          <input
            type="text"
            placeholder="골프장 명, 주소 검색..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        </div>
      </div>

      {/* Region Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          <div className="p-2 bg-white rounded-lg border border-slate-200 mr-2 text-slate-400">
              <Filter size={16}/>
          </div>
          {regions.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRegion(r)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    selectedRegion === r 
                    ? 'bg-brand-600 text-white shadow-md transform scale-105' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                  {r} {r !== '전체' && <span className="ml-1 opacity-60">{courses.filter(c => c.region === r).length}</span>}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(course => (
          <div 
             key={course.id} 
             onClick={() => navigate(`/courses/${course.id}`)}
             className="block group h-full cursor-pointer"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-brand-200 transition-all duration-300 h-full flex flex-col transform hover:-translate-y-1">
              <div className={`h-24 bg-gradient-to-r ${getGradient(course.id)} p-5 flex flex-col justify-end relative`}>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20">
                        {course.region}
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20">
                        {course.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{course.name}</h3>
              </div>
              
              <div className="p-5 flex-grow flex flex-col">
                <div className="flex items-center text-slate-500 text-xs mb-4">
                    <MapPin size={12} className="mr-1 shrink-0" /> <span className="truncate">{course.address}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 py-3 border-y border-slate-50">
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">홀 수</div>
                        <div className="text-sm font-bold text-slate-700">{course.holes}홀</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">개장</div>
                        <div className="text-sm font-bold text-slate-700">{course.openYear}년</div>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                        {course.grassType}
                    </span>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-brand-600 flex items-center transition-colors">
                        상세보기 <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1"/>
                    </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {filteredCourses.length === 0 && (
           <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <Search size={40} className="mx-auto mb-4 text-slate-300" />
             <p className="text-slate-500 font-medium">검색 결과가 없습니다.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default CourseList;
