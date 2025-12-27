import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trash2, List as ListIcon, PieChart as PieChartIcon, X, ChevronLeft, ChevronRight, BookOpen, Search, Quote, CalendarDays, ChevronDown, Layers, Calendar, Info } from 'lucide-react';
import { Transaction, Diary } from '../types';
import { CATEGORY_GROUPS, INCOME_CATEGORY, CategoryItem, CHART_COLORS } from '../constants';

interface DetailsProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  diaries: Diary[];
  onSaveDiary: (date: string, content: string) => void;
}

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Details: React.FC<DetailsProps> = ({ transactions, onDelete, diaries }) => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [selDay, setSelDay] = useState(getLocalDateString(new Date()));
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selYear, setSelYear] = useState(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  
  // 选择器状态
  const [showPicker, setShowPicker] = useState(false);
  const [pickerViewDate, setPickerViewDate] = useState(new Date());
  // 内部子模式：在日历中选择具体某天时，是否正在选择年份
  const [isYearSelectingInCalendar, setIsYearSelectingInCalendar] = useState(false);
  
  const yearListRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dParam = searchParams.get('date');
    if (dParam) { 
      setSelDay(dParam); 
      setMode('day'); 
      setPickerViewDate(new Date(dParam));
    }
  }, [searchParams]);

  // 自动滚动定位逻辑
  useEffect(() => {
    if (showPicker && (mode === 'year' || isYearSelectingInCalendar) && selectedYearRef.current) {
      setTimeout(() => {
        selectedYearRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showPicker, mode, isYearSelectingInCalendar]);

  const allCats = useMemo(() => {
    const items: CategoryItem[] = [];
    CATEGORY_GROUPS.forEach(g => items.push(...g.items));
    items.push(INCOME_CATEGORY);
    return items;
  }, []);

  const filteredDiaries = useMemo(() => {
    let res = diaries;
    if (mode === 'day') res = res.filter(d => d.date === selDay);
    else if (mode === 'month') res = res.filter(d => d.date.startsWith(selMonth));
    else if (mode === 'year') res = res.filter(d => d.date.startsWith(selYear));
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      res = res.filter(d => d.content.toLowerCase().includes(q));
    }
    return [...res].sort((a, b) => b.date.localeCompare(a.date));
  }, [diaries, mode, selDay, selMonth, selYear, searchTerm]);

  const filteredTransactions = useMemo(() => {
    let res = transactions;
    if (mode === 'day') res = res.filter(t => t.date === selDay);
    else if (mode === 'month') res = res.filter(t => t.date.startsWith(selMonth));
    else if (mode === 'year') res = res.filter(t => t.date.startsWith(selYear));
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      res = res.filter(t => 
        (t.note || '').toLowerCase().includes(q) || 
        (t.description || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return [...res].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, mode, selDay, selMonth, selYear, searchTerm]);

  const stats = useMemo(() => {
    const inc = filteredTransactions.filter(t => t.type === 'income').reduce((s: number, t) => s + t.amount, 0);
    const exp = filteredTransactions.filter(t => t.type === 'expense').reduce((s: number, t) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
    interface ChartItem { name: string; value: number; }
    return Object.entries(grouped).map(([name, value]): ChartItem => ({ 
      name: allCats.find(i => i.label === name)?.displayLabel || name, 
      value: value as number 
    })).sort((a: ChartItem, b: ChartItem) => b.value - a.value);
  }, [filteredTransactions, allCats]);

  const calendarDays = useMemo(() => {
    const year = pickerViewDate.getFullYear();
    const month = pickerViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [pickerViewDate]);

  const handleDateSelect = (d: Date) => {
    const ds = getLocalDateString(d);
    setSelDay(ds);
    setShowPicker(false);
  };

  const allAvailableYears = useMemo(() => {
    const years = [];
    for (let y = 2100; y >= 1900; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const openPickerModal = () => {
    setIsYearSelectingInCalendar(false);
    setShowPicker(true);
  };

  return (
    <div className="space-y-4 pb-12 animate-in slide-in-from-bottom-2 duration-300">
      {/* 增强型弹出选择器 */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-7 shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-black">
                {mode === 'day' ? (isYearSelectingInCalendar ? '快速跳转年份' : '选择日期') : mode === 'month' ? '选择月份' : '选择年份'}
              </h3>
              <button onClick={() => setShowPicker(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={20} /></button>
            </div>

            {mode === 'day' && (
              <div className="space-y-4">
                {/* 交互式日历头部 */}
                <div className="flex justify-between items-center">
                  <button onClick={() => setPickerViewDate(new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() - 1, 1))} className="p-2.5 bg-slate-50 rounded-2xl active:scale-90 transition-transform"><ChevronLeft size={20}/></button>
                  
                  {/* 点击年份标题切换子模式 */}
                  <button 
                    onClick={() => setIsYearSelectingInCalendar(!isYearSelectingInCalendar)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 group"
                  >
                    <span className="font-black text-base">{pickerViewDate.getFullYear()}年 {pickerViewDate.getMonth() + 1}月</span>
                    <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${isYearSelectingInCalendar ? 'rotate-180 text-black' : 'group-hover:text-slate-500'}`} />
                  </button>

                  <button onClick={() => setPickerViewDate(new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() + 1, 1))} className="p-2.5 bg-slate-50 rounded-2xl active:scale-90 transition-transform"><ChevronRight size={20}/></button>
                </div>

                {isYearSelectingInCalendar ? (
                  /* 日历内的快捷年份选择器 */
                  <div className="relative h-72">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
                    <div className="h-full overflow-y-auto pr-1 hide-scrollbar overscroll-contain py-4">
                      <div className="grid grid-cols-2 gap-3">
                        {allAvailableYears.map(y => {
                          const isPickerTargetYear = pickerViewDate.getFullYear().toString() === y;
                          return (
                            <button 
                              key={y} 
                              ref={isPickerTargetYear ? selectedYearRef : null}
                              onClick={() => {
                                setPickerViewDate(new Date(parseInt(y), pickerViewDate.getMonth(), 1));
                                setIsYearSelectingInCalendar(false);
                              }}
                              className={`py-3.5 rounded-2xl text-[14px] font-black transition-all active:scale-95 ${isPickerTargetYear ? 'bg-black text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                              {y}年
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>
                  </div>
                ) : (
                  /* 标准日历视图 */
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{d}</div>)}
                    {calendarDays.map((day, idx) => (
                      day ? (
                        <button 
                          key={idx} 
                          onClick={() => handleDateSelect(day)}
                          className={`h-10 flex items-center justify-center rounded-xl text-[13px] font-bold transition-all ${getLocalDateString(day) === selDay ? 'bg-black text-white shadow-lg scale-105' : 'hover:bg-slate-50 text-slate-700 active:bg-slate-100'}`}
                        >
                          {day.getDate()}
                        </button>
                      ) : <div key={idx} className="h-10" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'month' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center mb-2">
                   <button onClick={() => setPickerViewDate(new Date(pickerViewDate.getFullYear() - 1, 0, 1))} className="p-2.5 bg-slate-50 rounded-2xl active:scale-90 transition-transform"><ChevronLeft size={20}/></button>
                   <span className="font-black text-xl">{pickerViewDate.getFullYear()}年</span>
                   <button onClick={() => setPickerViewDate(new Date(pickerViewDate.getFullYear() + 1, 0, 1))} className="p-2.5 bg-slate-50 rounded-2xl active:scale-90 transition-transform"><ChevronRight size={20}/></button>
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  {Array.from({length: 12}).map((_, i) => {
                    const mStr = `${pickerViewDate.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
                    return (
                      <button 
                        key={i} 
                        onClick={() => { setSelMonth(mStr); setShowPicker(false); }}
                        className={`py-4 rounded-2xl text-[14px] font-black transition-all active:scale-95 ${selMonth === mStr ? 'bg-black text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        {i + 1}月
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'year' && (
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none rounded-t-3xl"></div>
                <div 
                  ref={yearListRef}
                  className="max-h-96 overflow-y-auto pr-1 hide-scrollbar overscroll-contain py-6"
                >
                  <div className="grid grid-cols-2 gap-3.5">
                    <button 
                      onClick={() => { setMode('all'); setShowPicker(false); }}
                      className="col-span-2 py-4 rounded-2xl text-[15px] font-black transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-2 mb-2"
                    >
                      <Layers size={18} /> 全部年份数据
                    </button>
                    {allAvailableYears.map((y) => {
                      const isSelected = selYear === y;
                      return (
                        <button 
                          key={y} 
                          ref={isSelected ? selectedYearRef : null}
                          onClick={() => { setSelYear(y); setShowPicker(false); }}
                          className={`py-4 rounded-2xl text-[15px] font-black transition-all active:scale-95 ${isSelected ? 'bg-black text-white shadow-xl scale-105 z-10' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {y}年
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none rounded-b-3xl"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 置顶筛选栏 */}
      <div className="sticky top-[-12px] z-20 space-y-3 pt-1 bg-[#EBE7E0]/90 backdrop-blur-md pb-3">
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
            {(['day', 'month', 'year', 'all'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${mode === m ? 'bg-black text-white shadow-lg' : 'text-slate-400'}`}>
                {m === 'day' ? '按日' : m === 'month' ? '按月' : m === 'year' ? '按年' : '全部'}
              </button>
            ))}
          </div>
          
          <div className="flex gap-3">
             <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索明细或随笔..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-[1.2rem] text-[13px] font-bold outline-none focus:ring-1 focus:ring-black transition-all" />
             </div>
             {mode !== 'all' && (
               <button onClick={openPickerModal} className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-[1.2rem] text-[12px] font-black active:scale-95 transition-all shadow-xl">
                 <Calendar size={16} />
                 <span>{mode === 'day' ? selDay : mode === 'month' ? selMonth : selYear}</span>
                 <ChevronDown size={14} className="opacity-50" />
               </button>
             )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">收入</p>
            <p className="text-[14px] font-black text-green-700 truncate">¥{stats.inc.toLocaleString()}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">支出</p>
            <p className="text-[14px] font-black text-red-600 truncate">¥{stats.exp.toLocaleString()}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">结余</p>
            <p className="text-[14px] font-black text-black truncate">¥{stats.bal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 随笔回顾板块 */}
      {filteredDiaries.length > 0 && (
        <div className="space-y-4 px-1">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-5 mb-2 flex items-center gap-2">
             <BookOpen size={14} className="text-slate-200" /> 随笔回顾 ({filteredDiaries.length})
          </h3>
          <div className="space-y-4">
            {filteredDiaries.map((diary) => (
              <div key={diary.date} className="bg-white/70 border border-slate-100 p-6 rounded-[2.5rem] relative overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
                <Quote size={45} className="absolute -right-3 -bottom-3 text-slate-100 opacity-25" />
                <div className="flex justify-between items-center mb-4">
                  <div className="bg-slate-100 p-2 rounded-xl">
                    <BookOpen size={16} className="text-slate-400" />
                  </div>
                  {mode !== 'day' && (
                    <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-50 shadow-sm">{diary.date}</span>
                  )}
                </div>
                <p className="text-[14px] font-bold text-slate-700 leading-[1.8] whitespace-pre-wrap italic">
                  “{diary.content}”
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 账单明细列表 */}
      <div className="space-y-4 px-1">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-5 mt-8 mb-2 flex items-center gap-2">
           <ListIcon size={14} className="text-slate-200" /> 账单明细 ({filteredTransactions.length})
        </h3>
        {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
          const cat = allCats.find(i => i.label === t.category);
          return (
            <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-lg transition-transform group-active:rotate-12" style={{ backgroundColor: cat?.color || '#94a3b8' }}>
                  {cat?.icon ? React.cloneElement(cat.icon as React.ReactElement<any>, { size: 32, color: 'white' }) : <ListIcon size={32} color="white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-extrabold text-black text-[16px] truncate tracking-tight">{cat?.displayLabel || t.category}</h4>
                    <p className={`font-black text-[16px] ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                      {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                     <p className="text-[12px] font-bold text-slate-400 truncate pr-2">{t.note || '无备注'}</p>
                     {mode !== 'day' && <span className="text-[10px] font-black text-slate-200 whitespace-nowrap">{t.date}</span>}
                  </div>
                </div>
                <button onClick={() => onDelete(t.id)} className="p-3 text-slate-100 hover:text-red-500 transition-colors active:scale-90"><Trash2 size={22} /></button>
              </div>
              {t.description && (
                <div className="flex gap-2 items-start bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <Info size={14} className="text-slate-300 mt-0.5" />
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                </div>
              )}
            </div>
          );
        }) : <div className="py-20 text-center text-[13px] font-black text-slate-200 uppercase tracking-[0.3em] opacity-30">未找到相关记录</div>}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mt-10">
          <h3 className="text-base font-black text-black flex items-center gap-2 mb-8"><PieChartIcon size={22} className="text-slate-400" /> 支出分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value">
                  {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', fontSize: '12px', fontWeight: 'bold', padding: '12px 16px' }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeights: '900', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Details;