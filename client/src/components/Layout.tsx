import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Compass, Monitor, ShieldAlert } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function Layout() {
  const location = useLocation();
  const isTempleScreen = location.pathname.startsWith('/temple');
  const [liveEnabled, setLiveEnabled] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(window.location.origin);
    
    const fetchLiveStatus = async () => {
      try {
        const res = await fetch('/api/live/settings');
        if (res.ok) {
          const data = await res.json();
          setLiveEnabled(data.liveEnabled);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchLiveStatus();
    socketRef.current.on('live_tv_update', fetchLiveStatus);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0b0a0c] text-[#f0e6d0] font-sans antialiased overflow-x-hidden selection:bg-gold-500 selection:text-maroon-900">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-[#ff8c00]/8 blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-[#D4AF37]/8 blur-[180px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-[#8B0000]/6 blur-[150px]" />
      </div>

      {/* Thin luxury gold frame around the viewport */}
      <div className="fixed inset-0 border-[4px] border-gold-500/10 pointer-events-none z-50 rounded-lg" />
      <div className="fixed inset-2 border border-gold-500/5 pointer-events-none z-50 rounded-md" />

      {!isTempleScreen && (
        <nav className="relative z-40 border-b border-gold-500/20 bg-black/40 backdrop-blur-xl sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <a href="/" className="flex items-center space-x-3 group">
                <motion.div 
                  className="p-2.5 bg-gradient-to-br from-gold-500 via-saffron to-orange-glow rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-gold-400/30"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <Flame className="w-5.5 h-5.5 text-maroon-900 animate-pulse" />
                </motion.div>
                <div>
                  <h1 className="font-serif text-lg md:text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-500 to-orange-glow drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:brightness-110 transition-all">
                    Tiger Chehar Raj Uvasad
                  </h1>
                  <p className="text-gold-500/80 text-[9px] uppercase tracking-[0.25em] font-extrabold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron animate-ping" />
                    દિવ્ય ભક્ત પોર્ટલ
                  </p>
                </div>
              </a>
              
              <div className="flex items-center space-x-2 md:space-x-4">
                <a href="/" className="relative px-3.5 py-2 text-xs font-semibold text-gold-400 hover:text-white transition-all rounded-lg overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-gold-500" />
                    મુખ્ય ડેશબોર્ડ
                  </span>
                  <div className="absolute inset-0 bg-gold-500/5 scale-0 group-hover:scale-100 transition-all duration-300 rounded-lg border border-gold-500/20" />
                </a>

                <Link to="/temple/live" target="_blank" className="relative px-3.5 py-2 text-xs font-semibold text-gold-400 hover:text-white transition-all rounded-lg overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-gold-500" />
                    લાઈવ મંદિર ટીવી
                  </span>
                  <div className="absolute inset-0 bg-gold-500/5 scale-0 group-hover:scale-100 transition-all duration-300 rounded-lg border border-gold-500/20" />
                </Link>

                <Link to="/login" className="relative px-4 py-2.5 text-xs font-bold text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] border border-gold-500/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-[0.98] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  અધિકારી લોગિન
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={isTempleScreen ? "relative z-10 w-full" : "relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8"}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={isTempleScreen ? "w-full h-full" : ""}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

