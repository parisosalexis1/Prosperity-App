
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { analyzeInvestmentScenario } from '../services/geminiService';
import { Sparkles } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface CalculatorProps {
    isDarkMode: boolean;
    language: Language;
}

export const Calculator: React.FC<CalculatorProps> = ({ isDarkMode, language }) => {
  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(10);
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);
  
  const t = translations[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  // Calculate Data
  const data = [];
  let currentBalance = principal;
  let totalInvested = principal;

  for (let i = 0; i <= years; i++) {
    data.push({
      year: i,
      balance: Math.round(currentBalance),
      invested: Math.round(totalInvested),
    });
    // Compound monthly for the next year
    for (let m = 0; m < 12; m++) {
      currentBalance += monthly;
      currentBalance *= (1 + (rate / 100) / 12);
      totalInvested += monthly;
    }
  }

  const finalAmount = data[data.length - 1].balance;
  const totalPrincipal = data[data.length - 1].invested;
  const interestEarned = finalAmount - totalPrincipal;

  const handleGetInsight = async () => {
    setLoading(true);
    const insight = await analyzeInvestmentScenario(principal, monthly, rate, years, finalAmount, language);
    setAiInsight(insight);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.calcTitle}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title={t.configuration} className="h-fit">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t.initialInv}</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t.monthlyContrib}</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                <input
                  type="number"
                  value={monthly}
                  onChange={(e) => setMonthly(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t.annualRate}</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t.timePeriod}</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={years} 
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
            </div>
            
            <button
              onClick={handleGetInsight}
              disabled={loading}
              className="w-full mt-4 py-2 flex justify-center items-center gap-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
               <Sparkles size={16} />
               {loading ? t.analyzing : t.analyzeScenario}
            </button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.totalInvested}</p>
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-200">₺{totalPrincipal.toLocaleString(locale)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.interestEarned}</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+₺{Math.round(interestEarned).toLocaleString(locale)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.totalValue}</p>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">₺{Math.round(finalAmount).toLocaleString(locale)}</p>
                </div>
            </div>

            <Card className="min-h-[400px]">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="year" 
                            label={{ value: t.year, position: 'insideBottomRight', offset: -5, fill: isDarkMode ? '#94a3b8' : '#64748b' }} 
                            stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                        />
                        <YAxis 
                            tickFormatter={(value) => `₺${value/1000}k`} 
                            stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                        <Tooltip 
                            formatter={(value: number) => [`₺${value.toLocaleString(locale)}`, '']}
                            labelFormatter={(label) => `${t.year} ${label}`}
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                                borderRadius: '0.5rem'
                            }}
                            itemStyle={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#4f46e5" fillOpacity={1} fill="url(#colorBalance)" name={t.totalBalance} />
                        <Area type="monotone" dataKey="invested" stroke="#94a3b8" fillOpacity={0} strokeDasharray="5 5" name={t.principal} />
                    </AreaChart>
                </ResponsiveContainer>
            </Card>

            {aiInsight && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-indigo-900 dark:text-indigo-100">
                    <div className="flex items-center gap-2 mb-2 font-semibold">
                        <Sparkles size={16} />
                        <span>{t.aiInsight}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{aiInsight}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
