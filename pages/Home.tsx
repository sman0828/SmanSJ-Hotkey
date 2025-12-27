import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Upload, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, X, BookOpen, Save, Wallet, FileText, Database, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { Transaction, Diary, TransactionType } from '../types';
import { CATEGORY_GROUPS, INCOME_CATEGORY } from '../constants';

interface HomeProps {
  transactions: Transaction[];
  diaries: Diary[];
  onAdd: (t: Transaction) => void;
  onImportAll: (ts: Transaction[], ds: Diary[]) => void;
  onSaveDiary: (date: string, content: string) => void;
}

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 高级中文数字解析引擎
 */
const chineseToNumber = (str: string): number => {
  if (!str) return 0;
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);

  const map: Record<string, number> = { 
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, 
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, 
    '千': 1000, '万': 10000 
  };
  
  if (str === '十') return 10;

  let total = 0;
  let r = 0; 
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const val = map[char];
    if (val === undefined) continue;

    if (val >= 10) {
      if (val === 10000) {
        total = (total + (r || 1)) * 10000;
        r = 0;
      } else {
        total += (r || 1) * val;
        r = 0;
      }
    } else {
      r = val;
    }
  }
  total += r;

  if (str.length >= 2) {
    const lastChar = str[str.length - 1];
    const prevChar = str[str.length - 2];
    const lastVal = map[lastChar];
    const prevVal = map[prevChar];
    
    if (lastVal !== undefined && lastVal < 10 && prevVal !== undefined && prevVal >= 10) {
      total = total - lastVal + (lastVal * (prevVal / 10));
    }
  }
  
  return total;
};

