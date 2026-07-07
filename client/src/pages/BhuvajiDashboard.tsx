import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Undo, Search, LogOut } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { Devotee } from '../types';

export default function BhuvajiDashboard() {
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    if (role !== 'bhuvaji') {
      navigate('/login');
      return;
    }

    socketRef.current = io(window.location.origin);
    
    const fetchDevotees = async () => {
      try {
        const res = await fetch('/api/devotees');
        const data = await res.json();
        setDevotees(data.devotees);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchDevotees();
    socketRef.current.on('queue_update', fetchDevotees);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [navigate]);

  const handleStatusChange = async (id: string, status: 'completed' | 'pending') => {
    try {
      await fetch(`/api/devotees/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    navigate('/login');
  };

  const pendingDevotees = devotees.filter(d => d.status === 'pending');
  const currentDevotee = pendingDevotees.length > 0 ? pendingDevotees[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ffb828] to-[#ff7a00] drop-shadow-md">
            ભુવાજી કંટ્રોલ પેનલ
          </h2>
          <p className="text-[#ffb828]/60 text-xs mt-1 uppercase tracking-widest font-bold">Bhuvaji Control Panel</p>
        </div>
        <button 
          onClick={logout} 
          className="flex items-center text-[#ffb828]/70 hover:text-white bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 px-4 py-2 rounded-xl transition-all font-medium text-sm"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Control Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121015]/65 border border-[#ffb828]/25 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ffb828] to-[#ff7a00]" />
            <h3 className="text-sm font-semibold text-[#ffb828]/60 uppercase tracking-widest mb-6">ચાલુ ભક્ત (Current Devotee)</h3>
            
            {currentDevotee ? (
              <div className="text-center pb-4">
                <div className="font-serif text-8xl text-transparent bg-clip-text bg-gradient-to-r from-[#ffb828] to-[#ff7a00] font-bold mb-8 drop-shadow-[0_0_20px_rgba(255,184,40,0.35)]">
                  {currentDevotee.tokenNumber.toString().padStart(3, '0')}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                  <div className="bg-black/40 p-4 rounded-xl border border-[#ffb828]/15">
                    <p className="text-xs text-[#ffb828]/60 uppercase tracking-wider font-semibold">નામ (Name)</p>
                    <p className="text-lg text-white font-semibold mt-1">{currentDevotee.name}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-[#ffb828]/15">
                    <p className="text-xs text-[#ffb828]/60 uppercase tracking-wider font-semibold">ગામ (Village)</p>
                    <p className="text-lg text-white font-semibold mt-1">{currentDevotee.village}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-[#ffb828]/15">
                    <p className="text-xs text-[#ffb828]/60 uppercase tracking-wider font-semibold">મોબાઈલ (Mobile)</p>
                    <p className="text-lg text-white font-semibold mt-1">{currentDevotee.mobile}</p>
                  </div>
                </div>

                <div className="flex justify-center">
                   <button 
                     onClick={() => {
                       if (window.confirm('શું દર્શન પૂર્ણ થઈ ગયા છે? (Are you sure you want to complete this token and call the next?)')) {
                         handleStatusChange(currentDevotee.id, 'completed');
                       }
                     }}
                     className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border border-green-400/30 font-bold py-4 px-12 rounded-2xl text-lg flex items-center transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] transform hover:-translate-y-0.5"
                   >
                     દર્શન પૂર્ણ & આગળ વધો <ChevronRight className="ml-2 w-5 h-5" />
                   </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-24">
                <p className="text-xl text-[#f0e6d0]/40 font-medium">કતાર ખાલી છે (Queue is empty)</p>
              </div>
            )}
          </div>
        </div>

        {/* Queue List */}
        <div className="bg-[#121015]/65 border border-[#ffb828]/25 rounded-3xl p-6 backdrop-blur-xl flex flex-col h-[600px] shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-serif font-bold text-white">આજની કતાર</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffb828]/50" />
              <input 
                type="text"
                placeholder="શોધો..."
                className="bg-black/40 border border-[#ffb828]/20 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#ffb828]/60 focus:shadow-[0_0_15px_rgba(255,184,40,0.15)] w-28 focus:w-40 transition-all placeholder-[#ffb828]/35"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {devotees.filter(d => d.id !== currentDevotee?.id && d.status !== 'completed').map((devotee) => (
              <div 
                key={devotee.id}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  devotee.status === 'completed' 
                    ? 'bg-green-950/10 border-green-500/20 opacity-60' 
                    : devotee.id === currentDevotee?.id
                      ? 'bg-[#ffb828]/10 border-[#ffb828]/60 shadow-[0_0_15px_rgba(255,184,40,0.1)]'
                      : 'bg-black/40 border-[#ffb828]/15 hover:border-[#ffb828]/30'
                }`}
              >
                <div className="flex items-center gap-4">
                   <span className={`font-mono text-lg font-bold ${devotee.status === 'completed' ? 'text-green-400' : 'text-[#ffb828]'}`}>
                     {devotee.tokenNumber.toString().padStart(3, '0')}
                   </span>
                   <div>
                     <p className="text-white font-semibold text-sm">{devotee.name}</p>
                     <p className="text-xs text-[#ffb828]/60 font-medium mt-0.5">{devotee.village}</p>
                     <p className="text-[10px] text-white/45 mt-1.5 flex flex-col gap-0.5">
                       <span>📱 {devotee.mobile}</span>
                       <span>🕒 {new Date(devotee.registrationTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                     </p>
                   </div>
                </div>
                
                {devotee.status === 'completed' ? (
                  <button 
                    onClick={() => handleStatusChange(devotee.id, 'pending')}
                    className="p-2 text-[#ffb828]/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Undo Complete"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-[10px] font-bold text-orange-400 px-2 py-1 rounded bg-orange-400/10 uppercase tracking-wider">બાકી</div>
                )}
              </div>
            ))}
            {devotees.length === 0 && (
              <p className="text-center text-[#f0e6d0]/30 text-sm mt-10">આજે કોઈ રજીસ્ટ્રેશન નથી</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
