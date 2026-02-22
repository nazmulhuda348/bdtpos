
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Expenses from './components/Expenses';
import Users from './components/Users';
import Scanner from './components/Scanner';
import Settings from './components/Settings';
import { Store, Product, User, UserRole, Sale, Expense } from './types';
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
  const [currentUser, setCurrentUser] = useState<User>(() => users[0] || INITIAL_USER);

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
    localStorage.setItem('omni_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('omni_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

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

  const checkPermission = (action: string) => {
    if (currentUser.role === UserRole.SUPER_ADMIN) return true;
    
    switch(action) {
      case 'VIEW_ANALYTICS': return currentUser.role === UserRole.MANAGER;
      case 'MANAGE_USERS': return false;
      case 'DELETE_DATA': return false;
      case 'EDIT_PRICES': return currentUser.role === UserRole.MANAGER;
      case 'EDIT_STORES': return false;
      default: return true;
    }
  };

  return (
    <HashRouter>
      <Layout 
        currentUser={currentUser} 
        currentStore={currentStore} 
        stores={stores} 
        onStoreChange={setCurrentStore}
        users={users}
        onUserChange={setCurrentUser}
      >
        <Routes>
          <Route path="/" element={
            checkPermission('VIEW_ANALYTICS') 
              ? <Dashboard products={products} currentStore={currentStore} sales={sales} expenses={expenses} />
              : <Navigate to="/inventory" replace />
          } />
          <Route 
            path="/inventory" 
            element={
              <Inventory 
                products={products} 
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
                canEditPrices={checkPermission('EDIT_PRICES')}
                canDelete={checkPermission('DELETE_DATA')}
              />
            } 
          />
          <Route 
            path="/sales" 
            element={
              <Sales 
                sales={sales} 
                products={products} 
                currentStore={currentStore} 
                currentUser={currentUser}
                onAddSale={addSale}
                onUpdateSale={updateSale}
                onUpdateStock={updateProduct}
                onDeleteSale={deleteSale}
                canDelete={checkPermission('DELETE_DATA')}
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
                    canDelete={checkPermission('DELETE_DATA')}
                  />
                : <Navigate to="/inventory" replace />
            } 
          />
          <Route 
            path="/users" 
            element={
              checkPermission('MANAGE_USERS')
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
                canEditStores={checkPermission('EDIT_STORES')}
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
