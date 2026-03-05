import React, { useState, useMemo } from 'react';
import { Purchase, Supplier, Product, Store, User, Expense } from '../types';
import { 
  ShoppingBag, Search, Plus, Truck, DollarSign, Trash2, Download,
  Calendar, Hash, ArrowRight, Package, Check, X, AlertOctagon,
  RotateCcw, Printer
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
  onAddExpense?: (expense: Omit<Expense, 'id' | 'timestamp'>) => void | Promise<void>; // 🔴 New: Expense যুক্ত করার পারমিশন
  canDelete: boolean;
}

const Purchases: React.FC<PurchasesProps> = ({ 
  purchases, suppliers, products, currentStore, 
  onAddPurchase, onUpdateStock, onUpdateSupplierDue, onDeletePurchase, onAddExpense, canDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New Purchase Form State
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  // 🔴 Return Modal State 🔴
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [purchaseToReturn, setPurchaseToReturn] = useState<Purchase | null>(null);
  const [returnQty, setReturnQty] = useState(1);

  // 🔴 Payment Modal State 🔴
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);

  // 🔴 Print Modal State 🔴
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPoForPrint, setSelectedPoForPrint] = useState<string | null>(null);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => p.storeId === currentStore.id)
      .filter(p => p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   p.productName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, currentStore.id, searchTerm]);

  // Handle New Purchase Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === supplierId);
    const product = products.find(p => p.id === productId);
    if (!supplier || !product) return;
    setIsLoading(true);
    try {
      const totalCost = quantity * unitCost;
      const amountDue = Math.max(0, totalCost - amountPaid);
      
      await onAddPurchase({ 
        poNumber, supplierId, supplierName: supplier.name, 
        productId, productName: product.name, 
        quantity, unitCost, totalCost, amountPaid, amountDue, 
        storeId: currentStore.id 
      });
      await onUpdateStock(productId, { quantity: product.quantity + quantity, buyingPrice: unitCost });
      if (amountDue > 0) await onUpdateSupplierDue(supplierId, amountDue);
      
      alert('Procurement Success: Stock updated and PO recorded.');
      resetForm();
      
      // Auto Open Print
      setSelectedPoForPrint(poNumber);
      setShowPrintModal(true);
    } catch (error: any) { alert(`Purchase failed: ${error.message}`); } 
    finally { setIsLoading(false); }
  };

  const resetForm = () => { setPoNumber(''); setSupplierId(''); setProductId(''); setQuantity(0); setUnitCost(0); setAmountPaid(0); setIsModalOpen(false); };

  // 🔴 Return Logic & Math (Zero Due & Over-return Block) 🔴
  const getReturnableQty = (purchase: Purchase) => {
    if (!purchase) return 0;
    const returns = purchases.filter(p => p.poNumber === `RET-${purchase.poNumber}` && p.productId === purchase.productId);
    const alreadyReturned = returns.reduce((acc, curr) => acc + Math.abs(curr.quantity), 0);
    return purchase.quantity - alreadyReturned;
  };

  const getMaxAllowedReturnQty = (purchase: Purchase) => {
    if (!purchase) return 0;
    const physicalMax = getReturnableQty(purchase);
    const supplier = suppliers.find(s => s.id === purchase.supplierId);
    const currentDue = supplier ? supplier.totalDue : 0;
    
    // No due = 0 items allowed
    if (currentDue <= 0) return 0;
    
    const effectiveUnitCost = purchase.totalCost / purchase.quantity;
    const financialMax = Math.floor(currentDue / effectiveUnitCost);
    
    // 🔴 New Logic: স্টকে কয়টি প্রোডাক্ট আছে তা চেক করা 🔴
    const product = products.find(p => p.id === purchase.productId);
    const currentStock = product ? product.quantity : 0;
    
    // রিটার্ন করা যাবে = ফিজিক্যাল কেনা স্টক, বকেয়া অনুযায়ী ম্যাক্স স্টক, এবং বর্তমান স্টকের মধ্যে যেটি সবচেয়ে ছোট
    return Math.min(physicalMax, financialMax, currentStock);
  };

  const handleOpenReturn = (purchase: Purchase) => {
    const supplier = suppliers.find(s => s.id === purchase.supplierId);
    const currentDue = supplier ? supplier.totalDue : 0;

    // 🔴 Block 1: Zero Due Block 🔴
    if (currentDue <= 0) {
        alert('Action Denied: You cannot return items because there is no outstanding due for this supplier.');
        return;
    }

    const physicalMax = getReturnableQty(purchase);
    if (physicalMax <= 0) {
        alert('All items from this PO have already been returned.');
        return;
    }

    // 🔴 New Logic: স্টক জিরো হলে রিটার্ন ব্লক করা 🔴
    const product = products.find(p => p.id === purchase.productId);
    if (!product || product.quantity <= 0) {
        alert('Action Denied: You do not have any of this product in stock to return.');
        return;
    }

    // 🔴 Block 2: Over-Return Block 🔴
    const maxQty = getMaxAllowedReturnQty(purchase);
    if (maxQty <= 0) {
        const effectiveUnitCost = purchase.totalCost / purchase.quantity;
        alert(`Action Denied: Returning even 1 item ($${effectiveUnitCost.toFixed(2)}) exceeds the supplier's current due of $${currentDue.toFixed(2)}, or you don't have enough stock.`);
        return;
    }

    setPurchaseToReturn(purchase);
    setReturnQty(1);
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseToReturn) return;

    // Strict calculation based on Due Limit
    const maxQty = getMaxAllowedReturnQty(purchaseToReturn);
    if (returnQty <= 0 || returnQty > maxQty) {
        alert(`Invalid return quantity. Maximum allowed (based on stock and due) is ${maxQty}.`);
        return;
    }

    setIsLoading(true);
    try {
        const effectiveUnitCost = purchaseToReturn.totalCost / purchaseToReturn.quantity;
        const refundAmount = returnQty * effectiveUnitCost;
        
        // 100% goes to Due Adjustment (Cash Refund blocked)
        const dueAdjustment = refundAmount;
        const returnPoNumber = `RET-${purchaseToReturn.poNumber}`;
        
        await onAddPurchase({
            poNumber: returnPoNumber,
            supplierId: purchaseToReturn.supplierId,
            supplierName: purchaseToReturn.supplierName,
            productId: purchaseToReturn.productId, // Must be valid UUID
            productName: `[RETURN] ${purchaseToReturn.productName}`,
            quantity: -returnQty,
            unitCost: purchaseToReturn.unitCost, 
            totalCost: -refundAmount,
            amountPaid: 0, // No cash changed hands
            amountDue: -dueAdjustment, // Exact amount reducing the due
            storeId: currentStore.id
        });

        const product = products.find(p => p.id === purchaseToReturn.productId);
        if (product) {
            const newStock = Math.max(0, product.quantity - returnQty);
            await onUpdateStock(product.id, { quantity: newStock });
        }

        if (dueAdjustment > 0 && purchaseToReturn.supplierId) {
            await onUpdateSupplierDue(purchaseToReturn.supplierId, -dueAdjustment);
        }

        alert(`Purchase Return processed successfully!\nSupplier Due Adjusted: $${dueAdjustment.toFixed(2)}`);
        setIsReturnModalOpen(false);
        setPurchaseToReturn(null);

        // Auto Open Print Modal
        setSelectedPoForPrint(returnPoNumber);
        setShowPrintModal(true);

    } catch (error: any) {
        alert(`Failed to process return: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // 🔴 Supplier Payment Logic & DB Fix 🔴
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplierId || paymentAmount <= 0) return;
    setIsLoading(true);
    try {
        const supplier = suppliers.find(s => s.id === paymentSupplierId);
        if (!supplier) throw new Error("Supplier not found");

        const year = new Date().getFullYear();
        const count = purchases.length + 1;
        const payPoNumber = `PAY-${year}-${String(count).padStart(3, '0')}`;

        // Safe Dummy UUID used to prevent DB Crash
        const safeProductId = products.length > 0 ? products[0].id : '00000000-0000-0000-0000-000000000000';

        await onAddPurchase({
            poNumber: payPoNumber,
            supplierId: supplier.id,
            supplierName: supplier.name,
            productId: safeProductId,
            productName: 'Supplier Due Payment',
            quantity: 0,
            unitCost: 0,
            totalCost: 0,
            amountPaid: paymentAmount,
            amountDue: -paymentAmount, 
            storeId: currentStore.id
        });

        await onUpdateSupplierDue(supplier.id, -paymentAmount);

        // 🔴 New Logic: পেমেন্ট করলে অটোমেটিক Expense এ যুক্ত হবে 🔴
        if (onAddExpense) {
            await onAddExpense({
                storeId: currentStore.id,
                category: "Supplier Payment",
                amount: paymentAmount,
                description: `Payment to ${supplier.name} (PO: ${payPoNumber})`
            });
        }

        alert(`Payment of $${paymentAmount.toFixed(2)} recorded successfully.`);
        setIsPaymentModalOpen(false);
        setPaymentSupplierId('');
        setPaymentAmount(0);

        // Auto Open Print Modal
        setSelectedPoForPrint(payPoNumber);
        setShowPrintModal(true);

    } catch (error: any) {
        alert(`Payment failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handlePrint = (poNumber: string) => {
    setSelectedPoForPrint(poNumber);
    setShowPrintModal(true);
  };

  const exportToCSV = () => {
    const headers = ['PO Number', 'Supplier', 'Product', 'Qty', 'Unit Cost', 'Total Cost', 'Paid', 'Due', 'Date'];
    const data = filteredPurchases.map(p => {
      const isPayment = p.poNumber?.startsWith('PAY-');
      const isVoid = p.poNumber?.startsWith('VOID-');
      const isReturn = p.poNumber?.startsWith('RET-');
      return [
        p.poNumber,
        p.supplierName,
        isPayment ? 'SUPPLIER PAYMENT' : p.productName,
        isPayment ? '-' : (isVoid ? '0' : p.quantity.toString()),
        isPayment ? '-' : p.unitCost.toFixed(2),
        isVoid ? '0.00' : p.totalCost.toFixed(2),
        p.amountPaid.toFixed(2),
        p.amountDue.toFixed(2),
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
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">Procurement PO</h1>
          <p className="text-slate-500 font-medium mt-1">Track stock intake for <span className="text-amber-400 font-black">{currentStore.name}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="p-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all shadow-xl"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button onClick={() => setIsPaymentModalOpen(true)} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-6 py-4 rounded-2xl font-black flex items-center gap-3 uppercase tracking-widest text-xs hover:bg-blue-500 hover:text-white transition-all shadow-xl">
            <DollarSign className="w-5 h-5 stroke-[3px]" /> Pay Supplier
          </button>

          <button onClick={() => setIsModalOpen(true)} className="bg-amber-400 text-slate-950 px-6 py-4 rounded-2xl font-black flex items-center gap-3 uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform shadow-xl shadow-amber-900/20">
            <Plus className="w-5 h-5 stroke-[3px]" /> New Purchase
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="relative group mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
          <input type="text" placeholder="Search PO, Supplier or Product..." className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 focus:border-amber-400 transition-all amber-glow" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 bg-slate-900/80">
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
                const isPayment = purchase.poNumber?.startsWith('PAY-');
                const isVoid = purchase.poNumber?.startsWith('VOID-');
                const isReturn = purchase.poNumber?.startsWith('RET-');

                return (
                  <tr key={purchase.id} className={`group hover:bg-slate-800/40 transition-all ${isVoid ? 'opacity-50 grayscale' : ''} ${isReturn ? 'bg-orange-500/5 hover:bg-orange-500/10' : isPayment ? 'bg-blue-500/5 hover:bg-blue-500/10' : ''}`}>
                    <td className="px-6 py-5">
                      <p className={`font-black text-xs tracking-tighter ${isVoid ? 'text-rose-500 line-through' : isReturn ? 'text-orange-400' : isPayment ? 'text-blue-400' : 'text-white'}`}>{purchase.poNumber}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{new Date(purchase.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-300">{purchase.supplierName}</td>
                    <td className="px-6 py-5 text-sm text-slate-400">
                      {isPayment ? <span className="text-blue-400 italic font-bold">Supplier Payment</span> : isReturn ? <span className="text-orange-400 italic font-bold">{purchase.productName}</span> : purchase.productName}
                    </td>
                    <td className="px-6 py-5 text-center font-black text-white text-sm">
                      {isPayment ? '-' : (isVoid ? '0' : purchase.quantity)}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-sm">
                       {isPayment ? '-' : <span className={isReturn ? 'text-orange-400' : 'text-white'}>${isVoid ? '0' : purchase.totalCost.toLocaleString()}</span>}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isVoid ? (
                         <span className="text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest border border-rose-500/20">CANCELLED</span>
                      ) : isReturn ? (
                         <span className="text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest border border-orange-500/20">DUE ADJUSTED</span>
                      ) : isPayment ? (
                        <span className="text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest">+ ${purchase.amountPaid?.toLocaleString()} Paid</span>
                      ) : (
                        <>
                          <p className="text-emerald-400 text-xs font-black">${purchase.amountPaid.toLocaleString()} Paid</p>
                          {purchase.amountDue > 0 && <p className="text-amber-400 text-[10px] font-black uppercase tracking-tighter">${purchase.amountDue.toLocaleString()} Due</p>}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isVoid && (
                          <button onClick={() => handlePrint(purchase.poNumber)} className="p-2 text-slate-600 hover:text-amber-400" title="Print Memo"><Printer className="w-4 h-4" /></button>
                        )}
                        {!isPayment && !isVoid && !isReturn && (
                          <button onClick={() => handleOpenReturn(purchase)} title="Return to Supplier" className="p-2 text-slate-600 hover:text-orange-400"><RotateCcw className="w-4 h-4" /></button>
                        )}
                        {canDelete && !isVoid && !isReturn && (
                          purchase.amountPaid > 0 && !isPayment ? (
                            <button title="Cannot void: Payment exists" className="p-2 text-slate-600 cursor-not-allowed opacity-50"><AlertOctagon className="w-4 h-4" /></button>
                          ) : (
                            <button onClick={() => onDeletePurchase(purchase.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 && <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-500 text-xs font-bold uppercase tracking-widest opacity-50">No purchase records found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isPaymentModalOpen && (
             <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                 <motion.div onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0" />
                 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-8"><h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-400"/> Supplier Payment</h2><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button></div>
                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        <select required value={paymentSupplierId} onChange={e => setPaymentSupplierId(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-blue-400">
                           <option value="">Select Supplier to Pay</option>
                           {suppliers.filter(s => s.storeId === currentStore.id && s.totalDue > 0).map(s => (
                               <option key={s.id} value={s.id}>{s.name} (Due: ${s.totalDue.toLocaleString()})</option>
                           ))}
                        </select>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Payment Amount ($)</label>
                           <input type="number" step="0.01" min="0.01" required value={paymentAmount || ''} onFocus={e => e.target.select()} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-blue-400 font-black focus:border-blue-400" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50">Confirm Payment</button>
                    </form>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {isReturnModalOpen && purchaseToReturn && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative">
               <button onClick={() => setIsReturnModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
               <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-orange-500"/> Return to Supplier</h2>
               <p className="text-xs text-slate-400 font-bold mb-6">PO Number: {purchaseToReturn.poNumber}</p>

               <form onSubmit={handleReturnSubmit} className="space-y-6">
                   <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 mb-6">
                       <p className="text-sm font-bold text-white mb-1">{purchaseToReturn.productName}</p>
                       <p className="text-xs text-slate-400">Unit Cost: ${(purchaseToReturn.totalCost / purchaseToReturn.quantity).toFixed(2)} / item</p>
                   </div>

                   <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Return Quantity</label>
                       <input type="number" min="1" max={getMaxAllowedReturnQty(purchaseToReturn)} value={returnQty} onFocus={e => e.target.select()} onChange={e => setReturnQty(parseInt(e.target.value) || 1)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-orange-400 font-black focus:border-orange-500" />
                       <p className="text-[10px] text-orange-500/80 font-bold text-right mr-2 mt-1">Allowed Max: {getMaxAllowedReturnQty(purchaseToReturn)} items</p>
                   </div>

                   <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Adjustment Calculation</p>
                       <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                           <span>Total Value:</span><span>${(returnQty * (purchaseToReturn.totalCost / purchaseToReturn.quantity)).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-slate-300">
                           <span>Stock Decrease:</span><span className="text-rose-400">-{returnQty} Items</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-slate-300 mt-1">
                           <span>Due Reduced By:</span><span className="text-emerald-400">${(returnQty * (purchaseToReturn.totalCost / purchaseToReturn.quantity)).toFixed(2)}</span>
                       </div>
                   </div>

                   <button type="submit" disabled={isLoading} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-orange-600 transition-colors disabled:opacity-50">Confirm Return</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {isModalOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                 <motion.div onClick={resetForm} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                 <motion.div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-black text-white tracking-tight uppercase">New Purchase Order</h2><button onClick={resetForm} className="p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button></div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                           <input required placeholder="PO Number (e.g. PO-001)" value={poNumber} onChange={e => setPoNumber(e.target.value.toUpperCase())} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400" />
                           <select required value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400"><option value="">Select Supplier</option>{suppliers.filter(s => s.storeId === currentStore.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        </div>
                        <select required value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400"><option value="">Select Product</option>{products.filter(p => p.storeId === currentStore.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        <div className="grid grid-cols-3 gap-6">
                           <input type="number" required placeholder="Qty" min="1" value={quantity || ''} onFocus={e => e.target.select()} onChange={e => setQuantity(parseInt(e.target.value) || 0)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400" />
                           <input type="number" step="0.01" required placeholder="Cost/Item" value={unitCost || ''} onFocus={e => e.target.select()} onChange={e => setUnitCost(parseFloat(e.target.value) || 0)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-bold focus:border-amber-400" />
                           <input type="number" step="0.01" required placeholder="Paid Amount" value={amountPaid || ''} onFocus={e => e.target.select()} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-amber-400 font-bold focus:border-amber-400" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full py-5 bg-amber-400 text-slate-950 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50">Confirm Purchase</button>
                    </form>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>

      {/* 🔴 Smart Invoice Print Modal 🔴 */}
      <AnimatePresence>
        {showPrintModal && selectedPoForPrint && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 no-print">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white text-slate-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">Memo Preview</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="bg-slate-950 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors"><Printer className="w-4 h-4" /> Print</button>
                  <button onClick={() => setShowPrintModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 print-content" id="printable-invoice">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">{currentStore.name}</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{currentStore.location}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-1">
                      {selectedPoForPrint.startsWith('PAY-') ? 'Payment Receipt' : selectedPoForPrint.startsWith('RET-') ? 'Return Memo' : 'Purchase Order'}
                    </h2>
                    <p className="text-xs font-bold text-slate-400">{selectedPoForPrint}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Supplier Info</p>
                    <p className="font-black text-lg">{purchases.find(p => p.poNumber === selectedPoForPrint)?.supplierName || 'Unknown Supplier'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date Issued</p>
                    <p className="font-black text-lg">{new Date(purchases.find(p => p.poNumber === selectedPoForPrint)?.timestamp || new Date()).toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="w-full mb-12">
                  <thead>
                    <tr className="border-b-2 border-slate-950 text-[10px] font-black uppercase tracking-widest">
                      <th className="py-4 text-left">Description</th>
                      <th className="py-4 text-center">Qty</th>
                      <th className="py-4 text-right">Unit Cost</th>
                      <th className="py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.filter(p => p.poNumber === selectedPoForPrint).map(item => (
                      <tr key={item.id}>
                        <td className="py-4 font-bold">{item.poNumber?.startsWith('PAY-') ? 'Due Collection / Payment' : item.productName}</td>
                        <td className="py-4 text-center font-bold">{item.poNumber?.startsWith('PAY-') ? '-' : Math.abs(item.quantity)}</td>
                        <td className="py-4 text-right font-bold">${item.poNumber?.startsWith('PAY-') ? '-' : item.unitCost.toFixed(2)}</td>
                        <td className="py-4 text-right font-black">${Math.abs(item.totalCost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Total Value</span>
                      <span className="font-black">${Math.abs(purchases.filter(p => p.poNumber === selectedPoForPrint).reduce((acc, curr) => acc + curr.totalCost, 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      {/* 🔴 Dynamic Label for Return/Payment 🔴 */}
                      <span className="text-slate-500 font-bold">
                        {selectedPoForPrint.startsWith('RET-') ? 'Due Adjusted' : selectedPoForPrint.startsWith('PAY-') ? 'Amount Paid' : 'Amount Paid'}
                      </span>
                      <span className="font-black text-emerald-600">
                         ${Math.abs(purchases.filter(p => p.poNumber === selectedPoForPrint).reduce((acc, curr) => acc + (selectedPoForPrint.startsWith('RET-') ? curr.amountDue : (curr.amountPaid || 0)), 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t-2 border-slate-950 pt-3 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Current Balance</span>
                      <span className="text-2xl font-black">
                         ${suppliers.find(s => s.id === purchases.find(p => p.poNumber === selectedPoForPrint)?.supplierId)?.totalDue.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-20 pt-12 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Thank you for your business</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
};

export default Purchases;