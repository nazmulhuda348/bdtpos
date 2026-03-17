import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ScanLine, 
  Settings, 
  Menu, 
  Warehouse, 
  UserCircle,
  ShieldCheck,
  ShieldOff,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
  Bell,
  Search,
  Users as UsersIcon,
  X,
  Wallet,
  LogOut,
  Users,
  Truck,
  AlertTriangle,
  Trash2,
  History
} from 'lucide-react';
import { User, Store, UserRole, Product, UserPermissions } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  currentStore: Store;
  stores: Store[];
  users: User[];
  products: Product[];
  onStoreChange: (store: Store) => void;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  currentStore, 
  stores, 
  users,
  products,
  onStoreChange,
  onUserChange,
  onLogout
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();

  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.storeId === currentStore.id && p.quantity <= p.minThreshold);
  }, [products, currentStore.id]);

  // 🔴 Store Owner Role Added to navItems 🔴
  const navItems = [
    { name: 'Analytics', path: '/', icon: LayoutDashboard, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole, UserRole.SALESMAN] },
    { name: 'Sales', path: '/sales', icon: ShoppingCart, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole, UserRole.SALESMAN] },
    { name: 'Purchases', path: '/purchases', icon: ShoppingBag, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole] },
    { name: 'Customers', path: '/customers', icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole, UserRole.SALESMAN] },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole] },
    { name: 'Log Expense', path: '/expenses', icon: Wallet, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole] },
    { name: 'Wastage', path: '/wastage', icon: Trash2, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole] },
    { name: 'Scanner', path: '/scanner', icon: ScanLine, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole, UserRole.SALESMAN] },
    { name: 'User Control', path: '/users', icon: UsersIcon, permission: 'user_control_access' as keyof UserPermissions, roles: [UserRole.SUPER_ADMIN] },
    { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings_access' as keyof UserPermissions, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER' as UserRole, UserRole.SALESMAN] },
    { name: 'Fund Management', path: '/funds', icon: Wallet, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, 'STORE_OWNER'] },
  ].filter(item => {
    if (currentUser.role === UserRole.SUPER_ADMIN) return true;
    if (item.permission && !currentUser.permissions?.[item.permission]) return false;
    return item.roles.includes(currentUser.role);
  });

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-slate-950 selection:bg-amber-400/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Premium Sidebar */}
      <aside className={`
        fixed inset-y-4 left-4 w-64 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl z-50 transition-all duration-300 lg:translate-x-0 lg:static lg:block lg:my-4 lg:ml-4 lg:mr-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            {/* এখানে আপনার সম্পূর্ণ লোগোটি বসানো হয়েছে */}
            <Link to="/" onClick={closeSidebar} className="flex items-center justify-start group cursor-pointer">
              <img 
                src="/full-logo.png" 
                alt="BDT - Buildings Developments & Technologies" 
                className="w-auto h-16 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-lg"
              />
            </Link>
            <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 group
                    ${isActive 
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/10' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-amber-400'}
                  `}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="text-sm tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-slate-800/50 space-y-4">
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3">
              <div className="relative">
                <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-xl border border-slate-700 object-cover" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-amber-500 font-extrabold flex items-center gap-1 uppercase tracking-tighter">
                  {currentUser.role === UserRole.SUPER_ADMIN ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                  {currentUser.role.replace('_', ' ')}
                </p>
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-300 group border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-sm font-bold tracking-wide">Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-amber-400 lg:hidden shadow-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-2.5 rounded-2xl backdrop-blur-md">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Global search..." 
                className="bg-transparent border-none outline-none text-sm text-slate-300 w-48 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Store Switcher for Super Admin */}
             <div className="relative">
                <button 
                  onClick={() => isSuperAdmin && setIsStoreMenuOpen(!isStoreMenuOpen)}
                  disabled={!isSuperAdmin}
                  className={`flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all backdrop-blur-md ${isSuperAdmin ? 'hover:border-amber-400/50' : 'cursor-default'}`}
                >
                  <Warehouse className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-slate-100">{currentStore.name}</span>
                  {isSuperAdmin && <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isStoreMenuOpen ? 'rotate-180' : ''}`} />}
                </button>
                {isStoreMenuOpen && isSuperAdmin && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsStoreMenuOpen(false)} />
                    <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 py-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <p className="px-5 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Select Operations Base</p>
                      {stores.map(store => (
                        <button
                          key={store.id}
                          onClick={() => {
                            onStoreChange(store);
                            setIsStoreMenuOpen(false);
                          }}
                          className={`
                            w-full text-left px-5 py-3 text-sm transition-all flex items-center gap-3
                            ${currentStore.id === store.id ? 'bg-amber-400/10 text-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                          `}
                        >
                          <Warehouse className="w-4 h-4 opacity-50" />
                          {store.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
             </div>

             <div className="relative">
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-amber-400 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {lowStockProducts.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-950 animate-pulse"></span>
                  )}
                </button>
                
                <AnimatePresence>
                  {isNotificationOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 py-4 overflow-hidden"
                      >
                        <div className="px-5 py-2 border-b border-slate-800 mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System Alerts</p>
                          <span className="bg-rose-500/10 text-rose-500 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                            {lowStockProducts.length} Alerts
                          </span>
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                          {lowStockProducts.length > 0 ? (
                            lowStockProducts.map(p => (
                              <div key={p.id} className="px-5 py-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 mt-1">
                                    <AlertTriangle className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white mb-0.5">{p.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Stock level critical: <span className="text-rose-400 font-black">{p.quantity} units</span> remaining.</p>
                                    <Link 
                                      to="/purchases" 
                                      onClick={() => setIsNotificationOpen(false)}
                                      className="text-[9px] text-amber-500 font-black uppercase tracking-widest mt-2 inline-block hover:underline"
                                    >
                                      Restock Now
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-5 py-10 text-center opacity-30 grayscale">
                              <Bell className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No active alerts</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 lg:pt-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;