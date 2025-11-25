
import { Language } from '../types';

export const translations = {
  en: {
    // Sidebar
    monthlyReport: "Monthly Report",
    investmentCalc: "Investment Calc",
    importData: "Import Data",
    excelAnalysis: "Excel Analysis",
    dateSelection: "Date Selection",
    year: "Year",
    month: "Month",
    menu: "Menu",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    language: "Language",
    resetData: "Reset All Data",
    resetConfirm: "Are you sure? This will permanently delete all your financial data and start from scratch.",
    confirmReset: "Click again to confirm",
    
    // General
    loading: "Loading...",
    exportPDF: "Export PDF",
    aiAnalysis: "AI Analysis",
    close: "Close",
    
    // Monthly Report - Header
    monthlyOverview: "Monthly Overview",
    
    // Cards
    income: "Income",
    totalInflow: "Total Inflow",
    expenses: "Expenses",
    transactions: "transactions",
    netSavings: "Net",
    cashRemaining: "Cash Remaining",
    assetsBought: "Assets Bought",
    currentHoldings: "Current Holdings",
    
    // Wealth Card
    estimatedWealth: "Estimated Total Wealth",
    calculation: "Calculation",
    prevAssets: "Previous Assets",
    netCash: "Net Cash",
    newAssets: "New Assets",
    
    // Charts
    outflowBreakdown: "Outflow Breakdown",
    cashFlow: "Cash Flow",
    incomeLabel: "Income",
    outflowLabel: "Outflow",
    netCashLabel: "Net Cash",
    ofTotalIncome: "of Total Income",
    ofIncome: "of Income",

    // AI
    aiFinancialInsight: "AI Financial Insight",
    
    // Config
    incomeConfig: "Income & Configuration",
    monthlySalary: "Monthly Salary",
    otherIncome: "Other Income",
    passiveIncome: "Passive Income",
    incomeTransactions: "Income Transactions",
    addIncomeTx: "Add Income",
    useDetailedIncome: "Using Detailed Income List",
    usdRate: "USD/TL Rate",
    setRateHint: "Set rate to see USD values",
    prevMonthManual: "Previous Month Manual Data (Optional)",
    prevNetSavings: "Previous Month Net",
    prevAssetValue: "Previous Month Asset Value",
    amountFromLast: "Amount from last month",
    totalAssetLast: "Total asset value last month",
    
    // Assets Section
    assetsInvestments: "Assets & Investments",
    comparePrev: "Compare Previous",
    assetName: "Asset Name",
    assetPlaceholder: "Asset Name (e.g. Gold, Apple Stock)",
    quantity: "Quantity",
    purchasePrice: "Purchase Price (Unit)",
    addAsset: "Add Asset",
    prevQty: "Prev Qty",
    unitPrice: "Unit Price",
    totalValue: "Total Value",
    action: "Action",
    noAssets: "No assets recorded for this month.",
    
    // Expenses Section
    manualPrevExp: "Prev. Month (Manual):",
    expenseName: "Expense Name",
    amount: "Amount",
    category: "Category",
    addExpense: "Add Expense",
    expense: "Expense",
    noExpenses: "No expenses recorded yet.",
    filterSort: "Filter & Sort",
    min: "Min",
    max: "Max",
    allCategories: "All Categories",
    searchPlaceholder: "Search...",

    // Categories
    categories: {
        rent: "Rent",
        bills: "Bills",
        subscriptions: "Subscriptions",
        ccDebt: "Credit Card Debt",
        loan: "Loan",
        health: "Health",
        entertainment: "Entertainment",
        groceries: "Groceries & Food",
        fuel: "Fuel",
        general: "General",
        transportation: "Transportation",
        shopping: "Shopping",
        dining: "Dining & Social",
        moneyTransfer: "Money Transfer",
        atm: "ATM Withdrawal",
        investment: "Investment",
        gambling: "Gambling / Games of Chance",
        // Income Categories for List
        salary: "Salary",
        passive: "Passive Income",
        other: "Other Income"
    },

    // Trend
    noHistory: "No history",
    noChange: "No Change",
    vsLastMo: "vs last mo",
    
    // PDF Specific
    reportTitle: "Prosperity Financial Report",
    executiveSummary: "Executive Summary",
    totalIncome: "Total Income",
    outflowExpAssets: "Outflow (Exp + Assets)",
    savingsRate: "Savings Rate",
    wealthProjection: "Wealth Projection",
    totalProjectedWealth: "Total Projected Wealth",
    previousWealth: "Previous Wealth",
    monthlyGrowth: "Monthly Growth",
    monthOverMonth: "Month-over-Month Comparison",
    netSavingsHeader: "Net",
    totalExpensesHeader: "Total Expenses",
    assetsHeader: "Assets",
    current: "Current",
    previous: "Previous",
    change: "Change",
    visualAnalysis: "Visual Analysis",
    chartsNotAvailable: "Charts not available",
    expenseBreakdown: "Expense Breakdown",
    percentIncome: "% of Income",
    usd: "USD",
    
    // Calculator
    calcTitle: "Compound Interest Calculator",
    configuration: "Configuration",
    initialInv: "Initial Investment",
    monthlyContrib: "Monthly Contribution",
    annualRate: "Annual Interest Rate (%)",
    timePeriod: "Time Period (Years)",
    analyzeScenario: "Analyze Scenario",
    analyzing: "Analyzing...",
    totalInvested: "Total Invested",
    interestEarned: "Interest Earned",
    totalBalance: "Total Balance",
    principal: "Principal",
    aiInsight: "AI Insight",

    // Data Import
    importTitle: "Import from PDF",
    importDesc: "Upload a previously exported Monthly Report PDF to set it as the previous month's baseline.",
    dragDrop: "Drag & drop PDF report here",
    extracting: "Reading...",
    extractedData: "Report Summary",
    selectTargetMonth: "Select Target Month to Apply",
    applyToMonth: "Apply Data to Selected Month",
    successImport: "Data successfully applied to",
    failedImport: "Could not find valid data in this PDF.",
    netSavingsLast: "Net Cash",
    expensesLast: "Expenses",
    assetsLast: "Assets Bought",
    totalWealthLast: "Total Wealth",
    pdfSourceDate: "Report Date",
    unknown: "Unknown",
    
    // Comparison
    comparisonTool: "PDF Comparison Tool",
    comparisonDesc: "Analyze two different reports side-by-side to see performance changes.",
    reportA: "Report A (Baseline)",
    reportB: "Report B (Comparison)",
    uploadReport: "Upload Report",
    clear: "Clear",
    metric: "Metric",
    difference: "Difference",
    estIncome: "Est. Income",
    better: "Better",
    worse: "Worse",
    analysis: "Analysis",

    // Excel Analysis
    excelTitle: "Excel Expense Analysis",
    excelDesc: "Upload your bank statement or expense sheet to visualize expenditure breakdown.",
    uploadStep: "1. Upload File",
    mappingStep: "2. Map Columns",
    analysisStep: "3. Expense Dashboard",
    selectCategoryCol: "Select Category / Description Column",
    selectAmountCol: "Select Amount Column",
    containsNegatives: "Expenses are negative values (e.g. -100)",
    analyzeBtn: "Analyze Expenses",
    totalExpenses: "Total Expenses",
    txCount: "Transactions",
    categoryBreakdown: "Expenditure Percentage Breakdown",
    percentage: "Percentage",
    uncategorized: "Uncategorized",
    reviewUncategorized: "Review Uncategorized Items",
    assignCategory: "Assign Category",
    applyChanges: "Apply Changes",
    uncategorizedCount: "Items needing review",
    allCategorized: "All items categorized!",
    autoCategorizedCount: "Auto-categorized",
    aiCategorize: "AI Smart Categorize",
    aiAutoCategorizing: "AI Categorizing...",
    importToReport: "Import to Monthly Report",
    importToReportDesc: "Add filtered entries to your financial record",
    selectTargetMonthImport: "Select Target Month for Import",
    summaryOfFiltered: "Summary of Filtered Data:",
    confirmImport: "Confirm Import",
    cancel: "Cancel",
    startDate: "Start Date",
    endDate: "End Date",
    importedSuccess: "Successfully imported transactions to",
    noTxToImport: "No transactions available to import.",
  },
  tr: {
    // Sidebar
    monthlyReport: "Aylık Rapor",
    investmentCalc: "Yatırım Hesaplama",
    importData: "Veri İçe Aktar",
    excelAnalysis: "Excel Analizi",
    dateSelection: "Tarih Seçimi",
    year: "Yıl",
    month: "Ay",
    menu: "Menü",
    lightMode: "Aydınlık Mod",
    darkMode: "Karanlık Mod",
    language: "Dil",
    resetData: "Tüm Verileri Sıfırla",
    resetConfirm: "Emin misiniz? Bu işlem tüm finansal verilerinizi kalıcı olarak silecek ve sıfırdan başlayacaksınız.",
    confirmReset: "Onaylamak için tekrar tıkla",
    
    // General
    loading: "Yükleniyor...",
    exportPDF: "PDF İndir",
    aiAnalysis: "Yapay Zeka",
    close: "Kapat",
    
    // Monthly Report - Header
    monthlyOverview: "Aylık Genel Bakış",
    
    // Cards
    income: "Gelir",
    totalInflow: "Toplam Giriş",
    expenses: "Giderler",
    transactions: "işlem",
    netSavings: "Net",
    cashRemaining: "Kalan Nakit",
    assetsBought: "Varlık Alımı",
    currentHoldings: "Mevcut Varlıklar",
    
    // Wealth Card
    estimatedWealth: "Tahmini Toplam Varlık",
    calculation: "Hesaplama",
    prevAssets: "Önceki Varlıklar",
    netCash: "Net Nakit",
    newAssets: "Yeni Varlıklar",
    
    // Charts
    outflowBreakdown: "Gider Dağılımı",
    cashFlow: "Nakit Akışı",
    incomeLabel: "Gelir",
    outflowLabel: "Gider",
    netCashLabel: "Net Nakit",
    ofTotalIncome: "Toplam Gelirin",
    ofIncome: "Gelirin",

    // AI
    aiFinancialInsight: "YZ Finansal İçgörü",
    
    // Config
    incomeConfig: "Gelir ve Ayarlar",
    monthlySalary: "Aylık Maaş",
    otherIncome: "Diğer Gelir",
    passiveIncome: "Pasif Gelir",
    incomeTransactions: "Gelir İşlemleri",
    addIncomeTx: "Gelir Ekle",
    useDetailedIncome: "Detaylı Gelir Listesi Kullanılıyor",
    usdRate: "USD/TL Kuru",
    setRateHint: "USD değerlerini görmek için kur girin",
    prevMonthManual: "Önceki Ay Manuel Veri (Opsiyonel)",
    prevNetSavings: "Önceki Ay Net",
    prevAssetValue: "Önceki Ay Varlık Değeri",
    amountFromLast: "Geçen aydan miktar",
    totalAssetLast: "Geçen ayki toplam varlık",
    
    // Assets Section
    assetsInvestments: "Varlıklar ve Yatırımlar",
    comparePrev: "Öncekiyle Karşılaştır",
    assetName: "Varlık Adı",
    assetPlaceholder: "Varlık Adı (örn. Altın, Hisse)",
    quantity: "Adet",
    purchasePrice: "Alış Fiyatı (Birim)",
    addAsset: "Varlık Ekle",
    prevQty: "Önc. Adet",
    unitPrice: "Birim Fiyat",
    totalValue: "Toplam Değer",
    action: "İşlem",
    noAssets: "Bu ay için varlık kaydı yok.",
    
    // Expenses Section
    manualPrevExp: "Önc. Ay (Manuel):",
    expenseName: "Gider Adı",
    amount: "Tutar",
    category: "Kategori",
    addExpense: "Gider Ekle",
    expense: "Gider",
    noExpenses: "Henüz gider kaydedilmedi.",
    filterSort: "Filtrele & Sırala",
    min: "Min",
    max: "Maks",
    allCategories: "Tüm Kategoriler",
    searchPlaceholder: "Ara...",

    // Categories
    categories: {
        rent: "Kira",
        bills: "Faturalar",
        subscriptions: "Abonelikler",
        ccDebt: "Kredi Kartı Borcu",
        loan: "Kredi",
        health: "Sağlık",
        entertainment: "Eğlence",
        groceries: "Market & Gıda",
        fuel: "Yakıt",
        general: "Genel",
        transportation: "Ulaşım",
        shopping: "Alışveriş",
        dining: "Yeme & İçme",
        moneyTransfer: "Para Transferi",
        atm: "ATM Para Çekme",
        investment: "Yatırım",
        gambling: "Şans Oyunları / Kripto",
        // Income Categories for List
        salary: "Maaş",
        passive: "Pasif Gelir",
        other: "Diğer Gelir"
    },
    
    // Trend
    noHistory: "Geçmiş yok",
    noChange: "Değişim Yok",
    vsLastMo: "geçen aya göre",
    
    // PDF Specific
    reportTitle: "Prosperity Finansal Raporu",
    executiveSummary: "Yönetici Özeti",
    totalIncome: "Toplam Gelir",
    outflowExpAssets: "Çıkan (Gider + Varlık)",
    savingsRate: "Tasarruf Oranı",
    wealthProjection: "Varlık Projeksiyonu",
    totalProjectedWealth: "Toplam Tahmini Varlık",
    previousWealth: "Önceki Varlık",
    monthlyGrowth: "Aylık Büyüme",
    monthOverMonth: "Aydan Aya Karşılaştırma",
    netSavingsHeader: "Net",
    totalExpensesHeader: "Toplam Gider",
    assetsHeader: "Varlıklar",
    current: "Mevcut",
    previous: "Önceki",
    change: "Değişim",
    visualAnalysis: "Görsel Analiz",
    chartsNotAvailable: "Grafikler mevcut değil",
    expenseBreakdown: "Gider Detayı",
    percentIncome: "Gelir %",
    usd: "USD",
    
    // Calculator
    calcTitle: "Bileşik Faiz Hesaplayıcı",
    configuration: "Ayarlar",
    initialInv: "Başlangıç Yatırımı",
    monthlyContrib: "Aylık Katkı",
    annualRate: "Yıllık Faiz Oranı (%)",
    timePeriod: "Süre (Yıl)",
    analyzeScenario: "Senaryoyu Analiz Et",
    analyzing: "Analiz Ediliyor...",
    totalInvested: "Toplam Yatırılan",
    interestEarned: "Kazanılan Faiz",
    totalBalance: "Toplam Bakiye",
    principal: "Anapara",
    aiInsight: "YZ İçgörüsü",

    // Data Import
    importTitle: "PDF'den İçe Aktar",
    importDesc: "Aylık Rapor PDF'sini yükleyerek bir sonraki ay için 'Önceki Ay' referansı olarak ayarlayın.",
    dragDrop: "PDF raporunu buraya sürükleyin",
    extracting: "Okunuyor...",
    extractedData: "Rapor Özeti",
    selectTargetMonth: "Uygulanacak Ayı Seçin",
    applyToMonth: "Veriyi Seçilen Aya Uygula",
    successImport: "Veri başarıyla uygulandı:",
    failedImport: "Bu PDF'de geçerli veri bulunamadı.",
    netSavingsLast: "Net Nakit",
    expensesLast: "Giderler",
    assetsLast: "Varlık Alımı",
    totalWealthLast: "Toplam Varlık",
    pdfSourceDate: "Rapor Tarihi",
    unknown: "Bilinmiyor",
    
    // Comparison
    comparisonTool: "PDF Karşılaştırma Aracı",
    comparisonDesc: "Performans değişikliklerini görmek için iki farklı raporu yan yana analiz edin.",
    reportA: "Rapor A (Baz)",
    reportB: "Rapor B (Karşılaştırılan)",
    uploadReport: "Rapor Yükle",
    clear: "Temizle",
    metric: "Metrik",
    difference: "Fark",
    estIncome: "Tahmini Gelir",
    better: "Daha İyi",
    worse: "Daha Kötü",
    analysis: "Analiz",

    // Excel Analysis
    excelTitle: "Excel Gider Analizi",
    excelDesc: "Harcama dağılımını görselleştirmek için banka dökümünüzü veya gider tablonuzu yükleyin.",
    uploadStep: "1. Dosya Yükle",
    mappingStep: "2. Sütunları Eşleştir",
    analysisStep: "3. Gider Paneli",
    selectCategoryCol: "Kategori / Açıklama Sütununu Seç",
    selectAmountCol: "Tutar Sütununu Seç",
    containsNegatives: "Giderler negatif değerde (örn. -100)",
    analyzeBtn: "Giderleri Analiz Et",
    totalExpenses: "Toplam Gider",
    txCount: "İşlem Adedi",
    categoryBreakdown: "Harcama Yüzde Dağılımı",
    percentage: "Yüzde",
    uncategorized: "Kategorisiz",
    reviewUncategorized: "Kategorisizleri İncele",
    assignCategory: "Kategori Ata",
    applyChanges: "Değişiklikleri Uygula",
    uncategorizedCount: "İncelenecek öğeler",
    allCategorized: "Tüm öğeler kategorize edildi!",
    autoCategorizedCount: "Otomatik Kategorize",
    aiCategorize: "YZ Akıllı Kategorizasyon",
    aiAutoCategorizing: "YZ Kategorize Ediyor...",
    importToReport: "Aylık Rapora Aktar",
    importToReportDesc: "Filtrelenen kayıtları finansal kaydınıza ekleyin",
    selectTargetMonthImport: "Aktarım İçin Hedef Ay Seçin",
    summaryOfFiltered: "Filtrelenen Veri Özeti:",
    confirmImport: "Aktarımı Onayla",
    cancel: "İptal",
    startDate: "Başlangıç",
    endDate: "Bitiş",
    importedSuccess: "İşlemler başarıyla aktarıldı:",
    noTxToImport: "Aktarılacak işlem bulunamadı.",
  }
};

