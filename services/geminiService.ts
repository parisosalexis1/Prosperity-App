
import { GoogleGenAI } from "@google/genai";
import { MonthData, Language } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateFinancialReport = async (data: MonthData, language: Language = 'en'): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "API Key not configured.";

  const totalIncome = data.incomes.monthly + data.incomes.other + data.incomes.passive;
  const totalExpenses = data.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDebtPayment = data.expenses
    .filter(e => e.category.toLowerCase() === 'debt')
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalAssetCost = (data.assets || []).reduce((acc, curr) => acc + (curr.quantity * curr.purchasePrice), 0);
    
  // Net Profit (Cash Remaining) = Income - Expenses - Asset Purchases
  const net = totalIncome - totalExpenses - totalAssetCost;
  
  // Savings Rate = (Cash Remaining + Assets) / Income
  const savingsRate = totalIncome > 0 ? (((net + totalAssetCost) / totalIncome) * 100).toFixed(1) : 0;

  const expenseBreakdown = data.expenses.map(e => `- ${e.name} (${e.category}): ₺${e.amount}`).join('\n');
  
  const assetsList = (data.assets || []).map(a => `- ${a.name}: ${a.quantity} units @ ₺${a.purchasePrice} (Total: ₺${a.quantity * a.purchasePrice})`).join('\n');

  const langInstruction = language === 'tr' ? "IMPORTANT: Provide the entire response in Turkish." : "Provide the response in English.";

  const prompt = `
    Act as a financial advisor. Analyze the following monthly financial data for a user in Turkey (Currency: TL).
    ${langInstruction}
    
    Context: ${new Date(data.year, data.month).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })}
    
    Market Data:
    - USD/TL Rate recorded: ${data.exchangeRate || 'Not specified'}
    
    Financial Position:
    - Debt Payments this month: ₺${totalDebtPayment}
    
    Income Breakdown:
    - Monthly Salary: ₺${data.incomes.monthly}
    - Other Income: ₺${data.incomes.other}
    - Passive Income: ₺${data.incomes.passive}
    
    Total Income: ₺${totalIncome}
    Total Regular Expenses: ₺${totalExpenses}
    Total Asset Purchases: ₺${totalAssetCost}
    Net Cash Remaining (After Expenses & Assets): ₺${net}
    Savings Rate (Cash Remaining + Assets): ${savingsRate}%
    
    Assets Purchased this Month:
    ${assetsList || 'None recorded'}
    
    Expense List:
    ${expenseBreakdown}
    
    Please provide a concise but insightful analysis. 
    1. Comment on the savings rate and debt burden.
    2. If assets were purchased, comment on the diversification (Gold, Stock, etc.) and the impact on liquidity.
    3. Identify the largest expense categories.
    4. Give 2-3 actionable tips to improve profitability for next month.
    Keep the tone professional and encouraging.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI analysis at this time.";
  }
};

export const analyzeInvestmentScenario = async (
  principal: number,
  contribution: number,
  rate: number,
  years: number,
  finalAmount: number,
  language: Language = 'en'
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "API Key not configured.";

  const langInstruction = language === 'tr' ? "IMPORTANT: Provide the entire response in Turkish." : "Provide the response in English.";

  const prompt = `
    I am planning an investment (Currency: TL).
    Principal: ₺${principal}
    Monthly Contribution: ₺${contribution}
    Annual Return Rate: ${rate}%
    Time Horizon: ${years} years.
    
    The calculated final amount is ₺${finalAmount.toFixed(2)}.
    
    ${langInstruction}

    Briefly explain the power of compound interest in this scenario. 
    Considering this is in TL, mention if this return rate beats typical inflation or requires high-risk assets.
    What would be the impact of increasing the contribution by 10%?
    Limit response to one paragraph.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate investment analysis.";
  }
};
