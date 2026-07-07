import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Clock, Compass, Users, CheckCircle2, RotateCcw, User, Home, Phone, 
  ShieldAlert, Volume2, MapPin, Bell, Monitor, Search, FileSpreadsheet, Download, 
  LogOut, QrCode, Map, Image as ImageIcon, Calendar, TrendingUp, 
  Send, Lock, UserCheck, RefreshCw, FileDown, Printer, Camera, Mic, MicOff, 
  X, ChevronRight, Check, AlertCircle, Plus, Eye
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { cn } from '../lib/utils';
import { QRCodeCanvas } from 'qrcode.react';
import { SpeechService, speak, processSpeechWithGemini, extractMobileNumber, convertWordsToDigits, matchesConfirmation } from '../services/speech';
import { downloadPassPdf } from '../lib/passPdf';
import { VoiceWaveVisualizer } from '../components/VoiceWaveVisualizer';
import { DivineThreeScene } from '../components/DivineThreeScene';
import templeDarshanImg from '../assets/images/temple_darshan_1782924670035.jpg';
import lionLogoImg from '../assets/images/golden_lion_logo_1782992631796.jpg';

interface Devotee {
  id: string;
  name: string;
  village: string;
  mobile: string;
  language: string;
  tokenNumber: number;
  status: 'pending' | 'completed';
  registrationTime: string;
  completionTime?: string;
  district?: string;
  state?: string;
  age?: number;
  gender?: string;
  vehicleNumber?: string;
  familyCount?: number;
  specialNotes?: string;
  photoUrl?: string;
}

interface FormData {
  name: string;
  village: string;
  mobile: string;
  district: string;
  state: string;
  age: string;
  gender: string;
  vehicleNumber: string;
  familyCount: string;
  specialNotes: string;
  photoUrl: string;
  aadhaar: string;
  arrivalDate: string;
}

