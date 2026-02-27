import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Expenses from './components/Expenses';
import Users from './components/Users';
import Customers from './components/Customers';
import Suppliers from './components/Suppliers';
import Purchases from './components/Purchases';
import Wastage from './components/Wastage';
import Scanner from './components/Scanner';
import Settings from './components/Settings';
import Login from './components/Login';
import { Store, Product, User, UserRole, Sale, Expense, Customer, Supplier, Purchase, UserPermissions } from './types';

const App: React.FC = () => {
  // --- ১. অথেন্টিকেশন স্টেট ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('omni_auth') === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('omni_user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- ২. ডাটা স্টেট ---
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // 🔴 ক্যাটাগরি স্টেট (Local Storage সহ) 🔴
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omni_categories');
    return saved ? JSON.parse(saved) : ['Electronics', 'Clothing', 'Food', 'Others'];
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omni_expense_categories');
    return saved ? JSON.parse(saved) : ['Salary', 'Rent', 'Transport', 'Utilities', 'Wastage'];
  });

  // --- ৩. স্টেট রিসেট ফাংশন ---
  const resetAllData = useCallback(() => {
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setCustomers([]);
    setSuppliers([]);
    setPurchases([]);
    setUsers([]);
  }, []);

  // --- ৪. স্টোর এবং ইউজার লিস্ট লোড করা ---
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const fetchInitialMetadata = async () => {
      let storeQuery = supabase.from('stores').select('*');
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        if (!currentUser.assignedStoreId) {
          setStores([]);
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
    };

    fetchInitialMetadata();
  }, [isAuthenticated, currentUser?.id, currentUser?.assignedStoreId]);

  // --- ৫. স্টোর স্পেসিফিক ডাটা ফেচিং ---
  useEffect(() => {
    if (!isAuthenticated || !currentUser || !currentStore?.id) return;

    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.assignedStoreId !== currentStore.id) {
      console.warn("Unauthorized store access attempt blocked.");
      resetAllData();
      return; 
    }

    const fetchStoreData = async () => {
      setIsDataLoading(true);
      resetAllData(); 

      const storeId = currentStore.id;

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
      setIsDataLoading(false);
    };

    fetchStoreData();
  }, [currentStore?.id, currentUser?.id, isAuthenticated]);

  // --- ৬. অথেন্টিকেশন হ্যান্ডলার ---
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentStore(null);
    resetAllData();
    localStorage.clear(); 
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('omni_auth', 'true');
    localStorage.setItem('omni_user', JSON.stringify(user));
  };

  // 🔴 ৭. ক্যাটাগরি কন্ট্রোলার ফাংশন 🔴
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

  // --- ৮. CRUD ফাংশনসমূহ ---
  const addProduct = useCallback(async (newProduct: Omit<Product, 'id' | 'lastUpdated'>) => {
    const { data } = await supabase.from('products').insert([{ ...newProduct, storeId: currentStore?.id }]).select().single();
    if (data) setProducts(prev => [...prev, data]);
  }, [currentStore?.id]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const { data } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p));
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const addSale = useCallback(async (sale: Omit<Sale, 'id' | 'timestamp'>) => {
    const { data } = await supabase.from('sales').insert([{ ...sale, storeId: currentStore?.id }]).select().single();
    if (data) setSales(prev => [data, ...prev]);
  }, [currentStore?.id]);

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
    const { data } = await supabase.from('sales').update(updates).eq('id', id).select().single();
    if (data) setSales(prev => prev.map(s => s.id === id ? data : s));
  }, []);

  const deleteSale = useCallback(async (id: string) => {
    await supabase.from('sales').delete().eq('id', id);
    setSales(prev => prev.filter(s => s.id !== id));
  }, []);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const { data } = await supabase.from('expenses').insert([{ ...expense, storeId: currentStore?.id }]).select().single();
    if (data) setExpenses(prev => [data, ...prev]);
  }, [currentStore?.id]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const { data } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (data) setExpenses(prev => prev.map(e => e.id === id ? data : e));
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    const { data } = await supabase.from('customers').insert([{ ...customer, storeId: currentStore?.id }]).select().single();
    if (data) setCustomers(prev => [...prev, data]);
  }, [currentStore?.id]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const { data } = await supabase.from('customers').update(updates).eq('id', id).select().single();
    if (data) setCustomers(prev => prev.map(c => c.id === id ? data : c));
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    setCustomers(prev => prev.filter(c => c.id !== id));
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

  const deleteSupplier = useCallback(async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
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

  const deletePurchase = useCallback(async (id: string) => {
    await supabase.from('purchases').delete().eq('id', id);
    setPurchases(prev => prev.filter(p => p.id !== id));
  }, []);

  const deleteStore = async (id: string) => {
    if (stores.length <= 1) return alert("System requires at least one hub.");
    await supabase.from('stores').delete().eq('id', id);
    const updated = stores.filter(s => s.id !== id);
    setStores(updated);
    if (currentStore?.id === id) setCurrentStore(updated[0]);
  };

  const checkPermission = (action: keyof UserPermissions) => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) return true;
    return currentUser?.permissions?.[action] || false;
  };

  // --- ৯. রেন্ডারিং লজিক ---
  if (!isAuthenticated || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (!currentStore || isDataLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400 font-black tracking-widest uppercase animate-pulse">Isolating Hub Data...</div>;
  }

  return (
    <HashRouter>
      <Layout 
        currentUser={currentUser} currentStore={currentStore} stores={stores} 
        onStoreChange={setCurrentStore} users={users} onUserChange={setCurrentUser}
        products={products} onLogout={handleLogout}
      >
        <Routes>
          <Route path="/" element={currentUser.role !== UserRole.SALESMAN ? <Dashboard products={products} currentStore={currentStore} sales={sales} expenses={expenses} /> : <Navigate to="/inventory" replace />} />
          
          {/* 🔴 এখানে Inventory-তে আসল ক্যাটাগরি ফাংশনগুলো পাস করা হলো 🔴 */}
          <Route path="/inventory" element={<Inventory products={products} suppliers={suppliers} currentStore={currentStore} currentUser={currentUser} categories={categories} sales={sales} expenses={expenses} onUpdate={updateProduct} onDelete={deleteProduct} onAdd={addProduct} onAddSale={addSale} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddCategory={handleAddCategory} onRemoveCategory={handleRemoveCategory} onUpdateSupplierDue={updateSupplierDue} onAddPurchase={addPurchase} canEditPrices={checkPermission('inventory_edit')} canDelete={checkPermission('inventory_delete')} />} />
          
          <Route path="/sales" element={<Sales sales={sales} products={products} customers={customers} expenses={expenses} currentStore={currentStore} currentUser={currentUser} onAddSale={addSale} onUpdateSale={updateSale} onUpdateStock={updateProduct} onUpdateCustomerDue={updateCustomerDue} onDeleteSale={deleteSale} canDelete={checkPermission('sales_delete')} />} />
          <Route path="/customers" element={<Customers customers={customers} currentStore={currentStore} onAddCustomer={addCustomer} onUpdateCustomer={updateCustomer} onDeleteCustomer={deleteCustomer} onAddSale={addSale} onUpdateCustomerDue={updateCustomerDue} canEdit={checkPermission('customers_edit')} canDelete={checkPermission('customers_delete')} />} />
          <Route path="/suppliers" element={<Suppliers suppliers={suppliers} currentStore={currentStore} onAddSupplier={addSupplier} onUpdateSupplier={updateSupplier} onDeleteSupplier={deleteSupplier} onAddExpense={addExpense} onUpdateSupplierDue={updateSupplierDue} canEdit={checkPermission('suppliers_edit')} canDelete={checkPermission('suppliers_delete')} />} />
          <Route path="/purchases" element={<Purchases purchases={purchases} suppliers={suppliers} products={products} currentStore={currentStore} onAddPurchase={addPurchase} onUpdateStock={updateProduct} onUpdateSupplierDue={updateSupplierDue} onDeletePurchase={deletePurchase} canDelete={checkPermission('purchase_delete')} />} />
          
          {/* 🔴 এখানে Expenses-এ আসল ক্যাটাগরি ফাংশনগুলো পাস করা হলো 🔴 */}
          <Route path="/expenses" element={currentUser.role !== UserRole.SALESMAN ? <Expenses expenses={expenses} currentStore={currentStore} currentUser={currentUser} expenseCategories={expenseCategories} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddExpenseCategory={handleAddExpenseCategory} onRemoveExpenseCategory={handleRemoveExpenseCategory} canEdit={checkPermission('expenses_edit')} canDelete={checkPermission('expenses_delete')} /> : <Navigate to="/inventory" replace />} />
          
          <Route path="/wastage" element={currentUser.role !== UserRole.SALESMAN ? <Wastage products={products} currentStore={currentStore} expenses={expenses} onUpdateStock={updateProduct} onAddExpense={addExpense} /> : <Navigate to="/inventory" replace />} />
          <Route path="/users" element={checkPermission('user_control_access') ? <Users users={users} stores={stores} setUsers={setUsers} /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings stores={stores} currentUser={currentUser} users={users} currentStore={currentStore} setStores={setStores} setUsers={setUsers} setCurrentUser={setCurrentUser} setCurrentStore={setCurrentStore} onDeleteStore={deleteStore} canEditStores={checkPermission('settings_access')} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;