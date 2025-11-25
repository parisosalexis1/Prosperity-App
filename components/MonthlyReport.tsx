
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Sparkles, Wallet, TrendingDown, TrendingUp, Coins, Gem, Download, Loader2, FileText, ArrowUp, ArrowDown, ArrowUpDown, Minus, History, ChevronRight, ChevronDown, X, Filter, Search } from 'lucide-react';
import { MonthData, Expense, Asset, IncomeType, Language } from '../types';
import { getMonthData, updateMonthData, generateId } from '../services/storageService';
import { generateFinancialReport } from '../services/geminiService';
import { Card } from './ui/Card';
import { translations, getLocalizedCategory } from '../utils/translations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

// Global declarations for CDN libraries
declare var pdfMake: any;
declare var html2canvas: any;

interface MonthlyReportProps {
  year: number;
  month: number;
  isDarkMode: boolean;
  language: Language;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type SortKey = 'name' | 'amount' | 'category';

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ year, month, isDarkMode, language }) => {
  const [data, setData] = useState<MonthData | null>(null);
  const [prevData, setPrevData] = useState<MonthData | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAssetComparison, setShowAssetComparison] = useState(false);
  
  const t = translations[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  
  // Categories list derived from keys to maintain order
  const categoryKeys = ['rent', 'bills', 'subscriptions', 'ccDebt', 'loan', 'moneyTransfer', 'atm', 'investment', 'health', 'entertainment', 'groceries', 'dining', 'shopping', 'fuel', 'transportation', 'gambling', 'general'] as const;
  
  // Income Categories
  const incomeCategoryKeys = ['salary', 'passive', 'other'] as const;

  // New Expense State
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState(t.categories.general);

  // New Income State
  const [showIncomeList, setShowIncomeList] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeCategory, setNewIncomeCategory] = useState(t.categories.other);

  // Filter & Sort State for Expenses
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseMin, setExpenseMin] = useState('');
  const [expenseMax, setExpenseMax] = useState('');
  const [showExpenseFilters, setShowExpenseFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });

  // Update category selection when language changes to prevent mismatch in UI
  useEffect(() => {
      setNewExpenseCategory(t.categories.general);
      setNewIncomeCategory(t.categories.other);
  }, [language, t.categories.general, t.categories.other]);

  // New Asset State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetQuantity, setNewAssetQuantity] = useState('');
  const [newAssetPrice, setNewAssetPrice] = useState('');

  // Load data when year/month changes
  useEffect(() => {
    const loaded = getMonthData(year, month);
    setData(loaded);
    
    // Determine if we should show income list mode by default
    if (loaded.incomeList && loaded.incomeList.length > 0) {
        setShowIncomeList(true);
    } else {
        setShowIncomeList(false);
    }

    // Load previous month for comparison
    const prevDate = new Date(year, month - 1);
    const loadedPrev = getMonthData(prevDate.getFullYear(), prevDate.getMonth());
    setPrevData(loadedPrev);
  }, [year, month]);

  // Auto-save effect
  useEffect(() => {
    if (data) {
        // If using detailed list, calculate totals before saving/rendering
        if (data.incomeList && data.incomeList.length > 0) {
             const monthlySum = data.incomeList.filter(i => {
                 const localCat = getLocalizedCategory(i.category, language);
                 return localCat === t.categories.salary;
             }).reduce((acc, c) => acc + c.amount, 0);

             const passiveSum = data.incomeList.filter(i => {
                 const localCat = getLocalizedCategory(i.category, language);
                 return localCat === t.categories.passive;
             }).reduce((acc, c) => acc + c.amount, 0);

             const otherSum = data.incomeList.filter(i => {
                 const localCat = getLocalizedCategory(i.category, language);
                 return localCat !== t.categories.salary && localCat !== t.categories.passive;
             }).reduce((acc, c) => acc + c.amount, 0);

             // Only update if numbers differ to avoid loop
             if (data.incomes.monthly !== monthlySum || data.incomes.passive !== passiveSum || data.incomes.other !== otherSum) {
                 const newData = {
                     ...data,
                     incomes: {
                         monthly: monthlySum,
                         passive: passiveSum,
                         other: otherSum
                     }
                 };
                 setData(newData); // This triggers another effect but numbers will match next time
                 updateMonthData(newData);
                 return;
             }
        }
        updateMonthData(data);
    }
  }, [data, t.categories.salary, t.categories.passive, language]);

  const handleIncomeChange = (field: keyof typeof IncomeType | 'monthly' | 'other' | 'passive', value: string) => {
    if (!data) return;
    const numValue = parseFloat(value) || 0;
    setData({
      ...data,
      incomes: {
        ...data.incomes,
        [field.toLowerCase()]: numValue
      }
    });
  };

  const handleGeneralDataChange = (field: 'exchangeRate' | 'manualPrevSavings' | 'manualPrevAssetTotal' | 'manualPrevExpenses', value: string) => {
    if (!data) return;
    const numValue = value === '' ? undefined : parseFloat(value);
    setData({
      ...data,
      [field]: numValue
    });
  };

  const addExpense = () => {
    if (!data || !newExpenseName || !newExpenseAmount) return;
    const newExpense: Expense = {
      id: generateId(),
      name: newExpenseName,
      amount: parseFloat(newExpenseAmount),
      category: newExpenseCategory
    };
    setData({
      ...data,
      expenses: [...data.expenses, newExpense]
    });
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  const deleteExpense = (id: string) => {
    if (!data) return;
    setData({
      ...data,
      expenses: data.expenses.filter(e => e.id !== id)
    });
  };

  const updateExpenseCategory = (id: string, newCat: string) => {
      if (!data) return;
      setData({
          ...data,
          expenses: data.expenses.map(e => e.id === id ? { ...e, category: newCat } : e)
      });
  };

  const addIncomeTransaction = () => {
      if (!data || !newIncomeName || !newIncomeAmount) return;
      const newInc: Expense = {
          id: generateId(),
          name: newIncomeName,
          amount: parseFloat(newIncomeAmount),
          category: newIncomeCategory
      };
      
      const updatedList = [...(data.incomeList || []), newInc];
      setData({
          ...data,
          incomeList: updatedList
      });
      setShowIncomeList(true);
      setNewIncomeName('');
      setNewIncomeAmount('');
  };

  const updateIncomeCategory = (id: string, newCat: string) => {
      if (!data || !data.incomeList) return;
      const updatedList = data.incomeList.map(i => i.id === id ? { ...i, category: newCat } : i);
      setData({
          ...data,
          incomeList: updatedList
      });
  };

  const deleteIncomeTransaction = (id: string) => {
      if (!data || !data.incomeList) return;
      const updatedList = data.incomeList.filter(i => i.id !== id);
      setData({
          ...data,
          incomeList: updatedList
      });
  };

  const addAsset = () => {
    if (!data || !newAssetName || !newAssetQuantity || !newAssetPrice) return;
    const newAsset: Asset = {
      id: generateId(),
      name: newAssetName,
      quantity: parseFloat(newAssetQuantity),
      purchasePrice: parseFloat(newAssetPrice)
    };
    setData({
      ...data,
      assets: [...(data.assets || []), newAsset]
    });
    setNewAssetName('');
    setNewAssetQuantity('');
    setNewAssetPrice('');
  };

  const deleteAsset = (id: string) => {
    if (!data) return;
    setData({
      ...data,
      assets: (data.assets || []).filter(a => a.id !== id)
    });
  };

  const updateAssetPreviousQuantity = (id: string, val: string) => {
    if (!data) return;
    const numVal = val === '' ? undefined : parseFloat(val);
    const updatedAssets = data.assets.map(a => {
        if (a.id === id) {
            return { ...a, previousQuantity: numVal };
        }
        return a;
    });
    setData({ ...data, assets: updatedAssets });
  };

  const handleGenerateAIReport = async () => {
    if (!data) return;
    setLoadingAI(true);
    const report = await generateFinancialReport(data, language);
    setData({ ...data, aiAnalysis: report });
    setLoadingAI(false);
  };

  const closeAIAnalysis = () => {
    if (!data) return;
    setData({ ...data, aiAnalysis: undefined });
  };

  // --- Calculations ---
  
  const exchangeRate = data?.exchangeRate || 0;
  const hasRate = exchangeRate > 0;

  const totalIncome = data ? (data.incomes.monthly || 0) + (data.incomes.other || 0) + (data.incomes.passive || 0) : 0;
  const totalExpenses = data ? data.expenses.reduce((acc, curr) => acc + curr.amount, 0) : 0;
  const totalAssetsCost = data ? (data.assets || []).reduce((acc, curr) => acc + (curr.quantity * curr.purchasePrice), 0) : 0;
  
  const netFlow = totalIncome - totalExpenses - totalAssetsCost;
  const net = netFlow + (data?.manualPrevSavings || 0);
  const savingsRate = totalIncome > 0 ? (((netFlow + totalAssetsCost) / totalIncome) * 100).toFixed(1) : '0';

  const prevTotalIncome = prevData ? (prevData.incomes.monthly || 0) + (prevData.incomes.other || 0) + (prevData.incomes.passive || 0) : 0;
  const prevTotalExpenses = prevData ? prevData.expenses.reduce((acc, curr) => acc + curr.amount, 0) : 0;
  const prevAssetCost = prevData ? (prevData.assets || []).reduce((acc, curr) => acc + (curr.quantity * curr.purchasePrice), 0) : 0;
  const prevNetCalculated = prevTotalIncome - prevTotalExpenses - prevAssetCost;
  
  const effectivePrevNet = (data && data.manualPrevSavings !== undefined) ? data.manualPrevSavings : prevNetCalculated;
  const prevTotalAssetsCalculated = prevData ? (prevData.assets || []).reduce((acc, curr) => acc + (curr.quantity * curr.purchasePrice), 0) : 0;
  
  const effectivePrevAssetWealth = (data && data.manualPrevAssetTotal !== undefined) ? data.manualPrevAssetTotal : prevTotalAssetsCalculated;
  const effectivePrevAssetPurchases = (data && data.manualPrevAssetPurchases !== undefined) ? data.manualPrevAssetPurchases : prevTotalAssetsCalculated;
  const effectivePrevExpenses = (data && data.manualPrevExpenses !== undefined) ? data.manualPrevExpenses : prevTotalExpenses;

  const manualPrevWealth = data?.manualPrevAssetTotal;
  const showWealthCard = manualPrevWealth !== undefined && manualPrevWealth > 0;
  const prevTotalWealth = (manualPrevWealth || 0) + (data?.manualPrevSavings || 0);
  const projectedTotalWealth = (manualPrevWealth || 0) + net + totalAssetsCost; 
  const wealthGrowthPercent = prevTotalWealth > 0 ? (((projectedTotalWealth - prevTotalWealth) / prevTotalWealth) * 100).toFixed(2) : '0.00';

  const hasPrevData = prevData !== null || (data && (data.manualPrevSavings !== undefined || data.manualPrevExpenses !== undefined));
  const formatUSD = (val: number) => hasRate ? `$${(val / exchangeRate).toLocaleString(locale, { maximumFractionDigits: 0 })}` : '';
  const formatTL = (val: number) => `₺${val.toLocaleString(locale)}`;

  // Chart Data Preparation
  const expensesByCategory = data ? data.expenses.reduce((acc: {[key: string]: number}, curr) => {
    const locCat = getLocalizedCategory(curr.category, language);
    acc[locCat] = (acc[locCat] || 0) + curr.amount;
    return acc;
  }, {}) : {};
  
  if (totalAssetsCost > 0) {
      expensesByCategory[t.assetsBought] = totalAssetsCost;
  }

  const pieData = Object.keys(expensesByCategory).map(cat => ({
    name: cat,
    value: expensesByCategory[cat]
  }));

  const barData = [
    { name: t.incomeLabel, amount: totalIncome, fill: '#10B981' }, 
    { name: t.outflowLabel, amount: totalExpenses + totalAssetsCost, fill: '#EF4444' },
    { name: t.netCashLabel, amount: net, fill: '#3B82F6' },
  ];

  // Filtering & Sorting Logic
  const handleSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') {
          direction = 'asc';
      }
      setSortConfig({ key, direction });
  };

  const filteredExpenses = data ? data.expenses.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                          getLocalizedCategory(e.category, language).toLowerCase().includes(expenseSearch.toLowerCase());
      
      const localizedCat = getLocalizedCategory(e.category, language);
      const matchCat = expenseCategoryFilter === 'all' || localizedCat === expenseCategoryFilter;
      
      const min = expenseMin ? parseFloat(expenseMin) : -Infinity;
      const max = expenseMax ? parseFloat(expenseMax) : Infinity;
      const matchAmount = e.amount >= min && e.amount <= max;

      return matchSearch && matchCat && matchAmount;
  }) : [];

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const { key, direction } = sortConfig;
    let valA: any = a[key];
    let valB: any = b[key];
    
    if (key === 'category') {
        valA = getLocalizedCategory(a.category, language);
        valB = getLocalizedCategory(b.category, language);
    } else if (key === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortConfig.key !== colKey) return <ArrowUpDown size={14} className="text-slate-400 opacity-50 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-indigo-600 dark:text-indigo-400 ml-1" />
      : <ArrowDown size={14} className="text-indigo-600 dark:text-indigo-400 ml-1" />;
  };

  // --- Export Function ---

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);

    try {
      const chartsElement = document.getElementById('charts-container');
      let chartsImage = null;
      
      if (chartsElement) {
        const canvas = await html2canvas(chartsElement, {
          scale: 2,
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          ignoreElements: (element: any) => element.classList.contains('no-print')
        });
        chartsImage = canvas.toDataURL('image/png');
      }

      const hiddenPayload = JSON.stringify({
          magic: 'PROSPERITY_V1',
          data: {
              net,
              expenses: totalExpenses,
              assets: totalAssetsCost,
              totalWealth: projectedTotalWealth,
              monthlySalary: data.incomes.monthly,
              date: `${year}-${String(month + 1).padStart(2, '0')}`,
              currency: hasRate ? 'USD' : 'TL'
          }
      });
      
      const hasAssets = data.assets && data.assets.length > 0;

      const docDefinition = {
        info: {
          title: `Prosperity Report - ${year}-${month + 1}`,
          author: 'Prosperity Finance Tracker',
        },
        content: [
          { text: t.reportTitle, style: 'header' },
          { text: `${new Date(year, month).toLocaleString(locale, { month: 'long', year: 'numeric' })}`, style: 'subheader' },
          hasRate ? { text: `${t.usdRate}: $1 = ₺${exchangeRate}`, style: 'smallItalic' } : null,
          { text: t.executiveSummary, style: 'h2' },
          {
            style: 'tableExample',
            table: {
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: t.totalIncome, style: 'tableHeader' },
                  { text: t.outflowExpAssets, style: 'tableHeader' },
                  { text: t.netCash, style: 'tableHeader' },
                  { text: t.savingsRate, style: 'tableHeader' }
                ],
                [
                  { text: [formatTL(totalIncome), hasRate ? `\n(${formatUSD(totalIncome)})` : ''], alignment: 'center' },
                  { text: [formatTL(totalExpenses + totalAssetsCost), hasRate ? `\n(${formatUSD(totalExpenses + totalAssetsCost)})` : ''], alignment: 'center' },
                  { text: [formatTL(net), hasRate ? `\n(${formatUSD(net)})` : ''], color: net >= 0 ? '#059669' : '#DC2626', bold: true, alignment: 'center' },
                  { text: `${savingsRate}%`, bold: true, alignment: 'center' }
                ]
              ]
            },
            layout: 'lightHorizontalLines'
          },
          { text: `${t.monthlySalary}: ${formatTL(data.incomes.monthly || 0)}`, fontSize: 10, color: '#64748b', margin: [0, -10, 0, 10], italics: true },
          showWealthCard ? { text: t.wealthProjection, style: 'h2', margin: [0, 20, 0, 5] } : null,
          showWealthCard ? {
            table: {
                widths: ['*', '*', '*'],
                body: [
                    [ {text: t.totalProjectedWealth, style: 'tableHeader'}, {text: t.previousWealth, style: 'tableHeader'}, {text: t.monthlyGrowth, style: 'tableHeader'} ],
                    [ {text: formatTL(projectedTotalWealth), alignment: 'center', bold: true, fontSize: 12}, {text: `₺${prevTotalWealth.toLocaleString(locale)}`, alignment: 'center'}, {text: `${wealthGrowthPercent}%`, alignment: 'center', color: wealthGrowthPercent.startsWith('-') ? '#e11d48' : '#059669', bold: true} ]
                ]
            },
            layout: 'lightHorizontalLines'
          } : null,
          showWealthCard ? {
              text: `${t.calculation}: ${t.prevAssets} (${formatTL(manualPrevWealth || 0)}) + ${t.cashRemaining} (${formatTL(net)}) + ${t.newAssets} (${formatTL(totalAssetsCost)})`,
              fontSize: 9, color: '#64748b', margin: [0, 5, 0, 0]
          } : null,
          { text: t.monthOverMonth, style: 'h2', margin: [0, 20, 0, 5] },
          {
            table: {
              widths: ['33%', '33%', '33%'],
              body: [
                [ { text: t.netSavingsHeader, style: 'tableHeader' }, { text: t.totalExpensesHeader, style: 'tableHeader' }, { text: t.assetsHeader, style: 'tableHeader' } ],
                [
                  { text: [`${t.current}: ${formatTL(net)}`, `\n${t.previous}: ${formatTL(effectivePrevNet)}`, `\n${t.change}: ${formatTL(net - effectivePrevNet)}`], margin: [0, 5, 0, 5] },
                  { text: [`${t.current}: ${formatTL(totalExpenses)}`, `\n${t.previous}: ${formatTL(effectivePrevExpenses)}`, `\n${t.change}: ${formatTL(totalExpenses - effectivePrevExpenses)}`], margin: [0, 5, 0, 5] },
                  { text: [`${t.current}: ${formatTL(totalAssetsCost)}`, `\n${t.previous}: ${formatTL(effectivePrevAssetPurchases)}`, `\n${t.change}: ${formatTL(totalAssetsCost - effectivePrevAssetPurchases)}`], margin: [0, 5, 0, 5] }
                ]
              ]
            },
            layout: 'lightHorizontalLines'
          },
          { text: t.cashFlow, style: 'h2', margin: [0, 20, 0, 5] },
          {
            table: {
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                [ { text: t.category, style: 'tableHeader' }, { text: t.amount, style: 'tableHeader', alignment: 'right' }, { text: t.percentIncome, style: 'tableHeader', alignment: 'right' }, { text: t.usd, style: 'tableHeader', alignment: 'right' } ],
                [ t.incomeLabel, { text: formatTL(totalIncome), alignment: 'right' }, { text: '100.0%', alignment: 'right', color: '#64748b' }, { text: formatUSD(totalIncome), alignment: 'right', color: '#64748b' } ],
                [ t.outflowLabel, { text: formatTL(totalExpenses + totalAssetsCost), alignment: 'right' }, { text: `${totalIncome > 0 ? (((totalExpenses + totalAssetsCost) / totalIncome) * 100).toFixed(1) : '0.0'}%`, alignment: 'right', color: '#64748b' }, { text: formatUSD(totalExpenses + totalAssetsCost), alignment: 'right', color: '#64748b' } ],
                [ t.netCashLabel, { text: formatTL(net), alignment: 'right', bold: true, color: net >= 0 ? '#059669' : '#DC2626' }, { text: `${totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0.0'}%`, alignment: 'right', bold: true }, { text: formatUSD(net), alignment: 'right', color: '#64748b' } ]
              ]
            },
            layout: 'lightHorizontalLines'
          },
          { text: t.visualAnalysis, style: 'h2', margin: [0, 20, 0, 10] },
          chartsImage ? { image: chartsImage, width: 520, alignment: 'center' } : { text: t.chartsNotAvailable, italics: true },
          data.aiAnalysis ? { text: t.aiFinancialInsight, style: 'h2', margin: [0, 20, 0, 5] } : null,
          data.aiAnalysis ? { text: data.aiAnalysis, style: 'text', margin: [0, 0, 0, 10] } : null,
          { text: t.assetsInvestments, style: 'h2', margin: [0, 20, 0, 10] },
          hasAssets ? {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: [
                [ { text: t.assetName, style: 'tableHeader' }, { text: t.quantity, style: 'tableHeader', alignment: 'right' }, { text: t.prevQty, style: 'tableHeader', alignment: 'right' }, { text: t.unitPrice, style: 'tableHeader', alignment: 'right' }, { text: t.totalValue, style: 'tableHeader', alignment: 'right' }, { text: t.usd, style: 'tableHeader', alignment: 'right' } ],
                ...(data.assets || []).map(a => {
                  const val = a.quantity * a.purchasePrice;
                  return [ a.name, { text: a.quantity.toString(), alignment: 'right' }, { text: a.previousQuantity !== undefined ? a.previousQuantity.toString() : '-', alignment: 'right', color: '#64748b' }, { text: formatTL(a.purchasePrice), alignment: 'right' }, { text: formatTL(val), alignment: 'right', bold: true }, { text: formatUSD(val), alignment: 'right', color: '#64748b' } ];
                })
              ]
            },
            layout: 'headerLineOnly'
          } : { text: t.noAssets, italics: true, color: 'gray' },
          { text: t.expenseBreakdown, style: 'h2', margin: [0, 20, 0, 10] },
          (data.expenses && data.expenses.length > 0) ? {
            table: {
              headerRows: 1,
              widths: ['*', '*', 'auto', 'auto', 'auto'],
              body: [
                [ { text: t.expenseName, style: 'tableHeader' }, { text: t.category, style: 'tableHeader' }, { text: t.amount, style: 'tableHeader', alignment: 'right' }, { text: t.percentIncome, style: 'tableHeader', alignment: 'right' }, { text: t.usd, style: 'tableHeader', alignment: 'right' } ],
                ...data.expenses.map(e => {
                   const pct = totalIncome > 0 ? ((e.amount / totalIncome) * 100).toFixed(1) : '0.0';
                   return [ e.name, getLocalizedCategory(e.category, language), { text: formatTL(e.amount), alignment: 'right' }, { text: `${pct}%`, alignment: 'right', color: '#64748b' }, { text: formatUSD(e.amount), alignment: 'right', color: '#64748b' } ];
                })
              ]
            },
            layout: 'lightHorizontalLines'
          } : { text: t.noExpenses, italics: true, color: 'gray' },
          { text: hiddenPayload, fontSize: 0.1, color: '#ffffff', opacity: 0 }
        ].filter(Boolean),
        styles: {
          header: { fontSize: 22, bold: true, color: '#334155', margin: [0, 0, 0, 5] },
          subheader: { fontSize: 14, color: '#64748b', margin: [0, 0, 0, 20] },
          smallItalic: { fontSize: 10, italics: true, color: '#94a3b8', margin: [0, 0, 0, 10] },
          h2: { fontSize: 14, bold: true, color: '#4f46e5', margin: [0, 10, 0, 10] },
          tableHeader: { bold: true, fontSize: 10, color: '#1e293b', fillColor: '#f1f5f9', margin: [0, 5, 0, 5] },
          text: { fontSize: 10, color: '#334155', lineHeight: 1.4 },
          tableExample: { margin: [0, 5, 0, 15] }
        },
        defaultStyle: { font: 'Roboto' }
      };

      pdfMake.createPdf(docDefinition).download(`Prosperity_Report_${year}_${month + 1}.pdf`);

    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Custom Tooltips
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const percent = totalIncome > 0 ? ((d.value / totalIncome) * 100).toFixed(1) : '0.0';
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
           <p className="font-bold mb-1">{d.name}</p>
           <p className="text-lg font-semibold">₺{d.value.toLocaleString(locale)}</p>
           <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
             {percent}% {t.ofTotalIncome}
           </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
     if (active && payload && payload.length) {
       const d = payload[0];
       const percent = totalIncome > 0 ? ((d.value / totalIncome) * 100).toFixed(1) : '0.0';
       return (
         <div className={`p-3 rounded-lg shadow-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
            <p className="font-bold mb-1">{label}</p>
            <p className="text-lg font-semibold" style={{ color: d.payload.fill }}>₺{d.value.toLocaleString(locale)}</p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {percent}% {t.ofIncome}
            </p>
         </div>
       );
     }
     return null;
  };

  const TrendIndicator = ({ current, previous, inverse = false }: { current: number, previous: number, inverse?: boolean }) => {
    if (!hasPrevData) return <span className="text-[10px] text-slate-400">{t.noHistory}</span>;
    const diff = current - previous;
    if (diff === 0) return <span className="text-[10px] text-slate-400 flex items-center"><Minus size={10} className="mr-1"/> {t.noChange}</span>;
    
    const isPositiveGood = !inverse; 
    const isGood = isPositiveGood ? diff > 0 : diff < 0;
    const Icon = diff > 0 ? ArrowUp : ArrowDown;
    const colorClass = isGood ? 'text-emerald-500' : 'text-rose-500';

    return (
        <span className={`flex items-center text-[10px] font-medium ${colorClass}`}>
            <Icon size={10} className="mr-1" />
            {Math.abs(diff).toLocaleString(locale)} {t.vsLastMo}
        </span>
    );
  };

  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.monthlyOverview}</h2>
            <p className="text-slate-500 dark:text-slate-400">
                {new Date(year, month).toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            >
                {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                <span>{t.exportPDF}</span>
            </button>
            <button
                onClick={handleGenerateAIReport}
                disabled={loadingAI}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
            >
                {loadingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                <span>{t.aiAnalysis}</span>
            </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Wallet size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase">{t.income}</span>
            </div>
            <div className="flex flex-col">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">₺{totalIncome.toLocaleString(locale)}</p>
                {hasRate && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{formatUSD(totalIncome)}</p>}
            </div>
            <div className="mt-2 flex justify-between items-center">
                <p className="text-xs text-slate-500">{t.totalInflow}</p>
                <TrendIndicator current={totalIncome} previous={prevTotalIncome} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                    <TrendingDown size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase">{t.expenses}</span>
            </div>
            <div className="flex flex-col">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">₺{totalExpenses.toLocaleString(locale)}</p>
                {hasRate && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{formatUSD(totalExpenses)}</p>}
            </div>
            <div className="mt-2 flex justify-between items-center">
                 <p className="text-xs text-slate-500">{data.expenses.length} {t.transactions}</p>
                 <TrendIndicator current={totalExpenses} previous={effectivePrevExpenses} inverse={true} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Coins size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase">{t.netSavings}</span>
            </div>
            <div className="flex flex-col">
                <p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ₺{net.toLocaleString(locale)}
                </p>
                {hasRate && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{formatUSD(net)}</p>}
            </div>
            <div className="mt-2 flex justify-between items-center">
                <p className="text-xs text-slate-500">{t.cashRemaining}</p>
                <TrendIndicator current={net} previous={effectivePrevNet} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Gem size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase">{t.assetsBought}</span>
            </div>
            <div className="flex flex-col">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">₺{totalAssetsCost.toLocaleString(locale)}</p>
                {hasRate && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{formatUSD(totalAssetsCost)}</p>}
            </div>
            <div className="mt-2 flex justify-between items-center">
                <p className="text-xs text-slate-500">{t.currentHoldings}</p>
                <TrendIndicator current={totalAssetsCost} previous={effectivePrevAssetPurchases} />
            </div>
        </div>
      </div>

      {showWealthCard && (
        <div className="w-full">
             <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white dark:from-slate-800 dark:to-slate-900 border-slate-700 shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                         <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{t.estimatedWealth}</h3>
                         <div className="flex items-baseline gap-4">
                            <span className="text-3xl font-bold tracking-tight">₺{projectedTotalWealth.toLocaleString(locale)}</span>
                            <span className={`flex items-center text-sm font-bold ${wealthGrowthPercent.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {wealthGrowthPercent.startsWith('-') ? <ArrowDown size={14} className="mr-1" /> : <ArrowUp size={14} className="mr-1" />}
                                {wealthGrowthPercent}%
                            </span>
                         </div>
                         {hasRate && (
                             <p className="text-lg text-slate-400 font-medium mt-1">
                                 {formatUSD(projectedTotalWealth)}
                             </p>
                         )}
                         <p className="text-xs text-slate-400 mt-2 opacity-80">
                            {t.calculation}: {t.prevAssets} (₺{manualPrevWealth?.toLocaleString(locale)}) + {t.cashRemaining} (₺{net.toLocaleString(locale)}) + {t.newAssets} (₺{totalAssetsCost.toLocaleString(locale)})
                         </p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                        <TrendingUp size={28} className="text-emerald-400" />
                    </div>
                </div>
             </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-container">
        <Card title={t.outflowBreakdown} className="min-h-[350px]">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
        <Card title={t.cashFlow} className="min-h-[350px]">
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <Tooltip cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9'}} content={<CustomBarTooltip />} />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                        {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                            dataKey="amount" 
                            position="top" 
                            content={(props: any) => {
                                const { x, y, width, value } = props;
                                const percent = totalIncome > 0 ? ((value / totalIncome) * 100).toFixed(0) : 0;
                                return (
                                    <text x={x + width / 2} y={y - 10} fill={isDarkMode ? '#94a3b8' : '#64748b'} textAnchor="middle" fontSize={12} fontWeight="bold">
                                        {percent}%
                                    </text>
                                );
                            }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Card>
      </div>

      {data.aiAnalysis && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-100 dark:border-indigo-900/30 relative">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Sparkles size={20} />
                    <h3 className="font-semibold">{t.aiFinancialInsight}</h3>
                </div>
                <button 
                    onClick={closeAIAnalysis} 
                    className="p-1 text-indigo-400 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800/50"
                    title={t.close}
                >
                    <X size={18} />
                </button>
            </div>
            <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {data.aiAnalysis}
            </div>
        </Card>
      )}

      {/* Income & Config */}
      <Card title={t.incomeConfig}>
        {showIncomeList ? (
             <div className="space-y-4">
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded font-medium">
                        {t.useDetailedIncome}
                     </span>
                     <button 
                        onClick={() => setShowIncomeList(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                     >
                        Switch to Simple Mode
                     </button>
                 </div>

                 {/* Calculated Totals Display */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 opacity-75">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.monthlySalary}</label>
                        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">₺{(data.incomes.monthly || 0).toLocaleString(locale)}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.otherIncome}</label>
                        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">₺{(data.incomes.other || 0).toLocaleString(locale)}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.passiveIncome}</label>
                        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">₺{(data.incomes.passive || 0).toLocaleString(locale)}</div>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.usdRate}</label>
                        <input
                            type="number"
                            value={data.exchangeRate || ''}
                            onChange={(e) => handleGeneralDataChange('exchangeRate', e.target.value)}
                            placeholder="e.g. 32.5"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                 </div>

                 {/* Income List Table */}
                 <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 mb-4">
                        <input
                            placeholder="Income Source"
                            value={newIncomeName}
                            onChange={(e) => setNewIncomeName(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="number"
                            placeholder={t.amount}
                            value={newIncomeAmount}
                            onChange={(e) => setNewIncomeAmount(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                            value={newIncomeCategory}
                            onChange={(e) => setNewIncomeCategory(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {incomeCategoryKeys.map((key) => (
                                <option key={key} value={t.categories[key]}>{t.categories[key]}</option>
                            ))}
                        </select>
                        <button
                            onClick={addIncomeTransaction}
                            className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <Plus size={18} />
                            <span>{t.addIncomeTx}</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3">{t.expenseName}</th>
                                    <th className="px-4 py-3">{t.category}</th>
                                    <th className="px-4 py-3">{t.amount}</th>
                                    <th className="px-4 py-3 text-right">{t.action}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(data.incomeList || []).map(inc => (
                                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-medium">{inc.name}</td>
                                        <td className="px-4 py-3">
                                            <div className="relative group">
                                                 <select
                                                    value={getLocalizedCategory(inc.category, language)}
                                                    onChange={(e) => updateIncomeCategory(inc.id, e.target.value)}
                                                    className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 outline-none appearance-none cursor-pointer pr-4 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors"
                                                 >
                                                    {incomeCategoryKeys.map((key) => (
                                                        <option key={key} value={t.categories[key]}>{t.categories[key]}</option>
                                                    ))}
                                                    {!Object.values(t.categories).includes(getLocalizedCategory(inc.category, language)) && (
                                                        <option value={inc.category}>{inc.category}</option>
                                                    )}
                                                 </select>
                                                 <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                                            +₺{inc.amount.toLocaleString(locale)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => deleteIncomeTransaction(inc.id)}
                                                className="text-slate-400 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
             </div>
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.monthlySalary}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                        <input
                            type="number"
                            value={data.incomes.monthly || ''}
                            onChange={(e) => handleIncomeChange('monthly', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.otherIncome}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                        <input
                            type="number"
                            value={data.incomes.other || ''}
                            onChange={(e) => handleIncomeChange('other', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.passiveIncome}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                        <input
                            type="number"
                            value={data.incomes.passive || ''}
                            onChange={(e) => handleIncomeChange('passive', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.usdRate}</label>
                    <input
                        type="number"
                        value={data.exchangeRate || ''}
                        onChange={(e) => handleGeneralDataChange('exchangeRate', e.target.value)}
                        placeholder="e.g. 32.5"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {!hasRate && <p className="text-[10px] text-orange-500 mt-1">{t.setRateHint}</p>}
                </div>

                <div className="absolute right-0 top-0 -mt-10 md:-mt-0 md:relative md:flex md:items-end">
                     <button
                        onClick={() => setShowIncomeList(true)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                     >
                         {t.addIncomeTx}
                     </button>
                </div>
            </div>
        )}
        
        {/* Manual Comparison Input Section */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <History size={16} />
                <span>{t.prevMonthManual}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.prevNetSavings}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                        <input
                            type="number"
                            value={data.manualPrevSavings !== undefined ? data.manualPrevSavings : ''}
                            placeholder={t.amountFromLast}
                            onChange={(e) => handleGeneralDataChange('manualPrevSavings', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.prevAssetValue}</label>
                     <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">₺</span>
                        <input
                            type="number"
                            value={data.manualPrevAssetTotal !== undefined ? data.manualPrevAssetTotal : ''}
                             placeholder={t.totalAssetLast}
                            onChange={(e) => handleGeneralDataChange('manualPrevAssetTotal', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
      </Card>

      {/* Assets & Investments Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t.assetsInvestments}</h3>
            <button 
                onClick={() => setShowAssetComparison(!showAssetComparison)}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${showAssetComparison ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
            >
               {showAssetComparison ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               <span>{t.comparePrev}</span>
            </button>
        </div>

        <div className="space-y-4">
            {/* Add Asset Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <input
                    placeholder={t.assetPlaceholder}
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                    type="number"
                    placeholder={t.quantity}
                    value={newAssetQuantity}
                    onChange={(e) => setNewAssetQuantity(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                    type="number"
                    placeholder={t.purchasePrice}
                    value={newAssetPrice}
                    onChange={(e) => setNewAssetPrice(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                    onClick={addAsset}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    <span>{t.addAsset}</span>
                </button>
            </div>

            {/* Asset List */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        <tr>
                            <th className="px-4 py-3">{t.assetName}</th>
                            <th className="px-4 py-3">{t.quantity}</th>
                            {showAssetComparison && <th className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{t.prevQty}</th>}
                            <th className="px-4 py-3">{t.unitPrice}</th>
                            <th className="px-4 py-3">{t.totalValue}</th>
                            <th className="px-4 py-3 text-right">{t.action}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(data.assets || []).map(asset => (
                            <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 font-medium flex items-center gap-2">
                                    <Gem size={16} className="text-indigo-500" />
                                    {asset.name}
                                </td>
                                <td className="px-4 py-3">{asset.quantity}</td>
                                {showAssetComparison && (
                                    <td className="px-4 py-3">
                                        <input 
                                            type="number" 
                                            className="w-20 px-2 py-1 text-xs border rounded dark:bg-slate-900 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Prev..."
                                            value={asset.previousQuantity !== undefined ? asset.previousQuantity : ''}
                                            onChange={(e) => updateAssetPreviousQuantity(asset.id, e.target.value)}
                                        />
                                    </td>
                                )}
                                <td className="px-4 py-3">₺{asset.purchasePrice.toLocaleString(locale)}</td>
                                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                    ₺{(asset.quantity * asset.purchasePrice).toLocaleString(locale)}
                                    {hasRate && <span className="text-xs text-slate-500 block font-normal">{formatUSD(asset.quantity * asset.purchasePrice)}</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => deleteAsset(asset.id)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {(data.assets || []).length === 0 && (
                            <tr>
                                <td colSpan={showAssetComparison ? 6 : 5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                    {t.noAssets}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </Card>

      {/* Expenses Section */}
      <Card className="relative">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {t.expenses}
                <button 
                    onClick={() => setShowExpenseFilters(!showExpenseFilters)}
                    className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showExpenseFilters ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400'}`}
                >
                    <Filter size={16} />
                </button>
            </h3>
            
            {/* Manual Comparison Input */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{t.manualPrevExp}</span>
                <div className="relative w-32">
                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">₺</span>
                    <input
                        type="number"
                        value={data.manualPrevExpenses !== undefined ? data.manualPrevExpenses : ''}
                        placeholder={prevTotalExpenses.toString()}
                        onChange={(e) => handleGeneralDataChange('manualPrevExpenses', e.target.value)}
                        className="w-full pl-5 pr-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                </div>
                 <div className="ml-2">
                    <TrendIndicator current={totalExpenses} previous={effectivePrevExpenses} inverse={true} />
                 </div>
            </div>
         </div>

         {/* Filter Bar */}
         {showExpenseFilters && (
             <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-in slide-in-from-top-2">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        value={expenseSearch}
                        onChange={(e) => setExpenseSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                     <select
                        value={expenseCategoryFilter}
                        onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                     >
                        <option value="all">{t.allCategories}</option>
                        {categoryKeys.map(k => (
                             <option key={k} value={t.categories[k]}>{t.categories[k]}</option>
                        ))}
                     </select>
                </div>
                <div className="flex gap-2 col-span-1 md:col-span-1 lg:col-span-2">
                     <input 
                        type="number" 
                        placeholder={t.min} 
                        value={expenseMin}
                        onChange={(e) => setExpenseMin(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                     <input 
                        type="number" 
                        placeholder={t.max} 
                        value={expenseMax}
                        onChange={(e) => setExpenseMax(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                </div>
             </div>
         )}

         <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <input
                    placeholder={t.expenseName}
                    value={newExpenseName}
                    onChange={(e) => setNewExpenseName(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                    type="number"
                    placeholder={t.amount}
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {categoryKeys.map((key) => (
                        <option key={key} value={t.categories[key]}>{t.categories[key]}</option>
                    ))}
                </select>
                <button
                    onClick={addExpense}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    <span>{t.addExpense}</span>
                </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-semibold sticky top-0 z-10 select-none">
                        <tr>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">{t.expense} <SortIcon colKey="name"/></div>
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('category')}
                            >
                                <div className="flex items-center gap-1">{t.category} <SortIcon colKey="category"/></div>
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('amount')}
                            >
                                <div className="flex items-center gap-1">{t.amount} <SortIcon colKey="amount"/></div>
                            </th>
                            <th className="px-4 py-3 text-right">{t.action}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedExpenses.map(expense => (
                            <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 font-medium">{expense.name}</td>
                                <td className="px-4 py-3">
                                    <div className="relative group">
                                         <select
                                            value={getLocalizedCategory(expense.category, language)} // Display localized value in select
                                            onChange={(e) => updateExpenseCategory(expense.id, e.target.value)}
                                            className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 outline-none appearance-none cursor-pointer pr-4 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                         >
                                            {categoryKeys.map(k => (
                                                <option key={k} value={t.categories[k]}>{t.categories[k]}</option>
                                            ))}
                                            {!Object.values(t.categories).includes(expense.category) && !Object.values(t.categories).includes(getLocalizedCategory(expense.category, language)) && (
                                                <option value={expense.category}>{expense.category}</option>
                                            )}
                                         </select>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                                    -₺{expense.amount.toLocaleString(locale)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => deleteExpense(expense.id)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sortedExpenses.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                    {data.expenses.length > 0 ? "No expenses match your filter." : t.noExpenses}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
      </Card>
    </div>
  );
};
