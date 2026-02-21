
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Product, Store, Sale } from '../types';
import { 
  ScanLine, 
  Package, 
  AlertCircle, 
  CheckCircle, 
  RefreshCcw, 
  ShoppingCart, 
  Truck, 
  History,
  ArrowRight,
  Zap,
  X,
  Volume2,
  CameraOff
} from 'lucide-react';

interface ScannerProps {
  products: Product[];
  currentStore: Store;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onAddSale: (sale: Omit<Sale, 'id' | 'timestamp'>) => void;
}

type ScanMode = 'receive' | 'sales';

interface ScanHistory {
  id: string;
  productName: string;
  sku: string;
  mode: ScanMode;
  timestamp: string;
}

const Scanner: React.FC<ScannerProps> = ({ products, currentStore, onUpdate, onAddSale }) => {
  const [mode, setMode] = useState<ScanMode>('sales');
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const scannerRef = useRef<any>(null);

  // Sound effect simulation (visual)
  const [flash, setFlash] = useState(false);

  const processScan = useCallback((decodedText: string) => {
    const product = products.find(p => p.sku === decodedText && p.storeId === currentStore.id);
    
    if (!product) {
      setStatus({ type: 'error', message: `SKU "${decodedText}" not found in ${currentStore.name}.` });
      return;
    }

    if (mode === 'sales') {
      if (product.quantity <= 0) {
        setStatus({ type: 'error', message: `Out of Stock: ${product.name}` });
        return;
      }

      // Generate Invoice
      const year = new Date().getFullYear();
      const invoiceId = `INV-SCN-${year}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      onAddSale({
        invoiceId,
        customerName: 'Scan-to-Go (Walk-in)',
        productId: product.id,
        productName: product.name,
        quantity: 1,
        buyingPrice: product.buyingPrice,
        unitPrice: product.price,
        discount: 0,
        totalPrice: product.price,
        storeId: currentStore.id
      });

      onUpdate(product.id, { quantity: product.quantity - 1 });
      setStatus({ type: 'success', message: `Sale Recorded: ${product.name} (-1 unit)` });
    } else {
      // Receive Mode
      onUpdate(product.id, { quantity: product.quantity + 1 });
      setStatus({ type: 'success', message: `Stock Received: ${product.name} (+1 unit)` });
    }

    // Trigger visual feedback
    setFlash(true);
    setTimeout(() => setFlash(false), 500);

    // Add to local UI history
    setHistory(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        productName: product.name,
        sku: product.sku,
        mode,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev.slice(0, 4)
    ]);
  }, [mode, products, currentStore, onUpdate, onAddSale]);

  const safeStopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
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
    setStatus({ type: 'idle', message: 'Configuring optical sensor...' });
    
    await safeStopScanner();

    // Use a sufficient delay to ensure the DOM target (#reader) is available
    setTimeout(async () => {
      try {
        const html5QrCode = new (window as any).Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { fps: 20, qrbox: { width: 280, height: 280 } };

        const onScanSuccess = (decodedText: string) => {
          processScan(decodedText);
          if (scannerRef.current) {
            scannerRef.current.pause();
            setTimeout(() => {
              if (scannerRef.current && scannerRef.current.getState() === 3) {
                scannerRef.current.resume();
              }
            }, 1500);
          }
        };

        try {
          // Attempt 1: Environment (Rear) camera
          await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
          setStatus({ type: 'idle', message: 'Scanning...' });
        } catch (err1) {
          console.log("Environment camera fallback triggered...");
          try {
            // Attempt 2: User (Front) camera
            await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
            setStatus({ type: 'idle', message: 'Scanning (User Cam)...' });
          } catch (err2) {
            console.log("Device ID direct access fallback triggered...");
            // Attempt 3: Any available device ID
            const devices = await (window as any).Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              await html5QrCode.start(devices[0].id, config, onScanSuccess, () => {});
              setStatus({ type: 'idle', message: 'Scanning (Generic)...' });
            } else {
              throw new Error("No optical hardware found or permission denied.");
            }
          }
        }
      } catch (err: any) {
        const msg = typeof err === 'string' ? err : (err?.message || "Optical initialization failed.");
        setStatus({ type: 'error', message: msg });
        setIsScanning(false);
      }
    }, 400);
  };

  const stopScanner = async () => {
    await safeStopScanner();
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      safeStopScanner();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header & Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Optical Operations Hub
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400/20" />
          </h1>
          <p className="text-slate-500 font-medium italic">Automated throughput for <span className="gold-gradient-text font-black">{currentStore.name}</span></p>
        </div>

        <div className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <button 
            onClick={() => setMode('sales')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sales' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ShoppingCart className="w-4 h-4" /> Sales Mode
          </button>
          <button 
            onClick={() => setMode('receive')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'receive' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Truck className="w-4 h-4" /> Receive Mode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Scanner Viewport */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`
            relative aspect-[4/3] bg-slate-900 rounded-[3rem] overflow-hidden border-4 transition-all duration-300 shadow-2xl
            ${flash ? (mode === 'sales' ? 'border-amber-400 scale-[1.01]' : 'border-emerald-500 scale-[1.01]') : 'border-slate-800'}
            ${isScanning ? 'ring-8 ring-white/5' : ''}
          `}>
            {isScanning ? (
              <div id="reader" className="w-full h-full"></div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
                <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 border transition-all duration-500 shadow-2xl ${mode === 'sales' ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                  {status.type === 'error' ? <CameraOff className="w-14 h-14" /> : <ScanLine className="w-14 h-14" />}
                </div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Sensor Calibrated</h3>
                <p className="text-sm text-slate-500 mb-10 font-medium max-w-[280px]">Automated {mode === 'sales' ? 'Settlement' : 'Intake'} Logic Active</p>
                <button 
                  onClick={startScanner}
                  className={`px-14 py-5 rounded-[2rem] font-black hover:scale-[1.05] transition-all shadow-2xl uppercase tracking-[0.2em] text-xs ${mode === 'sales' ? 'bg-amber-400 text-slate-950 shadow-amber-900/20' : 'bg-emerald-500 text-slate-950 shadow-amber-900/20'}`}
                >
                  Initiate Optical Stream
                </button>
              </div>
            )}
            
            {isScanning && (
              <div className="absolute top-6 right-6 z-10 flex gap-2">
                <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 border border-white/10">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> LIVE
                </div>
                <button 
                  onClick={stopScanner}
                  className="bg-rose-600 hover:bg-rose-700 p-2 rounded-xl text-white transition-all border border-rose-500/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {isScanning && (
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-scan z-10 opacity-50`}></div>
            )}
          </div>
          
          {/* Status Messenger */}
          <div className={`
            p-6 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-4
            ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
              status.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
              'bg-slate-900/50 border-slate-800 text-slate-500'}
          `}>
             <div className={`p-3 rounded-xl ${status.type === 'success' ? 'bg-emerald-500/20' : status.type === 'error' ? 'bg-rose-500/20' : 'bg-slate-800'}`}>
                {status.type === 'success' ? <CheckCircle className="w-6 h-6" /> : status.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <RefreshCcw className="w-6 h-6" />}
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Feedback</p>
                <p className="font-bold tracking-tight">{status.message || 'Sensor awaiting input...'}</p>
             </div>
          </div>
        </div>

        {/* Right Column: History & Stats */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-white text-lg tracking-tight">Recent Activity</h3>
                 </div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Feed</span>
              </div>

              <div className="space-y-4">
                 {history.map((item) => (
                   <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.mode === 'sales' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                            {item.mode === 'sales' ? <ShoppingCart className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white line-clamp-1">{item.productName}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">SKU: {item.sku}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={`text-xs font-black ${item.mode === 'sales' ? 'text-amber-400' : 'text-emerald-400'}`}>
                           {item.mode === 'sales' ? '-1 UNIT' : '+1 UNIT'}
                         </p>
                         <p className="text-[9px] text-slate-600 font-bold">{item.timestamp}</p>
                      </div>
                   </div>
                 ))}
                 {history.length === 0 && (
                   <div className="py-20 text-center space-y-4 opacity-30 grayscale">
                      <Package className="w-12 h-12 mx-auto text-slate-600" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic">No cycles recorded yet</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-400/10 transition-all"></div>
              <h3 className="font-black text-white mb-6 tracking-tight flex items-center gap-2">
                 <Volume2 className="w-5 h-5 text-amber-400" />
                 Operational Safety
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                The optical hub is configured for <span className="text-white">Auto-Commit</span>. Actions are final once verified. Ensure the target item is correctly identified in the session feed above.
              </p>
              <div className="mt-8 pt-8 border-t border-slate-800 flex items-center gap-3">
                 <div className="flex-1 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Session Count</p>
                    <p className="text-xl font-black text-white">{history.length}</p>
                 </div>
                 <div className="flex-1 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Base</p>
                    <p className="text-xl font-black text-amber-400 line-clamp-1">{currentStore.name.split(' ')[0]}</p>
                 </div>
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
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
