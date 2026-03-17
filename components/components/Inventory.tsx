import React, { useState, useMemo, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import { Product, Store, User, UserRole, Sale, Expense, Supplier, Purchase } from '../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Package,
  Tag,
  ChevronDown,
  Zap,
  RotateCcw,
  CameraOff,
  Check,
  PackagePlus,
  ScanLine,
  CheckCircle2,
  LayoutDashboard,
  ArrowRight,
  Database,
  Printer,
  QrCode,
  Download,
  Truck,
  DollarSign
} from 'lucide-react';

interface InventoryProps {
  products: Product[]; 
  suppliers: Supplier[];
  purchases: Purchase[]; 
  currentStore: Store; 
  currentUser: User; 
  categories: string[];
  sales: Sale[];
  expenses: Expense[];
  onUpdate: (id: string, updates: Partial<Product> & { linkedExpenseId?: string }) => void;
  onDelete: (id: string) => void;
  onAdd: (newProduct: Omit<Product, 'id' | 'lastUpdated'>) => Promise<any> | void; 
  onAddSale: (sale: Omit<Sale, 'id' | 'timestamp'>) => void;
  onAddExpense: (expense: Omit<Expense, 'id' | 'timestamp'>) => Promise<any> | any;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => Promise<any> | any;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  onUpdateSupplierDue: (id: string, amount: number) => void;
  onAddPurchase: (purchase: Omit<Purchase, 'id' | 'timestamp'>) => void;
  canEditPrices: boolean;
  canDelete: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  suppliers,
  purchases, 
  currentStore, 
  currentUser, 
  categories,
  expenses,
  onUpdate, 
  onDelete,
  onAdd,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddCategory,
  onRemoveCategory,
  onUpdateSupplierDue,
  onAddPurchase,
  canEditPrices,
  canDelete
}) => {
  const [isRegistrationActive, setIsRegistrationActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [scannedSku, setScannedSku] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const scannerRef = useRef<any>(null);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.storeId === currentStore.id)
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
  }, [products, currentStore, searchTerm, selectedCategory]);

  const generateBarcodeID = (category: string) => {
    const prefix = category.substring(0, 2).toUpperCase();
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefix}-${random}`;
  };

  const handleCreateBarcode = (product: Product) => {
    if (!product.barcodeId) {
      const newId = generateBarcodeID(product.category);
      onUpdate(product.id, { barcodeId: newId });
      setBarcodeProduct({ ...product, barcodeId: newId });
    } else {
      setBarcodeProduct(product);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Buying Price', 'Selling Price', 'Min Threshold'];
    const data = filteredProducts.map(p => [
      p.sku,
      p.name.replace(/,/g, ';'),
      p.category,
      p.quantity,
      p.buyingPrice.toFixed(2),
      p.price.toFixed(2),
      p.minThreshold
    ]);
    
    const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_${currentStore.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const safeStopScanner = async () => {
    if (scannerRef.current) {
      try {
        const currentState = scannerRef.current.getState();
        if (currentState === 2 || currentState === 3) {
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
        const html5QrCode = new (window as any).Html5Qrcode("reg-scanner-reader");
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
              throw new Error("No camera hardware detected.");
            }
          }
        }
      } catch (err: any) {
        setScannerError(err?.message || "Optical hardware initialization failed.");
        setIsScanning(false);
      }
    }, 350);
  };

  const handleSkuLookup = (sku: string, fromScanner: boolean = false) => {
    setScannedSku(sku);
    if (!sku) {
      setMatchedProduct(null);
      return;
    }

    const existing = products.find(p => p.sku === sku && p.storeId === currentStore.id);
    if (existing) {
      setMatchedProduct(existing);
    } else {
      setMatchedProduct(null);
    }
  };

  const resetFormState = () => {
    setEditingProduct(null);
    setScannedSku('');
    setMatchedProduct(null);
    setIsScanning(false);
    setScannerError(null);
  };

  const handleEditAsset = (product: Product) => {
    const hasUnpaidDues = purchases?.some(purchase => {
      if (purchase.productId === product.id && purchase.amountDue > 0) {
        const supplier = suppliers.find(s => s.id === purchase.supplierId);
        return supplier && supplier.totalDue > 0;
      }
      return false;
    });

    if (hasUnpaidDues) {
      alert("⚠️ অ্যাকশন বাতিল! এই প্রোডাক্টটির সাপ্লায়ারের বকেয়া এখনো সম্পূর্ণ পরিশোধ করা হয়নি। এডিট করার আগে সাপ্লায়ার প্যানেল থেকে বকেয়া ক্লিয়ার করুন।");
      return;
    }

    setEditingProduct(product);
    setScannedSku(product.sku);
    setIsRegistrationActive(true);
  };

  const handleDeleteAsset = async (product: Product & { linkedExpenseId?: string }) => {
    const hasUnpaidDues = purchases?.some(purchase => {
      if (purchase.productId === product.id && purchase.amountDue > 0) {
        const supplier = suppliers.find(s => s.id === purchase.supplierId);
        return supplier && supplier.totalDue > 0;
      }
      return false;
    });

    if (hasUnpaidDues) {
      alert("⚠️ অ্যাকশন বাতিল! এই প্রোডাক্টটির সাপ্লায়ারের বকেয়া এখনো সম্পূর্ণ পরিশোধ করা হয়নি। ডিলিট করার আগে সাপ্লায়ার প্যানেল থেকে বকেয়া ক্লিয়ার করুন।");
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete ${product.name}? Any associated financial expenses will also be reversed.`)) {
      try {
        if (product.linkedExpenseId) {
          await onDeleteExpense(product.linkedExpenseId);
        } else {
          // পুরনো প্রোডাক্ট ডিলিট করার জন্য ফলব্যাক
          const fallbackExpense = expenses.find(exp => 
            exp.storeId === currentStore.id && 
            exp.category === "Operational Cost" &&
            exp.description.includes(product.name)
          );
          if (fallbackExpense) {
            await onDeleteExpense(fallbackExpense.id);
          }
        }
        onDelete(product.id);
      } catch (error) {
        console.error("Failed to delete product or linked expense", error);
        alert("Warning: Could not reverse associated expenses automatically.");
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    
    const supplierId = form.pSupplier?.value;
    const amountPaid = parseFloat(form.pPaidAmount?.value || '0'); 
    const supplier = suppliers.find(s => s.id === supplierId);

    const quantity = matchedProduct ? parseInt(form.pNewQty.value) : parseInt(form.pQty.value);
    const buyingPrice = parseFloat(form.pBuyingPrice.value);
    const totalCost = quantity * buyingPrice;
    const dueAmount = totalCost - amountPaid;
    
    const productName = matchedProduct?.name || form.pName.value;
    let finalProductId = matchedProduct?.id; 

    if (matchedProduct) {
      onUpdate(matchedProduct.id, { 
        quantity: matchedProduct.quantity + quantity,
        buyingPrice: buyingPrice
      });
    } else {
      const data = {
        name: productName,
        sku: scannedSku || form.pSku.value,
        category: form.pCat.value,
        quantity: quantity,
        buyingPrice: buyingPrice,
        price: parseFloat(form.pPrice.value),
        minThreshold: parseInt(form.pMin.value)
      };
      
      if(editingProduct) {
        onUpdate(editingProduct.id, data);
        finalProductId = editingProduct.id;

        // 🔴 SMART FALLBACK LOGIC: পুরনো প্রোডাক্টগুলোর খরচ আপডেট করার জন্য 🔴
        let expenseIdToUpdate = editingProduct.linkedExpenseId;
        
        if (!expenseIdToUpdate) {
          // যদি লিংক করা আইডি না থাকে, তবে নাম দিয়ে খুঁজে বের করবে
          const fallbackExpense = expenses.find(exp => 
            exp.storeId === currentStore.id && 
            exp.category === "Operational Cost" &&
            exp.description.includes(editingProduct.name) // পুরনো নাম দিয়ে খুঁজবে
          );
          
          if (fallbackExpense) {
            expenseIdToUpdate = fallbackExpense.id;
            // ভবিষ্যতে যেন আর খুঁজতে না হয়, তাই আইডিটা লিংক করে দিচ্ছে
            onUpdate(editingProduct.id, { linkedExpenseId: fallbackExpense.id });
          }
        }

        // এক্সপেন্স আপডেট করা হচ্ছে
        if (expenseIdToUpdate) {
          const relatedExp = expenses.find(exp => exp.id === expenseIdToUpdate);
          if (relatedExp && relatedExp.category === "Operational Cost") {
            onUpdateExpense(expenseIdToUpdate, {
              amount: totalCost, 
              description: `Updated cash purchase: ${productName} (${quantity} units)`
            });
          }
        }

      } else {
        const result = await onAdd({...data, storeId: currentStore.id}) as any;
        if (result && result.id) {
            finalProductId = result.id;
        }
      }
    }

    let generatedExpenseId: string | null = null;

    if (supplier && finalProductId && !editingProduct) {
      if (amountPaid > 0) {
        const expResult = await onAddExpense({
          storeId: currentStore.id,
          category: "Inventory Purchase",
          amount: amountPaid,
          description: `Paid to ${supplier.name} for stock`
        });
        if (expResult && expResult.id) generatedExpenseId = expResult.id;
      }

      if (dueAmount > 0) {
        onUpdateSupplierDue(supplier.id, dueAmount);
      }

      onAddPurchase({
        poNumber: `${matchedProduct ? 'INV' : 'REG'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        productId: finalProductId, 
        productName: productName,
        quantity: quantity,
        unitCost: buyingPrice,
        totalCost: totalCost,
        amountPaid: amountPaid,
        amountDue: dueAmount,
        storeId: currentStore.id
      });
    } else {
      if (totalCost > 0 && !editingProduct) {
        const expResult = await onAddExpense({
          storeId: currentStore.id,
          category: "Operational Cost",
          amount: totalCost,
          description: `Cash purchase for new stock: ${productName} (${quantity} units)`
        });
        if (expResult && expResult.id) generatedExpenseId = expResult.id;
      } else if (matchedProduct && totalCost > 0) {
        const expResult = await onAddExpense({
          storeId: currentStore.id,
          category: "Operational Cost",
          amount: totalCost,
          description: `Restock cash purchase: ${productName} (+${quantity} units)`
        });
        if (expResult && expResult.id) generatedExpenseId = expResult.id;
      }
    }

    if (generatedExpenseId && finalProductId && !editingProduct) {
      onUpdate(finalProductId, { linkedExpenseId: generatedExpenseId });
    }
    
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
    resetFormState();
    form.reset();
  };

  const BarcodeModal = () => {
    if (!barcodeProduct) return null;
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl no-print">
        <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Asset Label</h3>
            <button onClick={() => setBarcodeProduct(null)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          <div className="p-10 flex flex-col items-center">
            <div id="barcode-print-area" className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center">
              <p className="text-slate-950 font-black text-xs mb-1 text-center">{barcodeProduct.name}</p>
              <p className="text-slate-500 font-bold text-[8px] mb-3 text-center uppercase tracking-widest">SKU: {barcodeProduct.sku}</p>
              <Barcode 
                value={barcodeProduct.barcodeId || ''} 
                width={1.2} 
                height={50} 
                fontSize={12}
                background="#ffffff"
                lineColor="#000000"
              />
            </div>

            <div className="w-full mt-10 space-y-4">
              <button 
                onClick={handlePrint}
                className="w-full bg-amber-400 text-slate-950 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-xl shadow-amber-900/20"
              >
                <Printer className="w-5 h-5" /> Print Label (50x30mm)
              </button>
              <button 
                onClick={() => {
                  const newId = generateBarcodeID(barcodeProduct.category);
                  onUpdate(barcodeProduct.id, { barcodeId: newId });
                  setBarcodeProduct({ ...barcodeProduct, barcodeId: newId });
                }}
                className="w-full bg-slate-800 text-slate-300 py-4 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] hover:text-white transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Regenerate ID
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isRegistrationActive) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Enterprise Inventory</h1>
            <p className="text-slate-500 font-medium tracking-tight">Management for <span className="gold-gradient-text font-black">{currentStore.name}</span></p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <button 
              onClick={exportToCSV}
              className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all shadow-xl"
            >
              <Download className="w-5 h-5" />
            </button>
            {currentUser.role !== UserRole.SALESMAN && (
              <>
                <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-900 border border-slate-800 text-slate-300 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:border-amber-400/50 transition-all shadow-xl">
                  <Tag className="w-4 h-4 text-amber-500" /> <span className="hidden md:inline uppercase tracking-widest text-[10px]">Categories</span>
                </button>
                <button 
                  onClick={() => setIsRegistrationActive(true)} 
                  className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:shadow-lg hover:shadow-amber-500/20 transition-all shadow-xl uppercase tracking-widest text-xs"
                >
                  <Plus className="w-5 h-5 stroke-[3px]" />
                  Register Asset
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Query SKU or Name..." 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50 transition-all amber-glow" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <select 
              className="px-6 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-xs font-bold text-slate-300 focus:border-amber-400 transition-all cursor-pointer shadow-xl appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%20fill%3D%22%2394a3b8%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_1rem_center]" 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Sectors</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-6 py-5">Item Identifier</th>
                  <th className="px-6 py-5">Unit Cost</th>
                  <th className="px-6 py-5">Market Price</th>
                  <th className="px-6 py-5 text-center">Holding</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredProducts.map((p, idx) => (
                  <tr key={p.id} className={`group transition-all duration-300 hover:bg-slate-800/40 ${idx % 2 === 0 ? 'bg-slate-900/10' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-700/50 group-hover:border-amber-400/30 group-hover:text-amber-400 transition-all duration-500">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-white leading-none mb-1 text-sm tracking-tight">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-400 text-sm italic tracking-tight">
                      {currentUser.role === UserRole.SALESMAN ? '***' : `$${p.buyingPrice.toFixed(2)}`}
                    </td>
                    <td className="px-6 py-5 font-black text-amber-400 text-sm tracking-tight">${p.price.toFixed(2)}</td>
                    <td className="px-6 py-5 text-center">
                       <span className={`text-sm font-black tracking-tight ${p.quantity <= p.minThreshold ? 'text-rose-500' : 'text-emerald-400'}`}>
                         {p.quantity} <span className="text-[10px] text-slate-600 font-bold uppercase ml-1">units</span>
                       </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleCreateBarcode(p)} className="p-2.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all" title="Create Barcode"><QrCode className="w-4 h-4" /></button>
                        {canEditPrices && (
                          <button onClick={() => handleEditAsset(p)} className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteAsset(p)} className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
             <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
               <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
               <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                 <Tag className="w-6 h-6 text-amber-500" /> Sector Taxonomy
               </h2>
               <div className="space-y-6">
                  <div className="flex gap-3">
                     <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New Sector Tag..." className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 transition-all amber-glow" />
                     <button onClick={() => { if(newCatName.trim()) { onAddCategory(newCatName.trim()); setNewCatName(''); }}} className="bg-amber-400 text-slate-950 px-6 py-4 rounded-2xl font-black shadow-lg"><Plus className="w-6 h-6" /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                     {categories.map(cat => (
                       <div key={cat} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 group hover:border-amber-400/30 transition-all">
                          <span className="text-sm font-bold text-slate-200 uppercase tracking-widest">{cat}</span>
                          <button onClick={() => onRemoveCategory(cat)} className="text-slate-600 hover:text-rose-500 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
                       </div>
                     ))}
                  </div>
               </div>
             </div>
          </div>
        )}
        
        <BarcodeModal />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      <div className="lg:w-[450px] flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto custom-scrollbar relative">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              {editingProduct ? 'Update Asset' : matchedProduct ? 'Receive Intake' : 'New Registration'}
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Operational Session</p>
          </div>
          <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-2xl text-amber-400">
            <PackagePlus className="w-5 h-5" />
          </div>
        </div>

        {showSuccessToast && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in slide-in-from-top-2">
            <Check className="w-5 h-5" />
            <p className="text-xs font-black uppercase tracking-widest">Processed. Form reset for next SKU.</p>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 text-amber-500">sku identifier</label>
            <div className="relative group">
              <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input 
                name="pSku" 
                required 
                readOnly={!!matchedProduct || !!editingProduct}
                value={scannedSku}
                autoFocus
                onChange={e => !editingProduct && handleSkuLookup(e.target.value)}
                placeholder="Identify asset via SKU..." 
                className={`w-full pl-12 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow ${ (matchedProduct || editingProduct) ? 'opacity-70 bg-slate-800/50' : ''}`} 
              />
              {(!matchedProduct && !editingProduct) && !isScanning && (
                <button type="button" onClick={startScanner} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-amber-400 transition-colors"><ScanLine className="w-5 h-5" /></button>
              )}
            </div>
          </div>

          {isScanning && (
            <div className="mb-6 animate-in fade-in duration-300">
              <div className="relative aspect-video bg-slate-800 rounded-3xl overflow-hidden border-2 border-amber-400/50">
                <div id="reg-scanner-reader" className="w-full h-full"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-white/30 animate-scan pointer-events-none"></div>
                <button type="button" onClick={() => { setIsScanning(false); safeStopScanner(); }} className="absolute bottom-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Cancel</button>
              </div>
            </div>
          )}

          {scannerError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
              <CameraOff className="w-4 h-4" />
              <p>{scannerError}</p>
            </div>
          )}

          {matchedProduct && !editingProduct && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
              <div className="p-2.5 bg-emerald-500 rounded-xl text-slate-950"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="flex-1">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Asset Matched</p>
                 <p className="text-white font-bold text-xs truncate">{matchedProduct.name}</p>
              </div>
              <button type="button" onClick={() => { setMatchedProduct(null); setScannedSku(''); }} className="p-2 text-slate-500 hover:text-white"><RotateCcw className="w-4 h-4" /></button>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Asset Name</label>
              <input 
                name="pName" 
                required 
                readOnly={!!matchedProduct} 
                value={matchedProduct ? matchedProduct.name : undefined} 
                defaultValue={editingProduct?.name} 
                placeholder="Product Name" 
                className={`w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow ${matchedProduct ? 'opacity-70 cursor-not-allowed italic' : ''}`} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Sector / Category</label>
              <div className="relative">
                <select 
                  name="pCat" 
                  disabled={!!matchedProduct} 
                  value={matchedProduct ? matchedProduct.category : undefined} 
                  defaultValue={editingProduct?.category} 
                  className={`w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none ${matchedProduct ? 'opacity-70 cursor-not-allowed italic' : ''}`}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {!matchedProduct && <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-amber-500" /> Supplier Profile
                </label>
                <div className="relative">
                  <select 
                    name="pSupplier" 
                    className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none"
                  >
                    <option value="">(None - Cash Buy)</option>
                    {suppliers.filter(s => s.storeId === currentStore.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> Paid Amount ($)
                </label>
                <input 
                  name="pPaidAmount" 
                  type="number" 
                  step="0.01" 
                  defaultValue={0}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                  onFocus={(e) => e.target.select()}
                  className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400" 
                />
              </div>
            </div>

            {matchedProduct ? (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-2">Add Stock (Vol)</label>
                  <input name="pNewQty" type="number" required autoFocus placeholder="+Volume" onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-rose-500/50 rounded-2xl outline-none text-white font-black focus:border-rose-500 amber-glow shadow-[0_0_20px_rgba(244,63,94,0.1)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Unit Cost ($)</label>
                  <input name="pBuyingPrice" type="number" step="0.01" required defaultValue={matchedProduct.buyingPrice} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Acquisition Cost ($)</label>
                     <input name="pBuyingPrice" type="number" step="0.01" required defaultValue={editingProduct?.buyingPrice || 0} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Market Price ($)</label>
                     <input name="pPrice" type="number" step="0.01" required defaultValue={editingProduct?.price || 0} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-amber-400 font-black focus:border-amber-400" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Current Holding</label>
                    <input name="pQty" type="number" required defaultValue={editingProduct?.quantity || 0} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Min. Threshold</label>
                    <input name="pMin" type="number" required defaultValue={editingProduct?.minThreshold || 5} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit" 
              className={`w-full py-5 rounded-[2rem] font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-2xl ${matchedProduct ? 'bg-emerald-500 text-slate-950 shadow-emerald-900/20' : 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-amber-900/20'} hover:scale-[1.02]`}
            >
              {matchedProduct ? 'Confirm Intake' : editingProduct ? 'Commit Changes' : 'Complete Registration'}
              <Zap className="w-5 h-5" />
            </button>
            <button 
              type="button" 
              onClick={() => { setIsRegistrationActive(false); resetFormState(); }} 
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
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Live Asset Ledger</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Synchronized Inventory Base</p>
           </div>
           <div className="p-3 bg-slate-800 rounded-2xl text-amber-500 border border-slate-700 shadow-xl">
              <Database className="w-5 h-5" />
           </div>
        </div>

        <div className="p-6 border-b border-slate-800/50">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none text-slate-100 text-sm focus:border-amber-400/50 transition-all" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-6 py-5">Identifier</th>
                  <th className="px-6 py-5 text-center">Holding</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-800/40 transition-all">
                    <td className="px-6 py-5">
                      <p className="font-bold text-white text-sm truncate max-w-[150px]">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{p.sku}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-sm font-black ${p.quantity <= p.minThreshold ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-amber-400 text-sm">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => handleCreateBarcode(p)} 
                          className="p-2 text-slate-400 hover:text-amber-400 transition-colors" 
                          title="Generate Barcode"
                         >
                          <QrCode className="w-4 h-4" />
                         </button>
                         {canEditPrices && (
                          <button onClick={() => handleEditAsset(p)} className="p-2.5 text-slate-400 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                         )}
                         {canDelete && (
                          <button 
                            onClick={() => handleDeleteAsset(p)} 
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                         )}
                      </div>
                      <span className="group-hover:hidden">${p.price.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
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
      `}</style>

      <BarcodeModal />
    </div>
  );
};

export default Inventory;