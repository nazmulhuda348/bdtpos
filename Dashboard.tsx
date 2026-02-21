
import React, { useMemo } from 'react';
import { Product, Store, InventoryStats, Sale, Expense } from '../types';
import { Package, AlertTriangle, TrendingDown, Layers, DollarSign, BarChart3, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  currentStore: Store;
  sales: Sale[];
  expenses: Expense[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, currentStore, sales, expenses }) => {
  const storeProducts = useMemo(() => 
    products.filter(p => p.storeId === currentStore.id), 
    [products, currentStore]
  );

  const storeSales = useMemo(() => 
    sales.filter(s => s.storeId === currentStore.id),
    [sales, currentStore]
  );

  const storeExpenses = useMemo(() => 
    expenses.filter(e => e.storeId === currentStore.id),
    [expenses, currentStore]
  );

  const stats: InventoryStats = useMemo(() => {
    const totalRev = storeSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalCOGS = storeSales.reduce((sum, s) => sum + (s.quantity * s.buyingPrice), 0);
    const totalExp = storeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = totalRev - totalCOGS;
    
    return {
      totalItems: storeProducts.reduce((sum, p) => sum + p.quantity, 0),
      lowStockCount: storeProducts.filter(p => p.quantity <= p.minThreshold && p.quantity > 0).length,
      totalValue: storeProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0),
      outOfStock: storeProducts.filter(p => p.quantity === 0).length,
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      totalProfit: grossProfit - totalExp
    };
  }, [storeProducts, storeSales, storeExpenses]);

  const StatCard = ({ title, value, icon: Icon, detail, isCurrency, trend }: any) => (
    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 group hover:border-amber-400/30 transition-all duration-500">
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-500 shadow-xl border border-slate-700/50">
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{title}</span>
          {trend && (
            <div className={`flex items-center justify-end gap-1 text-xs mt-1 font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
      <div className="flex items-end gap-1">
        <h3 className={`text-3xl font-black ${title === 'Net Profit' && value < 0 ? 'text-rose-500' : 'text-white'}`}>
          {isCurrency ? `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value.toLocaleString()}
        </h3>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{detail}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Enterprise Ledger
            <span className="bg-amber-400/10 text-amber-400 text-xs py-1 px-3 rounded-full border border-amber-400/20 uppercase tracking-widest font-bold">Live</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Strategic intelligence for <span className="gold-gradient-text font-bold">{currentStore.name}</span></p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 shadow-lg">Real-time</button>
          <button className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">Historical</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Net Profit" 
          value={stats.totalProfit} 
          icon={TrendingUp} 
          detail="Total yield after operational costs"
          isCurrency
          trend={12.5}
        />
        <StatCard 
          title="Gross Revenue" 
          value={stats.totalRevenue} 
          icon={DollarSign} 
          detail="Total capital intake this cycle"
          isCurrency
          trend={8.2}
        />
        <StatCard 
          title="Operations Cost" 
          value={stats.totalExpenses} 
          icon={Wallet} 
          detail="Overhead and logistics spending"
          isCurrency
          trend={-2.4}
        />
        <StatCard 
          title="Stock Equity" 
          value={stats.totalValue} 
          icon={BarChart3} 
          detail="Market value of current holdings"
          isCurrency
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
          <div className="px-8 py-7 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">Financial Performance</h3>
              <p className="text-xs text-slate-500 font-medium">Revenue vs Operational Expense Ratio</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-slate-700 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense</span>
              </div>
            </div>
          </div>
          <div className="p-10">
             <div className="h-72 flex items-end justify-around gap-8">
                <div className="flex flex-col items-center gap-4 w-full max-w-[140px] group">
                   <div 
                    className="bg-gradient-to-t from-amber-600 to-amber-400 w-full rounded-2xl transition-all duration-700 shadow-lg group-hover:shadow-amber-500/20" 
                    style={{ height: `${stats.totalRevenue > 0 ? Math.min(100, (stats.totalRevenue / (stats.totalRevenue + stats.totalExpenses || 1)) * 100) : 0}%` }}
                   ></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inflow</span>
                </div>
                <div className="flex flex-col items-center gap-4 w-full max-w-[140px] group">
                   <div 
                    className="bg-slate-800 w-full rounded-2xl transition-all duration-700 border border-slate-700 group-hover:bg-slate-700" 
                    style={{ height: `${stats.totalExpenses > 0 ? Math.min(100, (stats.totalExpenses / (stats.totalRevenue + stats.totalExpenses || 1)) * 100) : 0}%` }}
                   ></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outflow</span>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
           <h3 className="font-black text-white mb-8 tracking-tight text-lg">Expense Distribution</h3>
           <div className="space-y-6">
              {Array.from(new Set(storeExpenses.map(e => e.category))).map(cat => {
                const total = storeExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                const perc = (total / (stats.totalExpenses || 1)) * 100;
                return (
                  <div key={cat} className="group">
                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-amber-400 transition-colors">
                      <span>{cat}</span>
                      <span className="text-slate-300">${total.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                       <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${perc}%` }}></div>
                    </div>
                  </div>
                )
              })}
              {storeExpenses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 bg-slate-800 rounded-full text-slate-600">
                    <Wallet className="w-8 h-8" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">No operational expenses recorded.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;