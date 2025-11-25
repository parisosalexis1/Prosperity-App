

import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, PieChart as PieChartIcon, ArrowRight, Search, Calendar, Tag, DollarSign, RefreshCw, Edit, Filter, ChevronDown, Download, Loader2, ArrowUp, ArrowDown, ArrowUpDown, X, Sparkles, TrendingUp, TrendingDown, Wallet, FolderInput } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Sector } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';
import { translations, getLocalizedCategory } from '../utils/translations';
import { getMonthData, updateMonthData, generateId } from '../services/storageService';

// Declare XLSX which is loaded via CDN
declare var XLSX: any;
declare var pdfMake: any;
declare var html2canvas: any;

interface ExcelAnalysisProps {
  language: Language;
}

interface Transaction {
  id: number;
  date: string;
  rawDate: number; // Timestamp for sorting/filtering
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

interface AnalysisResult {
  totalExpense: number;
  totalIncome: number;
  netFlow: number;
  transactionCount: number;
  expenseBreakdown: { name: string; value: number; percentage: number }[];
  incomeBreakdown: { name: string; value: number; percentage: number }[];
  transactions: Transaction[];
}

type SortKey = keyof Transaction | 'date';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export const ExcelAnalysis: React.FC<ExcelAnalysisProps> = ({ language }) => {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localeStr = language === 'tr' ? 'tr-TR' : 'en-US';
  
  // State
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [chartView, setChartView] = useState<'expense' | 'income'>('expense');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [targetDate, setTargetDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  // Filters & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [showUncategorized, setShowUncategorized] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [amountRange, setAmountRange] = useState<{min: string, max: string}>({min: '', max: ''});
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Category Keywords Definition
  const getKeywordMap = () => {
    const tCategories = t.categories;
    return {
        // Expenses
        [tCategories.groceries]: ['migros', 'carrefour', 'bim', 'a101', 'şok', 'market', 'file', 'makro', 'getir', 'istegelsin', 'gross', 'sanalmarket', 'tahtakale'],
        [tCategories.subscriptions]: ['apple.com', 'apple.bill', 'itunes', 'google', 'canva', 'netflix', 'spotify', 'youtube', 'amazon prime', 'disney', 'blutv', 'exxen', 'mubi', 'adobe', 'icloud', 'microsoft', 'chatgpt', 'openai', 'midjourney', 'patreon', 'subscr', 'playstation', 'xbox', 'steam', 'app store'],
        [tCategories.dining]: ['cafe', 'kahve', 'starbucks', 'espresso', 'restaurant', 'burger', 'pizza', 'kebab', 'yemek', 'lokanta', 'pastane', 'simit', 'social', 'gloria', 'big chefs', 'köfteci', 'restoran', 'fırın', 'börek', 'unlu mamu', 'coffee', 'büfe', 'örnek unlu mamulleri'],
        [tCategories.shopping]: ['trendyol', 'hepsiburada', 'amazon', 'zara', 'lcw', 'boyner', 'giyim', 'tekstil', 'teknosa', 'media', 'ikea', 'koçtaş', 'decathlon', 'mango', 'stradivarius', 'çiçeksepeti', 'morhipo', 'beymen', 'mavi', 'defacto'],
        [tCategories.transportation]: ['taksi', 'uber', 'martı', 'shell', 'opet', 'bp', 'petrol', 'otopark', 'bilet', 'tcdde', 'thy', 'pegasus', 'ido', 'yolcu', 'bitaksi', 'karta dolum'],
        [tCategories.bills]: ['turkcell', 'vodafone', 'telekom', 'fatura', 'elektrik', 'su', 'doğalgaz', 'internet', 'superonline', 'enerjisa', 'igdas', 'iski', 'digiturk', 'ck akdeniz'],
        [tCategories.health]: ['eczane', 'hastane', 'medical', 'diş', 'doktor', 'medikal', 'optik', 'acıbadem', 'liv', 'memorial'],
        [tCategories.entertainment]: ['sinema', 'tiyatro', 'biletix', 'oyun', 'etkinlik', 'konser'],
        [tCategories.fuel]: ['akaryakıt', 'benzin', 'motorin', 'total', 'petrol ofisi'],
        [tCategories.moneyTransfer]: ['transfer', 'havale', 'eft', 'gönderim'],
        [tCategories.investment]: ['yatırım', 'hisse', 'fon', 'portföy', 'midas'],
        [tCategories.gambling]: ['bahis', 'şans oyunları', 'piyango', 'nesine']
    };
  };

  const getIncomeKeywords = () => {
      // Use localized keys if possible or just standard labels
      return {
          [t.categories.salary]: ['maaş', 'salary', 'bordro', 'aylık ödeme'],
          [t.categories.passive]: ['temettü', 'kar payı', 'faiz', 'hisse satışı', 'yatırım getirisi'],
          [t.categories.other]: ['gelen transfer', 'havale', 'eft', 'iade', 'refund', 'atm', 'deposit']
      };
  };

  const analyzeTransactions = (txs: Transaction[]) => {
      let totalExp = 0;
      let totalInc = 0;
      const expMap: Record<string, number> = {};
      const incMap: Record<string, number> = {};
      
      txs.forEach(tx => {
          if (tx.type === 'expense') {
            totalExp += tx.amount;
            const c = tx.category;
            expMap[c] = (expMap[c] || 0) + tx.amount;
          } else {
            totalInc += tx.amount;
            const c = tx.category;
            incMap[c] = (incMap[c] || 0) + tx.amount;
          }
      });

      // Use localization helper for chart names? 
      // Actually, tx.category here is whatever string was assigned. 
      // If we used `t.categories`, it's the localized string of the CURRENT language.
      // So sorting by value is fine.

      const expenseBreakdown = Object.keys(expMap).map(key => ({
          name: key,
          value: expMap[key],
          percentage: totalExp > 0 ? (expMap[key] / totalExp) * 100 : 0
      })).sort((a,b) => b.value - a.value).slice(0, 12);

      const incomeBreakdown = Object.keys(incMap).map(key => ({
          name: key,
          value: incMap[key],
          percentage: totalInc > 0 ? (incMap[key] / totalInc) * 100 : 0
      })).sort((a,b) => b.value - a.value);

      setAnalysis({
          totalExpense: totalExp,
          totalIncome: totalInc,
          netFlow: totalInc - totalExp,
          transactionCount: txs.length,
          expenseBreakdown,
          incomeBreakdown,
          transactions: txs
      });
  };

  const parseDateToTimestamp = (val: any): number => {
    // 1. If it's already a JS Date object
    if (val instanceof Date) {
        return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
    }
    
    // 2. If it's a number (Excel Serial Date)
    if (typeof val === 'number') {
         if (val > 20000) { // Approx modern dates
             // Excel base date is usually UTC-ish, but we want Local Date
             const utcDate = new Date(Math.round((val - 25569)*86400*1000));
             return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate()).getTime();
         }
         return 0;
    }
    
    const s = String(val).trim();
    if (!s) return 0;

    // 3. Try DD.MM.YYYY or DD/MM/YYYY (Common in Turkey/EU)
    if (/^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(s)) {
        const parts = s.split(/[./]/);
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        return new Date(y, m-1, d).getTime();
    }

    // 4. Try YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m-1, d).getTime();
    }
    
    // 5. Fallback to standard parse, then normalize to local midnight
    const t = Date.parse(s);
    if (!isNaN(t)) {
        const d = new Date(t);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }
    return 0;
  };

