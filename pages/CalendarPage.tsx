import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction, Diary } from '../types';
import { CHART_COLORS, CATEGORY_GROUPS } from '../constants';

interface CalendarPageProps {
  transactions: Transaction[];
  diaries: Diary[];
  onSaveDiary: (date: string, content: string) => void;
}

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CalendarPage: React.FC<CalendarPageProps> = ({ transactions, diaries }) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStr = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentMonth]);
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [currentMonth]);

  const monthSummary = useMemo(() => {
    const relevant = transactions.filter(t => t.date.startsWith(monthStr));
    const exp = relevant.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const allCategoryItems = CATEGORY_GROUPS.flatMap(g => g.items);
    const grouped = relevant.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      exp,
      chart: Object.entries(grouped).map(([name, value]) => {
        const catInfo = allCategoryItems.find(i => i.label === name);
        const val = value as number;
        return { 
          name: catInfo?.displayLabel || name, 
          value: val,
          color: catInfo?.color || '#94a3b8',
          percentage: exp > 0 ? (val / exp * 100).toFixed(1) : '0'
        };
      }).sort((a, b) => b.value - a.value)
    };
  }, [transactions, monthStr]);

  const getDaySummary = (date: string) => {
    const ts = transactions.filter(t => t.date === date);
    const inc = ts.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const exp = ts.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const hasD = diaries.some(d => d.date === date);
    return { inc, exp, hasD };
  };

  return (
    <div className="space-y-4 pb-4 animate-in duration-300">
      <div className="sticky top-[-12px] z-20 pt-1 bg-[#EBE7E0]/90 backdrop-blur-md pb-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-slate-50 rounded-xl text-slate-400"><ChevronLeft size={19} /></button>
          <h2 className="text-base font-black tracking-tighter text-black">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-slate-50 rounded-xl text-slate-400"><ChevronRight size={19} /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-[9px] font-black text-slate-300 uppercase">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-14"></div>;
            const ds = getLocalDateString(day);
            const sum = getDaySummary(ds);
            const isToday = ds === getLocalDateString(new Date());
            return (
              <button key={ds} onClick={() => navigate(`/details?date=${ds}`)} className={`h-14 flex flex-col items-center justify-between p-1 rounded-xl border transition-all bg-slate-50 border-transparent active:scale-95 ${isToday ? 'ring-1 ring-black ring-offset-1 bg-white' : ''}`}>
                <div className="w-full flex justify-between items-start">
                  <span className={`text-[10px] font-black ${isToday ? 'text-black underline' : 'text-slate-500'}`}>{day.getDate()}</span>
                  {sum.hasD && <BookOpen size={10} className="text-slate-300" />}
                </div>
                <div className="w-full text-[7px] font-black truncate leading-tight space-y-0.5 overflow-hidden text-right">
                  {sum.inc > 0 && <p className="text-green-600">+{sum.inc.toFixed(0)}</p>}
                  {sum.exp > 0 && <p className="text-red-500">-{sum.exp.toFixed(0)}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-black flex items-center gap-2 text-black"><BarChart3 size={19} /> 本月概览</h3>
          <p className="text-[10px] font-black text-slate-400">支出: ¥{monthSummary.exp.toFixed(0)}</p>
        </div>

        {monthSummary.chart.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {monthSummary.chart.slice(0, 4).map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-black text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex gap-2 items-baseline">
                      <span className="text-[10px] font-black text-black">¥{item.value.toFixed(0)}</span>
                      <span className="text-[12px] font-black text-slate-300 italic">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-48 pt-4 border-t border-slate-50">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={monthSummary.chart} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                    {monthSummary.chart.map((item, index) => <Cell key={`cell-${index}`} fill={item.color} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-200 text-[10px] font-black uppercase tracking-widest opacity-30">本月暂无支出记录</div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;