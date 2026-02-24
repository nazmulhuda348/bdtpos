
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { INITIAL_STORES, INITIAL_PRODUCTS, INITIAL_USER, INITIAL_CATEGORIES } from './constants';

const App: React.FC = () => {
  const [stores, setStores] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem('omni_stores');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_STORES;
    } catch (e) {
      console.error("Failed to parse stores from localStorage", e);
      return INITIAL_STORES;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('omni_products');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_PRODUCTS;
    } catch (e) {
      console.error("Failed to parse products from localStorage", e);
      return INITIAL_PRODUCTS;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('omni_users');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_USER];
    } catch (e) {
      console.error("Failed to parse users from localStorage", e);
      return [INITIAL_USER];
    }
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem('omni_sales');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse sales from localStorage", e);
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('omni_expenses');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse expenses from localStorage", e);
      return [];
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('omni_customers');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse customers from localStorage", e);
      return [];
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('omni_suppliers');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse suppliers from localStorage", e);
      return [];
    }
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try {
      const saved = localStorage.getItem('omni_purchases');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse purchases from localStorage", e);
      return [];
    }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omni_categories');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_CATEGORIES;
    } catch (e) {
      console.error("Failed to parse categories from localStorage", e);
      return INITIAL_CATEGORIES;
    }
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omni_expense_categories');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : ['Salary', 'Rent', 'Transport', 'Utilities', 'Maintenance', 'Marketing', 'Others'];
    } catch (e) {
      console.error("Failed to parse expense categories from localStorage", e);
      return ['Salary', 'Rent', 'Transport', 'Utilities', 'Maintenance', 'Marketing', 'Others'];
    }
  });

  const [currentStore, setCurrentStore] = useState<Store>(() => stores[0] || INITIAL_STORES[0]);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('omni_current_user');
      return saved ? JSON.parse(saved) : (users[0] || INITIAL_USER);
    } catch {
      return users[0] || INITIAL_USER;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('omni_is_authenticated') === 'true';
  });

  // Sync current store if assigned for Manager/Salesman
  useEffect(() => {
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.assignedStoreId) {
      const assigned = stores.find(s => s.id === currentUser.assignedStoreId);
      if (assigned) setCurrentStore(assigned);
    }
  }, [currentUser, stores]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('omni_stores', JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('omni_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('omni_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('omni_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('omni_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('omni_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('omni_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('omni_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('omni_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('omni_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  useEffect(() => {
    localStorage.setItem('omni_is_authenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('omni_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const addProduct = useCallback((newProduct: Omit<Product, 'id' | 'lastUpdated'>) => {
    const p: Product = {
      ...newProduct,
      id: Math.random().toString(36).substr(2, 9),
      lastUpdated: new Date().toISOString()
    };
    setProducts(prev => [...prev, p]);
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
    ));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const addSale = useCallback((sale: Omit<Sale, 'id' | 'timestamp'>) => {
    const newSale: Sale = {
      ...sale,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setSales(prev => [newSale, ...prev]);
  }, []);

  const updateSale = useCallback((id: string, updates: Partial<Sale>) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSale = useCallback((id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => 
      e.id === id ? { ...e, ...updates } : e
    ));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    if (window.confirm("Authorize Access: Are you sure you want to permanently purge this expenditure record?")) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  }, []);

  const addCustomer = useCallback((customer: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: 'CUST-' + Math.random().toString(36).substr(2, 5).toUpperCase()
    };
    setCustomers(prev => [...prev, newCustomer]);
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCustomerDue = useCallback((id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, totalDue: c.totalDue + amount } : c));
  }, []);

  const addSupplier = useCallback((supplier: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: 'SUPP-' + Math.random().toString(36).substr(2, 5).toUpperCase()
    };
    setSuppliers(prev => [...prev, newSupplier]);
  }, []);

  const updateSupplier = useCallback((id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSupplierDue = useCallback((id: string, amount: number) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, totalDue: s.totalDue + amount } : s));
  }, []);

  const addPurchase = useCallback((purchase: Omit<Purchase, 'id' | 'timestamp'>) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
  }, []);

  const deletePurchase = useCallback((id: string) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  }, []);

  const addCategory = (name: string) => {
    if (!categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  const removeCategory = (name: string) => {
    setCategories(prev => prev.filter(c => c !== name));
  };

  const addExpenseCategory = (name: string) => {
    if (!expenseCategories.includes(name)) {
      setExpenseCategories(prev => [...prev, name]);
    }
  };

  const removeExpenseCategory = (name: string) => {
    setExpenseCategories(prev => prev.filter(c => c !== name));
  };

  const deleteStore = (id: string) => {
    if (stores.length <= 1) {
      alert("Critical Error: System requires at least one operations hub.");
      return;
    }
    
    setStores(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (currentStore.id === id) {
        setCurrentStore(updated[0]);
      }
      return updated;
    });

    setProducts(prev => prev.filter(p => p.storeId !== id));
    setSales(prev => prev.filter(s => s.storeId !== id));
    setExpenses(prev => prev.filter(e => e.storeId !== id));
  };

  const checkPermission = (action: keyof UserPermissions) => {
    if (currentUser.role === UserRole.SUPER_ADMIN) return true;
    return currentUser.permissions?.[action] || false;
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // We don't necessarily need to clear currentUser, but we can reset it to a default if we want
  };

  if (!isAuthenticated) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout 
        currentUser={currentUser} 
        currentStore={currentStore} 
        stores={stores} 
        onStoreChange={setCurrentStore}
        users={users}
        onUserChange={setCurrentUser}
        products={products}
        onLogout={handleLogout}
      >
        <Routes>
          <Route path="/" element={
            currentUser.role !== UserRole.SALESMAN
              ? <Dashboard products={products} currentStore={currentStore} sales={sales} expenses={expenses} />
              : <Navigate to="/inventory" replace />
          } />
          <Route 
            path="/inventory" 
            element={
              <Inventory 
                products={products} 
                suppliers={suppliers}
                currentStore={currentStore} 
                currentUser={currentUser}
                categories={categories}
                sales={sales}
                expenses={expenses}
                onUpdate={updateProduct}
                onDelete={deleteProduct}
                onAdd={addProduct}
                onAddSale={addSale}
                onAddExpense={addExpense}
                onUpdateExpense={updateExpense}
                onDeleteExpense={deleteExpense}
                onAddCategory={addCategory}
                onRemoveCategory={removeCategory}
                onUpdateSupplierDue={updateSupplierDue}
                onAddPurchase={addPurchase}
                canEditPrices={checkPermission('inventory_edit')}
                canDelete={checkPermission('inventory_delete')}
              />
            } 
          />
          <Route 
            path="/sales" 
            element={
              <Sales 
                sales={sales} 
                products={products} 
                customers={customers}
                expenses={expenses}
                currentStore={currentStore} 
                currentUser={currentUser}
                onAddSale={addSale}
                onUpdateSale={updateSale}
                onUpdateStock={updateProduct}
                onUpdateCustomerDue={updateCustomerDue}
                onDeleteSale={deleteSale}
                canDelete={checkPermission('sales_delete')}
              />
            } 
          />
          <Route 
            path="/customers" 
            element={
              <Customers 
                customers={customers}
                currentStore={currentStore}
                onAddCustomer={addCustomer}
                onUpdateCustomer={updateCustomer}
                onDeleteCustomer={deleteCustomer}
                onAddSale={addSale}
                onUpdateCustomerDue={updateCustomerDue}
                canEdit={checkPermission('customers_edit')}
                canDelete={checkPermission('customers_delete')}
              />
            } 
          />
          <Route 
            path="/suppliers" 
            element={
              <Suppliers 
                suppliers={suppliers}
                currentStore={currentStore}
                onAddSupplier={addSupplier}
                onUpdateSupplier={updateSupplier}
                onDeleteSupplier={deleteSupplier}
                onAddExpense={addExpense}
                onUpdateSupplierDue={updateSupplierDue}
                canEdit={checkPermission('suppliers_edit')}
                canDelete={checkPermission('suppliers_delete')}
              />
            } 
          />
          <Route 
            path="/purchases" 
            element={
              <Purchases 
                purchases={purchases}
                suppliers={suppliers}
                products={products}
                currentStore={currentStore}
                onAddPurchase={addPurchase}
                onUpdateStock={updateProduct}
                onUpdateSupplierDue={updateSupplierDue}
                onDeletePurchase={deletePurchase}
                canDelete={checkPermission('purchase_delete')}
              />
            } 
          />
          <Route 
            path="/expenses" 
            element={
              currentUser.role !== UserRole.SALESMAN
                ? <Expenses 
                    expenses={expenses} 
                    currentStore={currentStore} 
                    currentUser={currentUser}
                    expenseCategories={expenseCategories}
                    onAddExpense={addExpense}
                    onUpdateExpense={updateExpense}
                    onDeleteExpense={deleteExpense}
                    onAddExpenseCategory={addExpenseCategory}
                    onRemoveExpenseCategory={removeExpenseCategory}
                    canEdit={checkPermission('expenses_edit')}
                    canDelete={checkPermission('expenses_delete')}
                  />
                : <Navigate to="/inventory" replace />
            } 
          />
          <Route 
            path="/wastage" 
            element={
              currentUser.role !== UserRole.SALESMAN
                ? <Wastage 
                    products={products}
                    currentStore={currentStore}
                    expenses={expenses}
                    onUpdateStock={updateProduct}
                    onAddExpense={addExpense}
                  />
                : <Navigate to="/inventory" replace />
            } 
          />
          <Route 
            path="/users" 
            element={
              checkPermission('user_control_access')
                ? <Users users={users} stores={stores} setUsers={setUsers} />
                : <Navigate to="/" replace />
            } 
          />
          <Route 
            path="/scanner" 
            element={
              <Scanner 
                products={products} 
                currentStore={currentStore}
                onUpdate={updateProduct}
                onAddSale={addSale}
              />
            } 
          />
          <Route 
            path="/settings" 
            element={
              <Settings 
                stores={stores} 
                currentUser={currentUser} 
                users={users}
                currentStore={currentStore}
                setStores={setStores} 
                setUsers={setUsers}
                setCurrentUser={setCurrentUser}
                setCurrentStore={setCurrentStore}
                onDeleteStore={deleteStore}
                canEditStores={checkPermission('settings_access')}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
