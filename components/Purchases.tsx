import React, { useState, useMemo } from 'react';
import { Purchase, Supplier, Product, Store, User } from '../types';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Truck, 
  DollarSign, 
  Trash2, 
  Download,
  Calendar,
  Hash,
  ArrowRight,
  Package,
  Check,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurchasesProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  products: Product[];
  currentStore: Store;
  onAddPurchase: (purchase: Omit<Purchase, 'id' | 'timestamp'>) => void | Promise<void>;
  onUpdateStock: (id: string, updates: Partial<Product>) => void | Promise<void>;
  onUpdateSupplierDue: (id: string, amount: number) => void | Promise<void>;
  onDeletePurchase: (id: string) => void | Promise<void>;
  canDelete: boolean;
}

const Purchases: React.FC<PurchasesProps> = ({ 
  purchases, 
  suppliers, 
  products, 
  currentStore, 
  onAddPurchase, 
  onUpdateStock,
  onUpdateSupplierDue,
  onDeletePurchase,
  canDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => p.storeId === currentStore.id)
      .filter(p => 
        p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [purchases, currentStore.id, searchTerm]);

  // 🔴 স্পেশাল ক্যালকুলেশন লজিক 🔴
  const actualPurchases = useMemo(() => {
    // পেমেন্ট রিসিভ এন্ট্রিগুলো বাদ দিয়ে শুধু আসল কেনাকাটার হিসাব
    return filteredPurchases.filter(p => !p.poNumber?.startsWith('PAY-') && p.productId !== 'SUPPLIER_PAYMENT' && p.productId !== 'PAYMENT_RECEIVED');
  }, [filteredPurchases]);

  const totalInvestment = useMemo(() => {
    return actualPurchases.reduce((acc, curr) => acc + curr.totalCost, 0);
  }, [actualPurchases]);

  const totalDue = useMemo(() => {
    // ১০০% নিখুঁত হিসাবের জন্য সরাসরি suppliers টেবিল থেকে মোট বকেয়া বের করা হচ্ছে
    return suppliers
      .filter(s => s.storeId === currentStore.id)
      .reduce((acc, curr) => acc + curr.totalDue, 0);
  }, [suppliers, currentStore.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === supplierId);
    const product = products.find(p => p.id === productId);
    
    if (!supplier || !product) return;

    setIsLoading(true);
    try {
      const totalCost = quantity * unitCost;
      const amountDue = totalCost - amountPaid;

      // Async DB Update: New Purchase
      await onAddPurchase({
        poNumber,
        supplierId,
        supplierName: supplier.name,
        productId,
        productName: product.name,
        quantity,
        unitCost,
        totalCost,
        amountPaid,
        amountDue,
        storeId: currentStore.id
      });

      // Update product stock and buying price in DB
      await onUpdateStock(productId, { 
        quantity: product.quantity + quantity,
        buyingPrice: unitCost 
      });

      // Update supplier due in DB
      if (amountDue > 0) {
        await onUpdateSupplierDue(supplierId, amountDue);
      }

      alert('Procurement Success: Stock updated and PO recorded.');
      resetForm();
    } catch (error: any) {
      alert(`Purchase failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPoNumber('');
    setSupplierId('');
    setProductId('');
    setQuantity(0);
    setUnitCost(0);
    setAmountPaid(0);
    setIsModalOpen(false);
  };

  const exportToCSV = () => {
    const headers = ['PO Number', 'Supplier', 'Product', 'Qty', 'Unit Cost', 'Total Cost', 'Paid', 'Due', 'Date'];
    const data = filteredPurchases.map(p => {
      const isPayment = p.poNumber?.startsWith('PAY-') || p.productId === 'SUPPLIER_PAYMENT' || p.productId === 'PAYMENT_RECEIVED';
      return [
        p.poNumber,
        p.supplierName,
        isPayment ? 'SUPPLIER PAYMENT' : p.productName,
        isPayment ? '-' : p.quantity,
        isPayment ? '-' : p.unitCost.toFixed(2),
        isPayment ? '-' : p.totalCost.toFixed(2),
        (p.amountPaid || 0).toFixed(2),
        (p.amountDue || 0).toFixed(2),
        new Date(p.timestamp).toLocaleDateString()
      ];
    });
    
    const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `purchases_${currentStore.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Procurement PO
            <span className="bg-amber-400/10 text-amber-400 text-xs py-1 px-3 rounded-full border border-amber-400/20 uppercase tracking-widest font-bold">Purchase Orders</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Track stock intake and vendor payments for <span className="gold-gradient-text font-black">{currentStore.name}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="p-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all shadow-xl"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 px-6 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-amber-900/10 uppercase tracking-widest text-xs"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            New Purchase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 flex items-center gap-6 group hover:border-amber-400/30 transition-all">
          <div className="w-14 h-14 bg-amber-400/10 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Purchases</p>
            <h3 className="text-2xl font-black text-white">{actualPurchases.length}</h3>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 flex items-center gap-6 group hover:border-emerald-400/30 transition-all">
          <div className="w-14 h-14 bg-emerald-400/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Investment</p>
            <h3 className="text-2xl font-black text-emerald-400">${totalInvestment.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 flex items-center gap-6 group hover:border-rose-400/30 transition-all">
          <div className="w-14 h-14 bg-rose-400/10 rounded-2xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Dues</p>
            <h3 className="text-2xl font-black text-rose-400">${totalDue.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="relative group mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by PO#, supplier or product..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 focus:border-amber-400 transition-all amber-glow" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="px-6 py-5">PO Number</th>
                <th className="px-6 py-5">Supplier</th>
                <th className="px-6 py-5">Product</th>
                <th className="px-6 py-5 text-center">Qty</th>
                <th className="px-6 py-5 text-right">Total Cost</th>
                <th className="px-6 py-5 text-right">Paid / Due</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredPurchases.map((purchase) => {
                // 🔴 পেমেন্ট রিসিভ এন্ট্রি চেনার লজিক 🔴
                const isPayment = purchase.poNumber?.startsWith('PAY-') || purchase.productId === 'SUPPLIER_PAYMENT' || purchase.productId === 'PAYMENT_RECEIVED';

                return (
                  <tr key={purchase.id} className="group hover:bg-slate-800/40 transition-all">
                    <td className="px-6 py-5">
                      <p className="font-black text-white text-xs tracking-tighter">{purchase.poNumber}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{new Date(purchase.timestamp).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-300">{purchase.supplierName}</td>
                    <td className="px-6 py-5 text-sm text-slate-400">
                      {isPayment ? (
                        <span className="text-blue-400 italic font-bold">Supplier Payment</span>
                      ) : (
                        purchase.productName
                      )}
                    </td>
                    <td className="px-6 py-5 text-center font-black text-white text-sm">
                      {isPayment ? '-' : purchase.quantity}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-white text-sm">
                      {isPayment ? '-' : `$${purchase.totalCost.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isPayment ? (
                        <span className="text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest">+ ${purchase.amountPaid?.toLocaleString()} Paid</span>
                      ) : (
                        <>
                          <p className="text-emerald-400 text-xs font-black">${purchase.amountPaid.toLocaleString()} Paid</p>
                          {purchase.amountDue > 0 && <p className="text-rose-400 text-[10px] font-black uppercase tracking-tighter">${purchase.amountDue.toLocaleString()} Due</p>}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {canDelete && (
                        <button 
                          onClick={() => onDeletePurchase(purchase.id)}
                          className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center opacity-30 grayscale">
                    <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No purchase records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">New Purchase Order</h2>
                <button onClick={resetForm} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">PO Number</label>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input 
                        required 
                        value={poNumber}
                        onChange={e => setPoNumber(e.target.value)}
                        placeholder="e.g. PO-2024-001" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Supplier</label>
                    <div className="relative group">
                      <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <select 
                        required 
                        value={supplierId}
                        onChange={e => setSupplierId(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow appearance-none"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.filter(s => s.storeId === currentStore.id).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Product to Restock</label>
                  <div className="relative group">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                    <select 
                      required 
                      value={productId}
                      onChange={e => setProductId(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow appearance-none"
                    >
                      <option value="">Select Product</option>
                      {products.filter(p => p.storeId === currentStore.id).map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Current: {p.quantity})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Quantity</label>
                    <input 
                      required 
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Unit Cost ($)</label>
                    <input 
                      required 
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-bold focus:border-amber-400 amber-glow" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Amount Paid ($)</label>
                    <input 
                      required 
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-amber-400 font-bold focus:border-amber-400 amber-glow" 
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Cost</p>
                    <p className="text-2xl font-black text-white">${(quantity * unitCost).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remaining Due</p>
                    <p className="text-2xl font-black text-rose-400">${Math.max(0, (quantity * unitCost) - amountPaid).toFixed(2)}</p>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 rounded-[2rem] font-black shadow-2xl hover:scale-[1.02] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : <>Confirm Purchase <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Purchases;