import React from 'react';
import { X, Info } from 'lucide-react';

interface CalendarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected: boolean;
  isOutlookConnected: boolean;
  onToggleGoogle: () => void;
  onToggleOutlook: () => void;
}

export const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  isOpen, onClose, isGoogleConnected, isOutlookConnected, onToggleGoogle, onToggleOutlook
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-900">캘린더 연동 설정</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 mb-4">
            외부 캘린더를 연동하여 골프장 업무 일지와 개인 일정을 통합 관리하세요.
          </p>

          {/* Google Calendar Option */}
          <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isGoogleConnected ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center p-2 shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Calendar_icon_%282020%29.svg/1024px-Google_Calendar_icon_%282020%29.svg.png" alt="Google" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Google Calendar</h4>
                <div className="flex items-center mt-0.5">
                   <span className={`w-2 h-2 rounded-full mr-1.5 ${isGoogleConnected ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                   <p className="text-xs text-slate-500">{isGoogleConnected ? '연동 완료' : '연동되지 않음'}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={onToggleGoogle}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isGoogleConnected 
                  ? 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm' 
                  : 'bg-slate-900 text-white border-transparent hover:bg-slate-800 hover:shadow-md'
              }`}
            >
              {isGoogleConnected ? '해제' : '연동하기'}
            </button>
          </div>

          {/* Outlook Calendar Option */}
          <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isOutlookConnected ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center p-2 shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/800px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png" alt="Outlook" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Outlook Calendar</h4>
                <div className="flex items-center mt-0.5">
                   <span className={`w-2 h-2 rounded-full mr-1.5 ${isOutlookConnected ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                   <p className="text-xs text-slate-500">{isOutlookConnected ? '연동 완료' : '연동되지 않음'}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={onToggleOutlook}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isOutlookConnected 
                  ? 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm' 
                  : 'bg-slate-900 text-white border-transparent hover:bg-slate-800 hover:shadow-md'
              }`}
            >
              {isOutlookConnected ? '해제' : '연동하기'}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 text-xs text-slate-500 border-t border-slate-100 flex items-start">
           <Info size={14} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
           보안을 위해 연동된 데이터는 현재 브라우저 세션에만 표시되며 서버에 영구 저장되지 않습니다.
        </div>
      </div>
    </div>
  );
};