
import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowRight, CheckCircle, AlertCircle, ChevronRight, ChevronDown, Scale, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { getMonthData, updateMonthData } from '../services/storageService';
import { Card } from './ui/Card';

// Declare pdfjsLib which is loaded via CDN in index.html
declare var pdfjsLib: any;

interface DataImportProps {
  language: Language;
  onImportSuccess: (year: number, month: number) => void;
}

interface ExtractedData {
  net: number;
  expenses: number;
  assets: number;
  monthlySalary?: number; // Added for specific salary comparison
  totalWealth?: number;
  sourceDate?: string;
  // Calculated
  income: number;
  savingsRate: number;
}

export const DataImport: React.FC<DataImportProps> = ({ language, onImportSuccess }) => {
  const t = translations[language];
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);
  
  // Comparison State
  const [compDataA, setCompDataA] = useState<ExtractedData | null>(null);
  const [compDataB, setCompDataB] = useState<ExtractedData | null>(null);
  const [processingComp, setProcessingComp] = useState<'A' | 'B' | null>(null);
  
  // Target date selection (default to current real date)
  const today = new Date();
  const [targetYear, setTargetYear] = useState(today.getFullYear());
  const [targetMonth, setTargetMonth] = useState(today.getMonth());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const compInputRefA = useRef<HTMLInputElement>(null);
  const compInputRefB = useRef<HTMLInputElement>(null);

  // --- Shared Parsing Logic ---
  
  const parseCurrency = (str: string, isTurkish: boolean): number => {
    // Remove currency symbols and whitespace
    let clean = str.replace(/[₺$€\s]/g, '');
    
    if (isTurkish) {
      // 1.234,56 -> Remove . then replace , with .
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> Remove ,
      clean = clean.replace(/,/g, '');
    }
    return parseFloat(clean) || 0;
  };

  const extractPdfData = async (file: File): Promise<ExtractedData> => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ');
      }

      let result: Partial<ExtractedData> = {};
      const isTurkish = fullText.includes("Net Birikim") || fullText.includes("Gider Dağılımı") || fullText.includes("Mevcut:");

      // Strategy 1: Hidden JSON Block
      const cleanText = fullText.replace(/\s+/g, ''); 
      const jsonStart = '{"magic":"PROSPERITY_V1"';
      const jsonStartIndex = cleanText.indexOf(jsonStart);
      
      if (jsonStartIndex !== -1) {
         let jsonStr = cleanText.substring(jsonStartIndex);
         let braceCount = 0;
         let endIndex = -1;
         for(let i=0; i<jsonStr.length; i++) {
             if (jsonStr[i] === '{') braceCount++;
             if (jsonStr[i] === '}') braceCount--;
             if (braceCount === 0 && i > 0) {
                 endIndex = i;
                 break;
             }
         }
         
         if (endIndex !== -1) {
             try {
                 const finalJson = jsonStr.substring(0, endIndex + 1);
                 const parsed = JSON.parse(finalJson);
                 if (parsed.data) {
                      result = {
                        net: parsed.data.net,
                        expenses: parsed.data.expenses,
                        assets: parsed.data.assets,
                        totalWealth: parsed.data.totalWealth,
                        monthlySalary: parsed.data.monthlySalary,
                        sourceDate: parsed.data.date
                      };
                 }
             } catch (e) {
                 console.warn("JSON parse failed", e);
             }
         }
      }

      // Strategy 2/3: Regex Fallback if JSON failed or incomplete
      if (result.net === undefined) {
          const keywordPattern = isTurkish ? "Mevcut" : "Current";
          const regex = new RegExp(`${keywordPattern}:\\s*[₺$]?\\s*([\\d.,]+)`, 'gi');
          const matches = [...fullText.matchAll(regex)];
          
          // Fallback try with other language if matches not found
          let finalMatches = matches;
          let finalIsTurkish = isTurkish;

          if (matches.length < 3) {
              const fallbackKeyword = isTurkish ? "Current" : "Mevcut";
              const fallbackRegex = new RegExp(`${fallbackKeyword}:\\s*[₺$]?\\s*([\\d.,]+)`, 'gi');
              finalMatches = [...fullText.matchAll(fallbackRegex)];
              finalIsTurkish = !isTurkish;
          }

          if (finalMatches.length >= 3) {
             result.net = parseCurrency(finalMatches[0][1], finalIsTurkish);
             result.expenses = parseCurrency(finalMatches[1][1], finalIsTurkish);
             result.assets = parseCurrency(finalMatches[2][1], finalIsTurkish);
          }
          
          // Total Wealth Regex
          const wealthPattern = new RegExp(
            `(?:Total Projected Wealth|Tahmini Toplam Varlık).*?(?:Monthly Growth|Aylık Büyüme)\\s*([₺$]?\\s*[\\d.,]+)`, 
            'i'
          );
          const wealthMatch = fullText.match(wealthPattern);
          if (wealthMatch && wealthMatch[1]) {
              const isWealthTR = wealthMatch[0].includes("Tahmini");
              result.totalWealth = parseCurrency(wealthMatch[1], isWealthTR);
          }
      }

      // Regex Fallback for Monthly Salary if not in JSON
      if (result.monthlySalary === undefined) {
          const salaryPattern = new RegExp(`(?:Monthly Salary|Aylık Maaş):\\s*[₺$]?\\s*([\\d.,]+)`, 'i');
          const salaryMatch = fullText.match(salaryPattern);
          if (salaryMatch && salaryMatch[1]) {
               result.monthlySalary = parseCurrency(salaryMatch[1], isTurkish);
          }
      }

      if (result.net === undefined || result.expenses === undefined || result.assets === undefined) {
          throw new Error("Could not locate valid data tables.");
      }

      // Calculations
      // Income = Net + Expenses + Assets (Est. Total)
      const income = (result.net || 0) + (result.expenses || 0) + (result.assets || 0);
      // Savings Rate = (Net + Assets) / Income
      const savingsRate = income > 0 ? (((result.net || 0) + (result.assets || 0)) / income) * 100 : 0;

      return {
          net: result.net!,
          expenses: result.expenses!,
          assets: result.assets!,
          totalWealth: result.totalWealth,
          monthlySalary: result.monthlySalary,
          sourceDate: result.sourceDate || t.unknown,
          income,
          savingsRate
      };
  };

  // --- Event Handlers ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Please upload a PDF file.");
      return;
    }
    setProcessing(true);
    setError(null);
    setData(null);

    try {
      const extracted = await extractPdfData(file);
      setData(extracted);
    } catch (err) {
      console.error(err);
      setError(t.failedImport);
    } finally {
      setProcessing(false);
    }
  };

  const handleCompFile = async (file: File, side: 'A' | 'B') => {
      if (file.type !== 'application/pdf') return;
      setProcessingComp(side);
      try {
          const extracted = await extractPdfData(file);
          if (side === 'A') setCompDataA(extracted);
          else setCompDataB(extracted);
      } catch (err) {
          console.error(err);
          alert(t.failedImport);
      } finally {
          setProcessingComp(null);
      }
  };

  const applyData = () => {
      if (!data) return;

      const existingData = getMonthData(targetYear, targetMonth);
      const updatedData = {
          ...existingData,
          manualPrevExpenses: data.expenses,
          manualPrevAssetPurchases: data.assets,
          manualPrevSavings: data.net, 
      };

      // Calculate previous wealth base (Total Wealth - Cash)
      let wealthBase = 0;
      if (data.totalWealth !== undefined) {
        wealthBase = data.totalWealth - data.net;
      } else {
        wealthBase = data.assets; 
      }
      updatedData.manualPrevAssetTotal = wealthBase;

      updateMonthData(updatedData);
      onImportSuccess(targetYear, targetMonth);
  };

  const getMonthName = (idx: number) => {
      const date = new Date(2024, idx);
      return date.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'long' });
  };

  // Helper for comparison table
  const formatDiff = (val: number, type: 'income' | 'expense') => {
      if (val === 0) return <span className="text-slate-400">-</span>;
      const isPositive = val > 0;
      
      // For income/net/assets/wealth: Positive is Good (Green), Negative is Bad (Red)
      // For expenses: Positive is Bad (Red), Negative is Good (Green)
      
      let isGood = isPositive;
      if (type === 'expense') isGood = !isPositive;

      return (
          <span className={`font-semibold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? '+' : ''}{val.toLocaleString()}
          </span>
      );
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
        {/* --- Section 1: Import Data --- */}
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.importTitle}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t.importDesc}</p>
            </div>

            <div 
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    dragActive 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={handleChange}
                />
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                    <Upload size={32} />
                </div>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 text-center mb-2">
                    {processing ? t.extracting : t.dragDrop}
                </p>
                <p className="text-sm text-slate-400 text-center">
                    *.pdf files only
                </p>
            </div>

            {error && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-lg flex items-start gap-3 text-rose-700 dark:text-rose-300">
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {data && (
                <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-900/10">
                    <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle size={20} />
                        <h3 className="font-bold">{t.extractedData}</h3>
                        {data.sourceDate && data.sourceDate !== t.unknown && <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-800 rounded-full border border-emerald-200 dark:border-emerald-700">{t.pdfSourceDate}: {data.sourceDate}</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{t.estIncome}</p>
                            <p className="text-base font-bold text-slate-700 dark:text-slate-200">₺{data.income.toLocaleString()}</p>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{t.expensesLast}</p>
                            <p className="text-base font-bold text-rose-600 dark:text-rose-400">₺{data.expenses.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{t.netSavingsLast}</p>
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">₺{data.net.toLocaleString()}</p>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{t.assetsLast}</p>
                            <p className="text-base font-bold text-amber-600 dark:text-amber-400">₺{data.assets.toLocaleString()}</p>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{t.totalWealthLast}</p>
                            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">₺{(data.totalWealth !== undefined ? data.totalWealth : 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{t.savingsRate}</p>
                            <p className="text-base font-bold text-slate-700 dark:text-slate-200">{data.savingsRate.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.selectTargetMonth}</label>
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                 <select
                                    value={targetMonth}
                                    onChange={(e) => setTargetMonth(parseInt(e.target.value))}
                                    className="w-full appearance-none px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                 >
                                    {Array.from({length: 12}).map((_, idx) => (
                                        <option key={idx} value={idx}>{getMonthName(idx)}</option>
                                    ))}
                                 </select>
                                 <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                             <input 
                                type="number" 
                                value={targetYear} 
                                onChange={(e) => setTargetYear(parseInt(e.target.value))}
                                className="w-24 px-3 py-2 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <button 
                            onClick={applyData}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <span>{t.applyToMonth}</span>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </Card>
            )}
        </div>

        {/* --- Section 2: Comparison Tool --- */}
        <div className="pt-10 border-t border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Scale size={24} />
                </div>
                <div>
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.comparisonTool}</h2>
                     <p className="text-slate-500 dark:text-slate-400 text-sm">{t.comparisonDesc}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 {/* Report A Upload */}
                 <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] transition-colors ${compDataA ? 'border-emerald-400 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                     {compDataA ? (
                         <div className="text-center w-full">
                             <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 rounded-full mb-3">
                                 <CheckCircle size={20} />
                             </div>
                             <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{t.reportA}</h3>
                             <p className="text-sm text-slate-500 mb-4">{compDataA.sourceDate}</p>
                             <div className="space-y-2 text-sm">
                                 <div className="flex justify-between px-4 py-1 bg-white dark:bg-slate-800 rounded">
                                     <span className="text-slate-500">{t.netSavingsLast}</span>
                                     <span className="font-medium dark:text-slate-200">₺{compDataA.net.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between px-4 py-1 bg-white dark:bg-slate-800 rounded">
                                     <span className="text-slate-500">{t.totalWealthLast}</span>
                                     <span className="font-medium dark:text-slate-200">₺{(compDataA.totalWealth || 0).toLocaleString()}</span>
                                 </div>
                             </div>
                             <button 
                                onClick={() => setCompDataA(null)}
                                className="mt-4 text-xs text-rose-500 hover:underline flex items-center justify-center gap-1 mx-auto"
                             >
                                 <X size={12} /> {t.clear}
                             </button>
                         </div>
                     ) : (
                         <div 
                            className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center"
                            onClick={() => compInputRefA.current?.click()}
                         >
                             <input ref={compInputRefA} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleCompFile(e.target.files[0], 'A')} />
                             <Upload size={24} className="text-slate-400 mb-2" />
                             <p className="font-medium text-slate-600 dark:text-slate-400">{t.reportA}</p>
                             <p className="text-xs text-slate-400 mt-1">{t.uploadReport}</p>
                             {processingComp === 'A' && <p className="text-xs text-indigo-500 mt-2 animate-pulse">{t.extracting}</p>}
                         </div>
                     )}
                 </div>

                 {/* Report B Upload */}
                 <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] transition-colors ${compDataB ? 'border-emerald-400 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                     {compDataB ? (
                         <div className="text-center w-full">
                             <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 rounded-full mb-3">
                                 <CheckCircle size={20} />
                             </div>
                             <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{t.reportB}</h3>
                             <p className="text-sm text-slate-500 mb-4">{compDataB.sourceDate}</p>
                             <div className="space-y-2 text-sm">
                                 <div className="flex justify-between px-4 py-1 bg-white dark:bg-slate-800 rounded">
                                     <span className="text-slate-500">{t.netSavingsLast}</span>
                                     <span className="font-medium dark:text-slate-200">₺{compDataB.net.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between px-4 py-1 bg-white dark:bg-slate-800 rounded">
                                     <span className="text-slate-500">{t.totalWealthLast}</span>
                                     <span className="font-medium dark:text-slate-200">₺{(compDataB.totalWealth || 0).toLocaleString()}</span>
                                 </div>
                             </div>
                             <button 
                                onClick={() => setCompDataB(null)}
                                className="mt-4 text-xs text-rose-500 hover:underline flex items-center justify-center gap-1 mx-auto"
                             >
                                 <X size={12} /> {t.clear}
                             </button>
                         </div>
                     ) : (
                         <div 
                            className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center"
                            onClick={() => compInputRefB.current?.click()}
                         >
                             <input ref={compInputRefB} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleCompFile(e.target.files[0], 'B')} />
                             <Upload size={24} className="text-slate-400 mb-2" />
                             <p className="font-medium text-slate-600 dark:text-slate-400">{t.reportB}</p>
                             <p className="text-xs text-slate-400 mt-1">{t.uploadReport}</p>
                             {processingComp === 'B' && <p className="text-xs text-indigo-500 mt-2 animate-pulse">{t.extracting}</p>}
                         </div>
                     )}
                 </div>
             </div>

             {/* Comparison Table */}
             {compDataA && compDataB && (
                 <Card>
                     <h3 className="font-bold text-lg mb-4">{t.analysis}</h3>
                     <div className="overflow-x-auto">
                         <table className="w-full text-sm">
                             <thead>
                                 <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                     <th className="text-left py-3 px-4">{t.metric}</th>
                                     <th className="text-right py-3 px-4">{t.reportA}</th>
                                     <th className="text-right py-3 px-4">{t.reportB}</th>
                                     <th className="text-right py-3 px-4">{t.difference}</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                 <tr>
                                     <td className="py-3 px-4 font-medium">{t.monthlySalary}</td>
                                     <td className="py-3 px-4 text-right">₺{(compDataA.monthlySalary || 0).toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">₺{(compDataB.monthlySalary || 0).toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">{formatDiff((compDataB.monthlySalary || 0) - (compDataA.monthlySalary || 0), 'income')}</td>
                                 </tr>
                                 <tr>
                                     <td className="py-3 px-4 font-medium">{t.expensesLast}</td>
                                     <td className="py-3 px-4 text-right">₺{compDataA.expenses.toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">₺{compDataB.expenses.toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">{formatDiff(compDataB.expenses - compDataA.expenses, 'expense')}</td>
                                 </tr>
                                 <tr>
                                     <td className="py-3 px-4 font-medium">{t.assetsLast}</td>
                                     <td className="py-3 px-4 text-right">₺{compDataA.assets.toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">₺{compDataB.assets.toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">{formatDiff(compDataB.assets - compDataA.assets, 'income')}</td>
                                 </tr>
                                 <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                     <td className="py-3 px-4 font-bold">{t.netSavingsLast}</td>
                                     <td className="py-3 px-4 text-right font-semibold">₺{compDataA.net.toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right font-semibold">₺{compDataB.net.toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">{formatDiff(compDataB.net - compDataA.net, 'income')}</td>
                                 </tr>
                                 <tr>
                                     <td className="py-3 px-4 font-medium">{t.totalWealthLast}</td>
                                     <td className="py-3 px-4 text-right text-slate-500">₺{(compDataA.totalWealth || 0).toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right text-slate-500">₺{(compDataB.totalWealth || 0).toLocaleString()}</td>
                                     <td className="py-3 px-4 text-right">{formatDiff((compDataB.totalWealth || 0) - (compDataA.totalWealth || 0), 'income')}</td>
                                 </tr>
                                  <tr>
                                     <td className="py-3 px-4 font-medium">{t.savingsRate}</td>
                                     <td className="py-3 px-4 text-right">{compDataA.savingsRate.toFixed(1)}%</td>
                                     <td className="py-3 px-4 text-right">{compDataB.savingsRate.toFixed(1)}%</td>
                                     <td className="py-3 px-4 text-right">
                                         {formatDiff(compDataB.savingsRate - compDataA.savingsRate, 'income')}
                                     </td>
                                 </tr>
                             </tbody>
                         </table>
                     </div>
                 </Card>
             )}
        </div>
    </div>
  );
};
