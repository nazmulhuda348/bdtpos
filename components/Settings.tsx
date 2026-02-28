import React, { useState, useEffect } from 'react';
import { Store, User, StorePayment } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  Store as StoreIcon, 
  CreditCard,
  Lock,
  Plus, 
  Trash2, 
  Edit2, 
  X,
  AlertCircle,
  CheckCircle2,
  CalendarClock
} from 'lucide-react';

interface SettingsProps {
  stores: Store[];
  currentUser: User;
  users: User[];
  currentStore: Store;
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentStore: React.Dispatch<React.SetStateAction<Store | null>>;
  onDeleteStore: (id: string) => void | Promise<void>;
  canEditStores: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  stores, 
  currentUser,
  setStores,
  setCurrentUser,
  onDeleteStore,
  canEditStores
}) => {
  const [activeTab, setActiveTab] = useState<'hubs' | 'billing' | 'security'>('hubs');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [payments, setPayments] = useState<StorePayment[]>([]);

  // Password State
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const today = new Date();
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = today.getDate();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase.from('store_payments').select('*');
    if (data) setPayments(data);
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    
    const storePayload = {
      name: form.storeName.value,
      location: form.storeLocation.value,
      monthlyFee: parseFloat(form.monthlyFee.value) || 0
    };

    try {
      if (editingStore) {
        const { data, error } = await supabase.from('stores').update(storePayload).eq('id', editingStore.id).select().single();
        if (error) throw error;
        if (data) {
          setStores(prev => prev.map(s => s.id === editingStore.id ? data : s));
          alert("Store updated successfully.");
        }
      } else {
        const { data, error } = await supabase.from('stores').insert([storePayload]).select().single();
        if (error) throw error;
        if (data) {
          setStores(prev => [...prev, data]);
          alert("New store registered.");
        }
      }
      setIsStoreModalOpen(false);
    } catch (error: any) {
      alert(`Operation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceivePayment = async (store: Store) => {
    if (!store.monthlyFee || store.monthlyFee <= 0) {
      alert("Please configure a monthly fee for this store first!");
      return;
    }

    if (window.confirm(`Receive payment of $${store.monthlyFee} for ${store.name} for the month of ${currentMonthYear}?`)) {
      try {
        const paymentPayload = {
          storeId: store.id,
          monthYear: currentMonthYear,
          amountPaid: store.monthlyFee,
          paymentDate: new Date().toISOString()
        };

        const { data, error } = await supabase.from('store_payments').insert([paymentPayload]).select().single();
        if (error) throw error;
        
        if (data) {
          setPayments(prev => [...prev, data]);
          alert("Payment recorded successfully!");
        }
      } catch (error: any) {
        alert(`Payment failed: ${error.message}`);
      }
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new !== passwordData.confirm) {
      alert("New passwords do not match!");
      return;
    }
    
    if (currentUser.password && passwordData.current !== currentUser.password) {
      alert("Current password is incorrect!");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.from('users').update({ password: passwordData.new }).eq('id', currentUser.id);
      if (error) throw error;
      
      setCurrentUser({ ...currentUser, password: passwordData.new });
      alert("Password updated successfully! Please use this new password for next login.");
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      alert(`Failed to update password: ${error.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getBillingStatus = (storeId: string) => {
    const hasPaid = payments.find(p => p.storeId === storeId && p.monthYear === currentMonthYear);
    if (hasPaid) return 'PAID';
    if (currentDay > 10) return 'OVERDUE';
    return 'DUE';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <SettingsIcon className="w-8 h-8 text-amber-500" />
        <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => setActiveTab('hubs')}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'hubs' ? 'bg-amber-400 text-slate-950 shadow-xl shadow-amber-900/20' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
        >
          <div className="flex items-center gap-2"><StoreIcon className="w-4 h-4" /> Store Hubs</div>
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'billing' ? 'bg-amber-400 text-slate-950 shadow-xl shadow-amber-900/20' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
        >
          <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing</div>
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-amber-400 text-slate-950 shadow-xl shadow-amber-900/20' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
        >
          <div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Security</div>
        </button>
      </div>

      {/* --- STORE HUBS TAB --- */}
      {activeTab === 'hubs' && (
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-widest">Registered Stores</h2>
            {canEditStores && (
              <button 
                onClick={() => { setEditingStore(null); setIsStoreModalOpen(true); }}
                className="bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-400 hover:text-slate-950 transition-colors text-xs uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" /> Add Store
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => (
              <div key={store.id} className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 flex flex-col justify-between hover:border-amber-400/30 transition-colors">
                <div>
                  <h3 className="text-lg font-black text-white mb-1">{store.name}</h3>
                  <p className="text-xs text-slate-400 font-bold mb-4">{store.location}</p>
                  <div className="bg-slate-900 px-4 py-2 rounded-xl inline-block mb-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Monthly Fee</p>
                    <p className="text-amber-400 font-black">${store.monthlyFee || 0}</p>
                  </div>
                </div>
                {canEditStores && (
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50">
                    <button onClick={() => { setEditingStore(store); setIsStoreModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteStore(store.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- BILLING & SUBSCRIPTIONS TAB --- */}
      {activeTab === 'billing' && (
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
             <CalendarClock className="w-6 h-6 text-amber-500" />
             <div>
               <h2 className="text-xl font-black text-white uppercase tracking-widest">Monthly Collection</h2>
               <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Billing Cycle: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-6 py-5">Store Name</th>
                  <th className="px-6 py-5 text-center">Monthly Fee</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {stores.map(store => {
                  const status = getBillingStatus(store.id);
                  return (
                    <tr key={store.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-5 font-bold text-white text-sm">{store.name}</td>
                      <td className="px-6 py-5 text-center font-black text-slate-300">${store.monthlyFee || 0}</td>
                      <td className="px-6 py-5 text-center">
                        {status === 'PAID' && <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Paid</span>}
                        {status === 'DUE' && <span className="bg-amber-400/10 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-400/20">Due</span>}
                        {status === 'OVERDUE' && (
                          <span className="bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20 flex items-center justify-center gap-1 w-fit mx-auto">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {status !== 'PAID' ? (
                          <button 
                            onClick={() => handleReceivePayment(store)}
                            className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"
                          >
                            Receive Payment
                          </button>
                        ) : (
                          <div className="flex items-center justify-end text-emerald-500 gap-1 opacity-50">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Cleared</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SECURITY TAB --- */}
      {activeTab === 'security' && (
        <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl max-w-2xl">
          <div className="flex items-center gap-3 mb-8">
             <Lock className="w-6 h-6 text-amber-500" />
             <div>
               <h2 className="text-xl font-black text-white uppercase tracking-widest">Account Security</h2>
               <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Update your login password</p>
             </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Current Password</label>
              <input 
                type="password" 
                required 
                value={passwordData.current}
                onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">New Password</label>
              <input 
                type="password" 
                required 
                minLength={6}
                value={passwordData.new}
                onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Confirm New Password</label>
              <input 
                type="password" 
                required 
                minLength={6}
                value={passwordData.confirm}
                onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isUpdatingPassword}
              className="w-full bg-amber-400 text-slate-950 py-5 rounded-[2rem] font-black mt-4 hover:scale-[1.02] transition-transform uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Store Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
             <button onClick={() => setIsStoreModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
             <h2 className="text-2xl font-black text-white mb-6 tracking-tight">{editingStore ? 'Update Store' : 'Register Store'}</h2>
             
             <form onSubmit={handleStoreSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Store Name</label>
                  <input name="storeName" required defaultValue={editingStore?.name} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Location</label>
                  <input name="storeLocation" required defaultValue={editingStore?.location} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Monthly Subscription Fee ($)</label>
                  <input name="monthlyFee" type="number" step="0.01" required defaultValue={editingStore?.monthlyFee || 0} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-emerald-400 font-black focus:border-amber-400 amber-glow" />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-amber-400 text-slate-950 py-5 rounded-[2rem] font-black mt-4 hover:scale-[1.02] transition-transform uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Save Configuration'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;