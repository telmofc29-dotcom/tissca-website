'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
}

interface CategorySummary {
  category: string;
  count: number;
  total: number;
}

export default function StatementsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getUser();
  }, []);

  // Load transactions for selected month
  useEffect(() => {
    if (!user) return;
    
    const loadTransactions = async () => {
      setLoading(true);
      try {
        // Build date range
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        const response = await fetch(
          `/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );

        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error('Failed to load transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [selectedMonth, selectedYear, user]);

  // Calculate summaries
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const profit = totalIncome - totalExpenses;

  // Group by category
  const categoryMap = new Map<string, CategorySummary>();
  transactions.forEach(t => {
    const existing = categoryMap.get(t.category) || { category: t.category, count: 0, total: 0 };
    existing.count += 1;
    existing.total += t.amount;
    categoryMap.set(t.category, existing);
  });
  const categoryBreakdown = Array.from(categoryMap.values());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const monthYearDisplay = `${months[selectedMonth]} ${selectedYear}`;

  // Download functions
  const downloadBankPDF = async () => {
    try {
      const response = await fetch(
        `/api/statements/pdf/bank?month=${selectedMonth}&year=${selectedYear}`,
        { method: 'GET' }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}_Bank.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error('Failed to download bank PDF:', error);
      alert('Failed to download statement');
    }
  };

  const downloadHMRCPDF = async () => {
    try {
      const response = await fetch(
        `/api/statements/pdf/hmrc?month=${selectedMonth}&year=${selectedYear}`,
        { method: 'GET' }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}_HMRC.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error('Failed to download HMRC PDF:', error);
      alert('Failed to download statement');
    }
  };

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Monthly Statements
          </h1>
          <p className="text-gray-600">
            View your income and expenses with detailed breakdowns and export options.
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 flex-1 md:flex-initial">
              <button
                onClick={downloadBankPDF}
                disabled={loading || transactions.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                📥 Bank PDF
              </button>
              <button
                onClick={downloadHMRCPDF}
                disabled={loading || transactions.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                📊 HMRC PDF
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Income */}
          <div className="bg-white rounded-lg border border-green-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Income</p>
                <p className="text-2xl md:text-3xl font-bold text-green-700">
                  £{totalIncome.toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {incomeTransactions.length} transaction{incomeTransactions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Expenses</p>
                <p className="text-2xl md:text-3xl font-bold text-red-700">
                  £{totalExpenses.toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {expenseTransactions.length} transaction{expenseTransactions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-4xl">📉</div>
            </div>
          </div>

          {/* Profit */}
          <div className={`bg-white rounded-lg border p-6 ${profit >= 0 ? 'border-blue-200' : 'border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Profit</p>
                <p className={`text-2xl md:text-3xl font-bold ${profit >= 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
                  £{profit.toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {profit >= 0 ? 'Positive' : 'Negative'} margin
                </p>
              </div>
              <div className="text-4xl">{profit >= 0 ? '✅' : '⚠️'}</div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-slate-900">Category Breakdown</h2>
          </div>
          {categoryBreakdown.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Count</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((item) => (
                  <tr key={item.category} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-slate-900 font-medium capitalize">{item.category}</td>
                    <td className="px-6 py-4 text-gray-700">{item.count}</td>
                    <td className="px-6 py-4 text-right text-slate-900 font-medium">
                      £{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-8 text-center text-gray-600">
              No transactions recorded for {monthYearDisplay}
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-slate-900">All Transactions ({transactions.length})</h2>
          </div>
          {transactions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-slate-900 whitespace-nowrap">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{transaction.description}</td>
                    <td className="px-6 py-4 text-gray-700 capitalize">{transaction.category}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? '📈 Income' : '📉 Expense'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}£{transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-8 text-center text-gray-600">
              {loading ? 'Loading transactions...' : `No transactions for ${monthYearDisplay}`}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-slate-900 mb-2">Bank Style PDF</h3>
            <p className="text-gray-700 text-sm">
              Download a detailed statement listing all transactions chronologically with running totals. Ideal for your records and accounting.
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-bold text-slate-900 mb-2">HMRC Summary PDF</h3>
            <p className="text-gray-700 text-sm">
              Download a tax-friendly summary with category totals. Perfect for submitting with your tax return.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
