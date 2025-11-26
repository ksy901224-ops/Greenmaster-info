import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Flag } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const CourseList: React.FC = () => {
  const { courses } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCourses = courses.filter(c => 
    c.name.includes(searchTerm) || c.address.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">골프장 찾기</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="골프장 명, 주소 검색..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map(course => (
          <Link to={`/courses/${course.id}`} key={course.id} className="block group">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-brand-500 hover:shadow-md transition-all h-full flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{course.name}</h3>
                <span className={`text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium`}>
                  {course.type}
                </span>
              </div>
              
              <div className="space-y-2 mb-4 flex-grow">
                <div className="flex items-center text-sm text-slate-600">
                  <MapPin size={16} className="mr-2 text-slate-400" />
                  {course.address}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Flag size={16} className="mr-2 text-slate-400" />
                  {course.holes}홀 / {course.grassType}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mt-2 border-t pt-2 border-slate-100">
                  {course.description}
                </p>
              </div>

              <div className="mt-auto text-center py-2 bg-slate-50 rounded-lg text-sm text-brand-700 font-medium group-hover:bg-brand-50 transition-colors">
                상세 정보 보기
              </div>
            </div>
          </Link>
        ))}
        
        {filteredCourses.length === 0 && (
           <div className="col-span-full text-center py-12">
             <p className="text-slate-500">검색 결과가 없습니다.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default CourseList;