const Home: React.FC<HomeProps> = ({ transactions, diaries, onAdd, onImportAll, onSaveDiary }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('餐饮');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString(new Date()));
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [diaryInput, setDiaryInput] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [isIdentifying, setIsIdentifying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const existing = diaries.find(d => d.date === date);
    setDiaryInput(existing?.content || '');
  }, [date, diaries]);

  // 随笔输入框高度自适应逻辑
  useEffect(() => {
    if (diaryRef.current) {
      diaryRef.current.style.height = 'auto';
      diaryRef.current.style.height = `${Math.max(80, diaryRef.current.scrollHeight)}px`;
    }
  }, [diaryInput]);

  useEffect(() => {
    if (!description.trim()) return;
    setIsIdentifying(true);
    const timer = setTimeout(() => {
      handleQuickIdentify();
      setIsIdentifying(false);
    }, 800); 
    return () => clearTimeout(timer);
  }, [description]);

  const handleQuickIdentify = () => {
    let newDate = date;
    let newAmount = amount;
    let newCategory = category;
    let newType: TransactionType = type;

    // 1. 日期解析
    const today = new Date();
    if (description.includes('昨天')) {
      today.setDate(today.getDate() - 1);
      newDate = getLocalDateString(today);
    } else if (description.includes('前天')) {
      today.setDate(today.getDate() - 2);
      newDate = getLocalDateString(today);
    } else if (description.includes('今天')) {
      newDate = getLocalDateString(new Date());
    }

    // 2. 金额解析
    const withUnitRegex = /([0-9.]+|[一二三四五六七八九十百千万零两]+)(?:块|元)([0-9.]+|[一二三四五六七八九]*)?/;
    const afterVerbRegex = /(?:花了|一共|支付|付了|收了|赚了|领了|发了|结算|消费|买了|支出|收入)\s*([0-9.]+|[一二三四五六七八九十百千万零两]+)/;

    const matchUnit = description.match(withUnitRegex);
    const matchVerb = description.match(afterVerbRegex);

    if (matchUnit) {
      const whole = chineseToNumber(matchUnit[1]);
      const fractionRaw = matchUnit[2];
      let fraction = 0;
      if (fractionRaw) {
        const fVal = chineseToNumber(fractionRaw);
        fraction = fVal < 10 ? fVal / 10 : fVal / 100;
      }
      newAmount = (whole + fraction).toString();
    } else if (matchVerb) {
      newAmount = chineseToNumber(matchVerb[1]).toString();
    } else {
      const pureNum = description.match(/\d+(\.\d+)?/);
      if (pureNum) newAmount = pureNum[0];
    }

    // 3. 类型识别
    if (description.match(/(收入|赚了|领了|发工资|红包|收钱|到账)/)) {
      newType = 'income';
      newCategory = '收入';
    } else {
      newType = 'expense';
    }

    // 4. 全分类映射联动 (支持分类名对应分类)
    const categoryKeywords: Record<string, string[]> = {
      '餐饮': ['餐饮', '奶茶', '饭', '吃', '喝', '火锅', '早餐', '午餐', '晚餐', '零食', '咖啡', '茶', '外卖'],
      '交通': ['交通', '地铁', '公交', '打车', '滴滴', '车费', '加油', '油费', '骑行', '机票', '高铁'],
      '票务': ['票务', '电影', '影院', '看戏', '话剧', '门票', '演出', '展览', '游乐园'],
      '服饰': ['服饰', '衣服', '裙子', '鞋', '外套', '裤子', '内衣', '袜'],
      '水': ['水费', '水'],
      '电': ['电费', '电', '充电'],
      '燃': ['燃气', '气费', '煤气', '燃'],
      '话': ['话费', '话', '流量', '充值'],
      '住宿': ['住宿', '酒店', '宾馆', '民宿', '房费'],
      '菜篮子': ['菜篮子', '买菜', '超市', '水果', '鸡蛋', '肉', '蔬菜', '生鲜'],
      '干货调料': ['干货', '调料', '调味品', '干货调料'],
      '日用五金': ['五金', '工具', '螺丝', '灯泡', '五金店'],
      '购物其他': ['购物', '网购', '淘宝', '京东', '快递'],
      '娱乐其他': ['娱乐', '玩', '游戏', '聚会'],
      '服务其他': ['服务', '中介', '手续费'],
      '其他': ['其他', '杂项']
    };

    if (newType === 'expense') {
      let found = false;
      // 优先匹配全名
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (description.includes(cat) || keywords.some(k => description.includes(k))) {
          newCategory = cat;
          found = true;
          break;
        }
      }
    }

    // 5. 备注提取
    const noise = [
      '昨天', '前天', '今天', '大前天', '花了', '一共', '支付', '付了', 
      '收了', '赚了', '领了', '发了', '块钱', '块', '元', '结算', '消费', '看', '买了', '个'
    ];
    let cleanNote = description;
    
    const fullAmountStr = matchUnit ? matchUnit[0] : (matchVerb ? matchVerb[0] : '');
    if (fullAmountStr) {
      if (matchVerb) cleanNote = cleanNote.replace(matchVerb[1], ''); 
      else cleanNote = cleanNote.replace(matchUnit![0], '');
    }
    
    noise.forEach(n => { cleanNote = cleanNote.replace(new RegExp(n, 'g'), ''); });
    cleanNote = cleanNote.replace(/\d+(\.\d+)?/g, '').trim();

    setDate(newDate);
    if (newAmount && newAmount !== '0') setAmount(newAmount);
    if (cleanNote) setNote(cleanNote);
    setType(newType);
    setCategory(newCategory);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;
    const group = CATEGORY_GROUPS.find(g => g.items.some(i => i.label === category))?.name || '其他';
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      type, category,
      categoryGroup: type === 'income' ? '收入' : group,
      amount: Math.abs(val),
      date, note, description,
      createdAt: Date.now()
    });
    setAmount(''); setNote(''); setDescription('');
  };

  const handleReset = () => { setAmount(''); setNote(''); setDescription(''); };
  const handleSaveDiary = () => onSaveDiary(date, diaryInput);
  const handleResetDiary = () => setDiaryInput('');

  const handleExport = () => {
    let content = "---思南随记 账单数据---\n日期|类型|分类|金额|备注|详情\n";
    content += transactions.map(t => `${t.date}|${t.type === 'expense' ? '支出' : '收入'}|${t.category}|${t.amount}|${t.note}|${(t.description || '').replace(/\n/g, '\\n')}`).join('\n');
    content += "\n---思南随记 随笔数据---\n日期|内容\n";
    content += diaries.map(d => `${d.date}|${d.content.replace(/\n/g, '\\n')}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `备份_${date}.txt`; link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      let currentSection = "";
      const importedTs: Transaction[] = [];
      const importedDs: Diary[] = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.includes("账单数据")) { currentSection = "ts"; return; }
        if (trimmed.includes("随笔数据")) { currentSection = "ds"; return; }
        if (trimmed.startsWith("日期|")) return;
        if (currentSection === "ts") {
          const parts = trimmed.split('|');
          if (parts.length >= 4) {
            importedTs.push({
              id: Math.random().toString(36).substr(2, 9),
              date: parts[0], type: parts[1] === '收入' ? 'income' : 'expense',
              category: parts[2], categoryGroup: '', amount: parseFloat(parts[3]),
              note: parts[4] || '', description: parts[5] || '', createdAt: Date.now()
            });
          }
        } else if (currentSection === "ds") {
          const parts = trimmed.split('|');
          if (parts.length >= 2) importedDs.push({ date: parts[0], content: parts[1] });
        }
      });
      onImportAll(importedTs, importedDs);
      alert('导入成功');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = [];
    for (let i = 0; i < new Date(year, month, 1).getDay(); i++) days.push(null);
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-300">
      {showCalendar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-black">选择记录日期</h3>
              <button onClick={() => setShowCalendar(false)} className="p-1 text-black hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 bg-slate-50 rounded-xl text-black"><ChevronLeft size={19} /></button>
              <span className="font-extrabold text-[14px] text-black">{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 bg-slate-50 rounded-xl text-black"><ChevronRight size={19} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-[10px] font-black text-slate-300 uppercase text-center mb-2">{d}</div>))}
              {daysInMonth.map((day, idx) => day ? (
                <button key={idx} onClick={() => { setDate(getLocalDateString(day)); setShowCalendar(false); }} className={`h-10 flex items-center justify-center rounded-xl text-[12px] font-bold ${getLocalDateString(day) === date ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{day.getDate()}</button>
              ) : <div key={idx} className="h-10" />)}
            </div>
          </div>
        </div>
      )}

      {/* 随笔板块 */}
      <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[14px] font-black text-black flex items-center gap-2"><BookOpen size={22} className="text-slate-400" /> 随笔</h3>
          <button type="button" onClick={() => setShowCalendar(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100/50 rounded-lg"><CalendarIcon size={14} className="text-slate-400" /><span className="text-[11px] font-black text-black">{date}</span></button>
        </div>
        <textarea 
          ref={diaryRef}
          value={diaryInput} 
          onChange={e => setDiaryInput(e.target.value)} 
          placeholder="今天发生了什么？" 
          className="w-full min-h-[80px] p-3 bg-slate-50 rounded-xl border border-slate-100 text-[13px] font-bold outline-none resize-none focus:ring-1 focus:ring-black transition-all text-black placeholder:text-slate-200 mb-3 overflow-hidden" 
        />
        <div className="flex justify-end gap-2">
          <button onClick={handleResetDiary} className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[12px] active:scale-95 border border-slate-200 transition-all"><RotateCcw size={17} /> 重置</button>
          <button onClick={handleSaveDiary} className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl font-black text-[12px] active:scale-95 shadow-sm transition-all"><Save size={17} /> 保存</button>
        </div>
      </div>

      {/* 记账板块 */}
      <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[14px] font-black text-black flex items-center gap-2"><Wallet size={22} className="text-slate-400" /> 记账</h3>
          <div className="flex bg-slate-100 p-0.5 rounded-lg shadow-inner w-32">
            <button type="button" onClick={() => { setType('expense'); setCategory('餐饮'); }} className={`flex-1 py-1.5 rounded-md font-black text-[11px] ${type === 'expense' ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}>支出</button>
            <button type="button" onClick={() => { setType('income'); setCategory('收入'); }} className={`flex-1 py-1.5 rounded-md font-black text-[11px] ${type === 'income' ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}>收入</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">详情描述</label>
              <div className="flex items-center gap-2">
                {isIdentifying ? (
                  <span className="flex items-center gap-1 text-[9px] font-black text-slate-300 animate-pulse">
                    <Loader2 size={10} className="animate-spin" /> 正在识别内容...
                  </span>
                ) : description && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-green-500 animate-in fade-in zoom-in-90">
                    <Sparkles size={10} /> 自动识别已填入
                  </span>
                )}
              </div>
            </div>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="例如：干货花了三十" 
              className="w-full px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-[13px] outline-none focus:ring-1 focus:ring-black text-black placeholder:text-slate-200" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 pb-2 border-b border-slate-50">
            <button type="button" onClick={handleReset} className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[12px] active:scale-95 border border-slate-200 transition-all"><RotateCcw size={17} /> 重置</button>
            <button type="submit" className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl font-black text-[12px] active:scale-95 shadow-sm transition-all"><Save size={17} /> 保存</button>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">时间</label>
              <button type="button" onClick={() => setShowCalendar(true)} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-[12px] text-black"><CalendarIcon size={17} className="text-slate-400" /> {date.slice(5)}</button>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">金额</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[14px]">¥</span>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 font-black text-[14px] outline-none focus:ring-1 focus:ring-black text-black" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">备注</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="简单说明..." className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-[13px] outline-none focus:ring-1 focus:ring-black text-black" />
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">分类</label>
            <div className="space-y-4">
              {type === 'expense' ? CATEGORY_GROUPS.map(group => (
                <div key={group.name} className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-300 px-1 border-l border-slate-200 ml-1">{group.name}</p>
                  <div className="grid grid-cols-5 gap-y-1.5 gap-x-1">
                    {group.items.map(item => (
                      <button key={item.label} type="button" onClick={() => setCategory(item.label)} className={`flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all ${category === item.label ? 'bg-white shadow-lg scale-110 z-10' : 'opacity-40 grayscale-[20%]'}`}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: item.color }}>
                          {React.cloneElement(item.icon as React.ReactElement<any>, { size: 29, color: (item.label === '电' || item.label === '票务') ? '#222' : 'white', strokeWidth: 2.5 })}
                        </div>
                        <span className="text-[9px] font-black text-black text-center truncate w-full px-0.5">{item.displayLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="grid grid-cols-5 gap-2">
                  <button type="button" onClick={() => setCategory('收入')} className={`flex flex-col items-center gap-0.5 py-1 rounded-xl ${category === '收入' ? 'bg-white shadow-lg scale-110' : 'opacity-40'}`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: INCOME_CATEGORY.color }}>{React.cloneElement(INCOME_CATEGORY.icon as React.ReactElement<any>, { size: 29, color: 'white', strokeWidth: 2.5 })}</div>
                    <span className="text-[9px] font-black text-black">收入</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white/50 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex gap-3">
        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white text-slate-700 rounded-xl border border-slate-100 font-black text-[12px]"><Download size={19} className="text-slate-400" /><span>导入 TXT</span><input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".txt" /></button>
        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white text-slate-700 rounded-xl border border-slate-100 font-black text-[12px]"><Upload size={19} className="text-slate-400" /><span>导出 TXT</span></button>
      </div>
    </div>
  );
};

export default Home;