const LANGUAGES = [
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
  { code: 'hi-IN', label: 'हिंदी (Hindi)' },
  { code: 'en-IN', label: 'English' },
  { code: 'mr-IN', label: 'મરાઠી (Marathi)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
];

const PROMPTS: Record<string, any> = {
  'gu-IN': {
    greeting: "તમારું નામ બોલો",
    village: "ગામ નું નામ બોલો",
    mobile: "મોબાઈલ નંબર બોલો",
    confirm: (n: string, v: string, m: string) => `તમારું નામ ${n}, ગામ ${v}, અને નંબર ${m} છે. આ માહિતી સાચી છે? સાચી હોય તો હા બોલો, ખોટી હોય તો ના બોલો.`,
    success: (t: string) => `નોંધણી સફળ. તમારો ટોકન નંબર ${t} છે. ધ્યાન રાખો, ટોકન નંબર ${t}.`,
    fail: "નોંધણી નિષ્ફળ. કૃપા કરીને ફરી પ્રયાસ કરો.",
    resetMessage: "ઠીક છે. ફરીથી ભરો. તમારું નામ બોલો.",
    submitWords: ['હા', 'હાં', 'હા બરાબર', 'સાચું', 'બરાબર', 'yes', 'haa', 'haan', 'submit', 'correct', 'han', 'हाँ', 'हां'],
    againWords: ['ના', 'નથી', 'ખોટું', 'ફરીથી', 'no', 'naa', 'nahi', 'again', 'galat', 'wrong', 'नहीं', 'नही']
  },
  'hi-IN': {
    greeting: "जय चेहर मां। आपका नाम क्या है?",
    village: "आपके गांव का नाम क्या है?",
    mobile: "आपका मोबाइल नंबर क्या है?",
    confirm: (n: string, v: string, m: string) => `आपका नाम ${n}, गांव ${v}, और नंबर ${m} है। सही है तो हाँ बोलें, गलत है तो नहीं बोलें।`,
    success: (t: string) => `पंजीकरण सफल। आपका टोकन नंबर ${t} है। ध्यान रखें, टोकन नंबर ${t}.`,
    fail: "पंजीकरण विफल। कृपया पुनः प्रयास करें।",
    resetMessage: "ठीक है। फिर से कोशिश करते हैं। अपना नाम बताएं।",
    submitWords: ['सबमिट', 'हाँ', 'हां', 'सही', 'submit', 'yes', 'correct'],
    againWords: ['फिर से', 'नहीं', 'गलत', 'again', 'no', 'wrong']
  },
  'en-IN': {
    greeting: "Jai Chehar Maa. What is your full name?",
    village: "What is your village name?",
    mobile: "What is your mobile number?",
    confirm: (n: string, v: string, m: string) => `Your name is ${n}, village is ${v}, and number is ${m}. Say yes to confirm, or no to redo.`,
    success: (t: string) => `Registration Successful. Your Token Number is ${t}. Remember, token number ${t}.`,
    fail: "Registration failed. Please try again.",
    resetMessage: "Okay, let us try again. Please say your full name.",
    submitWords: ['submit', 'yes', 'correct', 'confirm', 'haa'],
    againWords: ['again', 'no', 'wrong', 'redo', 'na']
  }
};

const getPrompt = (lang: string) => PROMPTS[lang] || PROMPTS['en-IN'];

const formatMobileForSpeech = (mobile: string, lang: string) => {
  if (lang === 'gu-IN') {
    const digitsMap: Record<string, string> = {
      '0': 'શૂન્ય', '1': 'એક', '2': 'બે', '3': 'ત્રણ', '4': 'ચાર',
      '5': 'પાંચ', '6': 'છ', '7': 'સાત', '8': 'આઠ', '9': 'નવ'
    };
    return mobile.split('').map(d => digitsMap[d] || d).join(' ');
  }
  return mobile.split('').join(' ');
};

type InteractionState = 
  | 'idle' 
  | 'asking_name' | 'listening_name'
  | 'asking_village' | 'listening_village'
  | 'asking_mobile' | 'listening_mobile'
  | 'processing' 
  | 'asking_confirm' | 'listening_confirm'
  | 'success';

type ActiveTab = 
  | 'home'
  | 'register'
  | 'events'
  | 'gallery';

const getTabFromPath = (pathname: string): ActiveTab => {
  if (pathname.includes('register') || pathname.includes('ragister')) return 'register';
  if (pathname.includes('events')) return 'events';
  if (pathname.includes('gallery')) return 'gallery';
  return 'home';
};

const tabRoutes: Record<ActiveTab, string> = {
  home: '/',
  register: '/register',
  events: '/events',
  gallery: '/gallery',
};

export default function DevoteeRegistration() {
  const location = useLocation();
  const navigate = useNavigate();
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const goToTab = (tab: ActiveTab) => {
    navigate(tabRoutes[tab]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time Database state
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0, total: 0 });
  const [currentRunningToken, setCurrentRunningToken] = useState<number | null>(null);

  // Form Registration State
  const [formData, setFormData] = useState<FormData>({
    name: '',
    village: '',
    mobile: '',
    district: 'Gandhinagar',
    state: 'Gujarat',
    age: '',
    gender: 'Male',
    vehicleNumber: '',
    familyCount: '1',
    specialNotes: '',
    photoUrl: '',
    aadhaar: '',
    arrivalDate: new Date().toISOString().split('T')[0]
  });

  const [rawTranscripts, setRawTranscripts] = useState({
    name: '',
    village: '',
    mobile: ''
  });

  // Photo state & Camera refs
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Voice engine states
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [languageCode, setLanguageCode] = useState('gu-IN');
  const [voiceToken, setVoiceToken] = useState<number | null>(null);

  // System states
  const passRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortField, setSortField] = useState<'tokenNumber' | 'name' | 'registrationTime'>('tokenNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Devotee Pass (for modal/display)
  const [selectedPass, setSelectedPass] = useState<Devotee | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; time: string; type: 'info' | 'success' | 'alert' }>>([
    { id: '1', message: 'મંદિર ભક્તિ બ્રોડકાસ્ટ ચાલુ થયું છે.', time: '10 min ago', type: 'info' },
    { id: '2', message: 'નવા ભક્ત રજીસ્ટ્રેશન માટે તૈયાર.', time: 'Just now', type: 'success' }
  ]);

  // Gallery Active Lightbox Image
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Registration Schedule settings & status state
  const [scheduleState, setScheduleState] = useState<{
    status: 'open' | 'closed';
    reason?: 'disabled' | 'before_start' | 'after_end' | 'limit_reached' | 'scheduled_future';
    countdownSeconds: number;
    settings?: {
      registrationStatus: string;
      startDay: string;
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      timezone: string;
      maxTokens: number;
      maxTokensPerDay: number;
      allowEarlyRegistration: boolean;
      autoCloseAfterLimitReached: boolean;
    };
  }>({
    status: 'open',
    countdownSeconds: 0
  });

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Live TV settings & viewer count
  const [liveSettings, setLiveSettings] = useState<{
    youtubeUrl: string;
    streamTitle: string;
    description: string;
    autoplay: boolean;
    mute: boolean;
    enableLive: boolean;
  }>({
    youtubeUrl: '',
    streamTitle: '',
    description: '',
    autoplay: true,
    mute: true,
    enableLive: false
  });
  const [liveViewerCount, setLiveViewerCount] = useState(0);

  // Refs
  const recognitionRef = useRef<SpeechService | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const stateRef = useRef(interactionState);
  const transcriptRef = useRef(transcript);
  const rawTranscriptsRef = useRef(rawTranscripts);
  const createdDevoteeRef = useRef<Devotee | null>(null);

  useEffect(() => {
    stateRef.current = interactionState;
  }, [interactionState]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    rawTranscriptsRef.current = rawTranscripts;
  }, [rawTranscripts]);

  // Clock runner
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/registration-schedule');
      if (res.ok) {
        const data = await res.json();
        setScheduleState(data);
      }
    } catch (e) {
      console.error("Error loading registration schedule:", e);
    }
  };

  // Schedule Countdown runner
  useEffect(() => {
    if (scheduleState.status === 'closed' && scheduleState.countdownSeconds > 0) {
      const timer = setInterval(() => {
        setScheduleState(prev => {
          if (prev.countdownSeconds <= 1) {
            clearInterval(timer);
            fetchSchedule();
            return { ...prev, status: 'open', countdownSeconds: 0 };
          }
          return { ...prev, countdownSeconds: prev.countdownSeconds - 1 };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [scheduleState.status, scheduleState.countdownSeconds]);

  // Translate countdown seconds to Days, Hours, Minutes, Seconds
  useEffect(() => {
    const totalSeconds = scheduleState.countdownSeconds;
    if (totalSeconds <= 0) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    setCountdown({ days, hours, minutes, seconds });
  }, [scheduleState.countdownSeconds]);

  // Fetch Database Data & Setup Sockets
  useEffect(() => {
    socketRef.current = io(window.location.origin);
    
    const fetchDevoteesAndStats = async () => {
      try {
        const res = await fetch('/api/devotees');
        const data = await res.json();
        setDevotees(data.devotees);

        const qRes = await fetch('/api/queue/status');
        const qData = await qRes.json();
        setCurrentRunningToken(qData.currentPendingToken);
        setStats(qData.stats);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchDevoteesAndStats();
    fetchSchedule();

    const fetchLiveSettings = async () => {
      try {
        const res = await fetch('/api/live/settings');
        if (res.ok) {
          const data = await res.json();
          setLiveSettings(data);
        }
      } catch (e) {
        console.error("Error loading live settings:", e);
      }
    };
    fetchLiveSettings();

    socketRef.current.on('queue_update', fetchDevoteesAndStats);
    socketRef.current.on('registration_schedule_update', fetchSchedule);
    socketRef.current.on('live_tv_update', fetchLiveSettings);
    socketRef.current.on('viewer_count_update', (count: number) => {
      setLiveViewerCount(count);
    });
    socketRef.current.on('new_devotee', (devotee: Devotee) => {
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          message: `નવા ભક્ત રજીસ્ટ્રેશન: ${devotee.name} (${devotee.village}) - ટોકન: ${devotee.tokenNumber}`,
          time: 'હમણાં જ',
          type: 'success'
        },
        ...prev
      ]);
    });

    recognitionRef.current = new SpeechService(languageCode);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.setLang(languageCode);
    }
  }, [languageCode]);

  // Voice Interaction Orchestrator (State Machine)
  useEffect(() => {
    const prompts = getPrompt(languageCode);
    let cancelled = false;

    const updateTranscript = (text: string) => {
      let displayText = text;
      if (stateRef.current === 'listening_mobile') {
        const digitText = convertWordsToDigits(text).replace(/\D/g, '');
        displayText = digitText || text;
        const extracted = extractMobileNumber(text);
        if (extracted) {
          setFormData(prev => ({ ...prev, mobile: extracted }));
        }
      }
      transcriptRef.current = displayText;
      setTranscript(displayText);
    };

    const commitRawTranscript = (field: 'name' | 'village' | 'mobile', value: string) => {
      const updated = { ...rawTranscriptsRef.current, [field]: value };
      rawTranscriptsRef.current = updated;
      setRawTranscripts(updated);
    };
    
    if (interactionState === 'asking_name') {
      speak(prompts.greeting, languageCode, () => {
        if (!cancelled) setInteractionState('listening_name');
      });
    } else if (
      interactionState === 'listening_name' || 
      interactionState === 'listening_village' || 
      interactionState === 'listening_mobile' || 
      interactionState === 'listening_confirm'
    ) {
      setTranscript('');
      transcriptRef.current = '';
      setIsListening(true);

      const silenceMs = interactionState === 'listening_mobile' ? 8000 : 6000;
      recognitionRef.current?.start(
        (text) => {
          if (!cancelled) updateTranscript(text);
        },
        () => {
          if (cancelled) return;
          setIsListening(false);
          const st = stateRef.current;
          const currentText = transcriptRef.current.trim();
          
          if (!currentText && st !== 'idle' && st !== 'success') {
            setInteractionState('idle');
            return;
          }

          if (st === 'listening_name') {
            commitRawTranscript('name', currentText);
            setInteractionState('asking_village');
          } else if (st === 'listening_village') {
            commitRawTranscript('village', currentText);
            setInteractionState('asking_mobile');
          } else if (st === 'listening_mobile') {
            const mobileValue = extractMobileNumber(currentText) || currentText;
            commitRawTranscript('mobile', mobileValue);
            setInteractionState('processing');
          } else if (st === 'listening_confirm') {
            processConfirmation(currentText);
          }
        },
        (err) => {
          console.error("Speech recognition error", err);
          if (!cancelled && err !== 'no-speech') {
            setInteractionState('idle');
            setIsListening(false);
          }
        },
        { silenceMs }
      );
    } else if (interactionState === 'asking_village') {
      speak(prompts.village, languageCode, () => {
        if (!cancelled) setInteractionState('listening_village');
      });
    } else if (interactionState === 'asking_mobile') {
      speak(prompts.mobile, languageCode, () => {
        if (!cancelled) setInteractionState('listening_mobile');
      });
    } else if (interactionState === 'processing') {
      processAllTranscripts();
    } else if (interactionState === 'asking_confirm') {
      speak(prompts.confirm(formData.name, formData.village, formatMobileForSpeech(formData.mobile, languageCode)), languageCode, () => {
        if (!cancelled) setInteractionState('listening_confirm');
      });
    }

    return () => {
      cancelled = true;
      recognitionRef.current?.abort();
      setIsListening(false);
    };
  }, [interactionState]);

  const processAllTranscripts = async () => {
    const raw = rawTranscriptsRef.current;
    const combined = `Name: ${raw.name}\nVillage: ${raw.village}\nMobile: ${raw.mobile}`;
    const extractedMobile = extractMobileNumber(raw.mobile);

    const applyParsedData = (name?: string, village?: string, mobile?: string) => {
      setFormData(prev => {
        const newForm = { ...prev };
        newForm.name = (name || raw.name || prev.name).trim();
        newForm.village = (village || raw.village || prev.village).trim();
        if (extractedMobile) {
          newForm.mobile = extractedMobile;
        } else if (mobile) {
          newForm.mobile = mobile.replace(/\D/g, '').slice(-10);
        }
        return newForm;
      });
      setInteractionState('asking_confirm');
    };

    try {
      const data = await processSpeechWithGemini(combined, languageCode);
      applyParsedData(data.name, data.village, data.mobile);
    } catch (error) {
      console.error("Error parsing speech:", error);
      if (raw.name || raw.village || extractedMobile) {
        applyParsedData();
      } else {
        setInteractionState('idle');
      }
    }
  };

  const processConfirmation = (text: string) => {
    const prompts = getPrompt(languageCode);
    
    const isSubmit = matchesConfirmation(text, prompts.submitWords);
    const isAgain = matchesConfirmation(text, prompts.againWords);
    
    if (isSubmit) {
      handleVoiceSubmit();
    } else if (isAgain) {
      setFormData(prev => ({ ...prev, name: '', village: '', mobile: '' }));
      rawTranscriptsRef.current = { name: '', village: '', mobile: '' };
      setRawTranscripts({ name: '', village: '', mobile: '' });
      setTranscript('');
      transcriptRef.current = '';
      if (prompts.resetMessage) {
        speak(prompts.resetMessage, languageCode, () => {
          setInteractionState('asking_name');
        });
      } else {
        setInteractionState('asking_name');
      }
    } else {
      setInteractionState('asking_confirm');
    }
  };

  const toggleListening = () => {
    if (interactionState === 'idle' || interactionState === 'success') {
      if ('speechSynthesis' in window) {
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
      }
      
      setFormData(prev => ({ ...prev, name: '', village: '', mobile: '' }));
      rawTranscriptsRef.current = { name: '', village: '', mobile: '' };
      setRawTranscripts({ name: '', village: '', mobile: '' });
      createdDevoteeRef.current = null;
      setInteractionState('asking_name');
    } else {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setInteractionState('idle');
    }
  };

  const handleVoiceSubmit = async () => {
    // Validate mobile
    if (!formData.mobile || formData.mobile.length !== 10) {
      speak(getPrompt(languageCode).fail, languageCode);
      setInteractionState('idle');
      return;
    }

    // Use raw transcripts as fallback if formData fields are empty
    const submitName = formData.name || rawTranscripts.name || 'ભક્ત';
    const submitVillage = formData.village || rawTranscripts.village || 'અજ્ઞાત';

    // Show submitting state immediately
    setInteractionState('success');

    try {
      const res = await fetch('/api/devotees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: submitName,
          village: submitVillage,
          mobile: formData.mobile,
          language: languageCode,
          photoUrl: photoPreview || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Server error:', errData);
        speak(getPrompt(languageCode).fail, languageCode);
        setInteractionState('idle');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setVoiceToken(data.tokenNumber);
        // Update formData with the actual name/village used
        setFormData(prev => ({ ...prev, name: submitName, village: submitVillage }));
        speak(getPrompt(languageCode).success(data.tokenNumber.toString()), languageCode);
        
        // Open QR Pass for print
        const createdDevotee: Devotee = {
          id: data.id,
          name: submitName,
          village: submitVillage,
          mobile: formData.mobile,
          language: languageCode,
          tokenNumber: data.tokenNumber,
          status: 'pending',
          registrationTime: new Date().toISOString(),
          photoUrl: photoPreview || undefined
        };
        createdDevoteeRef.current = createdDevotee;
        setSelectedPass(createdDevotee);
      } else {
        speak(getPrompt(languageCode).fail, languageCode);
        setInteractionState('idle');
      }
    } catch (e) {
      console.error(e);
      speak(getPrompt(languageCode).fail, languageCode);
      setInteractionState('idle');
    }
  };

  // Manual Form Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.village || !formData.mobile) {
      alert("નામ, ગામ અને મોબાઈલ નંબર હોવા ફરજિયાત છે.");
      return;
    }
    if (formData.mobile.length !== 10) {
      alert("મોબાઇલ નંબર ૧૦ અંકનો હોવો જોઈએ.");
      return;
    }

    try {
      const res = await fetch('/api/devotees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          village: formData.village,
          mobile: formData.mobile,
          language: 'gu-IN',
          district: formData.district,
          state: formData.state,
          age: parseInt(formData.age) || undefined,
          gender: formData.gender,
          vehicleNumber: formData.vehicleNumber,
          familyCount: parseInt(formData.familyCount) || 1,
          specialNotes: formData.specialNotes,
          photoUrl: photoPreview || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        // Reset form
        const createdDevotee: Devotee = {
          id: data.id,
          name: formData.name,
          village: formData.village,
          mobile: formData.mobile,
          language: 'gu-IN',
          tokenNumber: data.tokenNumber,
          status: 'pending',
          registrationTime: new Date().toISOString(),
          district: formData.district,
          state: formData.state,
          age: parseInt(formData.age) || undefined,
          gender: formData.gender,
          vehicleNumber: formData.vehicleNumber,
          familyCount: parseInt(formData.familyCount) || 1,
          specialNotes: formData.specialNotes,
          photoUrl: photoPreview || undefined
        };

        setSelectedPass(createdDevotee);
        
        setFormData({
          name: '',
          village: '',
          mobile: '',
          district: 'Gandhinagar',
          state: 'Gujarat',
          age: '',
          gender: 'Male',
          vehicleNumber: '',
          familyCount: '1',
          specialNotes: '',
          photoUrl: '',
          aadhaar: '',
          arrivalDate: new Date().toISOString().split('T')[0]
        });
        setPhotoPreview(null);
      }
    } catch (e) {
      console.error(e);
      alert("રજીસ્ટ્રેશન કરવામાં ભૂલ આવી.");
    }
  };

  // Real Camera Photo Capture
  const triggerCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setShowCamera(true);
      // Wait a tick for modal to render and attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      alert("કેમેરા ચાલુ કરવામાં ભૂલ આવી. કૃપા કરીને કેમેરાની પરવાનગી આપો.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoPreview(dataUrl);
        stopCamera();
      }
    }
  };

  // Search & Filters on Devotees table
  const filteredDevotees = devotees.filter(devotee => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      devotee.name.toLowerCase().includes(term) ||
      devotee.village.toLowerCase().includes(term) ||
      devotee.mobile.includes(term) ||
      devotee.tokenNumber.toString().includes(term);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && devotee.status === statusFilter;
  });

  // Sorting
  const sortedDevotees = [...filteredDevotees].sort((a, b) => {
    let fieldA: any = a[sortField];
    let fieldB: any = b[sortField];

    if (sortField === 'name') {
      fieldA = fieldA.toLowerCase();
      fieldB = fieldB.toLowerCase();
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedDevotees.length / itemsPerPage);
  const paginatedDevotees = sortedDevotees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: 'tokenNumber' | 'name' | 'registrationTime') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const downloadPDF = async () => {
    if (!passRef.current || !selectedPass) return;
    try {
      const qrCanvas = passRef.current.querySelector('canvas');
      if (!qrCanvas) {
        throw new Error('QR code not ready');
      }

      const qrDataUrl = qrCanvas.toDataURL('image/png');
      const fileName = `TemplePass_${selectedPass.tokenNumber.toString().padStart(3, '0')}.pdf`;

      await downloadPassPdf(
        {
          tokenNumber: selectedPass.tokenNumber,
          name: selectedPass.name,
          village: selectedPass.village,
          mobile: selectedPass.mobile,
          registrationTime: selectedPass.registrationTime,
          photoUrl: selectedPass.photoUrl,
          logoUrl: lionLogoImg,
          qrDataUrl,
        },
        fileName
      );
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("PDF ડાઉનલોડ કરવામાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Token', 'Name', 'Village', 'Mobile', 'Status', 'Registered Time'];
    const rows = devotees.map(d => [
      d.tokenNumber,
      d.name,
      d.village,
      d.mobile,
      d.status,
      new Date(d.registrationTime).toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tiger_chehar_devotees_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulated Database Actions

  // Helper for status badge
  const renderStatusBadge = (status: 'pending' | 'completed') => {
    return (
      <span className={cn(
        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        status === 'completed' 
          ? "bg-green-500/10 text-green-400 border-green-500/25 shadow-[0_0_10px_rgba(34,197,94,0.15)]" 
          : "bg-orange-500/10 text-orange-400 border-orange-500/25 shadow-[0_0_10px_rgba(249,115,22,0.15)]"
      )}>
        {status === 'completed' ? 'પૂર્ણ' : 'બાકી'}
      </span>
    );
  };

  return (
    <div className="min-h-screen relative flex flex-col md:flex-row gap-6 z-10 select-none">
      
      {/* ─── SIDEBAR DOCK ─── */}
      <aside className="w-full md:w-68 flex flex-col gap-4 self-start sticky top-24 z-30">
        
        {/* Divine clock header */}
        <div className="bg-[#121015]/65 border border-gold-500/20 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-b from-gold-500 to-orange-glow" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-500/70">ચેહર માઁ મંત્ર રિંગ</span>
            <span className="text-xl font-bold font-serif text-white tracking-widest leading-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <Clock className="w-5 h-5 text-saffron animate-pulse" />
        </div>

        {/* Navigation Sidebar links */}
        <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-3.5 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 relative overflow-hidden">
          
          <div className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-gold-500/60 border-b border-gold-500/10 mb-2">
            ડેશબોર્ડ કંટ્રોલ
          </div>

          {[
            { id: 'home', label: 'હોમપેજ કંટ્રોલ', icon: Compass },
            { id: 'register', label: 'ભક્ત રજીસ્ટ્રેશન', icon: Plus },
            { id: 'events', label: 'ઈવેન્ટ અને ફરજો', icon: Calendar },
            { id: 'gallery', label: 'દિવ્ય ગેલરી ૩D', icon: ImageIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id as ActiveTab)}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
                  isSelected
                    ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                    : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5", isSelected ? "text-maroon-900" : "text-gold-500 group-hover:scale-110 transition-transform")} />
                <span>{tab.label}</span>
                {isSelected && (
                  <motion.div 
                    layoutId="activeTabOutline" 
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-maroon-900"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Mini quick status display */}
        <div className="bg-[#121015]/65 border border-gold-500/15 rounded-2xl p-4.5 backdrop-blur-md shadow-lg flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/50">લાઈવ ક્યુ સ્ટેટ્સ</span>
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/60">ચાલુ ટોકન:</span>
            <span className="font-mono text-base font-bold text-saffron">{currentRunningToken ? currentRunningToken.toString().padStart(3, '0') : 'નથી'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/60">બાકી પ્રતીક્ષા:</span>
            <span className="font-mono font-bold text-gold-400">{stats.pending} ભક્તો</span>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-gold-500/10 pt-2 mt-1">
            <span className="text-white/60">નોંધણી સ્થિતિ:</span>
            {scheduleState.status === 'open' ? (
              <span className="text-green-400 font-bold flex items-center gap-1">🟢 Open</span>
            ) : (
              <span className="text-red-400 font-bold flex items-center gap-1">🔴 Closed</span>
            )}
          </div>
        </div>

      </aside>

      {/* ─── MAIN CONTENT WINDOW ─── */}
      <section className="flex-1 min-w-0 z-10">
        <AnimatePresence mode="wait">
          
          {/* 1. HOME TAB */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Cinematic Hero */}
              <div className="h-[460px] relative rounded-3xl overflow-hidden border border-gold-500/25 bg-black/60 shadow-[0_0_40px_rgba(0,0,0,0.9)] flex items-center justify-center">
                {/* 3D Scene Background wrapper */}
                <DivineThreeScene className="absolute inset-0 w-full h-full opacity-90" />
                
                {/* Sunrise/mountain overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a0c] via-black/30 to-[#ff8c00]/10 pointer-events-none" />

                {/* Logo and floating content */}
                <div className="relative z-10 text-center px-4 space-y-4 max-w-2xl select-none">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center"
                  >
                    <img 
                      src={lionLogoImg} 
                      alt="Golden Lion Logo" 
                      className="w-20 h-20 rounded-full border border-gold-500/40 shadow-[0_0_30px_rgba(212,175,55,0.4)] object-cover bg-black animate-pulse" 
                    />
                  </motion.div>
                  
                  <div className="space-y-1">
                    <h2 className="font-serif text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-gold-400 to-gold-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] tracking-wide">
                      Tiger Chehar Raj Uvasad
                    </h2>
                    <p className="text-saffron text-xs md:text-sm font-extrabold uppercase tracking-[0.3em] drop-shadow-md">
                      ડીજીટલ રજીસ્ટ્રેશન ડેશબોર્ડ
                    </p>
                  </div>

                  <p className="text-[#f0e6d0]/80 text-xs md:text-sm max-w-md mx-auto leading-relaxed drop-shadow-md">
                    માં ચેહરના સાન્નિધ્યમાં ડિજિટલ દર્શન વ્યવસ્થા અને લાઈવ લાઈન મેનેજમેન્ટ પોર્ટલમાં આપનું હાર્દિક સ્વાગત છે.
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 pt-3">
                    <button 
                      onClick={() => goToTab('register')}
                      className="px-5 py-3 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:scale-105 active:scale-95 border border-gold-400/40"
                    >
                      ભક્ત રજીસ્ટ્રેશન
                    </button>
                  </div>
                </div>

                {/* Floating particle text bottom bar */}
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[10px] text-gold-500/50 uppercase tracking-widest border-t border-gold-500/10 pt-3.5 z-10 pointer-events-none">
                  <span>✦ સદાયે સહાયતી માં ચેહર</span>
                  <span>ઉવાસદ ધામ ✦</span>
                </div>
              </div>

              {/* LIVE TV SECTION */}
              {liveSettings.enableLive && liveSettings.youtubeUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-[#121015]/65 border border-gold-500/30 hover:border-gold-500/60 rounded-[32px] p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(212,175,55,0.15)] group relative overflow-hidden max-w-4xl mx-auto"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-gold-500" />
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 relative z-10">
                    <div>
                      <h3 className="text-xl md:text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-orange-glow tracking-wide">
                        {liveSettings.streamTitle || "લાઈવ દર્શન (Live Darshan)"}
                      </h3>
                      {liveSettings.description && (
                        <p className="text-white/60 text-xs mt-1 max-w-md">{liveSettings.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-full border border-gold-500/10 shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                        </span>
                        <span className="text-red-400 font-bold text-xs uppercase tracking-widest drop-shadow-[0_0_5px_#ef4444]">Live Now</span>
                      </div>
                      <div className="w-px h-4 bg-gold-500/20" />
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gold-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{liveViewerCount} <span className="text-white/40 ml-0.5">Watching</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden aspect-video border-2 border-gold-500/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] transition-shadow duration-500">
                    <iframe
                      src={(() => {
                        let url = liveSettings.youtubeUrl;
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
                        return `https://www.youtube.com/embed/${videoId}?autoplay=${liveSettings.autoplay ? 1 : 0}&mute=${liveSettings.mute ? 1 : 0}&rel=0`;
                      })()}
                      title={liveSettings.streamTitle || "Live Temple TV"}
                      className="w-full h-full object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </motion.div>
              )}

              {/* Stats Grid Dashboard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {[
                  { title: "આજના રજીસ્ટ્રેશન", value: stats.total, sub: "આજના નોંધાયેલા ભક્તો", color: "from-blue-500/10 text-blue-400" },
                  { title: "લાઈવ ટોકન નંબર", value: currentRunningToken ? currentRunningToken.toString().padStart(3, '0') : '001', sub: "ભુવાજી પાસે ચાલુ લાઈન", color: "from-amber-500/10 text-saffron" }
                ].map((card, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-[#121015]/65 border border-gold-500/15 hover:border-gold-500/45 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all relative overflow-hidden flex flex-col gap-3 group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gold-500/5 to-transparent rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f0e6d0]/50">{card.title}</span>
                      <div className={cn("p-2 rounded-lg bg-gradient-to-r", card.color.split(" ")[0])} />
                    </div>

                    <div className="flex flex-col">
                      <span className={cn("text-3xl font-serif font-extrabold drop-shadow", card.color.split(" ")[1])}>
                        {card.value}
                      </span>
                      <span className="text-[10px] text-white/40 mt-1 font-semibold">{card.sub}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )}

          {/* 2. REGISTRATION TAB */}
          {activeTab === 'register' && (
            scheduleState.status === 'closed' ? (
              <motion.div
                key="register-locked"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl mx-auto bg-[#121015]/75 border border-gold-500/20 rounded-[32px] p-8 backdrop-blur-md shadow-2xl relative text-center overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-red-500 via-orange-glow to-red-500 rounded-t-3xl" />
                <div className="absolute -inset-10 bg-gold-500/5 rounded-full filter blur-xl animate-pulse pointer-events-none" />

                {/* Animated Golden Clock */}
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gold-500/10 to-transparent rounded-full border border-gold-500/30 flex items-center justify-center relative">
                  <svg className="w-12 h-12 text-gold-400 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" className="origin-[12px_12px] animate-spin" style={{ transformOrigin: '12px 12px', animationDuration: '6s' }} />
                  </svg>
                  <div className="absolute inset-0 border border-gold-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                </div>

                <h3 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-saffron to-gold-500 drop-shadow flex items-center justify-center gap-2">
                  🔒 Registration is Closed
                </h3>
                <p className="text-xs text-white/50 uppercase tracking-widest font-extrabold mt-1">નોંધણી હાલમાં બંધ છે</p>

                <div className="my-8 p-5 bg-black/45 border border-gold-500/10 rounded-2xl space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ffb828]/60 block">અગામી સમયપત્રક (Next Opening Window)</span>
                  <div className="text-sm font-semibold text-white/90">
                    Registration opens on: <span className="text-gold-400 font-serif font-bold">{scheduleState.settings?.startDay || 'Sunday'}</span> at <span className="text-gold-400 font-mono font-bold">{scheduleState.settings?.startTime || '08:00 AM'}</span>
                  </div>
                  {scheduleState.settings?.startDate && (
                    <div className="text-xs text-white/40">
                      Date: {scheduleState.settings.startDate} to {scheduleState.settings.endDate || 'N/A'}
                    </div>
                  )}
                </div>

                {/* Countdown Timer */}
                {scheduleState.countdownSeconds > 0 && (
                  <div className="space-y-4 mb-4">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#ffb828]/50 block">નોંધણી શરૂ થવામાં બાકી સમય (Countdown Timer)</span>
                    <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
                      {[
                        { label: "Days", value: countdown.days },
                        { label: "Hours", value: countdown.hours },
                        { label: "Minutes", value: countdown.minutes },
                        { label: "Seconds", value: countdown.seconds }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-black/50 border border-gold-500/15 rounded-xl p-3 flex flex-col gap-1 items-center justify-center">
                          <span className="font-mono text-2xl font-extrabold text-saffron">{item.value.toString().padStart(2, '0')}</span>
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-white/40">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-red-400 font-bold tracking-widest mt-6 uppercase flex items-center justify-center gap-1.5 border-t border-gold-500/5 pt-4">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" /> 🔴 Registration Closed
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
              {/* Left Form Panel */}
              <div className="lg:col-span-8 bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative">
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-gold-500 via-saffron to-orange-glow rounded-t-3xl" />
                
                <div className="mb-8">
                  <h3 className="font-serif text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-orange-glow">
                    ભક્ત રજીસ્ટ્રેશન ફોર્મ (Registration Form)
                  </h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider font-extrabold mt-1">Fill out manually or use the AI Voice assistant below</p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">ભક્તનું નામ (Full Name) *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/40" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-gold-500 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all placeholder-white/20"
                          placeholder="દા.ત. નરેશભાઈ પટેલ"
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">મોબાઈલ નંબર (Mobile Number) *</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/40" />
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={formData.mobile}
                          onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-gold-500 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all placeholder-white/20"
                          placeholder="૧૦ આંકડાનો ફોન નંબર"
                        />
                      </div>
                    </div>

                    {/* Village */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">ગામનું નામ (Village) *</label>
                      <div className="relative">
                        <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/40" />
                        <input
                          type="text"
                          required
                          value={formData.village}
                          onChange={e => setFormData({ ...formData, village: e.target.value })}
                          className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-gold-500 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all placeholder-white/20"
                          placeholder="ગામ દા.ત. ઉવાસદ"
                        />
                      </div>
                    </div>

                    {/* District */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">જિલ્લો (District)</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/40" />
                        <input
                          type="text"
                          value={formData.district}
                          onChange={e => setFormData({ ...formData, district: e.target.value })}
                          className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-gold-500 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all placeholder-white/20"
                        />
                      </div>
                    </div>

                    {/* State */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">રાજ્ય (State)</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>


                    {/* Gender */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">લિંગ (Gender)</label>
                      <select
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="Male">પુરુષ (Male)</option>
                        <option value="Female">સ્ત્રી (Female)</option>
                        <option value="Other">અન્ય (Other)</option>
                      </select>
                    </div>

                    {/* Family Members Count */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80">સાથે સભ્યો (Family Members)</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.familyCount}
                        onChange={e => setFormData({ ...formData, familyCount: e.target.value })}
                        className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                  </div>

                  {/* Special Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gold-500/80">ખાસ નોંધ / માનતા (Special Notes)</label>
                    <textarea
                      value={formData.specialNotes}
                      onChange={e => setFormData({ ...formData, specialNotes: e.target.value })}
                      className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors h-20"
                      placeholder="માનતા અથવા કોઈ વિશેષ સેવા બાબત નોંધ..."
                    />
                  </div>

                  {/* Devotee Photo upload capture simulation */}
                  <div className="bg-black/20 border border-dashed border-gold-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-gold-500/30 overflow-hidden bg-black/60 flex items-center justify-center relative">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-gold-500/30" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 text-center sm:text-left">
                      <h4 className="text-xs font-bold text-white">ફોટો અપલોડ (Live Photo Camera Capture)</h4>
                      <p className="text-[10px] text-white/40">વેબકેમ અથવા સેલ્ફી કેમેરા દ્વારા લાઈવ પાસ માટે ફોટો લો</p>
                    </div>
                    <button
                      type="button"
                      onClick={triggerCamera}
                      className="px-4 py-2 border border-gold-500/30 hover:border-gold-500/60 rounded-xl text-xs font-bold text-gold-500 hover:text-white transition-all active:scale-95"
                    >
                      ફોટો ખેંચો (Capture)
                    </button>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-maroon-900 text-sm font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] border border-gold-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> સબમિટ રજીસ્ટ્રેશન
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          name: '',
                          village: '',
                          mobile: '',
                          district: 'Gandhinagar',
                          state: 'Gujarat',
                          age: '',
                          gender: 'Male',
                          vehicleNumber: '',
                          familyCount: '1',
                          specialNotes: '',
                          photoUrl: '',
                          aadhaar: '',
                          arrivalDate: new Date().toISOString().split('T')[0]
                        });
                        setPhotoPreview(null);
                      }}
                      className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all active:scale-[0.97]"
                    >
                      રીસેટ ફોર્મ
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Voice Assistant Panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Voice Card */}
                <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col min-h-[420px]">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-saffron to-gold-500" />
                  
                  <div className="text-center mb-6">
                    <h3 className="font-serif text-lg font-bold text-white">AI વૉઇસ રજીસ્ટ્રેશન</h3>
                    <p className="text-[9px] text-[#ffb828]/60 uppercase tracking-widest font-bold mt-1">Google Voice + Gemini Agent</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {interactionState === 'success' ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center gap-4 py-3 text-center"
                      >
                        {/* Success badge */}
                        <motion.div
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                          className="inline-flex items-center justify-center w-14 h-14 bg-green-500/20 text-green-400 rounded-full border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                        >
                          <Check className="w-7 h-7" />
                        </motion.div>

                        <motion.h3
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm font-bold text-green-400"
                        >
                          🎉 નોંધણી સફળ! Registration Success!
                        </motion.h3>

                        {/* BIG ANIMATED TOKEN NUMBER */}
                        <motion.div
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }}
                          className="relative w-full"
                        >
                          {/* glow behind */}
                          <div className="absolute inset-0 bg-gold-500/20 rounded-2xl filter blur-xl animate-pulse" />
                          <div className="relative bg-gradient-to-br from-[#1a1408] to-[#0d0a05] border-2 border-gold-500/60 rounded-2xl p-5 shadow-[0_0_30px_rgba(212,175,55,0.35)] overflow-hidden">
                            {/* top shine line */}
                            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold-400/80 to-transparent" />
                            <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-gold-500/50 mb-2">🎫 ટોકન નંબર (Token Number)</p>
                            <motion.p
                              initial={{ scale: 1.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.5 }}
                              className="text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-gold-300 via-saffron to-gold-500 leading-none drop-shadow-[0_0_20px_rgba(212,175,55,0.7)]"
                            >
                              {voiceToken?.toString().padStart(3, '0')}
                            </motion.p>
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.9 }}
                              className="text-[9px] text-gold-400/60 mt-2 font-bold"
                            >
                              {formData.name} · {formData.village}
                            </motion.p>
                          </div>
                        </motion.div>

                        {/* Action buttons */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 }}
                          className="flex gap-2 w-full"
                        >
                          <button
                            onClick={() => {
                              if (createdDevoteeRef.current) {
                                setSelectedPass(createdDevoteeRef.current);
                                return;
                              }
                              const pass: Devotee = {
                                id: Date.now().toString(),
                                name: formData.name,
                                village: formData.village,
                                mobile: formData.mobile,
                                language: languageCode,
                                tokenNumber: voiceToken!,
                                status: 'pending',
                                registrationTime: new Date().toISOString(),
                                photoUrl: photoPreview || undefined
                              };
                              setSelectedPass(pass);
                            }}
                            className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-extrabold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> પ્રિન્ટ પાસ
                          </button>
                          <button
                            onClick={() => {
                              setInteractionState('idle');
                              setFormData(prev => ({ ...prev, name: '', village: '', mobile: '' }));
                              setRawTranscripts({ name: '', village: '', mobile: '' });
                              setTranscript('');
                              setVoiceToken(null);
                            }}
                            className="flex-1 py-2 bg-black/40 border border-gold-500/25 text-gold-400 text-xs font-bold rounded-xl hover:bg-black/60 transition-all active:scale-95"
                          >
                            બીજી નોંધણી
                          </button>
                        </motion.div>
                      </motion.div>
                    ) : (interactionState === 'asking_confirm' || interactionState === 'listening_confirm') ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.35 }}
                        className="flex-1 flex flex-col gap-4"
                      >
                        {/* Header */}
                        <div className="text-center">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-500/60 block">
                            {interactionState === 'listening_confirm' ? '🎙️ સાંભળી રહ્યો છું...' : '📢 વિગત ચકાસો'}
                          </span>
                          <p className="text-[9px] text-white/30 mt-0.5">Confirm or Redo your details</p>
                        </div>

                        {/* Details Preview Card */}
                        <div className="bg-black/50 border border-gold-500/20 rounded-2xl p-4 space-y-2.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-gold-500/0 via-gold-500/60 to-gold-500/0" />
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-gold-500/50 block mb-2">ભક્ત વિગત (Devotee Details)</span>
                          {[
                            { label: 'નામ (Name)', value: formData.name },
                            { label: 'ગામ (Village)', value: formData.village },
                            { label: 'મોબાઈલ (Mobile)', value: formData.mobile }
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs border-b border-gold-500/10 pb-2 last:border-b-0 last:pb-0">
                              <span className="text-white/40 font-medium">{item.label}:</span>
                              <span className="text-gold-300 font-bold font-mono text-sm">{item.value || '—'}</span>
                            </div>
                          ))}
                        </div>

                        {/* HAA / NA visual buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => processConfirmation('હા')}
                            className={cn(
                            "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-300",
                            interactionState === 'listening_confirm'
                              ? "bg-green-500/15 border-green-500/40 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                              : "bg-black/30 border-green-500/15"
                          )}>
                            <span className="text-2xl mb-1">✅</span>
                            <span className="text-sm font-extrabold text-green-400">HAA (હા)</span>
                            <span className="text-[9px] text-white/30 mt-0.5">Submit & Get Token</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => processConfirmation('ના')}
                            className={cn(
                            "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-300",
                            interactionState === 'listening_confirm'
                              ? "bg-red-500/10 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                              : "bg-black/30 border-red-500/15"
                          )}>
                            <span className="text-2xl mb-1">❌</span>
                            <span className="text-sm font-extrabold text-red-400">NA (ના)</span>
                            <span className="text-[9px] text-white/30 mt-0.5">Redo Details</span>
                          </button>
                        </div>

                        {/* Mic listening pulse indicator */}
                        {interactionState === 'listening_confirm' && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <div className="absolute inset-0 border border-orange-500/50 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                              <div className="absolute -inset-3 border border-orange-500/20 rounded-full animate-pulse" />
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600/30 to-orange-800/30 border border-orange-400/60 flex items-center justify-center">
                                <Mic className="w-5 h-5 text-orange-300 animate-pulse" />
                              </div>
                            </div>
                            <span className="text-[10px] text-orange-400 font-bold">HAA અથવા NA બોલો</span>
                          </div>
                        )}

                        {/* Live transcript */}
                        <div className="bg-black/35 rounded-xl p-3 border border-gold-500/10 min-h-10 flex items-center justify-center text-center text-xs text-white/50 italic">
                          {transcript
                            ? <span className="text-white font-medium">"{transcript}"</span>
                            : interactionState === 'listening_confirm'
                              ? <span className="text-white/30">HAA (✓) અથવા NA (✗) બોલો...</span>
                              : <span className="text-white/30">📢 વિગત વાંચી રહ્યો છે...</span>
                          }
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col"
                      >
                        <div className="flex justify-center mb-6">
                          <select 
                            value={languageCode} 
                            onChange={(e) => setLanguageCode(e.target.value)}
                            disabled={isListening}
                            className="bg-black/60 border border-gold-500/40 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-gold-500 transition-colors disabled:opacity-50 text-xs w-44 text-center font-bold"
                          >
                            {LANGUAGES.map(lang => (
                              <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-1 my-4">
                          <div className="relative mb-4">
                            {isListening && (
                              <>
                                <div className="absolute inset-0 border border-orange-500/50 rounded-full animate-ping shadow-[0_0_35px_rgba(255,140,0,0.65)]" style={{ animationDuration: '1.8s' }} />
                                <div className="absolute -inset-4 border border-orange-500/20 rounded-full animate-pulse" />
                              </>
                            )}
                            <button
                              type="button"
                              onClick={toggleListening}
                              className={cn(
                                "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                isListening 
                                  ? "bg-gradient-to-br from-orange-600 to-orange-800 border-orange-400 shadow-[0_0_30px_rgba(255,140,0,0.8)] scale-105" 
                                  : "bg-gradient-to-br from-maroon-900 to-black border-gold-500 hover:border-gold-400 shadow-md active:scale-95"
                              )}
                            >
                              {isListening ? (
                                <Mic className="w-8 h-8 text-white animate-pulse" />
                              ) : (
                                <MicOff className="w-8 h-8 text-gold-400/40" />
                              )}
                            </button>
                          </div>
                          
                          <p className={cn("text-xs font-bold mb-4 transition-opacity", isListening ? "text-orange-400 opacity-100" : "text-white/40")}>
                            {isListening ? "હું સાંભળું છું, બોલો..." : "માઇક ચાલુ કરવા બટન દબાવો"}
                          </p>
                          <div className="h-8 w-full flex justify-center items-center opacity-80 mb-4">
                            <VoiceWaveVisualizer isListening={isListening} />
                          </div>
                        </div>

                        {/* Interactive state transcript logging */}
                        <div className="bg-black/35 rounded-xl p-3 border border-gold-500/10 min-h-16 flex flex-col justify-center text-center text-xs text-white/70 italic">
                          {transcript ? (
                            <span className="text-white font-medium">"{transcript}"</span>
                          ) : (
                            <span className="text-white/30">લાઈવ સ્પીચ ટ્રાન્સક્રિપ્ટ અહીં દેખાશે</span>
                          )}
                        </div>

                        {/* Voice form feedback preview */}
                        <div className="space-y-2 mt-4 text-xs">
                          <div className="flex justify-between items-center text-white/50 border-b border-white/5 py-1">
                            <span>નામ (Name):</span>
                            <span className="text-white font-bold">{formData.name || rawTranscripts.name || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-white/50 border-b border-white/5 py-1">
                            <span>ગામ (Village):</span>
                            <span className="text-white font-bold">{formData.village || rawTranscripts.village || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-white/50 border-b border-white/5 py-1">
                            <span>મોબાઈલ (Mobile):</span>
                            <span className="text-white font-bold">{formData.mobile || rawTranscripts.mobile || '-'}</span>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Instructions steps card */}
                <div className="bg-[#121015]/65 border border-gold-500/15 rounded-2xl p-5 shadow-lg backdrop-blur-md">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">વૉઇસ સિસ્ટમ માર્ગદર્શિકા</h4>
                  <ul className="space-y-2 text-[11px] text-[#f0e6d0]/70">
                    <li className="flex items-start gap-2">
                      <span className="text-gold-500 font-bold">1.</span>
                      <span>માઈક બટન દબાવીને તમારું આખું નામ બોલો.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold-500 font-bold">2.</span>
                      <span>ત્યારબાદ પૂછવામાં આવે ત્યારે તમારા ગામનું નામ અને છેલ્લે મોબાઈલ નંબર બોલો.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold-500 font-bold">3.</span>
                      <span>સિસ્ટમ તમારી વિગતો કન્ફર્મ કરશે. મંજૂરી માટે "હા" અથવા "સાચું" બોલવું.</span>
                    </li>
                  </ul>
                </div>

              </div>

            </motion.div>
          ))}



          {/* 5. EVENTS TAB */}
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-saffron/20 via-gold-500/20 to-[#8B0000]/20 border border-gold-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center md:text-left">
                  <Flame className="w-10 h-10 text-saffron animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold text-white">મંદિર આગામી મહોત્સવ ઉત્સવ અને ભંડારો</h4>
                    <p className="text-[11px] text-[#f0e6d0]/75 mt-0.5">શ્રાવણ સુદ પૂનમના રોજ સવારે દિવ્ય આરતી તથા ભંડારાનું આયોજન.</p>
                  </div>
                </div>
                <div className="bg-black/60 border border-gold-500/30 rounded-xl px-4 py-2 text-center">
                  <span className="block text-[8px] text-white/50 uppercase tracking-wider">દિવસો બાકી</span>
                  <span className="text-lg font-serif font-bold text-gold-500">૨૮ દિવસ</span>
                </div>
              </div>

              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg w-full">
                <h4 className="font-serif text-lg font-bold text-white border-b border-gold-500/10 pb-3 mb-4">મંદિર દૈનિક કાર્યક્રમ સમય પત્રક</h4>
                <div className="space-y-4">
                  {[
                    { title: "સવારની મંગળા આરતી", time: "૦૬:૦૦ AM", desc: "દરરોજ સવારે દિવ્ય મહા આરતી" },
                    { title: "ભક્ત ભોજન પ્રસાદશાળા", time: "૧૧:૩批 AM - ૦૨:૦૦ PM", desc: "શ્રી ચેહર પ્રસાદ વિતરણ ભોજનાલય" },
                    { title: "સાંજની સંધ્યા આરતી", time: "૦૭:૦૦ PM", desc: "સાંજના સમયની ધૂપ આરતી" },
                    { title: "રાત્રી ભજન સત્સંગ મંડળ", time: "૦૯:૦૦ PM", desc: "શનિવાર અને રવિવારે ખાસ આયોજન" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 p-3 bg-black/30 rounded-xl border border-gold-500/10">
                      <div>
                        <h5 className="text-xs font-bold text-white">{item.title}</h5>
                        <p className="text-[10px] text-white/40 mt-0.5">{item.desc}</p>
                      </div>
                      <span className="px-3 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-lg text-xs font-mono font-bold whitespace-nowrap">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. GALLERY TAB */}
          {activeTab === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg">
                <div className="border-b border-gold-500/10 pb-3 mb-6">
                  <h3 className="font-serif text-2xl font-bold text-white">દિવ્ય ફોટો અને વિડીયો ગેલેરી</h3>
                  <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold mt-0.5">Uvasad Temple drone footages & festival records</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { title: "માં ચેહર ગર્ભગૃહ દર્શન", img: templeDarshanImg, type: "Photo" },
                    { title: "સુવર્ણ મુકુટ મહોત્સવ", img: lionLogoImg, type: "Photo" },
                    { title: "મંદિર પરિસર ડ્રોન વ્યુ", img: templeDarshanImg, type: "Drone Video" },
                    { title: "લાઈવ પૂર્ણાહુતિ યજ્ઞ", img: lionLogoImg, type: "Photo" },
                    { title: "ભક્તોની લાઈવ ભીડ રેકોર્ડ", img: templeDarshanImg, type: "Photo" },
                    { title: "દિવ્ય ધ્વજારોહણ ઉત્સવ", img: lionLogoImg, type: "Photo" }
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.03 }}
                      className="bg-black/50 border border-gold-500/15 rounded-2xl overflow-hidden shadow-lg group relative cursor-pointer"
                      onClick={() => setLightboxImage(item.img)}
                    >
                      <div className="h-48 overflow-hidden relative">
                        <img 
                          src={item.img} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <Eye className="w-6 h-6 text-gold-500 mx-auto" />
                        </div>
                        <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/75 text-gold-500 border border-gold-500/30 rounded text-[9px] font-bold uppercase tracking-wider">
                          {item.type}
                        </span>
                      </div>
                      <div className="p-4 border-t border-gold-500/10">
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </section>

      {/* ─── LIVE NOTIFICATIONS CENTER (DRAWER / ALERTS) ─── */}
      <div className="fixed bottom-6 right-6 z-40 max-w-sm flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence>
          {notifications.slice(0, 2).map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-black/85 border border-gold-500/25 rounded-2xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.85)] flex items-start gap-3 backdrop-blur-xl pointer-events-auto"
            >
              <Bell className="w-5 h-5 text-saffron shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <p className="text-xs font-bold text-white leading-normal">{notif.message}</p>
                <div className="flex justify-between items-center mt-2 text-[9px] text-[#ffb828]/50 uppercase tracking-widest font-extrabold">
                  <span>{notif.time}</span>
                  <button 
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                    className="hover:text-white"
                  >
                    બંધ કરો (Dismiss)
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ─── MODAL: QR DEVOTEE PASS VIEW ─── */}
      <AnimatePresence>
        {selectedPass && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 print-modal-wrapper">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm w-full relative print:!transform-none print:!opacity-100"
            >
              <div 
                ref={passRef}
                className="print-pass-container bg-[#121015] border-2 border-gold-500/40 rounded-3xl p-6 md:p-8 w-full relative shadow-[0_0_50px_rgba(212,175,55,0.3)] text-center space-y-6"
              >
              <button
                onClick={() => setSelectedPass(null)}
                className="print-hide absolute top-4 right-4 text-white/50 hover:text-white p-1 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <img 
                  src={lionLogoImg} 
                  alt="Temple logo" 
                  className="w-12 h-12 mx-auto rounded-full object-cover border border-gold-500/40" 
                />
                <h4 className="font-serif text-sm font-bold text-gold-500 tracking-wider">TIGER CHEHAR RAJ UVASAD</h4>
                <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">Divine Darshan Entry Pass</p>
              </div>

              <div className="border border-gold-500/20 rounded-2xl p-4 bg-black/40 space-y-4">
                
                <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border border-gold-500/20 bg-black/60">
                  <img 
                    src={selectedPass.photoUrl || lionLogoImg} 
                    alt="Devotee" 
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl border border-gold-500/20 flex items-center justify-center">
                  <QRCodeCanvas 
                    value={JSON.stringify({
                      token: selectedPass.tokenNumber.toString().padStart(3, '0'),
                      name: selectedPass.name,
                      village: selectedPass.village,
                      mobile: selectedPass.mobile,
                      entryTime: new Date(selectedPass.registrationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      temple: "Tiger Chehar Raj Uvasad"
                    })}
                    size={96}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={false}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-white/50 border-b border-white/5 pb-1">
                    <span>ટોકન (Token ID):</span>
                    <span className="text-saffron font-extrabold text-base">{selectedPass.tokenNumber.toString().padStart(3, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/50 border-b border-white/5 pb-1">
                    <span>નામ (Devotee):</span>
                    <span className="text-white font-bold">{selectedPass.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/50 border-b border-white/5 pb-1">
                    <span>ગામ (Village):</span>
                    <span className="text-white font-semibold">{selectedPass.village}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/50 border-b border-white/5 pb-1">
                    <span>મોબાઈલ (Mobile):</span>
                    <span className="text-white font-semibold font-mono">{selectedPass.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/50 pb-1">
                    <span>નોંધણી સમય:</span>
                    <span className="text-white font-semibold font-mono">
                      {new Date(selectedPass.registrationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              </div>
              
              {/* Action Buttons (Outside of printable area) */}
              <div className="flex gap-3 mt-4 print-hide">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> પ્રિન્ટ પાસ (Print)
                </button>
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-gold-500/20"
            >
              <img src={lightboxImage} alt="Enlarged Darshan" className="w-full h-full object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            background: #ffffff !important;
            overflow: visible !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-modal-wrapper,
          .print-modal-wrapper * {
            visibility: visible !important;
          }

          .print-hide,
          .print-hide * {
            display: none !important;
            visibility: hidden !important;
          }

          .print-modal-wrapper {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
          }

          .print-pass-container {
            position: relative !important;
            transform: none !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 380px !important;
            page-break-inside: avoid;
            background-color: #0a080c !important;
            border: 2px solid #d4af37 !important;
            padding: 24px !important;
            border-radius: 20px !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-pass-container span,
          .print-pass-container p,
          .print-pass-container h4 {
            color: #ffffff !important;
          }

          .print-pass-container .text-gold-500,
          .print-pass-container .text-saffron {
            color: #F4C430 !important;
          }
        }
      `}</style>

      {/* Live Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121015] border border-gold-500/30 p-6 rounded-3xl shadow-2xl max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gold-500" /> લાઈવ કેમેરા (Live Camera)
                </h3>
                <button onClick={stopCamera} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gold-500/20 bg-black aspect-video relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover transform scale-x-[-1]" 
                />
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="px-8 py-3 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 font-extrabold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" /> ફોટો ખેંચો (Capture)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}