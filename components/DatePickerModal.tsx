import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, Calendar } from 'lucide-react';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: string, time?: string) => void;
  minDate?: Date;
  selectedDate?: string;
  selectedTime?: string;
}

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_ZH = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  minDate = new Date(),
  selectedDate,
  selectedTime,
}) => {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [step, setStep] = useState<'date' | 'time'>('date');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    if (selectedDate) {
      setSelected(new Date(selectedDate));
      setStep('time');
    } else {
      setSelected(null);
      setStep('date');
    }
  }, [selectedDate, isOpen]);

  const weekdays = lang === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN;
  const months = lang === 'zh' ? MONTHS_ZH : MONTHS_EN;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDisabled = (date: Date | null) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    return false;
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selected) return false;
    return date.toDateString() === selected.toDateString();
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isRangeStart = (date: Date | null) => {
    if (!date || !hoverDate) return false;
    const [start, end] = hoverDate < date ? [hoverDate, date] : [date, hoverDate];
    return date.toDateString() === start.toDateString();
  };

  const isRangeEnd = (date: Date | null) => {
    if (!date || !hoverDate) return false;
    const [start, end] = hoverDate < date ? [hoverDate, date] : [date, hoverDate];
    return date.toDateString() === end.toDateString() && !isSelected(date);
  };

  const isInRange = (date: Date | null) => {
    if (!date || !hoverDate || isSelected(date)) return false;
    const [start, end] = hoverDate < date ? [hoverDate, date] : [date, hoverDate];
    return isRangeStart(date) || isRangeEnd(date) || (hoverDate > date ? start < date : end > date);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date | null) => {
    if (!date || isDisabled(date)) return;
    setSelected(date);
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    if (selected) {
      onSelect(selected.toISOString().split('T')[0], time);
      onClose();
    }
  };

  const handleBack = () => {
    setStep('date');
  };

  if (!isOpen) return null;

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="relative">
          <div className="pt-6 px-6 pb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              {step === 'date' 
                ? <><Calendar className="h-5 w-5 text-teal-500" /> {selected ? `${selected.getMonth() + 1}月${selected.getDate()}日` : (lang === 'zh' ? '选择就诊日期' : 'Select Date')}</>
                : <><Clock className="h-5 w-5 text-teal-500" /> {lang === 'zh' ? '选择具体时间' : 'Select Time'}</>
              }
            </h2>
            <div className="flex items-center gap-2">
               {step === 'time' && (
                 <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <ChevronLeft className="h-5 w-5" />
                 </button>
               )}
               <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                 <X className="h-5 w-5" />
               </button>
            </div>
          </div>

          <div className="px-6 pb-6 pt-2">
            {step === 'date' ? (
              <>
                {/* Month Navigator */}
                <div className="flex items-center justify-between mb-6 bg-slate-50/70 text-sm rounded-2xl p-1 border border-slate-100">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-xl transition-all hover:shadow-sm text-slate-500 hover:text-teal-600">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="font-semibold text-slate-700 tracking-wide">
                    {currentMonth.getFullYear()}年 {months[currentMonth.getMonth()]}
                  </div>
                  <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-xl transition-all hover:shadow-sm text-slate-500 hover:text-teal-600">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                  {weekdays.map((day) => (
                    <div key={day} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 mb-2">
                      {day}
                    </div>
                  ))}
                  {days.map((date, idx) => (
                    <div
                      key={idx}
                      className="aspect-square flex flex-col items-center justify-center p-0.5"
                      onMouseEnter={() => date && !isDisabled(date) && setHoverDate(date)}
                      onMouseLeave={() => setHoverDate(null)}
                    >
                      {date ? (
                        <button
                          onClick={() => handleDateClick(date)}
                          disabled={isDisabled(date)}
                          className={`
                            relative w-full h-full rounded-2xl flex items-center justify-center text-[15px] transition-all duration-300 border border-transparent
                            ${isDisabled(date) ? 'text-slate-300/40 cursor-not-allowed' : 'text-slate-700 hover:bg-teal-50 hover:border-teal-100 hover:text-teal-600 font-medium cursor-pointer'}
                            ${isSelected(date) ? '!bg-teal-500 !border-teal-500 text-white font-bold shadow-md shadow-teal-500/20 scale-105' : ''}
                            ${isToday(date) && !isSelected(date) ? '!border-slate-200 text-teal-600 bg-white shadow-sm' : ''}
                          `}
                        >
                          {date.getDate()}
                          {isToday(date) && !isSelected(date) && <span className="absolute bottom-1 w-1 h-1 bg-teal-500 rounded-full"></span>}
                        </button>
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Quick Options */}
                <div className="mt-5 flex gap-3 pt-5 border-t border-slate-100/60">
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 rounded-xl text-sm font-medium text-slate-600 hover:text-teal-700 transition-all"
                  >
                    {lang === 'zh' ? '回到今天' : 'Today'}
                  </button>
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setCurrentMonth(tomorrow);
                    }}
                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 rounded-xl text-sm font-medium text-slate-600 hover:text-teal-700 transition-all"
                  >
                    {lang === 'zh' ? '查看明天' : 'Tomorrow'}
                  </button>
                </div>
              </>
            ) : (
              <div className="max-h-[360px] overflow-y-auto no-scrollbar pb-2">
                <div className="grid grid-cols-4 gap-2.5">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`
                        py-3 rounded-2xl text-[13px] font-semibold transition-all duration-300 border
                        ${selectedTime === time
                          ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/30 scale-[1.02]'
                          : 'bg-white border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-slate-600'
                        }
                      `}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 py-3 rounded-2xl border border-slate-100">
                  <Clock className="h-4 w-4 text-teal-500" />
                  {lang === 'zh' ? '请选择准确的时间，方便陪诊师安排服务' : 'Select consultation time for scheduling'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
