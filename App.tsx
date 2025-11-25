
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Calculator as CalcIcon, TrendingUp, DollarSign, Menu, X, Moon, Sun, ChevronLeft, ChevronRight, ChevronDown, Globe, Upload, FileSpreadsheet, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { MonthlyReport } from './components/MonthlyReport';
import { Calculator } from './components/Calculator';
import { DataImport } from './components/DataImport';
import { ExcelAnalysis } from './components/ExcelAnalysis';
import { ViewState, Language } from './types';
import { translations } from './utils/translations';
import { initiateReset, checkForPendingReset } from './services/storageService';

// CRITICAL: Check for reset flag BEFORE App component initializes or any hooks run.
// This ensures localStorage is empty before useState reads from it.
checkForPendingReset();

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isResettingApp, setIsResettingApp] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);
  
  // Language State
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('language') as Language) || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const t = translations[language];

  const toggleTheme = () => setDarkMode(!darkMode);
  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'tr' : 'en');

  const handleResetClick = () => {
    if (resetConfirming) {
        setIsResettingApp(true);
        initiateReset();
    } else {
        setResetConfirming(true);
        // Reset confirmation state after 3 seconds if not clicked
        setTimeout(() => setResetConfirming(false), 3000);
    }
  };


  const currentYear = new Date().getFullYear();
  
  // Localized months
  const getMonthName = (monthIndex: number) => {
      const date = new Date(currentYear, monthIndex);
      return date.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'long' });
  };

  const handleImportSuccess = (targetYear: number, targetMonth: number) => {
      setSelectedYear(targetYear);
      setSelectedMonth(targetMonth);
      setView('monthly');
      alert(`${t.successImport} ${getMonthName(targetMonth)} ${targetYear}`);
  };

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => {
        setView(target);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
        view === target 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  // If resetting, show a loader and nothing else
  if (isResettingApp) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 size={48} className="animate-spin text-indigo-600" />
                  <p className="text-lg font-medium">Resetting Application...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static flex flex-col no-print
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mr-3">
                <TrendingUp size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Prosperity</h1>
            <button 
                className="ml-auto md:hidden text-slate-500 dark:text-slate-400"
                onClick={() => setSidebarOpen(false)}
            >
                <X size={24} />
            </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
            <div className="mb-6">
                <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t.menu}</p>
                <NavItem target="monthly" icon={Calendar} label={t.monthlyReport} />
                <NavItem target="calculator" icon={CalcIcon} label={t.investmentCalc} />
                <NavItem target="excel" icon={FileSpreadsheet} label={t.excelAnalysis} />
                <NavItem target="import" icon={Upload} label={t.importData} />
            </div>

            {view === 'monthly' && (
                <div className="mb-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">{t.dateSelection}</p>
                    
                    <div className="px-4 mb-4">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase font-semibold tracking-wider">{t.year}</label>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setSelectedYear(prev => prev - 1)}
                                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Previous Year"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex-1 relative h-10">
                                <input 
                                    type="number" 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)}
                                    className="w-full h-full text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button 
                                onClick={() => setSelectedYear(prev => prev + 1)}
                                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Next Year"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="px-4">
                         <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase font-semibold tracking-wider">{t.month}</label>
                         <div className="relative">
                             <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="w-full appearance-none px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-colors shadow-sm"
                             >
                                {Array.from({length: 12}).map((_, idx) => (
                                    <option key={idx} value={idx}>{getMonthName(idx)}</option>
                                ))}
                             </select>
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                                 <ChevronDown size={16} />
                             </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {/* Language Toggle */}
             <button 
                onClick={toggleLanguage}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                <Globe size={18} />
                <span className="text-sm font-medium">{language === 'en' ? 'Türkçe' : 'English'}</span>
            </button>

            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-sm font-medium">{darkMode ? t.lightMode : t.darkMode}</span>
            </button>
            
            {/* Reset Data */}
            <button 
                type="button"
                onClick={handleResetClick}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                    resetConfirming 
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md animate-pulse' 
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                }`}
            >
                {resetConfirming ? <AlertTriangle size={18} /> : <Trash2 size={18} />}
                <span className="text-sm font-medium">
                    {resetConfirming ? t.confirmReset : t.resetData}
                </span>
            </button>

            <div className="mt-4 text-xs text-slate-400 dark:text-slate-600 text-center">
                v1.0.0 &copy; {currentYear}
            </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 md:hidden no-print"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Mobile Header */}
        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 md:hidden no-print flex-shrink-0">
            <button 
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                onClick={() => setSidebarOpen(true)}
            >
                <Menu size={24} />
            </button>
            <span className="ml-3 font-semibold text-slate-800 dark:text-white">Prosperity</span>
            <button 
                className="ml-auto p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                onClick={toggleTheme}
            >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
            <div className="max-w-6xl mx-auto">
                {view === 'monthly' && (
                    <MonthlyReport year={selectedYear} month={selectedMonth} isDarkMode={darkMode} language={language} />
                )}
                {view === 'calculator' && (
                    <Calculator isDarkMode={darkMode} language={language} />
                )}
                {view === 'excel' && (
                    <ExcelAnalysis language={language} />
                )}
                {view === 'import' && (
                    <DataImport language={language} onImportSuccess={handleImportSuccess} />
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
