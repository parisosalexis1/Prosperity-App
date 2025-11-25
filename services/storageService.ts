import { FinancialStore, MonthData, Expense } from '../types';

const STORAGE_KEY = 'prosperity_finance_data_v1';
let isResetting = false;

// 1. HARD RESET LOGIC
export const initiateReset = () => {
    console.log("Initiating Reset Sequence...");
    try {
        // Set a flag that survives reload
        sessionStorage.setItem('PROSPERITY_RESET_PENDING', 'true');
        
        // Use explicit navigation to the root path instead of reload()
        // This avoids "moved/deleted" errors in some environments and strips query params
        setTimeout(() => {
            window.location.href = window.location.pathname;
        }, 50);
    } catch (e) {
        console.error("Reset init failed", e);
        // Fallback
        window.location.reload();
    }
};

export const checkForPendingReset = () => {
    // Check if we are booting up after a reset request
    if (typeof window !== 'undefined' && sessionStorage.getItem('PROSPERITY_RESET_PENDING') === 'true') {
        console.log("EXECUTING HARD RESET ON BOOT");
        try {
            // WIPE EVERYTHING
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('theme');
            localStorage.removeItem('language');
            localStorage.clear();
            sessionStorage.clear(); // This removes the pending flag too
        } catch (e) {
            console.error("Reset failed", e);
        }
    }
};

// Used to verify lock state externally if needed
export const isStorageLocked = () => isResetting;

export const getStoredData = (): FinancialStore => {
  if (isResetting) return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Failed to load data", e);
    return {};
  }
};

export const saveStoredData = (data: FinancialStore) => {
  if (isResetting) {
    // Silently fail or warn to prevent re-writing data during reset
    return; 
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};

export const getMonthData = (year: number, month: number): MonthData => {
  const store = getStoredData();
  
  const defaultData: MonthData = {
    id: `${year}-${month}`,
    year,
    month,
    incomes: { monthly: 0, other: 0, passive: 0 },
    incomeList: [],
    totalDebt: 0,
    exchangeRate: 0,
    expenses: [],
    assets: [],
  };

  if (store[year] && store[year][month]) {
    return {
        ...defaultData,
        ...store[year][month]
    };
  }
  
  return defaultData;
};

export const updateMonthData = (data: MonthData) => {
  if (isResetting) return;
  const store = getStoredData();
  if (!store[data.year]) {
    store[data.year] = {};
  }
  store[data.year][data.month] = data;
  saveStoredData(store);
};

export const performFullReset = () => {
  // Legacy/Direct call support
  isResetting = true;
  localStorage.clear();
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};