export const getLocalizedCategory = (keyOrValue: string, lang: Language): string => {
    const t = translations;
    const target = t[lang].categories;
    const enCats = t.en.categories;
    const trCats = t.tr.categories;

    // 1. Check if it's a direct key match in current lang
    if (target[keyOrValue as keyof typeof target]) return target[keyOrValue as keyof typeof target];

    // 2. Check if it matches a value in EN (e.g. stored "Rent", lang is TR)
    const enKey = Object.keys(enCats).find(k => enCats[k as keyof typeof enCats] === keyOrValue);
    if (enKey) return target[enKey as keyof typeof target];

    // 3. Check if it matches a value in TR (e.g. stored "Kira", lang is EN)
    const trKey = Object.keys(trCats).find(k => trCats[k as keyof typeof trCats] === keyOrValue);
    if (trKey) return target[trKey as keyof typeof target];
    
    // 4. Fallback: Check hardcoded Income labels if they differ from category keys
    // "Monthly Salary" -> stored as "Salary" usually via import logic? 
    // If stored as "Monthly Salary"
    if (keyOrValue === "Monthly Salary" || keyOrValue === "Aylık Maaş") return target.salary;
    if (keyOrValue === "Passive Income" || keyOrValue === "Pasif Gelir") return target.passive;
    if (keyOrValue === "Other Income" || keyOrValue === "Diğer Gelir") return target.other;

    // 5. Return original if no match found (Custom category)
    return keyOrValue;
}
