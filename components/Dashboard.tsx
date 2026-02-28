import React, { useState, useMemo, useEffect } from 'react';
import { Product, Store, Sale, Expense, User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, TrendingUp, Package, AlertTriangle, ShoppingCart, 
  Zap, Wallet, LayoutDashboard, Check, Calendar, CreditCard, 
  QrCode, X, CheckCircle2, Clock 
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  currentStore: Store;
  sales: Sale[];
  expenses: Expense[];
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ products, currentStore, sales, expenses, currentUser }) => {

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // আপনার দেওয়া বিকাশ নাম্বার
  const bKashNumber = "01633334466"; 

  // 🔴 অ্যাডমিনের সেট করা মাস থেকে শুরু করে একদম সলিড ম্যাথ (Math) লজিক 🔴
  const getCheckableMonths = () => {
    const months = [];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startMonthStr = currentStore.billingStartMonth || currentMonthStr; 

    let [startYear, startMonth] = startMonthStr.split('-').map(Number);
    const [endYear, endMonth] = currentMonthStr.split('-').map(Number);

    let count = 0;
    // টাইমজোন ইস্যু এড়াতে সলিড লুপ ব্যবহার করা হলো
    while ((startYear < endYear || (startYear === endYear && startMonth <= endMonth)) && count < 60) {
      months.push(`${startYear}-${String(startMonth).padStart(2, '0')}`);
      startMonth++;
      if (startMonth > 12) {
        startMonth = 1;
        startYear++;
      }
      count++;
    }
    return months.length > 0 ? months : [currentMonthStr];
  };

  const relevantMonths = getCheckableMonths();

  const fetchPaymentStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const { data } = await supabase
        .from('store_payments')
        .select('*')
        .eq('storeId', currentStore.id)
        .in('monthYear', relevantMonths);
      
      setPaymentHistory(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchPaymentStatus();
  }, [currentStore.id]);

  // 🔴 মাল্টিপল এন্ট্রি স্ক্যান করে সঠিক স্ট্যাটাস বের করার শক্তিশালী লজিক 🔴
  const targetMonthData = useMemo(() => {
    for (const month of relevantMonths) {
      // ওই মাসের সব রেকর্ড বের করা হলো
      const records = paymentHistory.filter(p => p.monthYear === month);
      
      // মাসের সুন্দর নাম (যেমন: February 2026)
      const [y, m] = month.split('-').map(Number);
      const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      
      // ১. ওই মাসে কি কোনো 'PAID' আছে? থাকলে এই মাস ক্লিয়ার, স্কিপ করো!
      const hasPaid = records.some(p => p.status === 'PAID');
      if (hasPaid) continue;
      
      // ২. 'PAID' না থাকলে, কি কোনো 'PENDING' আছে?
      const pendingRecord = records.find(p => p.status === 'PENDING');
      if (pendingRecord) {
         return { monthYear: month, status: 'PENDING', record: pendingRecord, monthName };
      }
      
      // ৩. কিছুই না থাকলে (বা শুধু রিজেক্টেড থাকলে), তার মানে 'DUE'
      return { monthYear: month, status: 'DUE', record: null, monthName };
    }
    
    // লুপ কোনো বকেয়া না পেয়ে শেষ হলে, মানে সব মাস PAID!
    const lastMonth = relevantMonths[relevantMonths.length - 1];
    const [y, m] = lastMonth.split('-').map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return { monthYear: lastMonth, status: 'PAID', record: null, monthName };
  }, [paymentHistory, relevantMonths]);

  const submitPaymentTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) return;
    setIsSubmitting(true);

    try {
      const payload = {
        storeId: currentStore.id,
        monthYear: targetMonthData.monthYear,
        amountPaid: currentStore.monthlyFee || 0,
        paymentDate: new Date().toISOString(),
        trxId: trxId.trim(),
        status: 'PENDING'
      };

      const { data, error } = await supabase.from('store_payments').insert([payload]).select().single();
      if (error) throw error;
      
      setPaymentHistory(prev => [...prev, data]);
      setIsPaymentModalOpen(false);
      alert(`Payment submitted for ${targetMonthData.monthName}!`);
    } catch (error: any) {
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setTrxId('');
    }
  };

  // ইনভেন্টরি ও সেলস লজিক (আপনার আগের কোড)
  const inventoryStats = useMemo(() => {
    const storeProducts = products.filter(p => p.storeId === currentStore.id);
    const stockEquity = storeProducts.reduce((acc, p) => acc + (p.quantity * p.buyingPrice), 0);
    const lowStockCount = storeProducts.filter(p => p.quantity <= p.minThreshold).length;
    return { totalItems: storeProducts.length, stockEquity, lowStockCount, storeProducts };
  }, [products, currentStore.id]);

  const monthStats = useMemo(() => {
    const filteredSales = sales.filter(s => s.storeId === currentStore.id && (!selectedMonth || s.timestamp.startsWith(selectedMonth)));
    const filteredExpenses = expenses.filter(e => e.storeId === currentStore.id && (!selectedMonth || e.timestamp.startsWith(selectedMonth)));
    let totalSales = 0, totalCashIn = 0, totalProfit = 0, totalExpense = 0, wastageLoss = 0;
    filteredSales.forEach(s => {
      const isPayment = s.invoiceId?.startsWith('PAY-') || s.productId === 'PAYMENT_RECEIVED';
      totalCashIn += (s.amountPaid || 0);
      if (!isPayment) {
        totalSales += s.totalPrice;
        const product = products.find(p => p.id === s.productId);
        const buyingPrice = product ? product.buyingPrice : s.buyingPrice;
        totalProfit += (s.totalPrice - (buyingPrice * s.quantity));
      }
    });
    filteredExpenses.forEach(e => e.category === 'Wastage' ? wastageLoss += e.amount : totalExpense += e.amount);
    return { totalSales, totalProfit: totalProfit - wastageLoss, totalExpense, netBalance: totalCashIn - totalExpense };
  }, [sales, products, expenses, currentStore.id, selectedMonth]);

  const lowStockList = inventoryStats.storeProducts.filter(p => p.quantity <= p.minThreshold);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 🔴 ডাইনামিক সাবস্ক্রিপশন উইজেট 🔴 */}
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
                  {targetMonthData.status === 'PENDING' && <p className="text-[10px] text-amber-400/70 mt-1 uppercase font-bold">TrxID: {targetMonthData.record?.trxId} (Under Review)</p>}
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

      {/* Header, Stats, Low Stock Table (আপনার অরিজিনাল কোড) */}
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

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
             <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500" /> Low Stock Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-8 py-5">Product Name</th><th className="px-8 py-5">SKU</th><th className="px-8 py-5 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map(p => (
                  <tr key={p.id} className="border-b border-slate-800/50">
                    <td className="px-8 py-5 font-bold text-white">{p.name}</td>
                    <td className="px-8 py-5 text-xs text-slate-500">{p.sku}</td>
                    <td className="px-8 py-5 text-right text-rose-400 font-black">{p.quantity} left</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative">
             <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
             <h2 className="text-2xl font-black text-white mb-2 tracking-tight flex items-center gap-2"><CreditCard className="w-6 h-6 text-pink-500" /> bKash Payment</h2>
             <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-widest">Paying for: <span className="text-amber-400">{targetMonthData.monthName}</span></p>
             <div className="bg-slate-950 rounded-3xl p-6 flex flex-col items-center justify-center border border-slate-800 mb-6">
                <QrCode className="w-32 h-32 text-slate-300 mb-4 opacity-50" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Send Money To</p>
                <p className="text-xl font-black text-pink-500 tracking-widest">{bKashNumber}</p>
             </div>
             <form onSubmit={submitPaymentTrx} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Enter TrxID</label>
                  <input type="text" required value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-black uppercase tracking-widest focus:border-pink-500" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-pink-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : `Submit for ${targetMonthData.monthName}`}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;