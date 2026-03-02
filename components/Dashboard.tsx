import React, { useState, useMemo, useEffect } from 'react';
import { Product, Store, Sale, Expense, User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, TrendingUp, Package, AlertTriangle, ShoppingCart, 
  Zap, Wallet, LayoutDashboard, Check, Calendar, CreditCard, 
  QrCode, X, CheckCircle2, Clock, Activity 
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  currentStore: Store;
  sales: Sale[];
  expenses: Expense[];
  currentUser: User;
  activities?: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, currentStore, sales, expenses, currentUser, activities = [] }) => {

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bKashNumber = "01633334466"; 

  const getCheckableMonths = () => {
    const months = [];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startMonthStr = currentStore.billingStartMonth || currentMonthStr; 
    let [startYear, startMonth] = startMonthStr.split('-').map(Number);
    const [endYear, endMonth] = currentMonthStr.split('-').map(Number);
    let count = 0;
    while ((startYear < endYear || (startYear === endYear && startMonth <= endMonth)) && count < 60) {
      months.push(`${startYear}-${String(startMonth).padStart(2, '0')}`);
      startMonth++;
      if (startMonth > 12) { startMonth = 1; startYear++; }
      count++;
    }
    return months.length > 0 ? months : [currentMonthStr];
  };

  const relevantMonths = getCheckableMonths();

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      setIsLoadingStatus(true);
      const { data } = await supabase.from('store_payments').select('*').eq('storeId', currentStore.id).in('monthYear', relevantMonths);
      setPaymentHistory(data || []);
      setIsLoadingStatus(false);
    };
    fetchPaymentStatus();
  }, [currentStore.id]);

  const targetMonthData = useMemo(() => {
    for (const month of relevantMonths) {
      const records = paymentHistory.filter(p => p.monthYear === month);
      const [y, m] = month.split('-').map(Number);
      const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      const hasPaid = records.some(p => p.status === 'PAID');
      if (hasPaid) continue;
      const pendingRecord = records.find(p => p.status === 'PENDING');
      if (pendingRecord) return { monthYear: month, status: 'PENDING', record: pendingRecord, monthName };
      return { monthYear: month, status: 'DUE', record: null, monthName };
    }
    const lastMonth = relevantMonths[relevantMonths.length - 1];
    const [y, m] = lastMonth.split('-').map(Number);
    return { monthYear: lastMonth, status: 'PAID', record: null, monthName: new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }) };
  }, [paymentHistory, relevantMonths]);

  const submitPaymentTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = { storeId: currentStore.id, monthYear: targetMonthData.monthYear, amountPaid: currentStore.monthlyFee || 0, paymentDate: new Date().toISOString(), trxId: trxId.trim(), status: 'PENDING' };
      const { data, error } = await supabase.from('store_payments').insert([payload]).select().single();
      if (error) throw error;
      setPaymentHistory(prev => [...prev, data]);
      setIsPaymentModalOpen(false);
      alert(`Payment submitted for ${targetMonthData.monthName}!`);
    } catch (error: any) { alert(`Submission failed: ${error.message}`); } 
    finally { setIsSubmitting(false); setTrxId(''); }
  };

  const inventoryStats = useMemo(() => {
    const storeProducts = products.filter(p => p.storeId === currentStore.id);
    const stockEquity = storeProducts.reduce((acc, p) => acc + (p.quantity * p.buyingPrice), 0);
    const lowStockCount = storeProducts.filter(p => p.quantity <= p.minThreshold).length;
    return { totalItems: storeProducts.length, stockEquity, lowStockCount, storeProducts };
  }, [products, currentStore.id]);

  const monthStats = useMemo(() => {
    const filteredSales = sales.filter(s => s.storeId === currentStore.id && (!selectedMonth || s.timestamp.startsWith(selectedMonth)) && !s.invoiceId?.startsWith('VOID-'));
    const filteredExpenses = expenses.filter(e => e.storeId === currentStore.id && (!selectedMonth || e.timestamp.startsWith(selectedMonth)));
    let totalSales = 0, totalCashIn = 0, totalProfit = 0, totalExpense = 0, wastageLoss = 0;
    filteredSales.forEach(s => {
      const isPayment = s.invoiceId?.startsWith('PAY-') || s.productId === 'PAYMENT_RECEIVED';
      totalCashIn += (s.amountPaid || 0);
      if (!isPayment) {
        totalSales += s.totalPrice;
        const product = products.find(p => p.id === s.productId);
        totalProfit += (s.totalPrice - ((product ? product.buyingPrice : s.buyingPrice) * s.quantity));
      }
    });
    filteredExpenses.forEach(e => e.category === 'Wastage' ? wastageLoss += e.amount : totalExpense += e.amount);
    return { totalSales, totalProfit: totalProfit - wastageLoss, totalExpense, netBalance: totalCashIn - totalExpense };
  }, [sales, products, expenses, currentStore.id, selectedMonth]);

  const lowStockList = inventoryStats.storeProducts.filter(p => p.quantity <= p.minThreshold);

  const todaysActivities = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(a => a.timestamp.startsWith(today)).slice(0, 10);
  }, [activities]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {currentUser.role !== UserRole.SUPER_ADMIN && (
        <>
          {isLoadingStatus ? (
            <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 animate-pulse h-32 flex items-center justify-center text-slate-500 font-bold tracking-widest text-[10px] uppercase">Syncing Billing Data...</div>
          ) : (
            <div className={`p-6 rounded-[2rem] border-2 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${
              targetMonthData.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/30' : 
              targetMonthData.status === 'PENDING' ? 'bg-amber-400/10 border-amber-400/30' : 
              'bg-rose-500/10 border-rose-500/30'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${targetMonthData.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : targetMonthData.status === 'PENDING' ? 'bg-amber-400/20 text-amber-400' : 'bg-rose-500/20 text-rose-500'}`}>
                  {targetMonthData.status === 'PAID' ? <CheckCircle2 className="w-8 h-8" /> : targetMonthData.status === 'PENDING' ? <Clock className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Software Subscription</h2>
                  <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${targetMonthData.status === 'PAID' ? 'text-emerald-400' : targetMonthData.status === 'PENDING' ? 'text-amber-400' : 'text-rose-500'}`}>
                    {targetMonthData.status === 'PAID' ? `PAID FOR ${targetMonthData.monthName}` : 
                     targetMonthData.status === 'PENDING' ? `PENDING FOR ${targetMonthData.monthName}` : 
                     `DUE FOR ${targetMonthData.monthName}`}
                  </p>
                </div>
              </div>

              {targetMonthData.status === 'DUE' ? (
                <button onClick={() => setIsPaymentModalOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Pay Bill (${currentStore.monthlyFee || 0})
                </button>
              ) : (
                <div className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border flex items-center gap-2 ${targetMonthData.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-400/20 text-amber-400 border-amber-400/30'}`}>
                   {targetMonthData.status === 'PAID' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                   {targetMonthData.status === 'PAID' ? 'All Cleared' : 'In Review'}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">Command Center</h1>
          <p className="text-slate-500 font-medium mt-1">Financial metrics for <span className="text-amber-400 font-black">{currentStore.name}</span></p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl">
          <Calendar className="w-5 h-5 text-slate-400 ml-2" />
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-white font-bold outline-none cursor-pointer pr-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400"><ShoppingCart className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Sales</p><h3 className="text-2xl font-black text-white">${monthStats.totalSales.toLocaleString()}</h3></div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-rose-400/10 rounded-2xl flex items-center justify-center text-rose-400"><Zap className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Expense</p><h3 className="text-2xl font-black text-rose-400">${monthStats.totalExpense.toLocaleString()}</h3></div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-400/10 rounded-2xl flex items-center justify-center text-emerald-400"><TrendingUp className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Profit</p><h3 className="text-2xl font-black text-emerald-400">${monthStats.totalProfit.toLocaleString()}</h3></div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-400/10 rounded-2xl flex items-center justify-center text-blue-400"><Wallet className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Balance</p><h3 className="text-2xl font-black text-blue-400">${monthStats.netBalance.toLocaleString()}</h3></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Package className="w-32 h-32 text-amber-400" /></div>
          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3"><LayoutDashboard className="w-5 h-5 text-amber-500" /> Inventory Status</h2>
          <div className="space-y-6 relative z-10">
            <div><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Assets</p><p className="text-4xl font-black text-white">{inventoryStats.totalItems}</p></div>
            <div><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Equity</p><p className="text-4xl font-black text-emerald-400">${inventoryStats.stockEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[400px]">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
             <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500" /> Low Stock Alerts</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-800/50">
                {lowStockList.map(p => (
                  <tr key={p.id} className="group hover:bg-slate-800/40 transition-all">
                    <td className="px-8 py-4 font-bold text-white text-sm">{p.name}</td>
                    <td className="px-8 py-4 text-right text-rose-400 font-black">{p.quantity} left</td>
                  </tr>
                ))}
                {lowStockList.length === 0 && (
                  <tr><td colSpan={2} className="px-8 py-10 text-center opacity-40"><Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" /><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All optimal</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[400px]">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
             <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><Activity className="w-5 h-5 text-blue-400" /> Today's Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {todaysActivities.map(activity => (
              <div key={activity.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-xs text-white font-bold">{activity.text}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase">{activity.user}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {todaysActivities.length === 0 && (
               <div className="text-center opacity-40 py-10"><Activity className="w-8 h-8 mx-auto text-blue-500 mb-2" /><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No activity today</p></div>
            )}
          </div>
        </div>
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative">
             <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
             <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2"><CreditCard className="w-6 h-6 text-pink-500" /> bKash Payment</h2>
             
             {/* 🔴 bKash Number & QR Section Added Back 🔴 */}
             <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 text-center mb-6 shadow-inner">
                <QrCode className="w-16 h-16 text-pink-500 mx-auto mb-3" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Send Money to bKash</p>
                <p className="text-3xl font-black text-white tracking-widest">{bKashNumber}</p>
                <div className="mt-4 inline-block bg-pink-500/20 text-pink-400 px-4 py-2 rounded-xl border border-pink-500/30">
                  <p className="text-[10px] font-black uppercase tracking-widest">Amount to Pay</p>
                  <p className="text-lg font-black">${currentStore.monthlyFee || 0}</p>
                </div>
             </div>

             <form onSubmit={submitPaymentTrx} className="space-y-4">
                <input type="text" required value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} placeholder="Enter TrxID after payment" className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-black uppercase tracking-widest focus:border-pink-500 text-center" />
                <button type="submit" disabled={isSubmitting} className="w-full bg-pink-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50 hover:bg-pink-600 transition-colors">Submit Transaction</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;