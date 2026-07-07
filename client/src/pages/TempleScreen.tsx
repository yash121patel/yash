import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, BellRing, User, Clock, Bell, Volume2, Eye, Tv, Wifi, Sparkles, 
  VolumeX, Maximize2, Play, Pause, Compass, HeartHandshake, ShieldAlert,
  AlertCircle, ZoomIn, ZoomOut
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { DivineThreeScene } from '../components/DivineThreeScene';
import { cn } from '../lib/utils';

// 3D Shiny Glassmorphic Hover Card Component
function ThreeDCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setCoords({ x: x * 12, y: -y * 12 }); // Max 12 degrees tilt
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      className={cn(
        "relative rounded-3xl transition-all duration-300 ease-out border border-gold-500/20 bg-gradient-to-b from-black/20 to-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden",
        className
      )}
      style={{
        transform: isHovered ? `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg) scale3d(1.02, 1.02, 1.02)` : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'none' : 'all 0.5s ease'
      }}
    >
      {/* 3D Shiny Reflection Layer */}
      {isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 z-20"
          style={{
            background: `radial-gradient(circle 120px at ${coords.x * 5 + 50}% ${-coords.y * 5 + 50}%, rgba(255,213,74,0.45), transparent)`
          }}
        />
      )}
      
      {/* Top Gold Lighting Edge */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-gold-500/40 via-gold-300/60 to-transparent z-10" />

      {/* Content wrapper with translateZ to allow inner elements to pop out in 3D */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between" style={{ transform: 'translateZ(30px)' }}>
        {children}
      </div>
    </div>
  );
}

