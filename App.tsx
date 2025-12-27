import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle, Calendar, List, Wallet } from 'lucide-react';
import Home from './pages/Home';
import CalendarPage from './pages/CalendarPage';
import Details from './pages/Details';
import { Transaction, Diary } from './types';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('sman_transactions_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [diaries, setDiaries] = useState<Diary[]>(() => {
    const saved = localStorage.getItem('sman_diaries_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // 手势识别相关
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const ROUTES = ['/', '/calendar', '/details'];

  useEffect(() => {
    localStorage.setItem('sman_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sman_diaries_v2', JSON.stringify(diaries));
  }, [diaries]);

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  const handleImportAll = (newTs: Transaction[], newDiaries: Diary[]) => {
    setTransactions(prev => [...newTs, ...prev]);
    setDiaries(prev => {
      const merged = [...prev];
      newDiaries.forEach(nd => {
        const existingIdx = merged.findIndex(d => d.date === nd.date);
        if (existingIdx > -1) {
          merged[existingIdx] = nd;
        } else {
          merged.push(nd);
        }
      });
      return merged;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const saveDiary = (date: string, content: string) => {
    setDiaries(prev => {
      const filtered = prev.filter(d => d.date !== date);
      return content.trim() ? [...filtered, { date, content }] : filtered;
    });
  };

  // 处理手势切换
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const dx = touchEnd.x - touchStart.current.x;
    const dy = touchEnd.y - touchStart.current.y;

    // 确保是水平滑动
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) {
      const currentPath = location.pathname || '/';
      let currentIndex = ROUTES.findIndex(route => 
        route === '/' ? currentPath === '/' : currentPath.startsWith(route)
      );
      if (currentIndex === -1) currentIndex = 0;

      if (dx < 0) {
        // 向左划 -> 下一页 (循环)
        const nextIndex = (currentIndex + 1) % ROUTES.length;
        navigate(ROUTES[nextIndex]);
      } else {
        // 向右划 -> 上一页 (循环)
        const prevIndex = (currentIndex - 1 + ROUTES.length) % ROUTES.length;
        navigate(ROUTES[prevIndex]);
      }
    }
    touchStart.current = null;
  };

  return (
    <div 
      className="flex flex-col min-h-screen max-w-md mx-auto bg-[#EBE7E0] shadow-2xl overflow-hidden relative border-x border-slate-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="bg-white text-black pt-4 pb-2 px-4 sticky top-0 z-50 shadow-sm border-b border-slate-50 safe-top">
        {/* 在标题上方增加一个空白行高度 */}
        <div className="h-6"></div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <div className="bg-black p-1.5 rounded-lg">
              <Wallet size={19} className="text-white" />
            </div>
            <h1 className="text-base font-black tracking-tighter text-black">思南随记</h1>
          </div>
        </div>
        
        <nav className="flex justify-between items-center bg-slate-50 p-1 rounded-xl border border-slate-100/50">
          <TopNavLink to="/" icon={<PlusCircle />} label="记一笔" />
          <TopNavLink to="/calendar" icon={<Calendar />} label="日历" />
          <TopNavLink to="/details" icon={<List />} label="明细" />
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto px-3 pt-3 pb-8 hide-scrollbar">
        <Routes>
          <Route path="/" element={
            <Home 
              transactions={transactions} 
              diaries={diaries}
              onAdd={addTransaction} 
              onImportAll={handleImportAll}
              onSaveDiary={saveDiary}
            />
          } />
          <Route path="/calendar" element={<CalendarPage transactions={transactions} diaries={diaries} onSaveDiary={saveDiary} />} />
          <Route path="/details" element={
            <Details 
              transactions={transactions} 
              onDelete={deleteTransaction} 
              diaries={diaries} 
              onSaveDiary={saveDiary}
            />
          } />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

const TopNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/details' && location.pathname.startsWith('/details'));
  return (
    <Link 
      to={to} 
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 17, strokeWidth: isActive ? 2.5 : 2 })}
      <span className={`text-[11px] font-black ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </Link>
  );
};

export default App;