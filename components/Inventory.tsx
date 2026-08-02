import React, { useState, useMemo, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import { Product, Store, User, UserRole, Sale, Expense, Supplier, Purchase } from '../types';
import { 
  Search, Plus, Edit2, Trash2, X, Package, Tag, ChevronDown, Zap, 
  RotateCcw, CameraOff, Check, PackagePlus, ScanLine, CheckCircle2, 
  LayoutDashboard, ArrowRight, Database, Printer, QrCode, Download, 
  Truck, DollarSign, Calculator
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
  products, suppliers, purchases, currentStore, currentUser, categories,
  expenses, onUpdate, onDelete, onAdd, onAddExpense, onUpdateExpense,
  onDeleteExpense, onAddCategory, onRemoveCategory, onUpdateSupplierDue,
  onAddPurchase, canEditPrices, canDelete
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

  const [regQty, setRegQty] = useState<number | ''>('');
  const [regBuyingPrice, setRegBuyingPrice] = useState<number | ''>('');

  useEffect(() => {
    if (editingProduct) {
      setRegQty(editingProduct.quantity);
      setRegBuyingPrice(editingProduct.buyingPrice);
    } else if (matchedProduct) {
      setRegQty('');
      setRegBuyingPrice(matchedProduct.buyingPrice);
    } else {
      setRegQty('');
      setRegBuyingPrice('');
    }
  }, [editingProduct, matchedProduct, isRegistrationActive]);

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

  // 🟢 Inventory Status Logic 🟢
  const inventoryStats = useMemo(() => {
    const storeProducts = products.filter(p => p.storeId === currentStore.id);
    const stockEquity = storeProducts.reduce((acc, p) => acc + (p.quantity * p.buyingPrice), 0);
    return { totalItems: storeProducts.length, stockEquity };
  }, [products, currentStore.id]);

  // 🟢 iFrame Print Preview Logic for PDF/Printing 🟢
  const handlePrintInventory = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const storeProducts = products.filter(p => p.storeId === currentStore.id);
    
    const tableRows = storeProducts.map(p => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${p.sku}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #111; font-weight: bold;">${p.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${p.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #111; font-weight: bold;">${p.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #666;">$${p.buyingPrice.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #111; font-weight: bold;">$${(p.quantity * p.buyingPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    const printHTML = `
      <html>
        <head>
          <title>Inventory Report - ${currentStore.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; background: white; color: black; }
            .header { text-align: center; margin-bottom: 30px; }
            h1 { margin: 0 0 5px 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
            
            .summary-box { display: flex; justify-content: space-around; margin-bottom: 30px; padding: 20px; border: 2px solid #000; border-radius: 10px; }
            .summary-item { text-align: center; }
            .summary-title { font-size: 10px; text-transform: uppercase; color: #555; font-weight: bold; letter-spacing: 1.5px; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: 900; color: #000; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8f9fa; padding: 12px 10px; border-bottom: 2px solid #000; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #333; }
            th.center { text-align: center; }
            th.right { text-align: right; }
            td { font-size: 13px; }
            
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            
            @media print {
              @page { margin: 15mm; size: A4 portrait; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${currentStore.name}</h1>
            <div class="subtitle">Complete Asset & Inventory Report</div>
          </div>
          
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-title">Total Registered Assets</div>
              <div class="summary-value">${inventoryStats.totalItems} Items</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Total Stock Equity (Cost)</div>
              <div class="summary-value">$${inventoryStats.stockEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th class="center">Holding Qty</th>
                <th class="right">Unit Cost</th>
                <th class="right">Total Equity</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHTML);
      doc.close();
      
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

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
    setRegQty('');
    setRegBuyingPrice('');
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

    const quantity = parseInt(regQty.toString()) || 0;
    const buyingPrice = parseFloat(regBuyingPrice.toString()) || 0;
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

        let expenseIdToUpdate = editingProduct.linkedExpenseId;
        if (!expenseIdToUpdate) {
          const fallbackExpense = expenses.find(exp => 
            exp.storeId === currentStore.id && 
            exp.category === "Operational Cost" &&
            exp.description.includes(editingProduct.name)
          );
          
          if (fallbackExpense) {
            expenseIdToUpdate = fallbackExpense.id;
            onUpdate(editingProduct.id, { linkedExpenseId: fallbackExpense.id });
          }
        }

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
    const [printQty, setPrintQty] = useState(1);
    const printAreaRef = useRef<HTMLDivElement>(null);
    
    if (!barcodeProduct) return null;

    const handleDirectPrint = () => {
      if (!printAreaRef.current) return;
      
      const printContent = printAreaRef.current.innerHTML;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Print Label</title>
              <style>
                @page { size: 50mm 30mm; margin: 0; }
                body { margin: 0; padding: 0; background: white; font-family: 'Courier New', Courier, monospace; }
                .barcode-label { 
                  width: 50mm; 
                  height: 30mm; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  box-sizing: border-box; 
                  page-break-after: always; 
                  overflow: hidden; 
                  background: white; 
                  color: black;
                }
                .barcode-label:last-child { page-break-after: auto; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        doc.close();
        
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
      }
    };
    
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 sm:p-8 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Asset Label</h3>
            <button onClick={() => setBarcodeProduct(null)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="p-6 sm:p-10 flex flex-col items-center">
            {/* Screen Preview */}
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center w-[250px]">
              <p className="text-slate-950 font-black text-xs mb-1 text-center truncate w-full">{barcodeProduct.name}</p>
              <p className="text-slate-500 font-bold text-[8px] mb-3 text-center uppercase tracking-widest">SKU: {barcodeProduct.sku}</p>
              <Barcode value={barcodeProduct.barcodeId || ''} width={1.2} height={40} fontSize={12} background="#ffffff" lineColor="#000000" margin={0} />
            </div>

            <div className="w-full mt-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 text-center block">Number of Labels to Print</label>
                <input 
                  type="number" min="1" 
                  value={printQty} 
                  onChange={e => setPrintQty(parseInt(e.target.value) || 1)} 
                  onFocus={e => e.target.select()}
                  className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-amber-400 text-center font-black focus:border-amber-400 text-lg shadow-inner" 
                />
              </div>

              <button onClick={handleDirectPrint} className="w-full bg-amber-400 text-slate-950 py-4 sm:py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-xl shadow-amber-900/20">
                <Printer className="w-5 h-5" /> Print {printQty} Label{printQty > 1 ? 's' : ''}
              </button>
              <button onClick={() => {
                  const newId = generateBarcodeID(barcodeProduct.category);
                  onUpdate(barcodeProduct.id, { barcodeId: newId });
                  setBarcodeProduct({ ...barcodeProduct, barcodeId: newId });
                }} className="w-full bg-slate-800 text-slate-300 py-3 sm:py-4 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] hover:text-white transition-all">
                <RotateCcw className="w-4 h-4" /> Regenerate ID
              </button>
            </div>
          </div>

          {/* লুকানো প্রিন্ট এরিয়া (লুপ করে মাল্টিপল বারকোড তৈরি করবে) */}
          <div ref={printAreaRef} style={{ display: 'none' }}>
             {Array.from({ length: printQty }).map((_, i) => (
                <div key={i} className="barcode-label">
                  <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#000', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', width: '100%' }}>{barcodeProduct.name}</p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '8px', color: '#555', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}>SKU: {barcodeProduct.sku}</p>
                  <Barcode value={barcodeProduct.barcodeId || ''} width={1.2} height={25} fontSize={10} background="#ffffff" lineColor="#000000" margin={0} />
                </div>
             ))}
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
            <button onClick={exportToCSV} className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all shadow-xl"><Download className="w-5 h-5" /></button>
            {currentUser.role !== UserRole.SALESMAN && (
              <>
                <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-900 border border-slate-800 text-slate-300 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:border-amber-400/50 transition-all shadow-xl">
                  <Tag className="w-4 h-4 text-amber-500" /> <span className="hidden md:inline uppercase tracking-widest text-[10px]">Categories</span>
                </button>
                <button onClick={() => setIsRegistrationActive(true)} className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:shadow-lg hover:shadow-amber-500/20 transition-all shadow-xl uppercase tracking-widest text-xs">
                  <Plus className="w-5 h-5 stroke-[3px]" /> Register Asset
                </button>
              </>
            )}
          </div>
        </div>

        {/* 🟢 Inventory Status Card with Print Logic 🟢 */}
        <div 
          onClick={handlePrintInventory}
          className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden cursor-pointer hover:border-amber-400/50 transition-all group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Package className="w-32 h-32 text-amber-400" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-amber-500" /> Inventory Status
          </h2>
          <div className="flex flex-col md:flex-row gap-8 relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Assets</p>
              <p className="text-4xl font-black text-white">{inventoryStats.totalItems}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Equity</p>
              <p className="text-4xl font-black text-emerald-400">${inventoryStats.stockEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </span>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input type="text" placeholder="Query SKU or Name..." className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50 transition-all amber-glow" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="px-6 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-xs font-bold text-slate-300 focus:border-amber-400 transition-all cursor-pointer shadow-xl appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%20fill%3D%22%2394a3b8%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_1rem_center]" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
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
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-700/50 group-hover:border-amber-400/30 group-hover:text-amber-400 transition-all duration-500"><Package className="w-6 h-6" /></div>
                        <div>
                          <p className="font-bold text-white leading-none mb-1 text-sm tracking-tight">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-400 text-sm italic tracking-tight">{currentUser.role === UserRole.SALESMAN ? '***' : `$${p.buyingPrice.toFixed(2)}`}</td>
                    <td className="px-6 py-5 font-black text-amber-400 text-sm tracking-tight">${p.price.toFixed(2)}</td>
                    <td className="px-6 py-5 text-center">
                       <span className={`text-sm font-black tracking-tight ${p.quantity <= p.minThreshold ? 'text-rose-500' : 'text-emerald-400'}`}>{p.quantity} <span className="text-[10px] text-slate-600 font-bold uppercase ml-1">units</span></span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleCreateBarcode(p)} className="p-2.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all" title="Create Barcode"><QrCode className="w-4 h-4" /></button>
                        {canEditPrices && <button onClick={() => handleEditAsset(p)} className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>}
                        {canDelete && <button onClick={() => handleDeleteAsset(p)} className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>}
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
               <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3"><Tag className="w-6 h-6 text-amber-500" /> Sector Taxonomy</h2>
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
                name="pSku" required readOnly={!!matchedProduct || !!editingProduct} value={scannedSku} autoFocus
                onChange={e => !editingProduct && handleSkuLookup(e.target.value)}
                placeholder="Identify asset via SKU..." 
                className={`w-full pl-12 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow ${ (matchedProduct || editingProduct) ? 'opacity-70 bg-slate-800/50' : ''}`} 
              />
              {(!matchedProduct && !editingProduct) && !isScanning && <button type="button" onClick={startScanner} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-amber-400 transition-colors"><ScanLine className="w-5 h-5" /></button>}
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

          {scannerError && <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold"><CameraOff className="w-4 h-4" /><p>{scannerError}</p></div>}

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
              <input name="pName" required readOnly={!!matchedProduct} value={matchedProduct ? matchedProduct.name : undefined} defaultValue={editingProduct?.name} placeholder="Product Name" className={`w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow ${matchedProduct ? 'opacity-70 cursor-not-allowed italic' : ''}`} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Sector / Category</label>
              <div className="relative">
                <select name="pCat" disabled={!!matchedProduct} value={matchedProduct ? matchedProduct.category : undefined} defaultValue={editingProduct?.category} className={`w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none ${matchedProduct ? 'opacity-70 cursor-not-allowed italic' : ''}`}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {!matchedProduct && <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-1"><Truck className="w-3 h-3 text-amber-500" /> Supplier Profile</label>
                <div className="relative">
                  <select name="pSupplier" className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none">
                    <option value="">(None - Cash Buy)</option>
                    {suppliers.filter(s => s.storeId === currentStore.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-500" /> Paid Amount ($)</label>
                <input name="pPaidAmount" type="number" step="0.01" defaultValue={0} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400" />
              </div>
            </div>

            {matchedProduct ? (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-2">Add Stock (Vol)</label>
                  <input name="pNewQty" type="number" required autoFocus value={regQty} onChange={e => setRegQty(parseInt(e.target.value)||'')} placeholder="+Volume" onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-rose-500/50 rounded-2xl outline-none text-white font-black focus:border-rose-500 amber-glow shadow-[0_0_20px_rgba(244,63,94,0.1)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Unit Cost ($)</label>
                  <input name="pBuyingPrice" type="number" step="0.01" required value={regBuyingPrice} onChange={e => setRegBuyingPrice(parseFloat(e.target.value)||'')} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Acquisition Cost ($)</label>
                     <input name="pBuyingPrice" type="number" step="0.01" required value={regBuyingPrice} onChange={e => setRegBuyingPrice(parseFloat(e.target.value)||'')} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Market Price ($)</label>
                     <input name="pPrice" type="number" step="0.01" required defaultValue={editingProduct?.price || 0} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-amber-400 font-black focus:border-amber-400" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Current Holding</label>
                    <input name="pQty" type="number" required value={regQty} onChange={e => setRegQty(parseInt(e.target.value)||'')} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Min. Threshold</label>
                    <input name="pMin" type="number" required defaultValue={editingProduct?.minThreshold || 5} onWheel={(e) => (e.target as HTMLInputElement).blur()} onFocus={(e) => e.target.select()} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400" />
                  </div>
                </div>
              </>
            )}
            
            <div className={`bg-slate-950 p-6 rounded-3xl border border-slate-800 mt-2 flex justify-between items-center transition-opacity ${(!regQty || !regBuyingPrice) ? 'opacity-30' : ''}`}>
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Calculator className="w-4 h-4"/> Total Bill Value</span>
               <span className="text-2xl font-black gold-gradient-text tracking-tighter">${((Number(regQty) || 0) * (Number(regBuyingPrice) || 0)).toFixed(2)}</span>
            </div>
            
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button type="submit" className={`w-full py-5 rounded-[2rem] font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-2xl ${matchedProduct ? 'bg-emerald-500 text-slate-950 shadow-emerald-900/20' : 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-amber-900/20'} hover:scale-[1.02]`}>
              {matchedProduct ? 'Confirm Intake' : editingProduct ? 'Commit Changes' : 'Complete Registration'} <Zap className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => { setIsRegistrationActive(false); resetFormState(); }} className="w-full py-4 bg-slate-800 border border-slate-700 text-slate-400 rounded-[2rem] font-black hover:text-white transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl">cancel</button>
          </div>
        </form>
      </div>

      <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
           <div><h2 className="text-xl font-black text-white tracking-tight uppercase">Live Asset Ledger</h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Synchronized Inventory Base</p></div>
           <div className="p-3 bg-slate-800 rounded-2xl text-amber-500 border border-slate-700 shadow-xl"><Database className="w-5 h-5" /></div>
        </div>

        <div className="p-6 border-b border-slate-800/50">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
            <input type="text" placeholder="Search items..." className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none text-slate-100 text-sm focus:border-amber-400/50 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-6 py-5">Identifier</th><th className="px-6 py-5 text-center">Holding</th><th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-800/40 transition-all">
                    <td className="px-6 py-5"><p className="font-bold text-white text-sm truncate max-w-[150px]">{p.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{p.sku}</p></td>
                    <td className="px-6 py-5 text-center"><span className={`text-sm font-black ${p.quantity <= p.minThreshold ? 'text-rose-500' : 'text-emerald-400'}`}>{p.quantity}</span></td>
                    <td className="px-6 py-5 text-right font-black text-amber-400 text-sm">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleCreateBarcode(p)} className="p-2 text-slate-400 hover:text-amber-400 transition-colors" title="Generate Barcode"><QrCode className="w-4 h-4" /></button>
                         {canEditPrices && <button onClick={() => handleEditAsset(p)} className="p-2.5 text-slate-400 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>}
                         {canDelete && <button onClick={() => handleDeleteAsset(p)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
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
        @keyframes scan { 0% { top: 10%; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
        .animate-scan { animation: scan 1.5s ease-in-out infinite; }
      `}</style>

    </div>
  );
};

export default Inventory;