  const processData = (jsonData: any[][]) => {
      const headersToCheck = 20; 
      let headerRowIdx = -1;
      let dateIdx = -1;
      let descIdx = -1;
      let catIdx = -1;
      let amountIdx = -1;

      const keywords = {
          date: ['date', 'tarih', 'zaman', 'işlem tarihi'],
          desc: ['description', 'açıklama', 'işlem', 'payee', 'merchant', 'detail', 'yer', 'firma'],
          cat: ['category', 'kategori', 'sektör'],
          amt: ['amount', 'tutar', 'meblağ', 'harcama', 'borç', 'debit', 'withdraw', 'tutar tl', 'borç']
      };

      for (let i = 0; i < Math.min(jsonData.length, headersToCheck); i++) {
          const rawRow = jsonData[i] || [];
          const row = Array.from(rawRow).map(c => (c !== null && c !== undefined) ? String(c).toLocaleLowerCase(localeStr).trim() : "");
          
          const d = row.findIndex(c => keywords.date.some(k => c.includes(k)));
          const desc = row.findIndex(c => keywords.desc.some(k => c.includes(k)));
          const cat = row.findIndex(c => keywords.cat.some(k => c === k)); 
          const amt = row.findIndex(c => keywords.amt.some(k => c.includes(k) || c === 'tutar' || c === 'amount'));

          if (amt !== -1 && (desc !== -1 || dateIdx !== -1)) {
              headerRowIdx = i;
              dateIdx = d;
              descIdx = desc;
              catIdx = cat;
              amountIdx = amt;
              break;
          }
      }

      if (headerRowIdx === -1) {
           const numCols = jsonData[0]?.length || 0;
           for(let c=0; c<numCols; c++) {
               let numCount = 0;
               let dateCount = 0;
               let strCount = 0;
               for(let r=0; r<Math.min(jsonData.length, 50); r++) {
                   const cell = jsonData[r] ? jsonData[r][c] : undefined;
                   if (typeof cell === 'number') numCount++;
                   else if (String(cell || "").match(/^\d{2}[-./]\d{2}[-./]\d{2,4}$/)) dateCount++;
                   else if (String(cell || "").length > 3) strCount++;
               }

               if (amountIdx === -1 && numCount > 5) amountIdx = c;
               else if (dateIdx === -1 && dateCount > 3) dateIdx = c;
               else if (descIdx === -1 && strCount > 5) descIdx = c;
           }
      }

      if (amountIdx === -1) {
          throw new Error("Could not detect an Amount column. Please ensure the file contains transaction amounts.");
      }

      if (descIdx === -1) descIdx = (amountIdx === 0) ? 1 : 0;

      const rawTransactions: any[] = [];
      const startRow = headerRowIdx === -1 ? 0 : headerRowIdx + 1;
      const expenseKeywordMap = getKeywordMap();
      const incomeKeywordMap = getIncomeKeywords();

      for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;

          const rawAmt = row[amountIdx];
          if (rawAmt === undefined || rawAmt === null || rawAmt === '') continue;

          let val = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.-]/g, ''));
          if (isNaN(val)) continue;

          let dateStr = "-";
          let rawDateVal = 0;

          if (dateIdx !== -1 && row[dateIdx]) {
              const rawDate = row[dateIdx];
              rawDateVal = parseDateToTimestamp(rawDate);
              
              if (rawDateVal > 0) {
                 const dateObj = new Date(rawDateVal);
                 dateStr = dateObj.toLocaleDateString(localeStr);
              } else {
                 dateStr = String(rawDate);
              }
          }

          const description = descIdx !== -1 ? String(row[descIdx] || "Unknown").trim() : "Unknown";
          let category = catIdx !== -1 ? String(row[catIdx] || "").trim() : "";
          
          rawTransactions.push({
              id: i,
              date: dateStr,
              rawDate: rawDateVal,
              description,
              category, // May be empty
              amount: val
          });
      }

      const negatives = rawTransactions.filter(t => t.amount < 0).length;
      const isSignedFile = negatives > 0;
      
      const transactions: Transaction[] = [];

      rawTransactions.forEach(tx => {
          let type: 'income' | 'expense' = 'expense';
          let absAmount = Math.abs(tx.amount);
          let category = tx.category;

          // Determine Type
          if (isSignedFile) {
              if (tx.amount < 0) type = 'expense';
              else if (tx.amount > 0) type = 'income';
              else return; // skip 0
          } else {
              type = 'expense';
          }

          // Auto-Categorize if missing
          if (!category) {
              const descLowerTR = tx.description.toLocaleLowerCase('tr-TR');
              const descLowerEN = tx.description.toLowerCase();
              const matches = (term: string) => descLowerTR.includes(term) || descLowerEN.includes(term);

              if (type === 'expense') {
                  // Expense Categorization Logic
                  if (matches('konut kira bedeli')) category = t.categories.rent;
                  else if (matches('bireysel amaçlı kredi tahs')) category = t.categories.loan;
                  else if (matches('mobil-fast')) {
                      if (Math.abs(tx.amount) < 500) category = t.categories.moneyTransfer;
                      else category = ""; 
                  }
                  else if (matches('k.kartı ödeme')) category = t.categories.ccDebt;
                  else if (matches('atm para çekme')) category = t.categories.atm;
                  else if (matches('midas menkul')) category = t.categories.investment;
                  else if (matches('nesine') || matches('kripto varlık alım')) category = t.categories.gambling;
                  
                  if (!category) {
                      for (const [catName, keywords] of Object.entries(expenseKeywordMap)) {
                          if (keywords.some(k => matches(k))) {
                              category = catName;
                              break;
                          }
                      }
                  }
              } else {
                  // Income Categorization Logic
                  for (const [catName, keywords] of Object.entries(incomeKeywordMap)) {
                       if (keywords.some(k => matches(k))) {
                           category = catName;
                           break;
                       }
                  }
                  // Fallback for income
                  if (!category) {
                      category = t.categories.other; // "Other Income" or "Diğer Gelir"
                  }
              }
          }

          // Final fallback and Normalization
          if (!category) {
             category = t.uncategorized;
          } else {
              // Capitalize
              category = category.charAt(0).toUpperCase() + category.slice(1);
          }

          transactions.push({
              ...tx,
              amount: absAmount,
              category,
              type
          });
      });

      analyzeTransactions(transactions);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setAnalysis(null);
    setError(null);
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) throw new Error("File appears to be empty.");
      
      processData(jsonData);

    } catch (err) {
      console.error(err);
      setError("Failed to process file. Please ensure it is a valid Excel file.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analysis) return;
    setExporting(true);

    try {
        const chartsElement = document.getElementById('excel-charts-container');
        let chartsImage = null;
        
        if (chartsElement) {
            const canvas = await html2canvas(chartsElement, {
                scale: 2,
                backgroundColor: '#ffffff', // Force white background for PDF
                ignoreElements: (element: any) => element.classList.contains('no-print')
            });
            chartsImage = canvas.toDataURL('image/png');
        }

        const dateStr = new Date().toLocaleDateString(localeStr, { year: 'numeric', month: 'long', day: 'numeric' });

        const docDefinition = {
            info: {
                title: 'Prosperity - Excel Analysis',
                author: 'Prosperity Finance Tracker',
            },
            content: [
                // Header
                { text: t.excelTitle, style: 'header' },
                { text: `${t.pdfSourceDate}: ${dateStr}`, style: 'subheader' },
                { text: `File: ${file?.name || 'Uploaded File'}`, style: 'smallItalic' },

                // Summary Stats
                { text: t.executiveSummary, style: 'h2' },
                {
                    style: 'tableExample',
                    table: {
                        widths: ['*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Total Income', style: 'tableHeader' },
                                { text: t.totalExpenses, style: 'tableHeader' },
                                { text: 'Net Flow', style: 'tableHeader' },
                                { text: t.txCount, style: 'tableHeader' }
                            ],
                            [
                                { text: `₺${analysis.totalIncome.toLocaleString(localeStr)}`, alignment: 'center', fontSize: 12, bold: true, color: '#10B981' },
                                { text: `₺${analysis.totalExpense.toLocaleString(localeStr)}`, alignment: 'center', fontSize: 12, bold: true, color: '#DC2626' },
                                { text: `₺${analysis.netFlow.toLocaleString(localeStr)}`, alignment: 'center', fontSize: 12, bold: true, color: analysis.netFlow >= 0 ? '#10B981' : '#DC2626' },
                                { text: analysis.transactionCount.toString(), alignment: 'center', fontSize: 12 }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },

                // Charts Snapshot
                { text: t.visualAnalysis, style: 'h2', margin: [0, 20, 0, 10] },
                chartsImage ? { image: chartsImage, width: 500, alignment: 'center' } : { text: t.chartsNotAvailable, italics: true },

                // Category Breakdown Table
                { text: `${chartView === 'expense' ? 'Expense' : 'Income'} Breakdown`, style: 'h2', pageBreak: 'before' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto'],
                        body: [
                            [
                                { text: t.category, style: 'tableHeader' },
                                { text: t.amount, style: 'tableHeader', alignment: 'right' },
                                { text: t.percentage, style: 'tableHeader', alignment: 'right' }
                            ],
                            ...(chartView === 'expense' ? analysis.expenseBreakdown : analysis.incomeBreakdown).map(item => [
                                item.name,
                                { text: `₺${item.value.toLocaleString(localeStr)}`, alignment: 'right' },
                                { text: `${item.percentage.toFixed(1)}%`, alignment: 'right', bold: true, color: '#64748b' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },

                // Footer
                { text: 'Generated by Prosperity Finance', style: 'footer', alignment: 'center', margin: [0, 40, 0, 0], color: '#94a3b8', fontSize: 10 }
            ],
            styles: {
                header: { fontSize: 22, bold: true, color: '#334155', margin: [0, 0, 0, 5] },
                subheader: { fontSize: 14, color: '#64748b', margin: [0, 0, 0, 5] },
                smallItalic: { fontSize: 10, italics: true, color: '#94a3b8', margin: [0, 0, 0, 20] },
                h2: { fontSize: 16, bold: true, color: '#4f46e5', margin: [0, 20, 0, 10] },
                tableHeader: { bold: true, fontSize: 11, color: '#1e293b', fillColor: '#f1f5f9', margin: [0, 5, 0, 5] },
                tableExample: { margin: [0, 5, 0, 15] }
            },
            defaultStyle: { font: 'Roboto' }
        };

        pdfMake.createPdf(docDefinition).download(`Financial_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        setExporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateCategory = (txId: number, newCategory: string) => {
      if (!analysis) return;
      const updatedTxs = analysis.transactions.map(t => 
          t.id === txId ? { ...t, category: newCategory } : t
      );
      analyzeTransactions(updatedTxs);
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const d = payload[0];
        return (
          <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg">
             <p className="font-bold text-slate-800 dark:text-slate-200">{d.name}</p>
             <p className="text-slate-600 dark:text-slate-400">₺{d.value.toLocaleString()}</p>
             <p className="text-xs text-indigo-500 font-bold">{d.payload.percentage.toFixed(1)}%</p>
          </div>
        );
      }
      return null;
  };

  // --- Filtering & Sorting Logic ---

  const handleSort = (key: SortKey) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const filteredTransactions = (analysis?.transactions || []).filter(t => {
      const matchSearch = (t.description || "").toLocaleLowerCase(localeStr).includes(searchTerm.toLocaleLowerCase(localeStr)) ||
                          (t.category || "").toLocaleLowerCase(localeStr).includes(searchTerm.toLocaleLowerCase(localeStr));
      
      // Use localized category for filtering too? 
      // If user sees "Kira" but data is "Rent", they might filter for "Kira".
      // Let's match against Localized version.
      const localizedCat = getLocalizedCategory(t.category, language);
      const matchCat = categoryFilter === 'all' || localizedCat === categoryFilter;

      const matchType = typeFilter === 'all' || t.type === typeFilter;
      
      const minVal = amountRange.min ? parseFloat(amountRange.min) : -Infinity;
      const maxVal = amountRange.max ? parseFloat(amountRange.max) : Infinity;
      const matchAmount = t.amount >= minVal && t.amount <= maxVal;

      const txTime = t.rawDate;
      
      // Filter Logic Adjusted for Local Time Consistency
      let startObj = 0;
      if (dateRange.start) {
         // Create Date at 00:00:00 Local Time
         const [y, m, d] = dateRange.start.split('-').map(Number);
         startObj = new Date(y, m - 1, d).getTime();
      }
      
      let endObj = Infinity;
      if (dateRange.end) {
         // Create Date at 23:59:59.999 Local Time
         const [y, m, d] = dateRange.end.split('-').map(Number);
         endObj = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      }

      const matchDate = (txTime >= startObj) && (txTime <= endObj);

      return matchSearch && matchCat && matchAmount && matchDate && matchType;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: any = a[key];
      let valB: any = b[key];

      if (key === 'date') {
          valA = a.rawDate;
          valB = b.rawDate;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
  });

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
      if (sortConfig.key !== colKey) return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
      return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="text-indigo-600 dark:text-indigo-400" />
        : <ArrowDown size={14} className="text-indigo-600 dark:text-indigo-400" />;
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.15))' }}>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 12}
          fill={fill}
        />
      </g>
    );
  };

  const uncategorizedTransactions = (analysis?.transactions || []).filter(tx => tx.category === t.uncategorized);
  const uncategorizedCount = uncategorizedTransactions.length;

  // --- AI Categorization Logic ---

  const performAICategorization = async () => {
    // Only target currently filtered transactions to respect user view
    const targets = filteredTransactions;
    if (targets.length === 0 || !analysis) return;

    setAiCategorizing(true);
    
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            alert("API Key configuration missing. Please check your environment variables.");
            setAiCategorizing(false);
            return;
        }
        
        const client = new GoogleGenAI({ apiKey });
        
        // Prepare data for AI: Send only ID, Desc, Amount to save context
        // We limit to first 100 for responsiveness if list is huge
        const txData = targets.slice(0, 100).map(tx => ({
            id: tx.id,
            desc: tx.description,
            amount: tx.amount,
            type: tx.type
        }));

        const expCategories = Object.values(t.categories);
        // Income categories aren't strictly in t.categories array unless we extract them
        const incCategories = [t.categories.salary, t.categories.passive, t.categories.other];
        
        const prompt = `
            You are a financial analyst helper.
            Categorize the following bank transactions.
            
            Expense Categories: ${JSON.stringify(expCategories)}.
            Income Categories: ${JSON.stringify(incCategories)}.
            
            Rules:
            1. Analyze the description and type (income/expense) to find the best match.
            2. If it's a subscription (Netflix, Spotify, Apple, etc.), use "Subscriptions" (or localized equivalent from list).
            3. If strictly no category fits, use "${t.uncategorized}".
            4. Return a JSON object where keys are the Transaction IDs (as strings) and values are the Category Names.
            5. Return ONLY the JSON object, no markdown.
            
            Transactions:
            ${JSON.stringify(txData)}
        `;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");
        
        const categoryMap = JSON.parse(jsonText);
        
        // Update state
        const updatedTxs = analysis.transactions.map(tx => {
            if (categoryMap[String(tx.id)]) {
                return { ...tx, category: categoryMap[String(tx.id)] };
            }
            return tx;
        });
        
        analyzeTransactions(updatedTxs);
        
        if (targets.length > 100) {
            alert(`AI processed the first 100 visible transactions.`);
        }
        
    } catch (err) {
        console.error("AI Error", err);
        alert("AI Categorization failed. Please try again.");
    } finally {
        setAiCategorizing(false);
    }
  };

  const openImportModal = () => {
      if (filteredTransactions.length === 0) {
          alert(t.noTxToImport || "No transactions available to import.");
          return;
      }
      
      // Calculate Mode Date to suggest target month
      const dateCounts: Record<string, number> = {};
      let maxCount = 0;
      let bestKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;

      filteredTransactions.forEach(tx => {
          if (tx.rawDate > 0) {
              const d = new Date(tx.rawDate);
              const key = `${d.getFullYear()}-${d.getMonth()}`;
              dateCounts[key] = (dateCounts[key] || 0) + 1;
              if (dateCounts[key] > maxCount) {
                  maxCount = dateCounts[key];
                  bestKey = key;
              }
          }
      });
      
      const [y, m] = bestKey.split('-').map(Number);
      setTargetDate({ year: y, month: m });
      setShowImportModal(true);
  };

  const handleImportConfirm = () => {
      const targetData = getMonthData(targetDate.year, targetDate.month);
      
      // Ensure incomeList is initialized
      if (!targetData.incomeList) targetData.incomeList = [];
      
      let addedExpensesCount = 0;
      let addedIncomeCount = 0;

      filteredTransactions.forEach(tx => {
          if (tx.type === 'expense') {
              const newExpense = {
                  id: generateId(),
                  name: tx.description,
                  amount: tx.amount,
                  category: tx.category === t.uncategorized ? t.categories.general : tx.category
              };
              targetData.expenses.push(newExpense);
              addedExpensesCount++;
          } else {
              // Create specific Income Transaction
              const newIncome = {
                  id: generateId(),
                  name: tx.description,
                  amount: tx.amount,
                  category: tx.category === t.uncategorized ? t.categories.other : tx.category
              };
              targetData.incomeList!.push(newIncome);
              addedIncomeCount++;
          }
      });

      // Recalculate totals for target month based on new list
      if (addedIncomeCount > 0) {
          const monthlySum = targetData.incomeList!.filter(i => i.category === 'Salary' || i.category === t.categories.salary || i.category === 'Monthly Salary').reduce((acc, c) => acc + c.amount, 0);
          const passiveSum = targetData.incomeList!.filter(i => i.category === 'Passive' || i.category === t.categories.passive || i.category === 'Passive Income').reduce((acc, c) => acc + c.amount, 0);
          const otherSum = targetData.incomeList!.filter(i => 
             i.category !== 'Salary' && i.category !== t.categories.salary && i.category !== 'Monthly Salary' &&
             i.category !== 'Passive' && i.category !== t.categories.passive && i.category !== 'Passive Income'
          ).reduce((acc, c) => acc + c.amount, 0);
          
          targetData.incomes = {
              monthly: monthlySum,
              passive: passiveSum,
              other: otherSum
          };
      }

      updateMonthData(targetData);
      setShowImportModal(false);
      alert(`${t.importedSuccess} ${new Date(targetDate.year, targetDate.month).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })}.`);
  };

  const activeBreakdown = chartView === 'expense' ? analysis?.expenseBreakdown : analysis?.incomeBreakdown;

  return (
    <div className="space-y-8">
       <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.excelTitle}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t.excelDesc}</p>
       </div>

       {/* Upload Step */}
       {!analysis && (
           <Card className="border-indigo-100 dark:border-indigo-900/30">
               <div 
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      file 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                  }`}
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                  
                  {isProcessing ? (
                      <div className="flex flex-col items-center">
                          <RefreshCw className="animate-spin text-indigo-600 mb-2" size={32} />
                          <p className="font-medium text-slate-600 dark:text-slate-300">Processing file...</p>
                      </div>
                  ) : file ? (
                      <>
                        <FileSpreadsheet size={48} className="text-emerald-500 mb-2" />
                        <p className="font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                        <p className="text-xs text-emerald-600/70">Click to replace</p>
                      </>
                  ) : (
                      <>
                        <Upload size={48} className="text-slate-400 mb-2" />
                        <p className="font-medium text-slate-600 dark:text-slate-400">{t.uploadStep}</p>
                        <p className="text-xs text-slate-400 mt-2">Auto-detects Amount, Date & Description</p>
                      </>
                  )}
                </div>
                
                {error && (
                    <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
           </Card>
       )}

       {/* Analysis Dashboard */}
       {analysis && (
           <div className="space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CheckCircle size={24} className="text-emerald-500" />
                        {t.analysisStep}
                    </h3>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
                        >
                            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            <span>{t.exportPDF}</span>
                        </button>
                        <button onClick={reset} className="text-sm text-slate-500 hover:text-indigo-500 underline">
                            Upload different file
                        </button>
                    </div>
               </div>

               {/* Uncategorized Alert */}
               {uncategorizedCount > 0 && (
                   <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full">
                               <AlertCircle size={20} />
                           </div>
                           <div>
                               <p className="font-semibold text-amber-800 dark:text-amber-300">{uncategorizedCount} {t.uncategorizedCount}</p>
                               <p className="text-xs text-amber-600/80 dark:text-amber-400/80">{t.reviewUncategorized}</p>
                           </div>
                       </div>
                       <button 
                          onClick={() => setShowUncategorized(!showUncategorized)}
                          className="px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-medium transition-colors"
                       >
                           {showUncategorized ? t.close : t.assignCategory}
                       </button>
                   </div>
               )}

               {/* Review Uncategorized Section */}
               {showUncategorized && uncategorizedCount > 0 && (
                   <Card className="border-amber-200 dark:border-amber-800" title={t.reviewUncategorized}>
                       <div className="overflow-x-auto max-h-[400px]">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 sticky top-0 z-10">
                                   <tr>
                                       <th className="px-4 py-3">{t.expense}</th>
                                       <th className="px-4 py-3">{t.amount}</th>
                                       <th className="px-4 py-3">{t.assignCategory}</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                   {uncategorizedTransactions.map(tx => (
                                       <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                           <td className="px-4 py-3">
                                               <div className="font-medium">{tx.description}</div>
                                               <div className="text-xs text-slate-400">{tx.date}</div>
                                               <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">{tx.type}</div>
                                           </td>
                                           <td className={`px-4 py-3 font-medium ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                               {tx.type === 'expense' ? '-' : '+'}₺{tx.amount.toLocaleString()}
                                           </td>
                                           <td className="px-4 py-3">
                                               <div className="relative">
                                                   <select
                                                      value={tx.category}
                                                      onChange={(e) => updateCategory(tx.id, e.target.value)}
                                                      className="w-full appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                                                   >
                                                      <option value={t.uncategorized}>{t.uncategorized}</option>
                                                      {tx.type === 'expense' 
                                                        ? Object.values(t.categories).map(cat => <option key={cat} value={cat}>{cat}</option>)
                                                        : [t.categories.salary, t.categories.passive, t.categories.other].map(cat => <option key={cat} value={cat}>{cat}</option>)
                                                      }
                                                   </select>
                                                   <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                       <div className="mt-4 flex justify-end">
                           <button 
                                onClick={() => setShowUncategorized(false)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                            >
                                {t.applyChanges}
                           </button>
                       </div>
                   </Card>
               )}
               
               {/* Summary Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                       <div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Income</p>
                           <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">₺{analysis.totalIncome.toLocaleString()}</p>
                       </div>
                       <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                           <TrendingUp size={24} />
                       </div>
                   </div>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                       <div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalExpenses}</p>
                           <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">₺{analysis.totalExpense.toLocaleString()}</p>
                       </div>
                       <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                           <TrendingDown size={24} />
                       </div>
                   </div>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                       <div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Flow</p>
                           <p className={`text-2xl font-bold mt-2 ${analysis.netFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500'}`}>
                                {analysis.netFlow >= 0 ? '+' : ''}₺{analysis.netFlow.toLocaleString()}
                           </p>
                       </div>
                       <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                           <Wallet size={24} />
                       </div>
                   </div>
               </div>
               
               {/* Charts Container with ID for HTML2Canvas */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="excel-charts-container">
                   {/* Charts */}
                   <Card title={`${chartView === 'expense' ? 'Expense' : 'Income'} Breakdown`}>
                        <div className="flex justify-end mb-2">
                             <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                 <button 
                                    onClick={() => setChartView('expense')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartView === 'expense' ? 'bg-white dark:bg-slate-800 shadow text-rose-600' : 'text-slate-500'}`}
                                 >
                                     Expenses
                                 </button>
                                 <button 
                                    onClick={() => setChartView('income')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartView === 'income' ? 'bg-white dark:bg-slate-800 shadow text-emerald-600' : 'text-slate-500'}`}
                                 >
                                     Income
                                 </button>
                             </div>
                        </div>
                        <div className="h-[300px]">
                            {activeBreakdown && activeBreakdown.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={activeBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            {...({
                                                activeIndex: activeIndex,
                                                activeShape: renderActiveShape,
                                                onMouseEnter: onPieEnter,
                                                onMouseLeave: onPieLeave
                                            } as any)}
                                        >
                                            {activeBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.name === t.uncategorized ? '#94a3b8' : COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                    No data for this category.
                                </div>
                            )}
                        </div>
                   </Card>
                   
                   {/* Breakdown List */}
                   <Card title="Top Categories">
                       <div className="overflow-y-auto max-h-[350px]">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 sticky top-0 backdrop-blur-md">
                                   <tr>
                                       <th className="px-4 py-2">{t.category}</th>
                                       <th className="px-4 py-2 text-right">{t.amount}</th>
                                       <th className="px-4 py-2 text-right">{t.percentage}</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                   {(activeBreakdown || []).map((item, idx) => (
                                       <tr 
                                            key={idx} 
                                            className={`transition-colors cursor-default ${activeIndex === idx ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onMouseLeave={() => setActiveIndex(-1)}
                                        >
                                           <td className="px-4 py-3 font-medium flex items-center gap-2">
                                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.name === t.uncategorized ? '#94a3b8' : COLORS[idx % COLORS.length] }}></div>
                                               {item.name}
                                           </td>
                                           <td className="px-4 py-3 text-right">₺{item.value.toLocaleString(localeStr)}</td>
                                           <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">{item.percentage.toFixed(1)}%</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </Card>
               </div>

               {/* Full Transaction List with Advanced Filters */}
               <Card title="Transaction List">
                   {/* Advanced Filter Bar */}
                   <div className="flex flex-col gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm">
                                <Filter size={16} />
                                <span>Filter & Sort</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={openImportModal}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                                    title={t.importToReportDesc}
                                >
                                    <FolderInput size={16} />
                                    <span>{t.importToReport}</span>
                                </button>
                                <button
                                    onClick={performAICategorization}
                                    disabled={aiCategorizing || filteredTransactions.length === 0}
                                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {aiCategorizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    <span>{aiCategorizing ? t.aiAutoCategorizing : t.aiCategorize}</span>
                                </button>
                            </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                           {/* Search */}
                           <div className="relative">
                               <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                               <input 
                                  type="text" 
                                  placeholder="Search..." 
                                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                               />
                           </div>
                           
                           {/* Date Range */}
                            <div className="flex gap-2 col-span-1 md:col-span-2 lg:col-span-2">
                                <div className="relative w-full">
                                    <span className="absolute left-2 -top-2 bg-slate-50 dark:bg-slate-900 px-1 text-[10px] text-slate-500">{t.startDate}</span>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 dark:text-slate-300"
                                    />
                                </div>
                                <div className="relative w-full">
                                    <span className="absolute left-2 -top-2 bg-slate-50 dark:bg-slate-900 px-1 text-[10px] text-slate-500">{t.endDate}</span>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 dark:text-slate-300"
                                    />
                                </div>
                            </div>

                           {/* Category Filter */}
                           <div>
                               <select
                                   value={categoryFilter}
                                   onChange={(e) => setCategoryFilter(e.target.value)}
                                   className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 dark:text-slate-300"
                               >
                                   <option value="all">All Categories</option>
                                   <option value={t.uncategorized}>{t.uncategorized}</option>
                                   {Object.values(t.categories).map(cat => (
                                       <option key={cat} value={cat}>{cat}</option>
                                   ))}
                               </select>
                           </div>

                           {/* Amount Range */}
                           <div className="flex gap-2">
                               <input
                                    type="number"
                                    placeholder="Min ₺"
                                    value={amountRange.min}
                                    onChange={(e) => setAmountRange(prev => ({...prev, min: e.target.value}))}
                                    className="w-1/2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                               />
                               <input
                                    type="number"
                                    placeholder="Max ₺"
                                    value={amountRange.max}
                                    onChange={(e) => setAmountRange(prev => ({...prev, max: e.target.value}))}
                                    className="w-1/2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                               />
                           </div>
                       </div>
                   </div>

                   <div className="overflow-x-auto max-h-[500px] border border-slate-200 dark:border-slate-700 rounded-lg">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold sticky top-0 z-10 select-none">
                               <tr>
                                   <th 
                                      className="px-4 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                      onClick={() => handleSort('date')}
                                   >
                                       <div className="flex items-center gap-1">
                                           <Calendar size={14} /> 
                                           Date
                                           <SortIcon colKey="date" />
                                       </div>
                                   </th>
                                   <th 
                                      className="px-4 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                      onClick={() => handleSort('description')}
                                   >
                                       <div className="flex items-center gap-1">
                                            Description
                                            <SortIcon colKey="description" />
                                       </div>
                                   </th>
                                   <th 
                                      className="px-4 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                      onClick={() => handleSort('category')}
                                   >
                                       <div className="flex items-center gap-1">
                                           <Tag size={14} /> 
                                           Category
                                           <SortIcon colKey="category" />
                                       </div>
                                   </th>
                                   <th 
                                      className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                      onClick={() => handleSort('amount')}
                                   >
                                       <div className="flex items-center justify-end gap-1">
                                           Amount
                                           <SortIcon colKey="amount" />
                                       </div>
                                   </th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                               {sortedTransactions.map((tx) => (
                                   <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                       <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{tx.date}</td>
                                       <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{tx.description}</td>
                                       <td className="px-4 py-3">
                                           <div className="relative group">
                                                <select
                                                    value={getLocalizedCategory(tx.category, language)} // Use localized for display
                                                    onChange={(e) => updateCategory(tx.id, e.target.value)}
                                                    className={`appearance-none pl-2 pr-6 py-1 rounded text-xs font-medium cursor-pointer outline-none transition-colors w-full md:w-auto ${
                                                        tx.category === t.uncategorized 
                                                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' 
                                                        : tx.type === 'income'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                    }`}
                                                >
                                                    <option value={t.uncategorized}>{t.uncategorized}</option>
                                                    {tx.type === 'expense' 
                                                        ? Object.values(t.categories).map(cat => <option key={cat} value={cat}>{cat}</option>)
                                                        : [t.categories.salary, t.categories.passive, t.categories.other].map(cat => <option key={cat} value={cat}>{cat}</option>)
                                                    }
                                                </select>
                                           </div>
                                       </td>
                                       <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                           {tx.type === 'expense' ? '-' : '+'}₺{tx.amount.toLocaleString()}
                                       </td>
                                   </tr>
                               ))}
                               {sortedTransactions.length === 0 && (
                                   <tr>
                                       <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                           No transactions found matching your filters.
                                       </td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
                   <div className="mt-2 text-xs text-slate-400 text-right px-2">
                       Showing {sortedTransactions.length} of {analysis.transactions.length} transactions
                   </div>
               </Card>
           </div>
       )}

       {/* Import Modal */}
        {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.importToReport}</h3>
                         <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                             <X size={20} />
                         </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">{t.selectTargetMonthImport}</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={targetDate.year}
                                    onChange={(e) => setTargetDate(p => ({...p, year: parseInt(e.target.value)}))}
                                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <select
                                    value={targetDate.month}
                                    onChange={(e) => setTargetDate(p => ({...p, month: parseInt(e.target.value)}))}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {Array.from({length: 12}).map((_, i) => (
                                        <option key={i} value={i}>{new Date(2024, i).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', {month: 'long'})}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.summaryOfFiltered}</p>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1"><ArrowDown size={14} /> Expenses ({filteredTransactions.filter(tx => tx.type === 'expense').length})</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">₺{filteredTransactions.filter(tx => tx.type === 'expense').reduce((a,b) => a + b.amount, 0).toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ArrowUp size={14} /> Income ({filteredTransactions.filter(tx => tx.type === 'income').length})</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">₺{filteredTransactions.filter(tx => tx.type === 'income').reduce((a,b) => a + b.amount, 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowImportModal(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">{t.cancel}</button>
                            <button onClick={handleImportConfirm} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-md shadow-emerald-200 dark:shadow-none">{t.confirmImport}</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
