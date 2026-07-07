import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState<'bhuvaji' | 'admin'>('bhuvaji');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_role', data.role);
        if (data.role === 'bhuvaji') navigate('/bhuvaji');
        else navigate('/admin');
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-gold-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-500 to-orange-glow" />
        
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h2 className="text-3xl font-serif text-white mb-2">Secure Access</h2>
          <p className="text-gold-500/70">Please authenticate to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex bg-black/40 p-1 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${role === 'bhuvaji' ? 'bg-gold-500 text-maroon-900' : 'text-white/60 hover:text-white'}`}
              onClick={() => setRole('bhuvaji')}
            >
              Bhuvaji
            </button>
            <button
              type="button"
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${role === 'admin' ? 'bg-gold-500 text-maroon-900' : 'text-white/60 hover:text-white'}`}
              onClick={() => setRole('admin')}
            >
              Admin
            </button>
          </div>

          <div>
             <div className="relative">
               <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500/50" />
               <input 
                 type="password"
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full bg-black/20 border border-gold-500/30 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-gold-500 transition-colors"
                 placeholder="Enter Password"
                 required
               />
             </div>
             {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
             <p className="text-xs text-white/40 mt-4 text-center">Passwords for demo:<br/>bhuvaji: bhuvaji123<br/>admin: admin123</p>
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-maroon-900 font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