export default function TempleScreen() {
  const [currentToken, setCurrentToken] = useState<number | null>(null);
  const [nextToken, setNextToken] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<number | null>(null);
  
  // Player state controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [viewers, setViewers] = useState(1284);
  const [activeCount, setActiveCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  // Custom tilt animation tracking
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Live TV Settings state
  const [liveSettings, setLiveSettings] = useState({
    youtubeUrl: '',
    title: 'Live Temple Darshan Aarti',
    description: 'શ્રી ચેહર માઁ ના લાઈવ દર્શન',
    autoPlay: true,
    muteAudio: true,
    liveEnabled: false
  });
  
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Simulated view count fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => {
        const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return 1280 + activeCount + fluctuation;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [activeCount]);

  // Canvas Golden Particles Background Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{ x: number; y: number; size: number; speedY: number; opacity: number; angle: number }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create initial particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedY: -(Math.random() * 0.5 + 0.2),
        opacity: Math.random() * 0.5 + 0.2,
        angle: Math.random() * 360
      });
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 213, 74, 0.4)';
      
      // Gentle radial halo
      const radGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 10,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
      );
      radGrad.addColorStop(0, 'rgba(15, 12, 8, 0.95)');
      radGrad.addColorStop(0.5, 'rgba(11, 11, 11, 0.98)');
      radGrad.addColorStop(1, 'rgba(7, 6, 8, 1)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(p.angle * Math.PI / 180) * 0.25;
        p.angle += 0.5;

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 213, 74, ${p.opacity})`;
        ctx.shadowColor = '#FFD54A';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    drawParticles();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Real-time server queue and settings integration
  useEffect(() => {
    socketRef.current = io(window.location.origin);
    
    const fetchCurrentState = async () => {
      try {
        const res = await fetch('/api/devotees?status=pending');
        const data = await res.json();
        if (data.devotees && data.devotees.length > 0) {
          setCurrentToken(data.devotees[0].tokenNumber);
          if (data.devotees.length > 1) {
            setNextToken(data.devotees[1].tokenNumber);
          } else {
            setNextToken(null);
          }
        } else {
          setCurrentToken(null);
          setNextToken(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchLiveSettings = async () => {
      try {
        console.log("Fetching Live Settings...");
        const res = await fetch('/api/live/settings');
        if (res.ok) {
          const data = await res.json();
          console.log(`Live Enabled = ${data.liveEnabled}`);
          setLiveSettings({
            youtubeUrl: data.youtubeUrl || '',
            title: data.title || '',
            description: data.description || '',
            autoPlay: data.autoPlay ?? true,
            muteAudio: data.muteAudio ?? true,
            liveEnabled: data.liveEnabled ?? false
          });
          setIsPlaying(data.autoPlay ?? true);
          setIsMuted(data.muteAudio ?? true);
          console.log("Temple Live Updated");
        } else {
          console.error("Failed to fetch live settings: Status " + res.status);
        }
      } catch (e) {
        console.error("Error fetching live settings:", e);
      }
    };

    fetchCurrentState();
    fetchLiveSettings();

    socketRef.current.on('queue_update', fetchCurrentState);
    socketRef.current.on('live_tv_update', fetchLiveSettings);

    socketRef.current.on('viewer_count_update', (count: number) => {
      setActiveCount(count);
      setViewers(1280 + count);
    });

    socketRef.current.on('announce_next', (data: { tokenNumber: number }) => {
      setAnnouncement(data.tokenNumber);
      
      const utterance = new SpeechSynthesisUtterance(`Token Number ${data.tokenNumber}, Please proceed towards Bhuvaji.`);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
      
      setTimeout(() => {
        setAnnouncement(null);
        fetchCurrentState();
      }, 5000);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const waitPercentage = currentToken ? Math.min(100, Math.max(10, 100 - (currentToken % 10) * 10)) : 65;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (x / rect.width) * 10,
      y: (y / rect.height) * -10
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // YouTube URL Format Converter
  const getEmbedUrl = (url: string, autoplay: boolean, mute: boolean) => {
    if (!url) return '';
    let videoId = '';
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      }
    } catch (e) {
      console.error(e);
    }
    if (!videoId) return '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=${mute ? 1 : 0}&rel=0`;
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-hidden bg-[#0B0B0B] text-white">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      
      <div className="absolute inset-0 w-full h-full opacity-15 pointer-events-none z-0">
        <DivineThreeScene className="w-full h-full" />
      </div>

      <AnimatePresence>
        {announcement && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/85 z-50 backdrop-blur-md pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.1, y: -20 }}
              className="text-center bg-[#121015]/80 border-2 border-gold-500/40 p-8 rounded-3xl max-w-md shadow-[0_0_50px_rgba(255,213,74,0.3)] relative overflow-hidden"
            >
              <div className="absolute -inset-10 bg-gold-500/5 rounded-full filter blur-xl animate-pulse" />
              <BellRing className="w-24 h-24 text-gold-400 mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl font-serif font-extrabold text-white mb-2 tracking-wide">
                ટોકન નંબર {announcement.toString().padStart(3, '0')}
              </h2>
              <p className="text-xl text-gold-400 font-bold mb-4">કૃપા કરીને ભુવાજી પાસે આવો.</p>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-extrabold flex items-center justify-center gap-1.5 border-t border-gold-500/10 pt-4">
                <Wifi className="w-3.5 h-3.5 text-green-400 animate-pulse" /> Live Darshan Queue Alert
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 w-full p-6 flex justify-between items-center border-b border-gold-500/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full border border-gold-500/25 p-0.5 bg-black/50 flex items-center justify-center shadow-[0_0_15px_rgba(255,213,74,0.15)]">
            <Flame className="w-5 h-5 text-gold-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold-500/70 font-serif">TIGER CHEHAR RAJ UVASAD</span>
            <span className="text-xs font-semibold text-white/50">લાઈવ મંદિર ટીવી પોર્ટલ</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-green-400 flex items-center gap-1">
            <Wifi className="w-3 h-3" /> Online
          </span>
        </div>
      </header>

      <main className="relative z-10 w-full px-4 md:px-8 lg:px-12 py-6 flex-1 flex flex-col justify-center">
        
        <AnimatePresence mode="wait">
          {!liveSettings.liveEnabled ? (
            <motion.div
              key="queue-only-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full max-w-[95%] xl:max-w-[1400px] mx-auto flex flex-col lg:flex-row justify-between items-stretch gap-8 lg:gap-24"
            >
              <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col">
                {/* CARD 1: Token Information */}
              <ThreeDCard 
                className="border-2 border-gold-500/35 p-8 shadow-[0_25px_60px_rgba(212,175,55,0.12)] min-h-[360px] flex flex-col justify-between relative overflow-hidden bg-black/40 backdrop-blur-md rounded-3xl"
              >
                <h4 className="text-white text-base font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 border-b border-gold-500/10 pb-4">
                  <User className="w-6 h-6 text-gold-400" /> વર્તમાન ટોકન (CURRENT TOKEN)
                </h4>

                <div className="flex flex-col items-center justify-center flex-1 py-6">
                  <span className="text-[140px] leading-none font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-gold-200 via-gold-400 to-[#ff7a00] drop-shadow-[0_10px_20px_rgba(255,140,0,0.3)]">
                    {currentToken ? currentToken.toString().padStart(3, '0') : '001'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-white/50 border-t border-gold-500/10 pt-5 mt-2 bg-black/20 rounded-xl px-4 py-3">
                  <span className="font-bold tracking-widest uppercase">આગળનો નંબર (Next):</span>
                  <span className="text-gold-400 font-mono font-extrabold text-2xl">
                    {nextToken ? nextToken.toString().padStart(3, '0') : '002'}
                  </span>
                </div>
              </ThreeDCard>
              </div>

              <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col">
              {/* CARD 3: Divine Diya / Announcement Card */}
              <ThreeDCard className="border-2 border-gold-500/35 p-8 shadow-[0_25px_60px_rgba(212,175,55,0.12)] min-h-[360px] flex flex-col justify-between relative overflow-hidden bg-black/40 backdrop-blur-md rounded-3xl">
                <h4 className="text-white text-base font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 border-b border-gold-500/10 pb-4">
                  <Bell className="w-6 h-6 text-gold-400 animate-bounce" /> મંદિર જાહેરાત (NOTICE)
                </h4>

                <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
                  <div className="relative flex flex-col items-center mb-6">
                    <svg className="w-12 h-16 overflow-visible" viewBox="0 0 20 30">
                      <defs>
                        <linearGradient id="flameGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffd200" />
                          <stop offset="50%" stopColor="#ff5400" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M 10 0 C 18 10 18 20 10 28 C 2 20 2 10 10 0 Z" 
                        fill="url(#flameGrad2)" 
                        className="origin-bottom animate-ping"
                        style={{ animationDuration: '2.5s' }}
                      />
                      <path 
                        d="M 10 4 C 15 11 15 18 10 24 C 5 18 5 11 10 4 Z" 
                        fill="#ffd200"
                        className="origin-bottom animate-pulse"
                      />
                    </svg>
                    <div className="w-20 h-6 bg-gradient-to-r from-gold-600 to-gold-400 rounded-b-full border-t border-gold-200/50 shadow-md mt-1" />
                  </div>

                  <h3 className="text-4xl font-extrabold text-[#ffd54a] mb-4 drop-shadow-[0_0_15px_rgba(255,213,74,0.4)] tracking-wide">
                    જય ચેહર માઁ
                  </h3>
                  <p className="text-base text-white/70 font-semibold leading-relaxed px-2">
                    દરેક ભક્તોને નમ્ર વિનંતી કે દર્શન માટે લાઇનમાં શાંતિ જાળવી રાખવી. તમારો વારો આવે ત્યારે જ આગળ વધવું.
                  </p>
                </div>

                <div className="border-t border-gold-500/10 pt-5 mt-2 text-center text-gold-400 font-serif font-extrabold text-base uppercase tracking-widest bg-black/20 rounded-xl px-4 py-3">
                  🙏 સદાયે કૃપા વરસાવો માઁ 🙏
                </div>
              </ThreeDCard>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="live-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full h-full flex flex-col items-center justify-center max-w-7xl mx-auto"
            >
              {/* Massive TV Live Stream Player (Full Width) */}
              <div className="w-full flex flex-col gap-4 justify-center">
                <div 
                  id="player-box"
                  ref={playerContainerRef}
                  className="w-full relative rounded-[32px] overflow-hidden bg-black border border-gold-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 group aspect-video"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/5 via-transparent to-[#8B0000]/5 pointer-events-none z-0" />
                  <div className="absolute inset-0 rounded-[32px] border border-gold-500/10 pointer-events-none z-10" />

                  {/* Overlays: Top Actions Header */}
                  <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-red-500/25 pointer-events-auto shadow-lg">
                      <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                      <span className="text-xs font-extrabold uppercase tracking-widest text-red-500">LIVE NOW</span>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-gold-500/20 pointer-events-auto text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80 shadow-lg">
                      <Eye className="w-4 h-4 text-gold-400" />
                      <span>{viewers.toLocaleString()} watching</span>
                    </div>
                  </div>

                  {/* Video Player Box */}
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black z-0">
                    {liveSettings.youtubeUrl && isPlaying ? (
                      getEmbedUrl(liveSettings.youtubeUrl, isPlaying, isMuted) ? (
                        <iframe
                          src={getEmbedUrl(liveSettings.youtubeUrl, isPlaying, isMuted)}
                          title={liveSettings.title || "Live Temple Darshan Aarti"}
                          className="w-full h-full object-cover transition-transform duration-300 origin-center"
                          style={{ transform: `scale(${zoomLevel})` }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-center p-6 text-white/50">
                          <AlertCircle className="w-20 h-20 text-orange-400 mx-auto mb-4 animate-pulse" />
                          <p className="text-xl font-bold text-white">અમાન્ય વિડિઓ લિંક (Invalid Live Link)</p>
                          <p className="text-sm text-white/40 mt-2">Please enter a valid format in admin settings</p>
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full bg-[#0b0a0c] flex flex-col items-center justify-center p-6 text-center">
                        <AlertCircle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
                        <h3 className="text-3xl font-bold text-red-400 uppercase tracking-widest">🔴 Live Darshan is currently unavailable.</h3>
                        <p className="text-base text-white/40 mt-3">કૃપા કરીને પછીથી પ્રયાસ કરો (Please check back later)</p>
                      </div>
                    )}

                    {/* In-Video Action controls overlay */}
                    {liveSettings.youtubeUrl && (
                      <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-4 bg-black/75 backdrop-blur-md rounded-full border border-gold-500/20 text-gold-400 hover:text-white pointer-events-auto active:scale-95 transition-all shadow-lg"
                          >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </button>

                          <button 
                            type="button"
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-4 bg-black/75 backdrop-blur-md rounded-full border border-gold-500/20 text-gold-400 hover:text-white pointer-events-auto active:scale-95 transition-all shadow-lg"
                          >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                        </div>

                        <div className="flex gap-3 pointer-events-auto">
                          <button 
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.max(1.0, prev - 0.1))}
                            title="Zoom Out (ઝૂમ ઘટાડો)"
                            className="p-4 bg-black/75 backdrop-blur-md rounded-full border border-gold-500/20 text-gold-400 hover:text-white active:scale-95 transition-all shadow-lg"
                          >
                            <ZoomOut className="w-5 h-5" />
                          </button>

                          <span className="flex items-center justify-center px-4 py-2 bg-black/75 backdrop-blur-md border border-gold-500/20 text-gold-400 rounded-2xl text-xs font-mono font-bold min-w-[60px] shadow-lg">
                            {Math.round(zoomLevel * 100)}%
                          </span>

                          <button 
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.1))}
                            title="Zoom In (ઝૂમ કરો)"
                            className="p-4 bg-black/75 backdrop-blur-md rounded-full border border-gold-500/20 text-gold-400 hover:text-white active:scale-95 transition-all shadow-lg"
                          >
                            <ZoomIn className="w-5 h-5" />
                          </button>

                          <button 
                            type="button"
                            onClick={toggleFullscreen}
                            title="Toggle Fullscreen"
                            className="p-4 bg-[#D4AF37] text-maroon-900 rounded-full border border-gold-300 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)]"
                          >
                            <Maximize2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-[90%] mx-auto h-[4px] bg-gradient-to-r from-transparent via-gold-500/20 to-transparent blur-sm rounded-full pointer-events-none mt-4" />
                <div className="w-[80%] mx-auto h-[12px] bg-gold-500/5 filter blur-lg rounded-full pointer-events-none transform -translate-y-1.5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 w-full mt-auto flex items-center justify-center text-white/40 text-xs py-4 px-6 border-t border-gold-500/10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
          <span className="text-gold-500">🛡️</span> ટાઈગર ચહેર રાજ ઉવાસદ - બધા હકો આરક્ષિત (All Rights Reserved)
        </div>
      </footer>

      {/* Fullscreen style overrides */}
      <style>{`
        #player-box:fullscreen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          border-radius: 0 !important;
          border: none !important;
        }
        #player-box:fullscreen iframe {
          border-radius: 0 !important;
          scale: 1.0 !important;
        }
      `}</style>
    </div>
  );
}
