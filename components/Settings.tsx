import React, { useState } from 'react';
import { Store, User, UserRole } from '../types';
import { supabase } from '../lib/supabase'; // Supabase Import
import { 
  Warehouse, 
  Plus, 
  Trash2, 
  MapPin, 
  UserCircle, 
  Shield, 
  Key, 
  Edit, 
  X, 
  Save, 
  Settings as SettingsIcon,
  Globe,
  Coins
} from 'lucide-react';

interface SettingsProps {
  stores: Store[];
  currentStore: Store;
  currentUser: User;
  users: User[];
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  setCurrentStore: (store: Store) => void;
  onDeleteStore: (id: string) => void;
  canEditStores: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  stores, 
  currentStore,
  currentUser, 
  users, 
  setStores, 
  setUsers, 
  setCurrentUser, 
  setCurrentStore,
  onDeleteStore,
  canEditStores 
}) => {
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isChangingName, setIsChangingName] = useState(false);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [currency, setCurrency] = useState('USD ($)');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const name = form.storeName.value;
    const location = form.storeLoc.value;
    
    if (name && location) {
      try {
        // Insert new store into Supabase database
        const { data, error } = await supabase
          .from('stores')
          .insert([{ name, location }])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setStores(prev => [...prev, data]);
          setIsAddingStore(false);
          alert('System Operations: New Branch registered successfully.');
        }
      } catch (error: any) {
        alert(`Error adding store: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeStore = (id: string) => {
    // Audit check for last store handled in App.tsx but confirmed here as well
    if (stores.length <= 1) {
      alert('Operation Error: System requires at least one active operations hub.');
      return;
    }
    
    // Updated confirmation prompt as requested 100%
    if (window.confirm('Are you sure you want to delete this branch? All associated inventory data for this store will be lost.')) {
      onDeleteStore(id);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newName = form.newName.value;
    
    if (newName) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ name: newName })
          .eq('id', currentUser.id);

        if (error) throw error;

        const updatedUser = { ...currentUser, name: newName };
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        setIsChangingName(false);
        // Also update local storage so name persists on reload without full logout
        localStorage.setItem('omni_user', JSON.stringify(updatedUser));
        alert('Registry Updated: Display identifier modified.');
      } catch (error: any) {
        alert(`Error updating profile: ${error.message}`);
      }
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newPass = form.newPass.value;
    
    if (newPass) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ password: newPass })
          .eq('id', currentUser.id);

        if (error) throw error;

        const updatedUser = { ...currentUser, password: newPass };
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        setIsChangingPass(false);
        localStorage.setItem('omni_user', JSON.stringify(updatedUser));
        alert('Security Alert: Access key modified.');
      } catch (error: any) {
        alert(`Error updating password: ${error.message}`);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Configuration</h1>
          <p className="text-slate-500 font-medium">Manage infrastructure, localized hubs, and personal security profiles.</p>
        </div>
        <div className="flex items-center gap-3 bg-amber-400/10 text-amber-400 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-amber-400/20 shadow-lg shadow-amber-900/5">
          <SettingsIcon className="w-4 h-4" />
          Administrative Mode
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Stores & Preferences */}
        <div className="lg:col-span-7 space-y-10">
          {/* Operations Infrastructure Section */}
          <section className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-10 py-8 bg-slate-900/30 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-lg">
                  <Warehouse className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-black text-white text-lg tracking-tight">Operations Hubs</h2>
                  <p className="text-xs text-slate-500 font-medium">Global branch network</p>
                </div>
              </div>
              {canEditStores && (
                <button 
                  onClick={() => setIsAddingStore(true)} 
                  className="bg-amber-400 text-slate-950 px-6 py-3 rounded-2xl text-xs font-black hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2 uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" /> Register Site
                </button>
              )}
            </div>
            
            {isAddingStore && (
              <div className="px-10 py-8 bg-amber-400/5 border-b border-amber-400/10 animate-in slide-in-from-top duration-500">
                 <form onSubmit={handleAddStore} className="flex flex-col sm:flex-row gap-4">
                    <input name="storeName" required placeholder="Branch Identifier..." className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-sm font-bold shadow-inner focus:border-amber-400 amber-glow" />
                    <input name="storeLoc" required placeholder="Physical Coordinates..." className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-sm font-bold shadow-inner focus:border-amber-400 amber-glow" />
                    <div className="flex gap-2">
                      <button type="submit" disabled={isLoading} className="bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl text-xs font-black shadow-lg hover:bg-amber-500 disabled:opacity-50">
                        {isLoading ? '...' : 'Commit'}
                      </button>
                      <button type="button" onClick={() => setIsAddingStore(false)} className="bg-slate-800 border border-slate-700 text-slate-400 px-6 py-4 rounded-2xl text-xs font-black hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                 </form>
              </div>
            )}

            <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {stores.map(store => (
                <div key={store.id} className={`flex items-center justify-between p-6 border rounded-3xl shadow-sm transition-all group relative overflow-hidden ${currentStore.id === store.id ? 'bg-amber-400/5 border-amber-400/40' : 'bg-slate-900 border-slate-800 hover:border-amber-400/30'}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-400/10 transition-colors"></div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${currentStore.id === store.id ? 'bg-amber-400 text-slate-950 border-amber-400/50' : 'bg-slate-800 text-slate-400 group-hover:text-amber-400 border-slate-700'}`}>
                      <Warehouse className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-black text-white leading-tight tracking-tight text-lg">{store.name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1 uppercase font-black tracking-[0.15em]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> {store.location}
                      </p>
                    </div>
                  </div>
                  {canEditStores && (
                    <button 
                      onClick={() => removeStore(store.id)} 
                      className="text-amber-400 hover:text-red-500 p-2.5 transition-all relative z-10 hover:bg-red-500/10 rounded-xl"
                      title="Decommission Branch"
                    >
                      <Trash2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* System Preferences Section */}
          <section className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 p-10 shadow-2xl">
             <h3 className="font-black text-white mb-8 tracking-tight text-lg flex items-center gap-3">
               <Globe className="w-5 h-5 text-amber-400" />
               System Preferences
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reporting Currency</label>
                  <div className="relative group">
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                    <select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none"
                    >
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>BDT (৳)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Timezone / Locale</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                    <select 
                      className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 appearance-none"
                    >
                      <option>Automated (UTC-8)</option>
                      <option>Greenwich Mean Time</option>
                      <option>Bangladesh Standard Time</option>
                    </select>
                  </div>
                </div>
             </div>
          </section>
        </div>

        {/* Right Column: Profile Identity Governance */}
        <div className="lg:col-span-5 space-y-10">
          <section className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-slate-800 p-10 shadow-2xl sticky top-24">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-lg">
                <UserCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="font-black text-white text-xl tracking-tight">Identity Governance</h2>
            </div>
            
            <div className="flex flex-col items-center gap-10">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700"></div>
                <img src={currentUser.avatar} alt="" className="w-48 h-48 rounded-[3.5rem] border-4 border-slate-800 shadow-2xl group-hover:scale-[1.03] transition-transform relative z-10 object-cover" />
                <div className="absolute -bottom-3 -right-3 bg-amber-400 p-4 rounded-[1.5rem] text-slate-950 shadow-2xl ring-8 ring-slate-950 z-20"><Shield className="w-6 h-6 stroke-[3px]" /></div>
              </div>

              <div className="w-full space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">Verified Alias</label>
                  {!isChangingName ? (
                    <div className="flex items-center justify-between group bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <p className="text-2xl font-black text-white leading-none tracking-tight group-hover:gold-gradient-text transition-all duration-500">{currentUser.name}</p>
                      <button onClick={() => setIsChangingName(true)} className="p-3 text-slate-600 hover:text-amber-400 transition-all bg-slate-800 border border-slate-700 rounded-xl shadow-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateName} className="flex gap-3 animate-in fade-in slide-in-from-left duration-500">
                       <input 
                         name="newName" 
                         defaultValue={currentUser.name} 
                         required 
                         autoFocus
                         className="flex-1 px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-lg font-black text-white outline-none focus:border-amber-400 amber-glow" 
                       />
                       <button type="submit" className="bg-emerald-500 text-slate-950 px-5 py-4 rounded-2xl shadow-lg hover:bg-emerald-400 transition-all"><Save className="w-5 h-5 stroke-[3px]" /></button>
                       <button type="button" onClick={() => setIsChangingName(false)} className="bg-slate-800 border border-slate-700 text-slate-500 px-5 py-4 rounded-2xl hover:text-white transition-all"><X className="w-5 h-5" /></button>
                    </form>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">Clearance Protocol</label>
                  <div className="inline-flex items-center gap-3 bg-amber-400/10 text-amber-400 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] border border-amber-400/20 shadow-lg w-full">
                    <Shield className="w-4 h-4" /> System {currentUser.role}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/50">
                   <button onClick={() => setIsChangingPass(!isChangingPass)} className="flex items-center gap-4 text-[10px] font-black text-amber-500 hover:text-amber-400 transition-all uppercase tracking-[0.2em] group">
                     <div className="bg-slate-800 p-2.5 rounded-xl group-hover:bg-amber-400 group-hover:text-slate-950 transition-all border border-slate-700 shadow-md"><Key className="w-4 h-4" /></div> 
                     <span>Access Credential Reset</span>
                   </button>
                   {isChangingPass && (
                     <form onSubmit={handleUpdatePassword} className="mt-8 flex flex-col gap-4 animate-in fade-in slide-in-from-top duration-500">
                        <input name="newPass" required type="password" placeholder="Alphanumeric Master Key..." className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl focus:border-amber-400 amber-glow text-sm font-bold text-slate-100 outline-none" />
                        <button type="submit" className="w-full bg-slate-100 text-slate-950 py-4 rounded-2xl font-black hover:bg-white transition-all shadow-xl uppercase tracking-widest text-xs">Execute Update</button>
                     </form>
                   )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;