
import React, { useState } from 'react';
import { LogEntry, Department, ExternalEvent } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  logs: LogEntry[];
  externalEvents?: ExternalEvent[];
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

const DEPT_COLORS: Record<Department, string> = {
  [Department.SALES]: 'bg-blue-500',
  [Department.RESEARCH]: 'bg-purple-500',
  [Department.CONSTRUCTION]: 'bg-orange-500',
  [Department.CONSULTING]: 'bg-emerald-500',
  [Department.MANAGEMENT]: 'bg-slate-500',
};

export const CalendarView: React.FC<CalendarViewProps> = ({ logs, externalEvents = [], onDateSelect, selectedDate }) => {
  // CHANGED: Default to current real date to ensure calendar is always up-to-date
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayLogs = logs.filter(l => l.date === dateStr);
    const dayExternal = externalEvents.filter(e => e.date === dateStr);
    return { logs: dayLogs, external: dayExternal };
  };

  const renderDays = () => {
    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-slate-50 border-b border-r border-slate-100"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { logs: dayLogs, external: dayExternal } = getEventsForDate(day);
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const totalEvents = dayLogs.length + dayExternal.length;

      days.push(
        <div 
          key={day} 
          onClick={() => onDateSelect(dateStr)}
          className={`min-h-[7rem] border-b border-r border-slate-100 p-1 relative cursor-pointer transition-colors hover:bg-slate-50 
            ${isSelected ? 'bg-brand-50' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full 
              ${isToday ? 'bg-red-500 text-white shadow-md' : isSelected ? 'text-brand-700 font-bold' : 'text-slate-700'}`}>
              {day}
            </span>
          </div>
          
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayExternal.map(evt => (
              <div key={`ext-${evt.id}`} className="flex items-center text-xs truncate pr-1 group">
                <div className="w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0 bg-pink-500"></div>
                <span className="text-slate-600 truncate text-[10px] leading-tight group-hover:text-pink-600">
                  <span className="text-[9px] text-pink-500 font-medium mr-0.5">[{evt.source === 'Google' ? 'G' : 'O'}]</span>
                  {evt.title}
                </span>
              </div>
            ))}

            {dayLogs.map(log => (
              <div key={`log-${log.id}`} className="flex items-center text-xs truncate pr-1">
                 <div className={`w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0 ${DEPT_COLORS[log.department] || 'bg-gray-400'}`}></div>
                 <span className="text-slate-500 truncate text-[10px] leading-tight">{log.title}</span>
              </div>
            ))}
            
            {totalEvents > 4 && (
               <div className="text-[10px] text-slate-400 pl-2.5">+ {totalEvents - 4} more</div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mb-6">
      {/* Calendar Header */}
      <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-600">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {year}년 {month + 1}월
          </h2>
          <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-600">
            <ChevronRight size={18} />
          </button>
        </div>
        <button onClick={goToday} className="text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors shadow-sm active:scale-95">
          오늘 (Today)
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 text-center bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 py-2">
        <div className="text-red-500">일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div className="text-blue-500">토</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 bg-slate-200 gap-px border-b border-slate-200">
        {renderDays()}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 flex flex-wrap gap-3 border-t border-slate-100 justify-between items-center">
         <div className="flex flex-wrap gap-3">
          {Object.entries(DEPT_COLORS).map(([dept, colorClass]) => (
              <div key={dept} className="flex items-center text-xs text-slate-500">
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${colorClass}`}></div>
                  {dept}
              </div>
          ))}
         </div>
         <div className="flex items-center text-xs text-slate-500 pl-4 border-l border-slate-200">
             <div className="w-2 h-2 rounded-full mr-1.5 bg-pink-500"></div>
             외부 일정 (Google/Outlook)
         </div>
      </div>
    </div>
  );
};
