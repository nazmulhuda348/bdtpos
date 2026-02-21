
import React, { useState } from 'react';
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
  LogOut
} from 'lucide-react';
import { User, Store, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  currentStore: Store;
  stores: Store[];
  users: User[];
  onStoreChange: (store: Store) => void;
  onUserChange: (user: User) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  currentStore, 
  stores, 
  users,
  onStoreChange,
  onUserChange
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();

  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  const navItems = [
    { name: 'Analytics', path: '/', icon: LayoutDashboard, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SALESMAN] },
    { name: 'Sales', path: '/sales', icon: ShoppingCart, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SALESMAN] },
    { name: 'Log Expense', path: '/expenses', icon: Wallet, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
    { name: 'Scanner', path: '/scanner', icon: ScanLine, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SALESMAN] },
    { name: 'User Control', path: '/users', icon: UsersIcon, roles: [UserRole.SUPER_ADMIN] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SALESMAN] },
  ].filter(item => item.roles.includes(currentUser.role));

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
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-2xl shadow-lg shadow-amber-900/20">
                <Warehouse className="text-slate-950 w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold gold-gradient-text tracking-tight italic">Ongona</span>
            </div>
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

          <div className="pt-6 border-t border-slate-800/50">
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center gap-3 mb-1 text-left group"
              >
                <div className="relative">
                  <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-xl border border-slate-700 object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">{currentUser.name}</p>
                  <p className="text-[10px] text-amber-500 font-extrabold flex items-center gap-1 uppercase tracking-tighter">
                    {currentUser.role === UserRole.SUPER_ADMIN ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {currentUser.role}
                  </p>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                  <p className="px-4 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-2">Switch Account</p>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onUserChange(u);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors ${currentUser.id === u.id ? 'text-amber-400 font-bold bg-amber-400/5' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                      >
                        <img src={u.avatar} className="w-5 h-5 rounded-md" />
                        <div className="truncate">
                          <div>{u.name}</div>
                          <div className="text-[8px] opacity-60 uppercase">{u.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

             <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-amber-400 transition-colors">
                <Bell className="w-5 h-5" />
             </button>
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
