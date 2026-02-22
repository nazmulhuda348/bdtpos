
import React, { useState } from 'react';
import { User, Store, UserRole } from '../types';
import { 
  Users as UsersIcon, 
  Plus, 
  Trash2, 
  Shield, 
  Warehouse, 
  X, 
  Search, 
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

interface UsersProps {
  users: User[];
  stores: Store[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const Users: React.FC<UsersProps> = ({ users, stores, setUsers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = form.userName.value;
    const role = form.userRole.value as UserRole;
    const assignedStoreId = form.userStore.value;
    const password = form.userPass.value;

    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      role,
      avatar: `https://picsum.photos/seed/${name}/200`,
      assignedStoreId: role === UserRole.SUPER_ADMIN ? undefined : assignedStoreId,
      password
    };

    setUsers(prev => [...prev, newUser]);
    setIsModalOpen(false);
    alert('Access Provisioned: New identity synchronized to global directory.');
  };

  const removeUser = (id: string) => {
    if (window.confirm('Access Revocation: Permanently remove this user session?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const getStoreName = (id?: string) => {
    if (!id) return 'Global/All';
    return stores.find(s => s.id === id)?.name || 'Unknown Hub';
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Personnel Governance</h1>
          <p className="text-slate-500 font-medium">Global access directory and branch assignments</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 px-6 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-amber-900/10 uppercase tracking-widest text-xs"
        >
          <UserPlus className="w-5 h-5 stroke-[3px]" />
          Provision Access
        </button>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Query directory for personnel..." 
            className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50 transition-all amber-glow" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 group hover:border-amber-400/30 transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-400/10 transition-colors"></div>
               
               <div className="flex items-start justify-between relative z-10 mb-6">
                  <img src={user.avatar} className="w-16 h-16 rounded-2xl border-2 border-slate-800 grayscale group-hover:grayscale-0 transition-all duration-500" />
                  <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      user.role === UserRole.SUPER_ADMIN ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 
                      user.role === UserRole.MANAGER ? 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20' : 
                      'bg-slate-700/50 text-slate-400 border-slate-700'
                    }`}>
                      {user.role}
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold mt-2 font-mono">#{user.id.split('-')[1] || 'ADMIN'}</p>
                  </div>
               </div>

               <div className="relative z-10 space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight group-hover:gold-gradient-text transition-all duration-500">{user.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                      <Warehouse className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{getStoreName(user.assignedStoreId)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${user.role === UserRole.SUPER_ADMIN ? 'text-amber-500' : 'text-slate-600'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clearance Lvl {user.role === UserRole.SUPER_ADMIN ? '3' : user.role === UserRole.MANAGER ? '2' : '1'}</span>
                    </div>
                    {user.id !== 'u-1' && (
                      <button onClick={() => removeUser(user.id)} className="p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provisioning Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
             <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Identity Provisioning</h2>
             <p className="text-slate-500 text-xs font-bold mb-8 uppercase tracking-[0.2em]">Configure Personnel Access Rights</p>
             
             <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Legal Nomenclature</label>
                  <input name="userName" required placeholder="Full Operational Name" className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Protocol Role</label>
                    <select name="userRole" className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow appearance-none">
                      <option value={UserRole.SALESMAN}>Salesman</option>
                      <option value={UserRole.MANAGER}>Store Manager</option>
                      <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Site Assignment</label>
                    <select name="userStore" className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow appearance-none">
                      <option value="">Global/No Branch</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Authentication Key</label>
                  <div className="relative">
                    <input name="userPass" required type={showPassword ? "text" : "password"} placeholder="Secure Access String" className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none text-slate-100 font-bold focus:border-amber-400 amber-glow" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-4 text-slate-600 hover:text-amber-400 transition-colors">
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-400/5 p-4 rounded-2xl border border-amber-400/10 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-slate-400 font-medium">Assigned Managers and Salesmen will be restricted to viewing and managing data strictly within their designated Site Hub.</p>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 py-5 rounded-[2rem] font-black shadow-xl shadow-amber-900/20 hover:scale-[1.02] transition-transform uppercase tracking-widest text-xs">Execute Authorization</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
