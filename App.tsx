import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './components/Login';
import { Store, Product, User, UserRole, Sale, Expense, Customer, Supplier, Purchase, UserPermissions } from './types';

// 🔴 Lazy Loading Imports (পেজগুলোকে ফাস্ট লোড করার জন্য) 🔴
const Dashboard = lazy(() => import('./components/Dashboard'));
const Inventory = lazy(() => import('./components/Inventory'));
const Sales = lazy(() => import('./components/Sales'));
const Expenses = lazy(() => import('./components/Expenses'));
const Users = lazy(() => import('./components/Users'));
const Customers = lazy(() => import('./components/Customers'));
const Suppliers = lazy(() => import('./components/Suppliers'));
const Purchases = lazy(() => import('./components/Purchases'));
const Wastage = lazy(() => import('./components/Wastage'));
const Scanner = lazy(() => import('./components/Scanner'));
const Settings = lazy(() => import('./components/Settings'));

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('omni_auth') === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('omni_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  // 🔴 Loading States 🔴
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  const [activities, setActivities] = useState<any[]>(() => {
    const saved = localStorage.getItem('omni_activities');
    return saved ? JSON.parse(saved) : [];
  });

  const logActivity = useCallback((actionText: string) => {
    const newLog = {
      id: Date.now().toString(),
      text: actionText,
      user: currentUser?.name || 'System',
      timestamp: new Date().toISOString()
    };
    setActivities(prev => {
      const updated = [newLog, ...prev].slice(0, 50); 
      localStorage.setItem('omni_activities', JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omni_categories');
    return saved ? JSON.parse(saved) : ['Electronics', 'Clothing', 'Food', 'Others'];
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omni_expense_categories');
    return saved ? JSON.parse(saved) : ['Salary', 'Rent', 'Transport', 'Utilities', 'Wastage'];
  });

  const resetAllData = useCallback(() => {
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setCustomers([]);
    setSuppliers([]);
    setPurchases([]);
    setUsers([]);
  }, []);

  // 🔴 Initial Metadata Fetch Logic 🔴
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const fetchInitialMetadata = async () => {
      let storeQuery = supabase.from('stores').select('*');
      
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        if (!currentUser.assignedStoreId) {
           setStores([]);
           setIsInitialFetchDone(true);
           return; 
        }
        storeQuery = storeQuery.eq('id', currentUser.assignedStoreId);
      }

      const { data: storesData } = await storeQuery;
      
      if (storesData && storesData.length > 0) {
        setStores(storesData);
        if (!currentStore || !storesData.find(s => s.id === currentStore.id)) {
          setCurrentStore(storesData[0]);
        }
      }
      
      let userQuery = supabase.from('users').select('*');
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        userQuery = userQuery.eq('assignedStoreId', currentUser.assignedStoreId);
      }
      const { data: usersData } = await userQuery;
      if (usersData) setUsers(usersData);

      setIsInitialFetchDone(true);
    };
    fetchInitialMetadata();
  }, [isAuthenticated, currentUser?.id, currentUser?.assignedStoreId]);

  // 🔴 Store Data Fetching with Try/Catch 🔴
  useEffect(() => {
    if (!isAuthenticated || !currentUser || !currentStore?.id) return;
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.assignedStoreId !== currentStore.id) {
      resetAllData();
      return; 
    }
    
    const fetchStoreData = async () => {
      setIsDataLoading(true);
      resetAllData(); 
      const storeId = currentStore.id;
      
      try {
        const [
          { data: prodData }, { data: salesData }, { data: expData }, 
          { data: custData }, { data: suppData }, { data: purData }
        ] = await Promise.all([
          supabase.from('products').select('*').eq('storeId', storeId),
          supabase.from('sales').select('*').eq('storeId', storeId).order('timestamp', { ascending: false }),
          supabase.from('expenses').select('*').eq('storeId', storeId).order('timestamp', { ascending: false }),
          supabase.from('customers').select('*').eq('storeId', storeId),
          supabase.from('suppliers').select('*').eq('storeId', storeId),
          supabase.from('purchases').select('*').eq('storeId', storeId).order('timestamp', { ascending: false })
        ]);

        setProducts(prodData || []);
        setSales(salesData || []);
        setExpenses(expData || []);
        setCustomers(custData || []);
        setSuppliers(suppData || []);
        setPurchases(purData || []);

      } catch (error) {
        console.error("Database Fetch Error:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchStoreData();
  }, [currentStore?.id, currentUser?.id, isAuthenticated]);

  const handleLogout = () => {
    logActivity("Logged out of the system");
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentStore(null);
    setIsInitialFetchDone(false);
    resetAllData();
    localStorage.clear(); 
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('omni_auth', 'true');
    localStorage.setItem('omni_user', JSON.stringify(user));
  };

  const addSale = useCallback(async (sale: Omit<Sale, 'id' | 'timestamp'>) => {
    if (!sale.invoiceId?.startsWith('PAY-') && sale.productId !== 'PAYMENT_RECEIVED') {
      const product = products.find(p => p.id === sale.productId);
      if (!product || product.quantity < sale.quantity) {
        alert("Action Denied: Insufficient stock! Cannot process this sale.");
        throw new Error("Insufficient stock");
      }
    }
    const { data } = await supabase.from('sales').insert([{ ...sale, storeId: currentStore?.id }]).select().single();
    if (data) setSales(prev => [data, ...prev]);
  }, [currentStore?.id, products]);

  const addProduct = useCallback(async (newProduct: Omit<Product, 'id' | 'lastUpdated'>) => {
    const { data } = await supabase.from('products').insert([{ ...newProduct, storeId: currentStore?.id }]).select().single();
    if (data) setProducts(prev => [...prev, data]);
  }, [currentStore?.id]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const { data } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p));
  }, []);

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
    const { data } = await supabase.from('sales').update(updates).eq('id', id).select().single();
    if (data) setSales(prev => prev.map(s => s.id === id ? data : s));
  }, []);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const { data } = await supabase.from('expenses').insert([{ ...expense, storeId: currentStore?.id }]).select().single();
    if (data) setExpenses(prev => [data, ...prev]);
  }, [currentStore?.id]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const { data } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (data) setExpenses(prev => prev.map(e => e.id === id ? data : e));
  }, []);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    const { data } = await supabase.from('customers').insert([{ ...customer, storeId: currentStore?.id }]).select().single();
    if (data) setCustomers(prev => [...prev, data]);
  }, [currentStore?.id]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const { data } = await supabase.from('customers').update(updates).eq('id', id).select().single();
    if (data) setCustomers(prev => prev.map(c => c.id === id ? data : c));
  }, []);

  const updateCustomerDue = useCallback(async (id: string, amount: number) => {
    const customer = customers.find(c => c.id === id);
    if (customer) {
      const { data } = await supabase.from('customers').update({ totalDue: customer.totalDue + amount }).eq('id', id).select().single();
      if (data) setCustomers(prev => prev.map(c => c.id === id ? data : c));
    }
  }, [customers]);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    const { data } = await supabase.from('suppliers').insert([{ ...supplier, storeId: currentStore?.id }]).select().single();
    if (data) setSuppliers(prev => [...prev, data]);
  }, [currentStore?.id]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const { data } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();
    if (data) setSuppliers(prev => prev.map(s => s.id === id ? data : s));
  }, []);

  const updateSupplierDue = useCallback(async (id: string, amount: number) => {
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) {
      const { data } = await supabase.from('suppliers').update({ totalDue: supplier.totalDue + amount }).eq('id', id).select().single();
      if (data) setSuppliers(prev => prev.map(s => s.id === id ? data : s));
    }
  }, [suppliers]);

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id' | 'timestamp'>) => {
    const { data } = await supabase.from('purchases').insert([{ ...purchase, storeId: currentStore?.id }]).select().single();
    if (data) setPurchases(prev => [data, ...prev]);
  }, [currentStore?.id]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!window.confirm("Delete this product? All related stock will be removed.")) return;
    try {
      const p = products.find(x => x.id === id);
      await supabase.from('products').delete().eq('id', id);
      setProducts(prev => prev.filter(p => p.id !== id));
      logActivity(`Deleted product: ${p?.name}`);
    } catch (err: any) { alert(err.message); }
  }, [products, logActivity]);

  const deleteCustomer = useCallback(async (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (customer && customer.totalDue > 0) return alert(`Action Denied: Clear dues ($${customer.totalDue}) first!`);
    if (!window.confirm("Delete this customer?")) return;
    try {
      await supabase.from('customers').delete().eq('id', id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      logActivity(`Deleted customer profile: ${customer?.name}`);
    } catch (err: any) { alert(err.message); }
  }, [customers, logActivity]);

  const deleteSupplier = useCallback(async (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (supplier && supplier.totalDue > 0) return alert(`Action Denied: Clear dues ($${supplier.totalDue}) first!`);
    if (!window.confirm("Delete this supplier?")) return;
    try {
      await supabase.from('suppliers').delete().eq('id', id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      logActivity(`Deleted supplier profile: ${supplier?.name}`);
    } catch (err: any) { alert(err.message); }
  }, [suppliers, logActivity]);

  const deleteSale = useCallback(async (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (!sale || sale.invoiceId?.startsWith('VOID-')) return;
    if (sale.amountPaid > 0 && !sale.invoiceId?.startsWith('PAY-')) return alert("Action Denied: This invoice has payments. Please reverse the payment to $0 first.");
    if (!window.confirm("Are you sure you want to VOID this sale? Stock and dues will be adjusted.")) return;

    try {
      if (sale.invoiceId?.startsWith('PAY-') || sale.productId === 'PAYMENT_RECEIVED') {
        const customer = customers.find(c => c.id === sale.customerId);
        if (customer && sale.amountPaid) {
          const newDue = customer.totalDue + Number(sale.amountPaid);
          await supabase.from('customers').update({ totalDue: newDue }).eq('id', customer.id);
          setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, totalDue: newDue } : c));
        }
      } else {
        const product = products.find(p => p.id === sale.productId);
        if (product) {
          const newQty = product.quantity + Number(sale.quantity);
          await supabase.from('products').update({ quantity: newQty }).eq('id', product.id);
          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: newQty } : p));
        }
        if (sale.amountDue > 0 && sale.customerId) {
          const customer = customers.find(c => c.id === sale.customerId);
          if (customer) {
            const newDue = Math.max(0, customer.totalDue - Number(sale.amountDue));
            await supabase.from('customers').update({ totalDue: newDue }).eq('id', customer.id);
            setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, totalDue: newDue } : c));
          }
        }
      }

      const voidInvoiceId = `VOID-${sale.invoiceId}`;
      await supabase.from('sales').update({ invoiceId: voidInvoiceId, quantity: 0, totalPrice: 0, amountPaid: 0, amountDue: 0 }).eq('id', id);
      setSales(prev => prev.map(s => s.id === id ? { ...s, invoiceId: voidInvoiceId, quantity: 0, totalPrice: 0, amountPaid: 0, amountDue: 0 } : s));
      
      logActivity(`VOIDED Sale Invoice: ${sale.invoiceId}`);
      alert("Sale voided successfully.");
    } catch (err: any) { alert(`Failed: ${err.message}`); }
  }, [sales, products, customers, logActivity]);

  const deletePurchase = useCallback(async (id: string) => {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase || purchase.poNumber?.startsWith('VOID-')) return;
    if (purchase.amountPaid > 0 && !purchase.poNumber?.startsWith('PAY-') && purchase.productId !== 'SUPPLIER_PAYMENT') return alert("Action Denied: This PO has payments recorded. Please reverse the payment to $0 first.");
    if (!window.confirm("Are you sure you want to VOID this purchase? Stock will be reduced.")) return;

    try {
      if (purchase.poNumber?.startsWith('PAY-') || purchase.productId === 'SUPPLIER_PAYMENT' || purchase.productId === 'PAYMENT_RECEIVED') {
        const supplier = suppliers.find(s => s.id === purchase.supplierId);
        if (supplier && purchase.amountPaid) {
          const newDue = supplier.totalDue + Number(purchase.amountPaid);
          await supabase.from('suppliers').update({ totalDue: newDue }).eq('id', supplier.id);
          setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, totalDue: newDue } : s));
        }
      } else {
        const product = products.find(p => p.id === purchase.productId);
        if (product) {
          const newQty = Math.max(0, product.quantity - Number(purchase.quantity)); 
          await supabase.from('products').update({ quantity: newQty }).eq('id', product.id);
          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: newQty } : p));
        }
        if (purchase.amountDue > 0 && purchase.supplierId) {
          const supplier = suppliers.find(s => s.id === purchase.supplierId);
          if (supplier) {
            const newDue = Math.max(0, supplier.totalDue - Number(purchase.amountDue));
            await supabase.from('suppliers').update({ totalDue: newDue }).eq('id', supplier.id);
            setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, totalDue: newDue } : s));
          }
        }
      }

      const voidPoNumber = `VOID-${purchase.poNumber}`;
      await supabase.from('purchases').update({ poNumber: voidPoNumber, quantity: 0, totalCost: 0, amountPaid: 0, amountDue: 0 }).eq('id', id);
      setPurchases(prev => prev.map(p => p.id === id ? { ...p, poNumber: voidPoNumber, quantity: 0, totalCost: 0, amountPaid: 0, amountDue: 0 } : p));
      
      logActivity(`VOIDED Purchase PO: ${purchase.poNumber}`);
      alert("Purchase voided successfully.");
    } catch (err: any) { alert(`Failed: ${err.message}`); }
  }, [purchases, products, suppliers, logActivity]);

  const deleteExpense = useCallback(async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    if (!window.confirm("Are you sure you want to delete this expense? Funds will be reversed.")) return;

    try {
      if (expense.category === 'Wastage') {
        const expenseData = expense as any; 
        if (expenseData.productId && expenseData.quantity) {
          const product = products.find(p => p.id === expenseData.productId);
          if (product) {
            const newQty = product.quantity + Number(expenseData.quantity);
            await supabase.from('products').update({ quantity: newQty }).eq('id', product.id);
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: newQty } : p));
          }
        }
      }

      await supabase.from('expenses').delete().eq('id', id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      logActivity(`Deleted Expense: ${expense.category} - $${expense.amount}`);
    } catch (err: any) { alert(`Failed: ${err.message}`); }
  }, [expenses, products, logActivity]);

  const handleAddCategory = useCallback((name: string) => {
    setCategories(prev => {
      if (prev.includes(name)) return prev;
      const updated = [...prev, name];
      localStorage.setItem('omni_categories', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleRemoveCategory = useCallback((name: string) => {
    setCategories(prev => {
      const updated = prev.filter(c => c !== name);
      localStorage.setItem('omni_categories', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleAddExpenseCategory = useCallback((name: string) => {
    setExpenseCategories(prev => {
      if (prev.includes(name)) return prev;
      const updated = [...prev, name];
      localStorage.setItem('omni_expense_categories', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleRemoveExpenseCategory = useCallback((name: string) => {
    setExpenseCategories(prev => {
      const updated = prev.filter(c => c !== name);
      localStorage.setItem('omni_expense_categories', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteStore = async (id: string) => {
    if (stores.length <= 1) return alert("System requires at least one hub.");
    if (!window.confirm("Are you sure you want to delete this entire hub?")) return;
    await supabase.from('stores').delete().eq('id', id);
    const updated = stores.filter(s => s.id !== id);
    setStores(updated);
    if (currentStore?.id === id) setCurrentStore(updated[0]);
  };

  const checkPermission = (action: keyof UserPermissions) => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) return true;
    return currentUser?.permissions?.[action] || false;
  };

  const handleDownloadBackup = useCallback(async (storeId: string, storeName: string) => {
    try {
      const [
        { data: prodData },
        { data: custData },
        { data: suppData }
      ] = await Promise.all([
        supabase.from('products').select('*').eq('storeId', storeId),
        supabase.from('customers').select('*').eq('storeId', storeId),
        supabase.from('suppliers').select('*').eq('storeId', storeId)
      ]);

      const backupData = {
        storeName,
        backupDate: new Date().toISOString(),
        inventory: prodData || [],
        customers: custData || [],
        suppliers: suppData || []
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${storeName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logActivity(`Downloaded JSON Backup for ${storeName}`);
    } catch (error: any) {
      alert(`Backup failed: ${error.message}`);
    }
  }, [logActivity]);

  const handleRestoreBackup = useCallback(async (storeId: string, storeName: string, file: File) => {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.inventory || !backupData.customers || !backupData.suppliers) {
        throw new Error("Invalid backup file format. Required data missing.");
      }

      if (backupData.storeName && backupData.storeName !== storeName) {
         const confirmMismatch = window.confirm(`⚠️ সতর্কতা: এই ফাইলটি "${backupData.storeName}" এর, কিন্তু আপনি এটি "${storeName}" এ আপলোড করছেন! আপনি কি আসলেই এটি করতে চান?`);
         if (!confirmMismatch) return;
      }

      if (backupData.inventory.length > 0) {
         const { error } = await supabase.from('products').upsert(backupData.inventory);
         if (error) throw error;
      }
      if (backupData.customers.length > 0) {
         const { error } = await supabase.from('customers').upsert(backupData.customers);
         if (error) throw error;
      }
      if (backupData.suppliers.length > 0) {
         const { error } = await supabase.from('suppliers').upsert(backupData.suppliers);
         if (error) throw error;
      }

      logActivity(`Restored JSON Backup for ${storeName}`);
      alert(`✅ সফলভাবে ডেটা রিস্টোর হয়েছে!\nনতুন ডেটা দেখার জন্য পেজটি রিলোড হচ্ছে।`);
      window.location.reload(); 

    } catch (error: any) {
      alert(`Restore failed: ${error.message}`);
    }
  }, [logActivity]);

  if (!isAuthenticated || !currentUser) return <Login onLogin={handleLogin} />;
  
  if (isInitialFetchDone && !currentStore) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl">
           <h1 className="text-xl font-black text-rose-500 uppercase tracking-widest mb-2">Access Denied</h1>
           <p className="text-slate-400 text-xs font-bold leading-relaxed mb-8">
             {currentUser.role === UserRole.SUPER_ADMIN 
               ? "No store hubs exist in the database. Please check your system." 
               : "Your account has not been assigned to any specific Hub. Please contact your Super Admin."}
           </p>
           <button onClick={handleLogout} className="bg-rose-500 hover:bg-rose-600 transition-colors text-white w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20">Sign Out</button>
        </div>
      </div>
    );
 }

  if (!currentStore || isDataLoading || !isInitialFetchDone) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400 font-black tracking-widest uppercase animate-pulse">Isolating Hub Data...</div>;

  return (
    <HashRouter>
      <Layout currentUser={currentUser} currentStore={currentStore} stores={stores} onStoreChange={setCurrentStore} users={users} onUserChange={setCurrentUser} products={products} onLogout={handleLogout}>
        
        {/* 🔴 Suspense Added Here 🔴 */}
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400 font-black tracking-widest uppercase animate-pulse">Loading Module...</div>}>
          <Routes>
            <Route path="/" element={currentUser.role !== UserRole.SALESMAN ? <Dashboard products={products} currentStore={currentStore} sales={sales} expenses={expenses} currentUser={currentUser} activities={activities} /> : <Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<Inventory products={products} suppliers={suppliers} currentStore={currentStore} currentUser={currentUser} categories={categories} sales={sales} expenses={expenses} onUpdate={updateProduct} onDelete={deleteProduct} onAdd={addProduct} onAddSale={addSale} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddCategory={handleAddCategory} onRemoveCategory={handleRemoveCategory} onUpdateSupplierDue={updateSupplierDue} onAddPurchase={addPurchase} canEditPrices={checkPermission('inventory_edit')} canDelete={checkPermission('inventory_delete')} />} />
            <Route path="/sales" element={<Sales sales={sales} products={products} customers={customers} expenses={expenses} currentStore={currentStore} currentUser={currentUser} onAddSale={addSale} onUpdateSale={updateSale} onUpdateStock={updateProduct} onUpdateCustomerDue={updateCustomerDue} onDeleteSale={deleteSale} canDelete={checkPermission('sales_delete')} />} />
            <Route path="/customers" element={<Customers customers={customers} currentStore={currentStore} onAddCustomer={addCustomer} onUpdateCustomer={updateCustomer} onDeleteCustomer={deleteCustomer} onAddSale={addSale} onUpdateCustomerDue={updateCustomerDue} canEdit={checkPermission('customers_edit')} canDelete={checkPermission('customers_delete')} />} />
            <Route path="/suppliers" element={<Suppliers suppliers={suppliers} currentStore={currentStore} onAddSupplier={addSupplier} onUpdateSupplier={updateSupplier} onDeleteSupplier={deleteSupplier} onAddExpense={addExpense} onUpdateSupplierDue={updateSupplierDue} canEdit={checkPermission('suppliers_edit')} canDelete={checkPermission('suppliers_delete')} />} />
            <Route path="/purchases" element={<Purchases purchases={purchases} suppliers={suppliers} products={products} currentStore={currentStore} onAddPurchase={addPurchase} onUpdateStock={updateProduct} onUpdateSupplierDue={updateSupplierDue} onDeletePurchase={deletePurchase} canDelete={checkPermission('purchase_delete')} />} />
            <Route path="/expenses" element={currentUser.role !== UserRole.SALESMAN ? <Expenses expenses={expenses} currentStore={currentStore} currentUser={currentUser} expenseCategories={expenseCategories} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddExpenseCategory={handleAddExpenseCategory} onRemoveExpenseCategory={handleRemoveExpenseCategory} canEdit={checkPermission('expenses_edit')} canDelete={checkPermission('expenses_delete')} /> : <Navigate to="/inventory" replace />} />
            <Route path="/wastage" element={currentUser.role !== UserRole.SALESMAN ? <Wastage products={products} currentStore={currentStore} expenses={expenses} onUpdateStock={updateProduct} onAddExpense={addExpense} onDeleteExpense={deleteExpense} canDelete={checkPermission('expenses_delete')} /> : <Navigate to="/inventory" replace />} />
            <Route path="/scanner" element={<Scanner products={products} currentStore={currentStore} onUpdate={updateProduct} onAddSale={addSale} />} />
            <Route path="/users" element={currentUser.role === UserRole.SUPER_ADMIN || checkPermission('user_control_access') ? <Users users={users} stores={stores} setUsers={setUsers} /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={currentUser.role === UserRole.SUPER_ADMIN ? <Settings stores={stores} currentUser={currentUser} users={users} currentStore={currentStore} setStores={setStores} setUsers={setUsers} setCurrentUser={setCurrentUser} setCurrentStore={setCurrentStore} onDeleteStore={deleteStore} onDownloadBackup={handleDownloadBackup} onRestoreBackup={handleRestoreBackup} canEditStores={checkPermission('settings_access')} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

      </Layout>
    </HashRouter>
  );
};

export default App;