import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sale, Product, Store, User, UserRole, Customer, Expense } from '../types';
import { 
  ShoppingCart, 
  Search, 
  User as UserIcon, 
  Hash, 
  DollarSign, 
  Trash2, 
  X,
  ArrowRight,
  ScanLine,
  AlertCircle,
  Zap,
  RotateCcw,
  CameraOff,
  Check,
  Package,
  History,
  LayoutDashboard,
  TrendingUp,
  Printer,
  Download,
  CreditCard
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

interface SalesProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  currentStore: Store;
  currentUser: User;
  onAddSale: (sale: Omit<Sale, 'id' | 'timestamp'>) => void;
  onUpdateSale: (id: string, updates: Partial<Sale>) => void;
  onUpdateStock: (id: string, updates: Partial<Product>) => void;
  onUpdateCustomerDue: (id: string, amount: number) => void;
  onDeleteSale: (id: string) => void;
  canDelete: boolean;
}

const Sales: React.FC<SalesProps> = ({ 
  sales, 
  products, 
  customers,
  expenses,
  currentStore, 
  currentUser, 
  onAddSale, 
  onUpdateSale,
  onUpdateStock,
  onUpdateCustomerDue,
  onDeleteSale,
  canDelete
}) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // Scanner Logic
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  // Form State
  const [skuId, setSkuId] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [invoiceId, setInvoiceId] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<string | null>(null);

  useEffect(() => {
    if (isSessionActive && !invoiceId) {
      const year = new Date().getFullYear();
      const count = sales.length + 1;
      const formattedCount = String(count).padStart(3, '0');
      setInvoiceId(`INV-${year}-${formattedCount}`);
    }
  }, [isSessionActive, sales.length, invoiceId]);

  const resetEntryForm = () => {
    setSkuId('');
    setMatchedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
    setDiscount(0);
    setAmountPaid(0);
    setScannerError(null);
  };

  const safeStopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn("Scanner stop suppressed:", err);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    setScannerError(null);
    await safeStopScanner();

    setTimeout(async () => {
      try {
        const html5QrCode = new (window as any).Html5Qrcode("sales-scanner-reader");
        scannerRef.current = html5QrCode;
        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        const onScanSuccess = (decodedText: string) => {
          handleSkuLookup(decodedText, true);
          setIsScanning(false);
          safeStopScanner();
        };

        try {
          await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
        } catch (err1) {
          try {
            await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
          } catch (err2) {
            const devices = await (window as any).Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              await html5QrCode.start(devices[0].id, config, onScanSuccess, () => {});
            } else {
              throw new Error("Optical device unavailable.");
            }
          }
        }
      } catch (err: any) {
        setScannerError(err?.message || "Scanner initialization failed.");
        setIsScanning(false);
      }
    }, 350);
  };

  const handleSkuLookup = (sku: string, isFromScanner: boolean = false) => {
    setSkuId(sku);
    if (!sku) {
      setMatchedProduct(null);
      return;
    }

    const product = products.find(p => p.sku === sku && p.storeId === currentStore.id);
    if (product) {
      setMatchedProduct(product);
      setUnitPrice(product.price);
    } else {
      setMatchedProduct(null);
      if (isFromScanner) {
        alert('Product not registered! Please add to inventory first.');
        setSkuId('');
      }
      if (sku.length >= 8) {
        const timer = setTimeout(() => {
          if (!products.find(p => p.sku === sku && p.storeId === currentStore.id) && sku === skuId) {
            alert('Product not registered! Please add to inventory first.');
            setSkuId('');
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  };

  const totalAmount = useMemo(() => {
    const base = quantity * unitPrice;
    const discounted = base * (1 - (discount / 100));
    return discounted;
  }, [quantity, unitPrice, discount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedProduct) return;
    
    if (quantity > matchedProduct.quantity) {
      alert("Error: Insufficient stock for settlement.");
      return;
    }

    const isCashSale = !customerId || customerId === '';
    const totalCost = totalAmount;
    
    const finalAmountPaid = isCashSale ? totalCost : amountPaid;
    const currentDue = isCashSale ? 0 : Math.max(0, totalCost - finalAmountPaid);
    const finalCustomerName = isCashSale ? 'Cash Sale (Walk-in)' : (customerName || 'Walk-in Customer');

    onAddSale({
      invoiceId,
      customerId: isCashSale ? (null as unknown as string) : customerId,
      customerName: finalCustomerName,
      productId: matchedProduct.id,
      productName: matchedProduct.name,
      quantity,
      buyingPrice: matchedProduct.buyingPrice,
      unitPrice,
      discount,
      totalPrice: totalCost,
      amountPaid: finalAmountPaid,
      amountDue: currentDue,
      storeId: currentStore.id
    });

    onUpdateStock(matchedProduct.id, { quantity: matchedProduct.quantity - quantity });
    
    if (!isCashSale && currentDue > 0) {
      onUpdateCustomerDue(customerId, currentDue);
    }
    
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 1500);
    resetEntryForm();
  };

  const handleLedgerQuantityChange = (sale: Sale, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    const product = products.find(p => p.id === sale.productId);
    if (!product) return;

    const diff = sale.quantity - newQty;
    if (diff < 0 && product.quantity < Math.abs(diff)) {
      alert("Insufficient inventory for adjustment.");
      return;
    }

    const currentEffectiveUnitPrice = sale.totalPrice / sale.quantity;
    const newTotal = newQty * currentEffectiveUnitPrice;

    onUpdateSale(sale.id, { quantity: newQty, totalPrice: newTotal });
    onUpdateStock(product.id, { quantity: product.quantity + diff });
  };

  const handleLedgerTotalChange = (sale: Sale, newTotal: number) => {
    if (isNaN(newTotal) || newTotal < 0) return;
    onUpdateSale(sale.id, { totalPrice: newTotal, unitPrice: newTotal / sale.quantity });
  };

  const sessionSales = useMemo(() => {
    return sales.filter(s => s.invoiceId === invoiceId && s.storeId === currentStore.id);
  }, [sales, invoiceId, currentStore.id]);

  const totalTurnover = useMemo(() => {
    return sessionSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
  }, [sessionSales]);

  // 🔴 100% BULLETPROOF CALCULATION LOGIC 🔴
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.storeId === currentStore.id && s.timestamp.startsWith(today));
    const todayExpenses = expenses.filter(e => e.storeId === currentStore.id && e.timestamp.startsWith(today));
    
    let totalSales = 0;
    let todayCash = 0;
    let totalProfit = 0;

    todaySales.forEach(s => {
      // ইনভয়েস নম্বর PAY- দিয়ে শুরু হলে অথবা আইডি PAYMENT_RECEIVED হলে সেটি শুধুমাত্র ক্যাশ রিসিভ
      const isPayment = s.invoiceId?.startsWith('PAY-') || s.productId === 'PAYMENT_RECEIVED';

      // 1. Today's Cash (সবকিছুর নগদ আদায় যোগ হবে)
      todayCash += (s.amountPaid || 0);

      // 2. Sales & Profit (পেমেন্ট রিসিভ হলে এগুলো যোগ হবে না)
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

  const exportToCSV = () => {
    const headers = ['Invoice', 'Customer', 'Product', 'Qty', 'Unit Price', 'Discount', 'Total', 'Paid', 'Due', 'Date'];
    const data = sales
      .filter(s => s.storeId === currentStore.id)
      .map(s => {
        const isPayment = s.invoiceId?.startsWith('PAY-') || s.productId === 'PAYMENT_RECEIVED';
        return [
          s.invoiceId,
          s.customerName,
          isPayment ? 'DUE COLLECTION' : s.productName,
          isPayment ? '-' : s.quantity,
          isPayment ? '-' : s.unitPrice.toFixed(2),
          isPayment ? '-' : s.discount + '%',
          isPayment ? '-' : s.totalPrice.toFixed(2),
          (s.amountPaid || 0).toFixed(2),
          (s.amountDue || 0).toFixed(2),
          new Date(s.timestamp).toLocaleDateString()
        ];
      });
    
    const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_${currentStore.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (invId: string) => {
    setSelectedInvoiceForPrint(invId);
    setShowPrintModal(true);
  };

  // Main View: Historical Ledger
  if (!isSessionActive) {
    const historicalSales = sales
      .filter(s => s.storeId === currentStore.id)
      .filter(s => {
        const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.productName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !filterDate || s.timestamp.startsWith(filterDate);
        return matchesSearch && matchesDate;
      });

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Sales Operations</h1>
            <p className="text-slate-500 font-medium italic">General ledger for <span className="gold-gradient-text font-black">{currentStore.name}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="p-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all shadow-xl"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSessionActive(true)}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 px-6 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-amber-900/10 uppercase tracking-widest text-xs"
            >
              <ShoppingCart className="w-5 h-5 stroke-[3px]" />
              Record New Sale
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Balance</p>
              <h3 className={`text-lg font-black tracking-tighter ${todayStats.netBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                ${todayStats.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Query invoice, customer or item..." 
                className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 focus:border-amber-400 transition-all amber-glow" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <input type="date" className="px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-xs font-bold text-slate-300 focus:border-amber-400" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Invoice</th>
                  <th className="px-6 py-5">Customer</th>
                  <th className="px-6 py-5">Item</th>
                  <th className="px-6 py-5 text-center">Qty</th>
                  <th className="px-6 py-5 text-right">Settlement</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {historicalSales.map((sale) => {
                  const isPayment = sale.invoiceId?.startsWith('PAY-') || sale.productId === 'PAYMENT_RECEIVED';
                  return (
                    <tr key={sale.id} className="group hover:bg-slate-800/40 transition-all">
                      <td className="px-6 py-5 font-bold text-slate-400 text-xs whitespace-nowrap">
                        {new Date(sale.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 font-black text-white text-xs tracking-tighter">{sale.invoiceId}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-300">{sale.customerName}</td>
                      <td className="px-6 py-5 text-sm text-slate-400">
                        {isPayment ? (
                          <span className="text-blue-400 italic font-bold">Due Collection</span>
                        ) : (
                          sale.productName
                        )}
                      </td>
                      <td className="px-6 py-5 text-center font-black text-white text-sm">
                        {isPayment ? '-' : sale.quantity}
                      </td>
                      <td className="px-6 py-5 text-right font-black text-sm">
                        {isPayment ? (
                          <span className="text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest">+ ${sale.amountPaid?.toFixed(2)}</span>
                        ) : (
                          <div className="text-emerald-400">
                            <p>${sale.totalPrice.toFixed(2)}</p>
                            {sale.amountDue > 0 && <p className="text-rose-400 text-[9px] uppercase tracking-tighter mt-1">Due: ${sale.amountDue.toFixed(2)}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPayment && (
                            <button onClick={() => handlePrint(sale.invoiceId)} className="p-2 text-slate-600 hover:text-amber-400"><Printer className="w-4 h-4" /></button>
                          )}
                          {canDelete && (
                            <button onClick={() => onDeleteSale(sale.id)} className="p-2 text-slate-600 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Session View
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      <div className="lg:w-[450px] flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto custom-scrollbar relative">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">New Sale Session</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{invoiceId}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Active Entry</span>
          </div>
        </div>

        {showSuccessToast && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in slide-in-from-top-2">
            <Check className="w-5 h-5" />
            <p className="text-xs font-black uppercase tracking-widest">Confirmed. Form blanked for next SKU.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 text-amber-500">sku identifier</label>
            <div className="relative group">
              <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input 
                required 
                value={skuId}
                autoFocus
                onChange={e => handleSkuLookup(e.target.value)}
                placeholder="Search SKU..." 
                className={`w-full pl-12 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow ${matchedProduct ? 'bg-slate-800/50 border-amber-400/30' : ''}`} 
              />
              {!isScanning && (
                <button type="button" onClick={startScanner} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-amber-400 transition-all"><ScanLine className="w-5 h-5" /></button>
              )}
            </div>
          </div>

          {isScanning && (
            <div className="mb-6 animate-in fade-in duration-300">
              <div className="relative aspect-video bg-slate-800 rounded-3xl overflow-hidden border-2 border-amber-400/50">
                <div id="sales-scanner-reader" className="w-full h-full"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-white/30 animate-scan pointer-events-none"></div>
                <button onClick={() => { setIsScanning(false); safeStopScanner(); }} className="absolute bottom-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Cancel</button>
              </div>
            </div>
          )}

          {scannerError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
              <CameraOff className="w-4 h-4" />
              <p>{scannerError}</p>
            </div>
          )}

          {matchedProduct && (
            <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Name</label>
                <div className="w-full px-5 py-3.5 bg-slate-800/50 border border-slate-800 rounded-xl text-slate-400 font-bold text-xs truncate select-none italic">
                  {matchedProduct.name}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Category</label>
                <div className="w-full px-5 py-3.5 bg-slate-800/50 border border-slate-800 rounded-xl text-slate-400 font-bold text-xs select-none italic">
                  {matchedProduct.category}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Customer Profile</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <select 
                value={customerId}
                onChange={e => {
                  const cust = customers.find(c => c.id === e.target.value);
                  setCustomerId(e.target.value);
                  setCustomerName(cust ? cust.name : '');
                }}
                className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none"
              >
                <option value="">Walk-in Customer</option>
                {customers.filter(c => c.storeId === currentStore.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ${!matchedProduct ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">volume (qty)</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  required 
                  type="number" 
                  min="1" 
                  max={matchedProduct?.quantity || 1}
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-black focus:border-amber-400 amber-glow" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">selling price ($)</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  value={unitPrice}
                  onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400 amber-glow" 
                />
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ${!matchedProduct ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">discount (%)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-rose-500 font-black focus:border-amber-400 amber-glow" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">amount paid ($)</label>
              <div className="relative group">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  type="number" 
                  step="0.01" 
                  disabled={!customerId}
                  value={!customerId ? totalAmount : amountPaid}
                  onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl outline-none font-black transition-all ${
                    !customerId 
                      ? 'bg-emerald-900/20 border border-emerald-500/30 text-emerald-500 cursor-not-allowed' 
                      : 'bg-slate-800 border border-slate-700 text-amber-400 focus:border-amber-400 amber-glow'
                  }`} 
                />
              </div>
            </div>
          </div>

          <div className={`bg-slate-950 p-6 rounded-3xl border border-slate-800 mt-auto ${!matchedProduct ? 'opacity-50 grayscale' : ''}`}>
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Estimated Settlement</span>
                <span className="text-2xl font-black gold-gradient-text tracking-tighter">${totalAmount.toFixed(2)}</span>
             </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={!matchedProduct}
              className={`w-full py-5 rounded-[2rem] font-black shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${matchedProduct ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-amber-900/20 hover:scale-[1.02]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              confirm settlement <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              type="button" 
              onClick={() => { setIsSessionActive(false); setInvoiceId(''); setCustomerName(''); resetEntryForm(); }}
              className="w-full py-4 bg-slate-800 border border-slate-700 text-slate-400 rounded-[2rem] font-black hover:text-white transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl"
            >
              complete
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Live Sales Ledger</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Active Session Tracking</p>
           </div>
           <div className="p-3 bg-slate-800 rounded-2xl text-amber-500 border border-slate-700 shadow-xl">
              <History className="w-5 h-5" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-6 py-5">Item</th>
                  <th className="px-6 py-5 text-center">Vol (Qty)</th>
                  <th className="px-6 py-5 text-right">Settlement ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sessionSales.map((sale) => (
                    <tr key={sale.id} className="group hover:bg-slate-800/40 transition-all animate-in slide-in-from-right-4 duration-300">
                      <td className="px-6 py-5">
                        <p className="font-bold text-white text-sm truncate max-w-[180px]">{sale.productName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">{sale.customerName}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <input 
                          type="number"
                          min="1"
                          value={sale.quantity}
                          onChange={(e) => handleLedgerQuantityChange(sale, parseInt(e.target.value))}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-xl text-center font-black text-amber-400 text-sm focus:border-amber-400 outline-none p-1.5 shadow-inner"
                        />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-emerald-400 text-xs font-bold">$</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={sale.totalPrice}
                            onChange={(e) => handleLedgerTotalChange(sale, parseFloat(e.target.value))}
                            className="w-28 bg-slate-800 border border-slate-700 rounded-xl text-right font-black text-emerald-400 text-sm focus:border-emerald-400 outline-none p-1.5 shadow-inner"
                          />
                        </div>
                      </td>
                    </tr>
                ))}
                {sessionSales.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center opacity-30 grayscale">
                       <LayoutDashboard className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Awaiting session confirm</p>
                    </td>
                  </tr>
                )}
              </tbody>
           </table>
        </div>
        
        <div className="p-8 bg-slate-950 border-t border-slate-800">
           <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Turnover</p>
                <p className="text-2xl font-black text-white">${totalTurnover.toFixed(2)}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Items Settled</p>
                <p className="text-2xl font-black text-amber-400">{sessionSales.length}</p>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 1.5s ease-in-out infinite;
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      <AnimatePresence>
        {showPrintModal && selectedInvoiceForPrint && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white text-slate-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">Invoice Preview</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="bg-slate-950 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button 
                    onClick={() => setShowPrintModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 print-content" id="printable-invoice">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">{currentStore.name}</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{currentStore.location}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Invoice</h2>
                    <p className="text-xs font-bold text-slate-400">{selectedInvoiceForPrint}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                    <p className="font-black text-lg">{sales.find(s => s.invoiceId === selectedInvoiceForPrint)?.customerName || 'Walk-in Customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date Issued</p>
                    <p className="font-black text-lg">{new Date(sales.find(s => s.invoiceId === selectedInvoiceForPrint)?.timestamp || '').toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="w-full mb-12">
                  <thead>
                    <tr className="border-b-2 border-slate-950 text-[10px] font-black uppercase tracking-widest">
                      <th className="py-4 text-left">Description</th>
                      <th className="py-4 text-center">Qty</th>
                      <th className="py-4 text-right">Unit</th>
                      <th className="py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.filter(s => s.invoiceId === selectedInvoiceForPrint).map(item => (
                      <tr key={item.id}>
                        <td className="py-4 font-bold">{item.productId === 'PAYMENT_RECEIVED' ? 'Due Collection' : item.productName}</td>
                        <td className="py-4 text-center font-bold">{item.productId === 'PAYMENT_RECEIVED' ? '-' : item.quantity}</td>
                        <td className="py-4 text-right font-bold">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-4 text-right font-black">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Subtotal</span>
                      <span className="font-black">${sales.filter(s => s.invoiceId === selectedInvoiceForPrint).reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Amount Paid</span>
                      <span className="font-black text-emerald-600">${sales.filter(s => s.invoiceId === selectedInvoiceForPrint).reduce((acc, curr) => acc + (curr.amountPaid || 0), 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t-2 border-slate-950 pt-3 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest">Balance Due</span>
                      <span className="text-2xl font-black">${sales.filter(s => s.invoiceId === selectedInvoiceForPrint).reduce((acc, curr) => acc + (curr.amountDue || 0), 0).toFixed(2)}</span>
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
    </div>
  );
};

export default Sales;