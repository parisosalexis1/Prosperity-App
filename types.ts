

export enum IncomeType {
  MONTHLY = 'Monthly Salary',
  OTHER = 'Other Income',
  PASSIVE = 'Passive Income',
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
}

export interface Asset {
  id: string;
  name: string; // e.g. Gold, Apple Stock
  quantity: number;
  purchasePrice: number; // Price per unit when bought
  previousQuantity?: number; // Manual entry for previous month comparison
}

export interface MonthData {
  id: string; // Format: YYYY-MM
  year: number;
  month: number; // 0-11
  incomes: {
    monthly: number;
    other: number;
    passive: number;
  };
  incomeList?: Expense[]; // List of individual income transactions
  totalDebt: number; // Kept for legacy or specific override, but UI now calculates from expenses
  exchangeRate: number; // New field for USD/TL rate
  manualPrevSavings?: number; // Manual override for previous month comparison (Net Flow or Total Cash Position)
  manualPrevAssetTotal?: number; // Manual override for previous month WEALTH comparison (Stock)
  manualPrevAssetPurchases?: number; // Manual override for previous month ASSET PURCHASE comparison (Flow)
  manualPrevExpenses?: number; // Manual override for previous month comparison
  expenses: Expense[];
  assets: Asset[]; // New field for tracking purchases like Gold, Stocks
  aiAnalysis?: string;
}

export interface FinancialStore {
  [year: number]: {
    [month: number]: MonthData;
  };
}

export type ViewState = 'dashboard' | 'monthly' | 'calculator' | 'import' | 'excel';

export interface InvestmentScenario {
  principal: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
}

export type Language = 'en' | 'tr';