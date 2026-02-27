import React, { useMemo } from 'react';
import { Product, Store, Sale, Expense } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  ShoppingCart,
  Zap,
  Wallet,
  LayoutDashboard,
  Check // <-- এই আইকনটি মিসিং ছিল
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  currentStore: Store;
  sales: Sale[];
  expenses: Expense[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, currentStore, sales, expenses }) => {

  const inventoryStats = useMemo(() => {
    const storeProducts = products.filter(p => p.storeId === currentStore.id);
    const totalItems = storeProducts.length;
    // Stock Equity = Quantity * Buying Price
    const stockEquity = storeProducts.reduce((acc, p) => acc + (p.quantity * p.buyingPrice), 0);
    const lowStockCount = storeProducts.filter(p => p.quantity <= p.minThreshold).length;

    return { totalItems, stockEquity, lowStockCount, storeProducts };
  }, [products, currentStore.id]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.storeId === currentStore.id && s.timestamp.startsWith(today));
    const todayExpenses = expenses.filter(e => e.storeId === currentStore.id && e.timestamp.startsWith(today));
    
    let totalSales = 0;
    let todayCash = 0;
    let totalProfit = 0;

    todaySales.forEach(s => {
      const isPayment = s.invoiceId?.startsWith('PAY-') || s.productId === 'PAYMENT_RECEIVED' || s.productId === 'SUPPLIER_PAYMENT';

      todayCash += (s.amountPaid || 0);

      if (!isPayment) {
        totalSales += s.totalPrice;
        const product = products.find(p => p.id === s.productId);
        const buyingPrice = product ? product.buyingPrice : s.buyingPrice;
        const cost = buyingPrice * s.quantity;
        totalProfit += (s.totalPrice - cost);
      }
    });
    
    const totalExpense = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netBalance = todayCash - totalExpense;

    return { totalSales, todayCash, totalProfit, totalExpense, netBalance };
  }, [sales, products, expenses, currentStore.id]);

  const lowStockList = useMemo(() => {
    return inventoryStats.storeProducts.filter(p => p.quantity <= p.minThreshold);
  }, [inventoryStats.storeProducts]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Command Center
            <span className="bg-amber-400/10 text-amber-400 text-xs py-1 px-3 rounded-full border border-amber-400/20 uppercase tracking-widest font-bold">Overview</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Real-time metrics for <span className="gold-gradient-text font-black">{currentStore.name}</span></p>
        </div>
      </div>

      {/* Today's Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-[2rem] border border-slate-800 shadow-xl flex items-center gap-4 group hover:border-slate-500/30 transition-all">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Sales</p>
            <h3 className="text-lg font-black text-white tracking-tighter">${todayStats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-[2rem] border border-slate-800 shadow-xl flex items-center gap-4 group hover:border-amber-500/30 transition-all">
          <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Cash</p>
            <h3 className="text-lg font-black text-amber-400 tracking-tighter">${todayStats.todayCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-[2rem] border border-slate-800 shadow-xl flex items-center gap-4 group hover:border-emerald-500/30 transition-all">
          <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Profit</p>
            <h3 className="text-lg font-black text-emerald-400 tracking-tighter">${todayStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-[2rem] border border-slate-800 shadow-xl flex items-center gap-4 group hover:border-rose-500/30 transition-all">
          <div className="w-10 h-10 bg-rose-400/10 rounded-xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Expense</p>
            <h3 className="text-lg font-black text-rose-400 tracking-tighter">${todayStats.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-[2rem] border border-slate-800 shadow-xl flex items-center gap-4 group hover:border-blue-500/30 transition-all">
          <div className="w-10 h-10 bg-blue-400/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Balance</p>
            <h3 className={`text-lg font-black tracking-tighter ${todayStats.netBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              ${todayStats.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Inventory Summary Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Package className="w-32 h-32 text-amber-400" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-amber-500" />
            Inventory Status
          </h2>
          
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Assets</p>
              <p className="text-4xl font-black text-white">{inventoryStats.totalItems}</p>
            </div>
            
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Equity (Purchase Value)</p>
              <p className="text-4xl font-black text-emerald-400">${inventoryStats.stockEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Action Required
              </p>
              <p className="text-2xl font-black text-rose-400">{inventoryStats.lowStockCount} <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">items low on stock</span></p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts Table */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
             <h2 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-3">
               <AlertTriangle className="w-5 h-5 text-rose-500" />
               Low Stock Alerts
             </h2>
             <span className="bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
               {lowStockList.length} Warnings
             </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-8 py-5">Product Name</th>
                  <th className="px-8 py-5">SKU</th>
                  <th className="px-8 py-5 text-right">Current Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {lowStockList.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-800/40 transition-all">
                    <td className="px-8 py-5 font-bold text-white text-sm">{p.name}</td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">{p.sku}</td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-rose-400 font-black px-3 py-1 bg-rose-500/10 rounded-lg text-sm border border-rose-500/20">
                        {p.quantity} left
                      </span>
                    </td>
                  </tr>
                ))}
                {lowStockList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center opacity-40 grayscale">
                       <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory levels are optimal</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;