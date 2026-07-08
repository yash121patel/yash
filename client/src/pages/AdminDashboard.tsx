import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Clock, CheckCircle2, FileSpreadsheet, Download, LogOut, Search, 
  QrCode, Edit, Trash2, Check, X, ShieldAlert, TrendingUp, Calendar, MapPin, 
  Home, RefreshCw, Printer, AlertTriangle, AlertCircle, Plus, Eye, KeyRound,
  BarChart3, PieChart, Tv, Settings, Database
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Devotee, DailyEvent, UpcomingFestival } from '../types';
import { cn } from '../lib/utils';
import { QRCodeCanvas } from 'qrcode.react';


type AdminTab = 'overview' | 'management' | 'analytics' | 'settings' | 'schedule' | 'events_admin' | 'database_admin' | 'restore';

export default function AdminDashboard() {
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  
  // Search, filter, pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [sortField, setSortField] = useState<'tokenNumber' | 'name' | 'registrationTime'>('tokenNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Analytics filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterVillage, setFilterVillage] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Selected devotee for pass preview
  const [selectedPass, setSelectedPass] = useState<Devotee | null>(null);
  
  // Devotee editing state
  const [editingDevotee, setEditingDevotee] = useState<Devotee | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    village: '',
    mobile: '',
    status: 'pending'
  });

  const [liveSettings, setLiveSettings] = useState({
    youtubeUrl: '',
    title: '',
    description: '',
    autoPlay: true,
    muteAudio: true,
    liveEnabled: false
  });

  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [festival, setFestival] = useState<UpcomingFestival | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [viewingBackup, setViewingBackup] = useState<string | null>(null);
  const [backupDevotees, setBackupDevotees] = useState<Devotee[]>([]);
  const [backupSearchQuery, setBackupSearchQuery] = useState("");
  
  // Dedicated Restore states
  const [selectedRestoreBackup, setSelectedRestoreBackup] = useState<string>('');
  const [restoreFilterYear, setRestoreFilterYear] = useState<string>('all');
  const [restoreFilterMonth, setRestoreFilterMonth] = useState<string>('all');
  const [restoreFilterDate, setRestoreFilterDate] = useState<string>('all');
  const [restoreDevotees, setRestoreDevotees] = useState<Devotee[]>([]);
  // Toast state
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Registration Schedule state
  const [scheduleData, setScheduleData] = useState({
    registrationStatus: 'Scheduled',
    startDay: 'Sunday',
    startDate: '',
    startTime: '08:00 AM',
    endDate: '',
    endTime: '08:00 PM',
    timezone: 'Asia/Kolkata',
    maxTokens: 500,
    maxTokensPerDay: 500,
    allowEarlyRegistration: false,
    autoCloseAfterLimitReached: true,
    enabled: true
  });

  // Schedule Preview mock timer modal
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  // Mock countdown for schedule preview modal (shows 1 day, 4 hours, 30 min, 0 sec)
  const mockPreviewCountdown = { days: 1, hours: 4, minutes: 30, seconds: 0 };

  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  // Authentication check & Data fetching
  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    if (role !== 'admin') {
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

    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setDailyEvents(data.dailyEvents || []);
          setFestival(data.festival || null);
        }
      } catch (e) {
        console.error("Error fetching events:", e);
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
        }
      } catch (e) {
        console.error("Error fetching live settings:", e);
      }
    };
    
    const fetchScheduleSettings = async () => {
      try {
        const res = await fetch('/api/registration-schedule');
        if (res.ok) {
          const data = await res.json();
          setScheduleData({
            registrationStatus: data.settings.registrationStatus || 'Scheduled',
            startDay: data.settings.startDay || 'Sunday',
            startDate: data.settings.startDate || '',
            startTime: data.settings.startTime || '08:00 AM',
            endDate: data.settings.endDate || '',
            endTime: data.settings.endTime || '08:00 PM',
            timezone: data.settings.timezone || 'Asia/Kolkata',
            maxTokens: data.settings.maxTokens ?? 500,
            maxTokensPerDay: data.settings.maxTokensPerDay ?? 500,
            allowEarlyRegistration: data.settings.allowEarlyRegistration ?? false,
            autoCloseAfterLimitReached: data.settings.autoCloseAfterLimitReached ?? true,
            enabled: data.settings.enabled ?? true
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    const fetchBackups = async () => {
      try {
        const res = await fetch('/api/backups');
        if (res.ok) setBackups(await res.json());
      } catch (e) {
        console.error("Error fetching backups:", e);
      }
    };
    
    fetchDevotees();
    fetchLiveSettings();
    fetchScheduleSettings();
    fetchEvents();
    fetchBackups();

    socketRef.current.on('queue_update', fetchDevotees);
    socketRef.current.on('live_tv_update', fetchLiveSettings);
    socketRef.current.on('registration_schedule_update', fetchScheduleSettings);
    socketRef.current.on('events_update', fetchEvents);
    socketRef.current.on('update_data', () => {
      fetchDevotees();
      fetchLiveSettings();
      fetchScheduleSettings();
      fetchEvents();
      fetchBackups();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [navigate]);

  // Loading animation simulation when analytics filters change
  useEffect(() => {
    setIsLoadingAnalytics(true);
    const timer = setTimeout(() => setIsLoadingAnalytics(false), 550);
    return () => clearTimeout(timer);
  }, [filterDate, filterVillage, filterMonth, filterYear]);

  // ─── TIME FORMAT HELPERS ───
  // Convert "08:00 AM" / "08:00 PM" → "08:00" / "20:00" for HTML5 time input
  const ampmTo24 = (ampm: string): string => {
    if (!ampm) return '08:00';
    const [time, modifier] = ampm.trim().split(' ');
    if (!time || !modifier) return ampm; // already 24hr or invalid
    let [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '08:00';
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Convert "20:00" → "08:00 PM" for backend storage
  const to12hr = (time24: string): string => {
    if (!time24) return '08:00 AM';
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '08:00 AM';
    const modifier = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${modifier}`;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    navigate('/login');
  };

  // Metrics calculations (Total overall)
  const total = devotees.length;
  const completed = devotees.filter(d => d.status === 'completed').length;
  const pending = devotees.filter(d => d.status === 'pending').length;
  const approved = devotees.filter(d => d.status === 'approved').length;
  const rejected = devotees.filter(d => d.status === 'rejected').length;

  // Backup & Restore
  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      if (res.ok) {
        showToast("ડેટાબેઝ સફળતાપૂર્વક બેકઅપ લેવાયો છે.");
        window.alert("✅ ડેટાબેઝ બેકઅપ સફળતાપૂર્વક લેવાયો છે! (Database Backup Successful)");
        // Refresh backups list
        const res2 = await fetch('/api/backups');
        if (res2.ok) setBackups(await res2.json());
      } else {
        showToast("બેકઅપ લેવામાં ભૂલ આવી.", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("બેકઅપ લેવામાં ભૂલ આવી.", 'error');
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(`શું તમે ખરેખર ${filename} બેકઅપ રીસ્ટોર કરવા માંગો છો? આ ક્રિયા વર્તમાન ડેટાને ઓવરરાઇટ કરશે.`)) return;
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        showToast("ડેટાબેઝ સફળતાપૂર્વક રીસ્ટોર થયો છે.");
        window.alert("✅ ડેટાબેઝ સફળતાપૂર્વક રીસ્ટોર થયો છે! (Database Restore Successful)");
        // The server will broadcast update_data to refresh everything
      } else {
        showToast("રીસ્ટોરમાં ભૂલ આવી.", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("રીસ્ટોરમાં ભૂલ આવી.", 'error');
    }
  };

  const handleViewBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/backup/${filename}/devotees`);
      if (res.ok) {
        const data = await res.json();
        setBackupDevotees(data);
        setViewingBackup(filename);
      } else {
        showToast("ડેટા લાવવામાં ભૂલ આવી", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("ડેટા લાવવામાં ભૂલ આવી", "error");
    }
  };

  const exportBackupToExcel = async () => {
    if (!backupDevotees.length) return;
    const XLSX = await import('xlsx');
    const headers = ["Token Number", "Name", "Village", "Mobile", "Language", "Status", "Registration Date", "Registration Time"];
    const rows = backupDevotees.map(d => {
      const dateObj = new Date(d.registrationTime);
      return [
        d.tokenNumber,
        d.name,
        d.village,
        d.mobile,
        d.language,
        d.status,
        dateObj.toLocaleDateString('en-IN'),
        dateObj.toLocaleTimeString('en-IN')
      ];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Backup Data");
    XLSX.writeFile(workbook, `tiger_chehar_backup_${viewingBackup}_${Date.now()}.xlsx`);
  };

  // Devotee Actions: Edit Details Submit
  const handleSaveFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festival) return;
    try {
      const res = await fetch('/api/events/festival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(festival)
      });
      if (res.ok) showToast('મહોત્સવની માહિતી સફળતાપૂર્વક સાચવવામાં આવી');
    } catch (e) {
      console.error(e);
      showToast('Error saving festival', 'error');
    }
  };

  const handleSaveDailyEvent = async (event: DailyEvent) => {
    try {
      const res = await fetch('/api/events/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      if (res.ok) {
        showToast('ઇવેન્ટ સફળતાપૂર્વક સાચવવામાં આવી');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving event', 'error');
    }
  };

  const handleDeleteDailyEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/daily/${id}`, { method: 'DELETE' });
      if (res.ok) showToast('ઇવેન્ટ ડિલીટ કરવામાં આવી');
    } catch (e) {
      console.error(e);
      showToast('Error deleting event', 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevotee) return;
    try {
      const res = await fetch(`/api/devotees/${editingDevotee.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setEditingDevotee(null);
      } else {
        alert("ભૂલ આવી (Error editing record)");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Devotee Actions: Delete Devotee
  const handleDelete = async (id: string) => {
    if (!window.confirm("શું તમે ખરેખર આ રજીસ્ટ્રેશન ડીલીટ કરવા માંગો છો?")) return;
    try {
      const res = await fetch(`/api/devotees/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        alert("ભૂલ આવી (Error deleting record)");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Devotee Actions: Quick Update Status
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/devotees/${id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        alert("ભૂલ આવી (Error updating status)");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving Live Settings...");
    try {
      const res = await fetch('/api/live/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liveSettings)
      });
      if (res.ok) {
        const responseData = await res.json();
        console.log("Saved Successfully");
        setLiveSettings(responseData.data);
        showToast("✅ Live Settings Saved Successfully");
      } else {
        showToast("Failed to save settings", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Error occurred", "error");
    }
  };

  // Reset Settings
  const handleResetSettings = async () => {
    if (!window.confirm("શું તમે સેટિંગ્સ રીસેટ કરવા માંગો છો?")) return;
    const defaultSettings = {
      youtubeUrl: 'https://www.youtube.com/watch?v=5HlOasjK5yA',
      title: 'Live Temple Darshan Aarti',
      description: 'શ્રી ચેહર માઁ ના લાઈવ દર્શન',
      autoPlay: true,
      muteAudio: true,
      liveEnabled: false
    };
    try {
      const res = await fetch('/api/live/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultSettings)
      });
      if (res.ok) {
        const responseData = await res.json();
        setLiveSettings(responseData.data);
        showToast("✅ Settings Reset Successfully");
      } else {
        showToast("Failed to reset settings", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Error occurred during reset", "error");
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/registration-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });
      if (res.ok) {
        showToast("✅ નોંધણી સમયપત્રક સફળતાપૂર્વક સાચવવામાં આવ્યું છે. (Schedule Saved)");
      } else {
        showToast("Failed to save schedule settings", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error occurred", "error");
    }
  };

  const handleResetSchedule = async () => {
    if (!window.confirm("શું તમે સેટિંગ્સ રીસેટ કરવા માંગો છો?")) return;
    const defaults = {
      registrationStatus: 'Scheduled',
      startDay: 'Sunday',
      startDate: '',
      startTime: '08:00 AM',
      endDate: '',
      endTime: '08:00 PM',
      timezone: 'Asia/Kolkata',
      maxTokens: 500,
      maxTokensPerDay: 500,
      allowEarlyRegistration: false,
      autoCloseAfterLimitReached: true,
      enabled: true
    };
    try {
      const res = await fetch('/api/registration-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults)
      });
      if (res.ok) {
        setScheduleData(defaults);
        alert("નોંધણી સમયપત્રક રીસેટ કરવામાં આવ્યું છે.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmergencyLock = async () => {
    if (!window.confirm("શું તમે કટોકટીની સ્થિતિમાં રજીસ્ટ્રેશન તાત્કાલિક લોક કરવા માંગો છો?")) return;
    const lockedSettings = {
      ...scheduleData,
      registrationStatus: 'Disable',
      enabled: false
    };
    try {
      const res = await fetch('/api/registration-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockedSettings)
      });
      if (res.ok) {
        setScheduleData(lockedSettings);
        alert("તાત્કાલિક લોકઆઉટ સક્રિય કરવામાં આવ્યું છે (Emergency Close Active).");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // YouTube Live URL converter
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

  // Filtering devotee list
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

  // Export CSV
  const exportCSV = async () => {
    const XLSX = await import('xlsx');
    const headers = ['Token', 'Name', 'Village', 'Mobile', 'Status', 'Registered Time'];
    const rows = filteredDevotees.map(d => [
      d.tokenNumber,
      d.name,
      d.village,
      d.mobile,
      d.status,
      new Date(d.registrationTime).toLocaleString()
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Devotees");
    XLSX.writeFile(workbook, `tiger_chehar_admin_registry_${Date.now()}.csv`);
  };

  // Export PDF
  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new jsPDF();
    const headers = [['Token', 'Name', 'Village', 'Mobile', 'Status', 'Registered Time']];
    const data = filteredDevotees.map(d => [
      d.tokenNumber.toString(),
      d.name,
      d.village,
      d.mobile,
      d.status,
      new Date(d.registrationTime).toLocaleString()
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      headStyles: { fillColor: [212, 175, 55] },
      margin: { top: 20 },
      didDrawPage: function (data) {
        doc.text('Devotee Registration Report', 14, 15);
      }
    });
    
    doc.save(`tiger_chehar_admin_registry_${Date.now()}.pdf`);
  };

  // Unique list of villages dynamically gathered for dropdown filter
  const uniqueVillages = Array.from(new Set(devotees.map(d => d.village))).filter(Boolean);

  // ─── DYNAMIC ANALYTICS LOGIC ───
  const filteredAnalyticsDevotees = devotees.filter(d => {
    const regDate = new Date(d.registrationTime);
    
    // Date filter
    if (filterDate && d.registrationTime.split('T')[0] !== filterDate) {
      return false;
    }
    
    // Village filter
    if (filterVillage !== 'all' && d.village !== filterVillage) {
      return false;
    }
    
    // Month filter
    if (filterMonth !== 'all') {
      const month = (regDate.getMonth() + 1).toString();
      if (month !== filterMonth) return false;
    }
    
    // Year filter
    if (filterYear !== 'all') {
      const year = regDate.getFullYear().toString();
      if (year !== filterYear) return false;
    }
    
    return true;
  });

  // Fetch Dedicated Restore Data
  const fetchRestoreBackupData = async (filename: string) => {
    setSelectedRestoreBackup(filename);
    if (!filename) {
      setRestoreDevotees([]);
      return;
    }
    try {
      const res = await fetch(`/api/backups/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setRestoreDevotees(data.devotees);
      }
    } catch (e) {
      console.error("Error fetching restore data:", e);
    }
  };

  const filteredRestoreDevotees = restoreDevotees.filter(d => {
    const regDate = new Date(d.registrationTime);
    if (restoreFilterYear !== 'all' && regDate.getFullYear().toString() !== restoreFilterYear) return false;
    if (restoreFilterMonth !== 'all' && (regDate.getMonth() + 1).toString() !== restoreFilterMonth) return false;
    if (restoreFilterDate !== 'all' && regDate.getDate().toString() !== restoreFilterDate) return false;
    return true;
  });

  // Calculate filtered stats metrics
  const fTotal = filteredAnalyticsDevotees.length;
  const fCompleted = filteredAnalyticsDevotees.filter(d => d.status === 'completed').length;
  const fPending = filteredAnalyticsDevotees.filter(d => d.status === 'pending').length;
  const fApproved = filteredAnalyticsDevotees.filter(d => d.status === 'approved').length;
  const fRejected = filteredAnalyticsDevotees.filter(d => d.status === 'rejected').length;

  // Dynamic Daily trend generator
  const getDailyTrendData = () => {
    const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    filteredAnalyticsDevotees.forEach(d => {
      const dayName = days[new Date(d.registrationTime).getDay()];
      if (dayName in counts) {
        counts[dayName as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const counts = getDailyTrendData();
  const maxDailyCount = Math.max(...Object.values(counts), 1);

  // Generate Y coordinate for daily SVG line points
  const getSVGPointY = (val: number) => {
    return (180 - (val / maxDailyCount) * 110).toFixed(1);
  };

  // Generate dynamic Village chart data
  const getVillageData = () => {
    const countsMap: Record<string, number> = {};
    filteredAnalyticsDevotees.forEach(d => {
      countsMap[d.village] = (countsMap[d.village] || 0) + 1;
    });
    
    return Object.entries(countsMap)
      .map(([village, count]) => ({
        village,
        count,
        percentage: `${Math.min(100, Math.round((count / (filteredAnalyticsDevotees.length || 1)) * 100))}%`
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  const villageDistribution = getVillageData();

  // Export Analytics to CSV
  const exportAnalyticsCSV = async () => {
    const XLSX = await import('xlsx');
    const headers = ['Token', 'Name', 'Village', 'Mobile', 'Status', 'Registration Date'];
    const rows = filteredAnalyticsDevotees.map(d => [
      d.tokenNumber,
      d.name,
      d.village,
      d.mobile,
      d.status,
      new Date(d.registrationTime).toLocaleString()
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");
    XLSX.writeFile(workbook, `tiger_chehar_analytics_${Date.now()}.csv`);
  };

  // Export Analytics to Excel
  const exportAnalyticsExcel = async () => {
    const XLSX = await import('xlsx');
    const headers = ['Token', 'Name', 'Village', 'Mobile', 'Status', 'Registration Date'];
    const rows = filteredAnalyticsDevotees.map(d => [
      d.tokenNumber,
      d.name,
      d.village,
      d.mobile,
      d.status,
      new Date(d.registrationTime).toLocaleString()
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");
    XLSX.writeFile(workbook, `tiger_chehar_analytics_${Date.now()}.xlsx`);
  };

  // Export Analytics to PDF
  const exportAnalyticsPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new jsPDF();
    const headers = [['Token', 'Name', 'Village', 'Mobile', 'Status', 'Registration Date']];
    const data = filteredAnalyticsDevotees.map(d => [
      d.tokenNumber.toString(),
      d.name,
      d.village,
      d.mobile,
      d.status,
      new Date(d.registrationTime).toLocaleString()
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      headStyles: { fillColor: [212, 175, 55] },
      margin: { top: 20 },
      didDrawPage: function (data) {
        doc.text('Analytics Report', 14, 15);
      }
    });
    
    doc.save(`tiger_chehar_analytics_${Date.now()}.pdf`);
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: 'pending' | 'completed' | 'approved' | 'rejected') => {
    const badges = {
      pending: "bg-orange-500/10 text-orange-400 border-orange-500/25 shadow-[0_0_10px_rgba(249,115,22,0.15)]",
      approved: "bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
      rejected: "bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.15)]",
      completed: "bg-green-500/10 text-green-400 border-green-500/25 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
    };
    const labels = {
      pending: 'બાકી (Pending)',
      approved: 'મંજૂર (Approved)',
      rejected: 'અસ્વીકાર (Rejected)',
      completed: 'પૂર્ણ (Completed)'
    };
    return (
      <span className={cn(
        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        badges[status] || badges.pending
      )}>
        {labels[status] || labels.pending}
      </span>
    );
  };

  return (
    <div className="min-h-screen relative flex flex-col md:flex-row gap-6 z-10 select-none animate-fade-in">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce-in">
          <div className={cn(
            "px-6 py-4 rounded-2xl flex items-center gap-3 backdrop-blur-xl border shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
            toast.type === 'success' 
              ? "bg-green-950/80 border-green-500/30 text-green-400" 
              : "bg-red-950/80 border-red-500/30 text-red-400"
          )}>
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
      
      {/* ─── SIDEBAR DOCK ─── */}
      <aside className="w-full md:w-68 flex flex-col gap-4 self-start sticky top-24 z-30 print:hidden">
        
        {/* Secure Admin Lock Header */}
        <div className="bg-[#121015]/65 border border-gold-500/20 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-b from-[#8B0000] to-gold-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#ffb828]/60">સિક્યોર એક્સેસ</span>
            <span className="text-base font-bold font-serif text-white tracking-wide">એડમિન પોર્ટલ</span>
          </div>
          <KeyRound className="w-5 h-5 text-gold-400 animate-pulse" />
        </div>

        {/* Sidebar Navigation */}
        <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-3.5 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 relative overflow-hidden">
          <div className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-gold-500/60 border-b border-gold-500/10 mb-2">
            એડમિન કંટ્રોલ્સ
          </div>

          <button
            onClick={() => { setActiveTab('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'overview'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <Home className="w-4.5 h-4.5" />
            <span>ડેશબોર્ડ ઓવરવ્યૂ</span>
          </button>

          <button
            onClick={() => { setActiveTab('management'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'management'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <Users className="w-4.5 h-4.5" />
            <span>લાઇવ રજીસ્ટ્રેશન કંટ્રોલ</span>
          </button>

          <button
            onClick={() => { setActiveTab('analytics'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'analytics'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <TrendingUp className="w-4.5 h-4.5" />
            <span>એનાલિટિક્સ ડેશબોર્ડ</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'settings'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <Tv className="w-4.5 h-4.5" />
            <span>લાઇવ ટીવી સેટિંગ્સ</span>
          </button>

          <button
            onClick={() => { setActiveTab('schedule'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'schedule'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>નોંધણી સમયપત્રક</span>
          </button>

          <button
            onClick={() => { setActiveTab('events_admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'events_admin'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>ઇવેન્ટ્સ મેનેજમેન્ટ</span>
          </button>
          <button
            onClick={() => { setActiveTab('database_admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'database_admin'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <Database className="w-4.5 h-4.5" />
            <span>ડેટાબેઝ બેકઅપ</span>
          </button>
          <button
            onClick={() => { setActiveTab('restore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all relative overflow-hidden group",
              activeTab === 'restore'
                ? "text-maroon-900 bg-gradient-to-r from-gold-400 to-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-gold-300/40"
                : "text-gold-400/80 hover:text-white hover:bg-gold-500/5 hover:border-gold-500/10 border border-transparent"
            )}
          >
            <RefreshCw className="w-4.5 h-4.5" />
            <span>રીસ્ટોર (Restore)</span>
          </button>
        </div>

        {/* System Actions */}
        <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-4.5 backdrop-blur-md shadow-lg flex flex-col gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/50">સિસ્ટમ મેન્ટેનન્સ</span>
            <button
              onClick={logout}
              className="w-full py-2.5 bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> લોગઆઉટ (Logout)
            </button>
          </div>

      </aside>

      {/* ─── MAIN CONTENT WINDOW ─── */}
      <section className="flex-1 min-w-0 z-10 print:p-0">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-[#ff7a00] drop-shadow-md">
                એડમિન પેનલ (Admin Overview)
              </h2>
              <p className="text-[#ffb828]/60 text-xs mt-1 uppercase tracking-widest font-bold">Manage queue and registry data</p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { title: "કુલ રજીસ્ટ્રેશન", value: total, sub: "સિસ્ટમ કુલ રેકોર્ડ્સ", color: "text-white border-gold-500/15" },
                { title: "બાકી (Pending)", value: pending, sub: "પ્રતીક્ષા લાઈનમાં", color: "text-orange-400 border-orange-500/15" },
                { title: "મંજૂર (Approved)", value: approved, sub: "લાઈન પાસ એન્ટ્રી મંજૂર", color: "text-blue-400 border-blue-500/15" },
                { title: "અસ્વીકાર (Rejected)", value: rejected, sub: "એડમિન દ્વારા નકારેલ", color: "text-red-400 border-red-500/15" },
                { title: "પૂર્ણ (Completed)", value: completed, sub: "દર્શન સફળતાપૂર્વક પૂર્ણ", color: "text-green-400 border-green-500/15" }
              ].map((card, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "bg-[#121015]/65 border rounded-2xl p-4.5 shadow-md backdrop-blur-md hover:scale-[1.02] transition-all duration-300", 
                    card.color.split(" ")[1]
                  )}
                >
                  <p className="text-white/40 text-[9px] font-extrabold uppercase tracking-wider">{card.title}</p>
                  <p className={cn("text-3xl font-serif font-bold mt-2", card.color.split(" ")[0])}>{card.value}</p>
                  <p className="text-[9px] text-white/30 mt-1 font-semibold">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Default mini charts (Static representation for quick view) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Daily Visitor trend */}
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80 font-serif">દૈનિક મુલાકાતીઓ (Daily Registration Trend)</h4>
                  <span className="text-[10px] bg-gold-500/10 text-gold-400 font-bold px-2 py-0.5 rounded-full">આ અઠવાડિયે</span>
                </div>
                <div className="h-60 w-full flex items-end">
                  <svg viewBox="0 0 500 200" className="w-full h-full">
                    <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(212,175,55,0.08)" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(212,175,55,0.08)" strokeDasharray="4 4" />
                    <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(212,175,55,0.08)" strokeDasharray="4 4" />
                    
                    <path
                      d={`M 20 180 
                          L 20 ${getSVGPointY(counts.Mon)}
                          L 95 ${getSVGPointY(counts.Tue)}
                          L 170 ${getSVGPointY(counts.Wed)}
                          L 245 ${getSVGPointY(counts.Thu)}
                          L 320 ${getSVGPointY(counts.Fri)}
                          L 395 ${getSVGPointY(counts.Sat)}
                          L 470 ${getSVGPointY(counts.Sun)}
                          L 470 180 Z`}
                      fill="url(#grad)"
                      opacity="0.2"
                    />
                    
                    <path
                      d={`M 20 ${getSVGPointY(counts.Mon)}
                          L 95 ${getSVGPointY(counts.Tue)}
                          L 170 ${getSVGPointY(counts.Wed)}
                          L 245 ${getSVGPointY(counts.Thu)}
                          L 320 ${getSVGPointY(counts.Fri)}
                          L 395 ${getSVGPointY(counts.Sat)}
                          L 470 ${getSVGPointY(counts.Sun)}`}
                      fill="none"
                      stroke="url(#strokeGrad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Chart points */}
                    <circle cx="20" cy={getSVGPointY(counts.Mon)} r="4.5" fill="#ff8c00" className="animate-pulse" />
                    <circle cx="95" cy={getSVGPointY(counts.Tue)} r="4.5" fill="#D4AF37" />
                    <circle cx="170" cy={getSVGPointY(counts.Wed)} r="4.5" fill="#ff8c00" />
                    <circle cx="245" cy={getSVGPointY(counts.Thu)} r="4.5" fill="#D4AF37" />
                    <circle cx="320" cy={getSVGPointY(counts.Fri)} r="4.5" fill="#ff8c00" />
                    <circle cx="395" cy={getSVGPointY(counts.Sat)} r="4.5" fill="#D4AF37" />
                    <circle cx="470" cy={getSVGPointY(counts.Sun)} r="4.5" fill="#ffffff" />
                    
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ff8c00" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                      <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="50%" stopColor="#ff8c00" />
                        <stop offset="100%" stopColor="#ffffff" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Village stats distribution */}
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80 font-serif">ટોપ ગામવાર ભક્તો (Village Distribution)</h4>
                  <span className="text-[10px] bg-gold-500/10 text-gold-400 font-bold px-2 py-0.5 rounded-full">ટોપ ગામો</span>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                  {villageDistribution.map((row, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white/80">{row.village}</span>
                        <span className="text-gold-500">{row.count} ભક્તો</span>
                      </div>
                      <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-gold-500/10 p-0.5">
                        <div 
                          className="bg-gradient-to-r from-gold-500 to-saffron h-full rounded-full transition-all duration-1000"
                          style={{ width: row.percentage }}
                        />
                      </div>
                    </div>
                  ))}
                  {villageDistribution.length === 0 && (
                    <p className="text-center text-white/35 text-xs">કોઈ ગામવાર ડેટા ઉપલબ્ધ નથી</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. REGISTRATION MANAGEMENT TAB */}
        {activeTab === 'management' && (
          <div className="space-y-6">
            <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md animate-fade-in">
              
              {/* Search, Filter, Actions Toolbar */}
              <div className="p-6 border-b border-gold-500/15 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gold-500/5">
                <div>
                  <h3 className="text-xl font-serif font-bold text-white">લાઇવ રજીસ્ટ્રેશન મેનેજમેન્ટ (Live Devotee Desk)</h3>
                  <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold mt-0.5">Real-time database operations & queue control</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/50" />
                    <input
                      type="text"
                      placeholder="નામ, ગામ, ટોકન અથવા મોબાઈલ શોધો..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="bg-black/50 border border-gold-500/20 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-gold-500 w-full placeholder-gold-500/30 transition-all"
                    />
                  </div>
                  
                  {/* Filter Status */}
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                    className="bg-black/50 border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                  >
                    <option value="all">બધા સ્ટેટ્સ (All)</option>
                    <option value="pending">બાકી (Pending)</option>
                    <option value="approved">મંજૂર (Approved)</option>
                    <option value="rejected">અસ્વીકાર (Rejected)</option>
                    <option value="completed">પૂર્ણ (Completed)</option>
                  </select>

                  {/* Actions */}
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-950/20 text-green-400 border border-green-500/25 rounded-xl hover:bg-green-900/30 transition-all font-bold text-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export CSV
                  </button>

                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-950/20 text-red-400 border border-red-500/25 rounded-xl hover:bg-red-900/30 transition-all font-bold text-xs"
                  >
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                </div>
              </div>

              {/* Devotees Grid / Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="bg-black/40 text-gold-500/80 text-xs uppercase tracking-wider border-b border-gold-500/15">
                      <th onClick={() => handleSort('tokenNumber')} className="p-4 font-extrabold cursor-pointer hover:text-white transition-colors">
                        ટોકન (Token) {sortField === 'tokenNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('name')} className="p-4 font-extrabold cursor-pointer hover:text-white transition-colors">
                        નામ (Name) {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-4 font-extrabold">ગામ (Village)</th>
                      <th className="p-4 font-extrabold">મોબાઈલ (Mobile)</th>
                      <th onClick={() => handleSort('registrationTime')} className="p-4 font-extrabold cursor-pointer hover:text-white transition-colors">
                        નોંધણી સમય (Registered) {sortField === 'registrationTime' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-4 font-extrabold">સ્થિતિ (Status)</th>
                      <th className="p-4 font-extrabold text-center">ક્રિયાઓ (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-500/10 text-white/90">
                    {paginatedDevotees.map((d) => (
                      <tr key={d.id} className="hover:bg-gold-500/5 transition-colors group">
                        <td className="p-4 font-mono text-base font-extrabold text-saffron">
                          {d.tokenNumber.toString().padStart(3, '0')}
                        </td>
                        <td className="p-4 font-semibold text-sm">{d.name}</td>
                        <td className="p-4 text-[#f0e6d0]/80 text-xs font-semibold">{d.village}</td>
                        <td className="p-4 text-[#f0e6d0]/80 text-xs font-mono">{d.mobile}</td>
                        <td className="p-4 text-[#f0e6d0]/50 text-xs font-semibold">
                          {new Date(d.registrationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">{renderStatusBadge(d.status)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            
                            {/* Pass Preview */}
                            <button
                              onClick={() => setSelectedPass(d)}
                              title="View QR Pass"
                              className="p-2 bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-maroon-900 border border-gold-500/20 rounded-lg transition-all active:scale-95"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Detail */}
                            <button
                              onClick={() => {
                                setEditingDevotee(d);
                                setEditFormData({
                                  name: d.name,
                                  village: d.village,
                                  mobile: d.mobile,
                                  status: d.status
                                });
                              }}
                              title="Edit Devotee Details"
                              className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg transition-all active:scale-95"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Re-Approve */}
                            {d.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(d.id, 'approved')}
                                title="Approve Entry"
                                className="p-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/20 rounded-lg transition-all active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Reject */}
                            {(d.status === 'pending' || d.status === 'approved') && (
                              <button
                                onClick={() => handleStatusChange(d.id, 'rejected')}
                                title="Reject Entry"
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg transition-all active:scale-95"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Mark Completed */}
                            {d.status === 'approved' && (
                              <button
                                onClick={() => handleStatusChange(d.id, 'completed')}
                                title="Mark Completed"
                                className="p-2 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white border border-teal-500/20 rounded-lg transition-all active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Devotee */}
                            <button
                              onClick={() => handleDelete(d.id)}
                              title="Delete devotee record"
                              className="p-2 bg-red-950/20 hover:bg-red-900 text-red-400 hover:text-white border border-red-500/20 rounded-lg transition-all active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedDevotees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-white/30 text-xs font-bold">
                          કોઈ રેકોર્ડ મળ્યો નથી (No devotee records found)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gold-500/15 flex justify-between items-center bg-black/20">
                  <span className="text-[10px] text-white/40 font-bold uppercase">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-black/40 border border-gold-500/20 disabled:opacity-30 rounded-lg text-xs font-bold text-gold-400 hover:text-white transition-all active:scale-95"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-black/40 border border-gold-500/20 disabled:opacity-30 rounded-lg text-xs font-bold text-gold-400 hover:text-white transition-all active:scale-95"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* 3. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Header and Filter Controls */}
            <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-gold-500 via-saffron to-orange-glow rounded-t-3xl" />
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-gold-500/10 pb-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-gold-400" /> એનાલિટિક્સ ડેશબોર્ડ (Divine Analytics Desk)
                  </h3>
                  <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold mt-0.5">Statistical metrics & custom filters</p>
                </div>
                
                {/* Export & Print actions */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <button
                    onClick={exportAnalyticsCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-green-950/20 text-green-400 border border-green-500/20 hover:border-green-500/40 rounded-xl hover:bg-green-900/30 transition-all font-bold text-[10px]"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button
                    onClick={exportAnalyticsExcel}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-950/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 rounded-xl hover:bg-blue-900/30 transition-all font-bold text-[10px]"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Excel
                  </button>
                  <button
                    onClick={exportAnalyticsPDF}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-950/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl hover:bg-red-900/30 transition-all font-bold text-[10px]"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Reports
                  </button>
                </div>
              </div>

              {/* Dynamic Filter Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-black/40 border border-gold-500/10 rounded-2xl">
                {/* Date Picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gold-500/80 uppercase">Date (તારીખ)</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="bg-black/60 border border-gold-500/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Village selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gold-500/80 uppercase">Village (ગામ)</label>
                  <select
                    value={filterVillage}
                    onChange={e => setFilterVillage(e.target.value)}
                    className="bg-black/60 border border-gold-500/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                  >
                    <option value="all">બધા ગામો (All)</option>
                    {uniqueVillages.map((v, i) => (
                      <option key={i} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Month selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gold-500/80 uppercase">Month (મહિનો)</label>
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="bg-black/60 border border-gold-500/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                  >
                    <option value="all">બધા મહિના (All)</option>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((m) => {
                      const names = ['જાન્યુઆરી (Jan)', 'ફેબ્રુઆરી (Feb)', 'માર્ચ (Mar)', 'એપ્રિલ (Apr)', 'મે (May)', 'જૂન (Jun)', 'જુલાઈ (Jul)', 'ઓગસ્ટ (Aug)', 'સપ્ટેમ્બર (Sep)', 'ઓક્ટોબર (Oct)', 'નવેમ્બર (Nov)', 'ડિસેમ્બર (Dec)'];
                      return <option key={m} value={m}>{names[parseInt(m) - 1]}</option>;
                    })}
                  </select>
                </div>

                {/* Year selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gold-500/80 uppercase">Year (વર્ષ)</label>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="bg-black/60 border border-gold-500/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                  >
                    <option value="all">બધા વર્ષ (All)</option>
                    <option value="2026">૨૦૨૬ (2026)</option>
                    <option value="2025">૨૦૨૫ (2025)</option>
                  </select>
                </div>
              </div>

              {/* Reset filter button */}
              {(filterDate || filterVillage !== 'all' || filterMonth !== 'all' || filterYear !== 'all') && (
                <div className="flex justify-end mt-3">
                  <button 
                    onClick={() => {
                      setFilterDate('');
                      setFilterVillage('all');
                      setFilterMonth('all');
                      setFilterYear('all');
                    }}
                    className="text-[10px] font-bold text-gold-400 hover:text-white flex items-center gap-1 border border-gold-500/20 bg-gold-500/5 px-2.5 py-1 rounded-lg"
                  >
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> ફિલ્ટર્સ રીસેટ કરો (Clear filters)
                  </button>
                </div>
              )}
            </div>

            {/* Simulated loading indicator overlay or normal render */}
            {isLoadingAnalytics ? (
              <div className="h-64 flex flex-col items-center justify-center bg-[#121015]/65 border border-gold-500/25 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
                <RefreshCw className="w-10 h-10 text-gold-400 animate-spin mb-3" />
                <span className="text-xs text-white/50 font-bold uppercase tracking-widest">એનાલિટિક્સ ડેટા લોડ થઈ રહ્યો છે...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Filtered Metrics summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { title: "ફિલ્ટર કરેલ રજીસ્ટ્રેશન", value: fTotal, color: "text-white border-gold-500/20" },
                    { title: "બાકી (Pending)", value: fPending, color: "text-orange-400 border-orange-500/20" },
                    { title: "મંજૂર (Approved)", value: fApproved, color: "text-blue-400 border-blue-500/20" },
                    { title: "અસ્વીકાર (Rejected)", value: fRejected, color: "text-red-400 border-red-500/20" },
                    { title: "પૂર્ણ (Completed)", value: fCompleted, color: "text-green-400 border-green-500/20" }
                  ].map((card, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "bg-[#121015]/65 border rounded-2xl p-4 shadow-md backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02]", 
                        card.color.split(" ")[1]
                      )}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-gold-500/20 to-transparent" />
                      <p className="text-white/40 text-[9px] font-extrabold uppercase tracking-wider">{card.title}</p>
                      <p className={cn("text-2xl font-serif font-bold mt-1.5", card.color.split(" ")[0])}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Analytical Charts grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Line graph (Daily Registration Trend) */}
                  <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80 font-serif">દૈનિક નોંધણી ટ્રેન્ડ (Daily Registration Trend)</h4>
                      <span className="text-[10px] bg-gold-500/10 text-gold-400 font-bold px-2.5 py-0.5 rounded-full">અઠવાડિક પ્લોટ</span>
                    </div>

                    <div className="h-60 w-full flex items-end">
                      <svg viewBox="0 0 500 200" className="w-full h-full">
                        <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(212,175,55,0.08)" strokeDasharray="4 4" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(212,175,55,0.08)" strokeDasharray="4 4" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(212,175,55,0.08)" strokeDasharray="4 4" />
                        
                        {/* Dynamic Path Area */}
                        <path
                          d={`M 20 180 
                              L 20 ${getSVGPointY(counts.Mon)}
                              L 95 ${getSVGPointY(counts.Tue)}
                              L 170 ${getSVGPointY(counts.Wed)}
                              L 245 ${getSVGPointY(counts.Thu)}
                              L 320 ${getSVGPointY(counts.Fri)}
                              L 395 ${getSVGPointY(counts.Sat)}
                              L 470 ${getSVGPointY(counts.Sun)}
                              L 470 180 Z`}
                          fill="url(#grad2)"
                          opacity="0.22"
                        />
                        
                        {/* Dynamic Path Stroke Line */}
                        <path
                          d={`M 20 ${getSVGPointY(counts.Mon)}
                              L 95 ${getSVGPointY(counts.Tue)}
                              L 170 ${getSVGPointY(counts.Wed)}
                              L 245 ${getSVGPointY(counts.Thu)}
                              L 320 ${getSVGPointY(counts.Fri)}
                              L 395 ${getSVGPointY(counts.Sat)}
                              L 470 ${getSVGPointY(counts.Sun)}`}
                          fill="none"
                          stroke="url(#strokeGrad2)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* Point nodes */}
                        <circle cx="20" cy={getSVGPointY(counts.Mon)} r="4.5" fill="#ff8c00" />
                        <circle cx="95" cy={getSVGPointY(counts.Tue)} r="4.5" fill="#D4AF37" />
                        <circle cx="170" cy={getSVGPointY(counts.Wed)} r="4.5" fill="#ff8c00" />
                        <circle cx="245" cy={getSVGPointY(counts.Thu)} r="4.5" fill="#D4AF37" />
                        <circle cx="320" cy={getSVGPointY(counts.Fri)} r="4.5" fill="#ff8c00" />
                        <circle cx="395" cy={getSVGPointY(counts.Sat)} r="4.5" fill="#ff8c00" />
                        <circle cx="470" cy={getSVGPointY(counts.Sun)} r="4.5" fill="#ffffff" />

                        {/* Labels */}
                        <text x="20" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Mon</text>
                        <text x="95" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Tue</text>
                        <text x="170" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Wed</text>
                        <text x="245" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Thu</text>
                        <text x="320" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Fri</text>
                        <text x="395" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Sat</text>
                        <text x="470" y="196" fill="rgba(240,230,208,0.4)" fontSize="9" textAnchor="middle">Sun</text>

                        <defs>
                          <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ff8c00" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                          <linearGradient id="strokeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#D4AF37" />
                            <stop offset="50%" stopColor="#ff8c00" />
                            <stop offset="100%" stopColor="#ffffff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* Village Progress Bars */}
                  <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80 font-serif">ટોપ ગામવાર ભક્તો (Village Distribution)</h4>
                      <span className="text-[10px] bg-gold-500/10 text-gold-400 font-bold px-2 py-0.5 rounded-full">ટોપ ગામો</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center gap-4.5 py-1">
                      {villageDistribution.map((row, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-white/80">{row.village}</span>
                            <span className="text-gold-500">{row.count} ભક્તો</span>
                          </div>
                          <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-gold-500/10 p-0.5">
                            <div 
                              className="bg-gradient-to-r from-gold-500 to-saffron h-full rounded-full transition-all duration-1000"
                              style={{ width: row.percentage }}
                            />
                          </div>
                        </div>
                      ))}
                      {villageDistribution.length === 0 && (
                        <p className="text-center text-white/35 text-xs">કોઈ ગામવાર ડેટા ઉપલબ્ધ નથી</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Growth and Gender split charts row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Status Split representation */}
                  <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80">નોંધણી સ્થિતિ (Registration Status)</h4>
                    </div>

                    <div className="flex items-center justify-around py-4">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(212,175,55,0.08)" strokeWidth="10" />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22c55e" strokeWidth="10" strokeDasharray={`${(fCompleted/Math.max(fTotal, 1))*251} 251`} />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f97316" strokeWidth="10" strokeDasharray={`${(fPending/Math.max(fTotal, 1))*251} 251`} strokeDashoffset={`-${(fCompleted/Math.max(fTotal, 1))*251}`} />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-white/50">કુલ</span>
                          <span className="text-2xl font-serif font-extrabold text-white">{fTotal}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-white/60">પૂર્ણ (Completed):</span>
                          <span className="font-bold text-white">{fTotal > 0 ? Math.round((fCompleted/fTotal)*100) : 0}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span className="text-white/60">બાકી (Pending):</span>
                          <span className="font-bold text-white">{fTotal > 0 ? Math.round((fPending/fTotal)*100) : 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Process Rate card */}
                  <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#f0e6d0]/80">પ્રોસેસ રેટ (Process Rate)</h4>
                    </div>
                    <div className="flex-1 flex flex-col justify-center text-center py-4">
                      <h5 className="text-[10px] text-white/40 uppercase tracking-widest font-bold">કુલ નોંધણીમાંથી પ્રોસેસ થયેલ</h5>
                      <p className="text-5xl font-serif font-extrabold text-green-400 my-3 drop-shadow flex items-center justify-center gap-2">
                        {fTotal > 0 ? Math.round(((fCompleted + fApproved) / fTotal) * 100) : 0}%
                      </p>
                      <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                        કુલ નોંધાયેલા ભક્તોમાંથી મંજૂર અને પૂર્ણ થયેલ ભક્તોની ટકાવારી.
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* 5. REGISTRATION SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            
            {/* Header and Quick Emergency Actions */}
            <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-gold-500 via-[#8B0000] to-red-600 rounded-t-3xl" />
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gold-500/10 pb-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold-400" /> નોંધણી સમયપત્રક (Registration Schedule Panel)
                  </h3>
                  <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold mt-0.5">Automated open/close schedule management</p>
                </div>
                
                <button
                  type="button"
                  onClick={handleEmergencyLock}
                  className="px-4 py-2 bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-900/30 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                >
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> Emergency Lock (તાત્કાલિક લોક)
                </button>
              </div>
            </div>

            {/* Main Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form Column */}
              <div className="lg:col-span-8 bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative">
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-gold-500 to-saffron rounded-t-3xl" />
                
                <form onSubmit={handleSaveSchedule} className="space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* Registration Status */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase">Registration Status (નોંધણી સ્ટેટ્સ)</label>
                      <select
                        value={scheduleData.registrationStatus}
                        onChange={e => setScheduleData({ ...scheduleData, registrationStatus: e.target.value })}
                        className="bg-black/60 border border-gold-500/20 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                      >
                        <option value="Scheduled">Scheduled (સમયપત્રક મુજબ)</option>
                        <option value="Enable">Enable (તાત્કાલિક ચાલુ)</option>
                        <option value="Disable">Disable (તાત્કાલિક બંધ)</option>
                      </select>
                    </div>

                    {/* Start Day */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase">Start Day (શરૂ થવાનો વાર)</label>
                      <select
                        value={scheduleData.startDay}
                        onChange={e => setScheduleData({ ...scheduleData, startDay: e.target.value })}
                        className="bg-black/60 border border-gold-500/20 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                      >
                        {['Every Day', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <option key={day} value={day}>{day === 'Every Day' ? 'Every Day (દરરોજ)' : day}</option>
                        ))}
                      </select>
                    </div>

                    {/* Start Date - Calendar Picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase flex items-center gap-1.5">
                        📅 Start Date (શરૂ થવાની તારીખ)
                        <span className="text-[9px] text-white/30 normal-case font-normal">Optional</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={scheduleData.startDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setScheduleData({ ...scheduleData, startDate: e.target.value })}
                          className="w-full bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 focus:shadow-[0_0_12px_rgba(212,175,55,0.2)] transition-all cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        />
                        {scheduleData.startDate && (
                          <button type="button" onClick={() => setScheduleData({ ...scheduleData, startDate: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-red-400 transition-colors text-xs font-bold" title="Clear date">✕</button>
                        )}
                      </div>
                      {scheduleData.startDate && (
                        <span className="text-[10px] text-gold-400 font-semibold">
                          ✓ {new Date(scheduleData.startDate + 'T00:00:00').toLocaleDateString('gu-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Start Time - 12-Hour AM/PM Picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase flex items-center gap-1.5">
                        🕐 Start Time (શરૂ થવાનો સમય)
                      </label>
                      <div className="flex items-center gap-2">
                        {/* Hour */}
                        <select
                          value={scheduleData.startTime.split(':')[0] || '08'}
                          onChange={e => {
                            const [, rest] = scheduleData.startTime.split(':');
                            const min = rest ? rest.split(' ')[0] : '00';
                            const ampm = scheduleData.startTime.includes('PM') ? 'PM' : 'AM';
                            setScheduleData({ ...scheduleData, startTime: `${e.target.value}:${min} ${ampm}` });
                          }}
                          className="flex-1 bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-gold-500 text-center"
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const h = (i + 1).toString().padStart(2, '0');
                            return <option key={h} value={h}>{h}</option>;
                          })}
                        </select>
                        <span className="text-gold-400 font-bold text-lg">:</span>
                        {/* Minute */}
                        <select
                          value={scheduleData.startTime.split(':')[1]?.split(' ')[0] || '00'}
                          onChange={e => {
                            const hr = scheduleData.startTime.split(':')[0] || '08';
                            const ampm = scheduleData.startTime.includes('PM') ? 'PM' : 'AM';
                            setScheduleData({ ...scheduleData, startTime: `${hr}:${e.target.value} ${ampm}` });
                          }}
                          className="flex-1 bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-gold-500 text-center"
                        >
                          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {/* AM / PM Toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-gold-500/20">
                          <button
                            type="button"
                            onClick={() => {
                              const t = scheduleData.startTime.replace(/ PM$/, ' AM').replace(/ AM$/, ' AM');
                              const base = t.includes('AM') ? t : scheduleData.startTime.replace(/ PM$/, ' AM');
                              setScheduleData({ ...scheduleData, startTime: base.includes('AM') ? base : scheduleData.startTime.replace(/ (AM|PM)$/, ' AM') });
                            }}
                            className={`px-3 py-2.5 text-xs font-extrabold transition-all ${
                              !scheduleData.startTime.includes('PM') 
                                ? 'bg-gold-500 text-maroon-900' 
                                : 'bg-black/60 text-white/50 hover:text-white'
                            }`}
                          >AM</button>
                          <button
                            type="button"
                            onClick={() => {
                              const base = scheduleData.startTime.replace(/ (AM|PM)$/, ' PM');
                              setScheduleData({ ...scheduleData, startTime: base });
                            }}
                            className={`px-3 py-2.5 text-xs font-extrabold transition-all ${
                              scheduleData.startTime.includes('PM') 
                                ? 'bg-red-600 text-white' 
                                : 'bg-black/60 text-white/50 hover:text-white'
                            }`}
                          >PM</button>
                        </div>
                      </div>
                      <span className="text-[11px] text-gold-400 font-mono font-bold tracking-wider">⏰ {scheduleData.startTime}</span>
                    </div>

                    {/* End Date - Calendar Picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase flex items-center gap-1.5">
                        📅 End Date (બંધ થવાની તારીખ)
                        <span className="text-[9px] text-white/30 normal-case font-normal">Optional</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={scheduleData.endDate}
                          min={scheduleData.startDate || new Date().toISOString().split('T')[0]}
                          onChange={e => setScheduleData({ ...scheduleData, endDate: e.target.value })}
                          className="w-full bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 focus:shadow-[0_0_12px_rgba(212,175,55,0.2)] transition-all cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        />
                        {scheduleData.endDate && (
                          <button type="button" onClick={() => setScheduleData({ ...scheduleData, endDate: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-red-400 transition-colors text-xs font-bold" title="Clear date">✕</button>
                        )}
                      </div>
                      {scheduleData.endDate && (
                        <span className="text-[10px] text-gold-400 font-semibold">
                          ✓ {new Date(scheduleData.endDate + 'T00:00:00').toLocaleDateString('gu-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* End Time - 12-Hour AM/PM Picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase flex items-center gap-1.5">
                        🕐 End Time (બંધ થવાનો સમય)
                      </label>
                      <div className="flex items-center gap-2">
                        {/* Hour */}
                        <select
                          value={scheduleData.endTime.split(':')[0] || '08'}
                          onChange={e => {
                            const [, rest] = scheduleData.endTime.split(':');
                            const min = rest ? rest.split(' ')[0] : '00';
                            const ampm = scheduleData.endTime.includes('PM') ? 'PM' : 'AM';
                            setScheduleData({ ...scheduleData, endTime: `${e.target.value}:${min} ${ampm}` });
                          }}
                          className="flex-1 bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-gold-500 text-center"
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const h = (i + 1).toString().padStart(2, '0');
                            return <option key={h} value={h}>{h}</option>;
                          })}
                        </select>
                        <span className="text-gold-400 font-bold text-lg">:</span>
                        {/* Minute */}
                        <select
                          value={scheduleData.endTime.split(':')[1]?.split(' ')[0] || '00'}
                          onChange={e => {
                            const hr = scheduleData.endTime.split(':')[0] || '08';
                            const ampm = scheduleData.endTime.includes('PM') ? 'PM' : 'AM';
                            setScheduleData({ ...scheduleData, endTime: `${hr}:${e.target.value} ${ampm}` });
                          }}
                          className="flex-1 bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-gold-500 text-center"
                        >
                          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {/* AM / PM Toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-gold-500/20">
                          <button
                            type="button"
                            onClick={() => {
                              const base = scheduleData.endTime.replace(/ (AM|PM)$/, ' AM');
                              setScheduleData({ ...scheduleData, endTime: base });
                            }}
                            className={`px-3 py-2.5 text-xs font-extrabold transition-all ${
                              !scheduleData.endTime.includes('PM') 
                                ? 'bg-gold-500 text-maroon-900' 
                                : 'bg-black/60 text-white/50 hover:text-white'
                            }`}
                          >AM</button>
                          <button
                            type="button"
                            onClick={() => {
                              const base = scheduleData.endTime.replace(/ (AM|PM)$/, ' PM');
                              setScheduleData({ ...scheduleData, endTime: base });
                            }}
                            className={`px-3 py-2.5 text-xs font-extrabold transition-all ${
                              scheduleData.endTime.includes('PM') 
                                ? 'bg-red-600 text-white' 
                                : 'bg-black/60 text-white/50 hover:text-white'
                            }`}
                          >PM</button>
                        </div>
                      </div>
                      <span className="text-[11px] text-gold-400 font-mono font-bold tracking-wider">⏰ {scheduleData.endTime}</span>
                    </div>

                    {/* Timezone - Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase">🌍 Timezone (ટાઇમ ઝોન)</label>
                      <select
                        value={scheduleData.timezone}
                        onChange={e => setScheduleData({ ...scheduleData, timezone: e.target.value })}
                        className="bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500 font-bold"
                      >
                        <option value="Asia/Kolkata">🇮🇳 Asia/Kolkata (IST +5:30)</option>
                        <option value="UTC">🌐 UTC (GMT +0:00)</option>
                        <option value="America/New_York">🇺🇸 America/New_York (EST)</option>
                        <option value="Europe/London">🇬🇧 Europe/London (GMT)</option>
                        <option value="Asia/Dubai">🇦🇪 Asia/Dubai (GST +4:00)</option>
                      </select>
                    </div>

                    {/* Max Tokens Per Day */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gold-500/80 uppercase">🎫 Maximum Tokens Per Day (મહત્તમ ટોકન)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={scheduleData.maxTokens}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setScheduleData({ ...scheduleData, maxTokens: val, maxTokensPerDay: val });
                        }}
                        className="bg-black/60 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 font-mono"
                        placeholder="e.g. 500"
                      />
                      <span className="text-[9px] text-white/30">Max registrations allowed per day before auto-close</span>
                    </div>

                  </div>

                  {/* Toggle Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    
                    {/* Allow Early Registration */}
                    <label className="flex items-center justify-between p-3.5 bg-black/40 border border-gold-500/15 rounded-xl cursor-pointer hover:bg-gold-500/5 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase">Allow Early Registration</span>
                        <span className="text-[8px] text-white/40">ચાલુ સમય પહેલા નોંધણી સ્વીકારો</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={scheduleData.allowEarlyRegistration}
                        onChange={e => setScheduleData({ ...scheduleData, allowEarlyRegistration: e.target.checked })}
                        className="w-4 h-4 rounded text-gold-500 accent-gold-500 cursor-pointer"
                      />
                    </label>

                    {/* Auto Close After Limit */}
                    <label className="flex items-center justify-between p-3.5 bg-black/40 border border-gold-500/15 rounded-xl cursor-pointer hover:bg-gold-500/5 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase">Auto Close After Limit Reached</span>
                        <span className="text-[8px] text-white/40">ટોકન લિમિટ પૂરી થતા આપમેળે લોક કરો</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={scheduleData.autoCloseAfterLimitReached}
                        onChange={e => setScheduleData({ ...scheduleData, autoCloseAfterLimitReached: e.target.checked })}
                        className="w-4 h-4 rounded text-gold-500 accent-gold-500 cursor-pointer"
                      />
                    </label>

                  </div>

                  {/* Submit, Preview and Reset buttons */}
                  <div className="flex flex-wrap gap-3 pt-3 border-t border-gold-500/10">
                    <button
                      type="submit"
                      className="flex-1 min-w-[120px] py-3 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-95"
                    >
                      Save Schedule
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowSchedulePreview(true)}
                      className="px-5 py-3 bg-blue-500/15 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 hover:text-white transition-all active:scale-95"
                    >
                      Preview Lock Screen
                    </button>

                    <button
                      type="button"
                      onClick={handleResetSchedule}
                      className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all active:scale-95"
                    >
                      Reset Defaults
                    </button>
                  </div>

                </form>
              </div>

              {/* Stats & History sidebar */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Status Indicator */}
                <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-5 backdrop-blur-md shadow-lg space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/50 block">નોંધણી લાઈવ સ્થિતિ</span>
                  <div className="flex items-center justify-between p-3.5 bg-black/45 rounded-xl border border-gold-500/10">
                    <span className="text-xs text-white/70">Registration state:</span>
                    {scheduleData.registrationStatus === 'Enable' || (scheduleData.registrationStatus === 'Scheduled' && scheduleData.enabled) ? (
                      <span className="text-green-400 font-bold text-xs flex items-center gap-1">🟢 Active / Open</span>
                    ) : (
                      <span className="text-red-400 font-bold text-xs flex items-center gap-1">🔴 Inactive / Closed</span>
                    )}
                  </div>
                </div>

                {/* Simulated Changes history log */}
                <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-5 backdrop-blur-md shadow-lg space-y-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/50 block">Schedule History (સમયપત્રક ફેરફારો)</span>
                  
                  <div className="space-y-3 text-[11px]">
                    {[
                      { time: "Today, 07:50 PM", action: "Schedule saved successfully", user: "Admin Desk" },
                      { time: "Yesterday, 11:20 AM", action: "Token limit modified: 400 -> 500", user: "Admin Desk" },
                      { time: "02-07-2026, 04:30 PM", action: "Status set to Scheduled mode", user: "Bhuvaji Desk" }
                    ].map((log, i) => (
                      <div key={i} className="p-3 bg-black/35 rounded-xl border border-gold-500/10 space-y-1 relative">
                        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-gold-400" />
                        <div className="text-white/40 text-[9px]">{log.time}</div>
                        <div className="text-white/80 font-semibold">{log.action}</div>
                        <div className="text-gold-500/60 text-[9px] font-bold uppercase">{log.user}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* 4. LIVE TV SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-gold-500 via-saffron to-orange-glow rounded-t-3xl" />
              
              <div className="border-b border-gold-500/10 pb-4 mb-6">
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-gold-400 animate-pulse" /> લાઇવ મંદિર ટીવી સેટિંગ્સ (Live TV Settings)
                </h3>
                <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold mt-0.5">Manage YouTube Live Streaming dynamically</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Controls */}
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  
                  {/* URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gold-500/80 uppercase">YouTube Live URL</label>
                    <input
                      type="url"
                      required
                      placeholder="e.g. https://www.youtube.com/watch?v=abc123"
                      value={liveSettings.youtubeUrl}
                      onChange={e => setLiveSettings({ ...liveSettings, youtubeUrl: e.target.value })}
                      className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors placeholder-white/20"
                    />
                    <span className="text-[10px] text-white/40">
                      Supports `watch?v=`, `youtu.be/`, `/embed/`, and `/live/` formats.
                    </span>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gold-500/80 uppercase">Stream Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Live Temple Darshan Aarti"
                      value={liveSettings.title}
                      onChange={e => setLiveSettings({ ...liveSettings, title: e.target.value })}
                      className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gold-500/80 uppercase">Stream Description</label>
                    <textarea
                      rows={3}
                      placeholder="Enter description..."
                      value={liveSettings.description}
                      onChange={e => setLiveSettings({ ...liveSettings, description: e.target.value })}
                      className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    
                    {/* Premium 3D Live TV Status Toggle */}
                    <div className="col-span-1 sm:col-span-3 border border-gold-500/20 bg-black/40 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden mb-2">
                      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent pointer-events-none" />
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex flex-col text-center sm:text-left">
                          <span className="text-sm font-extrabold text-gold-500 uppercase tracking-widest mb-1 font-serif">
                            Live TV Status
                          </span>
                          {liveSettings.liveEnabled ? (
                            <span className="text-xs font-bold text-green-400 flex items-center justify-center sm:justify-start gap-1.5 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-green-500" /> 🟢 LIVE ENABLED
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-400 flex items-center justify-center sm:justify-start gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500" /> 🔴 LIVE DISABLED
                            </span>
                          )}
                          <span className="text-[10px] text-white/40 mt-2 max-w-[200px] leading-relaxed">
                            Turn ON to instantly broadcast the Live player to all devotees.
                          </span>
                        </div>

                        {/* 3D Glassmorphism Toggle */}
                        <div 
                          className={cn(
                            "relative w-24 h-12 rounded-full cursor-pointer p-1 transition-all duration-500 shadow-inner flex items-center",
                            liveSettings.liveEnabled 
                              ? "bg-gradient-to-r from-green-600 to-green-400 border border-green-400/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3),_0_0_20px_rgba(74,222,128,0.4)]" 
                              : "bg-gradient-to-r from-gray-900 to-black border border-red-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),_0_0_15px_rgba(239,68,68,0.2)]"
                          )}
                          onClick={() => setLiveSettings({ ...liveSettings, liveEnabled: !liveSettings.liveEnabled })}
                        >
                          <div 
                            className={cn(
                              "w-10 h-10 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] transform transition-transform duration-500 flex items-center justify-center",
                              liveSettings.liveEnabled 
                                ? "translate-x-12 bg-white" 
                                : "translate-x-0 bg-red-500/20 backdrop-blur-md border border-red-500/50"
                            )}
                          >
                            {liveSettings.liveEnabled ? (
                              <Tv className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Autoplay */}
                    <label className="flex items-center justify-between p-3 bg-black/35 rounded-xl border border-gold-500/10 cursor-pointer hover:bg-gold-500/5 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase">Auto Play</span>
                        <span className="text-[8px] text-white/40">Starts instantly</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={liveSettings.autoPlay}
                        onChange={e => setLiveSettings({ ...liveSettings, autoPlay: e.target.checked })}
                        className="w-4 h-4 rounded text-gold-500 accent-gold-500 cursor-pointer"
                      />
                    </label>

                    {/* Mute */}
                    <label className="flex items-center justify-between p-3 bg-black/35 rounded-xl border border-gold-500/10 cursor-pointer hover:bg-gold-500/5 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase">Mute Audio</span>
                        <span className="text-[8px] text-white/40">Mute on startup</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={liveSettings.muteAudio}
                        onChange={e => setLiveSettings({ ...liveSettings, muteAudio: e.target.checked })}
                        className="w-4 h-4 rounded text-gold-500 accent-gold-500 cursor-pointer"
                      />
                    </label>

                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-95"
                    >
                      Save Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all active:scale-95"
                    >
                      Reset Defaults
                    </button>
                  </div>

                </form>

                {/* Stream Preview Panel */}
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold text-gold-500/80 uppercase">Live Player Preview</span>
                  
                  <div className="w-full relative rounded-3xl overflow-hidden bg-black border border-gold-500/20 aspect-video shadow-[0_10px_30px_rgba(0,0,0,0.85)] flex items-center justify-center">
                    {liveSettings.liveEnabled && liveSettings.youtubeUrl ? (
                      getEmbedUrl(liveSettings.youtubeUrl, liveSettings.autoPlay, liveSettings.muteAudio) ? (
                        <iframe
                          src={getEmbedUrl(liveSettings.youtubeUrl, liveSettings.autoPlay, liveSettings.muteAudio)}
                          title="Preview Live Stream"
                          className="w-full h-full object-cover"
                          allow="autoplay"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                          <p className="text-xs text-white/80 font-bold">અમાન્ય YouTube URL (Invalid Stream link)</p>
                          <p className="text-[10px] text-white/40 mt-1">Please write a valid URL format</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center p-4">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2 animate-pulse" />
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider">🔴 Live Darshan is currently unavailable.</p>
                        <p className="text-[10px] text-white/30 mt-1">Live Status switch is turned OFF</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-black/35 rounded-2xl p-4 border border-gold-500/10 space-y-1.5 text-xs text-[#f0e6d0]/70">
                    <div className="flex justify-between font-bold text-white border-b border-gold-500/5 pb-1 mb-1">
                      <span>Stream Metadata Preview</span>
                    </div>
                    <div><span className="text-gold-500">Title:</span> {liveSettings.title || 'None'}</div>
                    <div><span className="text-gold-500">Desc:</span> {liveSettings.description || 'None'}</div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ─── EVENTS ADMIN TAB ─── */}
        {activeTab === 'events_admin' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-saffron to-gold-500">
                ઇવેન્ટ્સ મેનેજમેન્ટ (Events Admin)
              </h2>
              <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold">Customize Daily Events & Upcoming Festivals</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Upcoming Festival */}
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Calendar className="w-48 h-48" />
                </div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="bg-gold-500/10 p-2.5 rounded-xl border border-gold-500/20">
                    <Calendar className="w-5 h-5 text-gold-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-white">મહોત્સવ (Festival)</h3>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">Upcoming Main Event</p>
                  </div>
                </div>

                <form onSubmit={handleSaveFestival} className="space-y-4 relative z-10 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/70">શીર્ષક (Title)</label>
                      <input
                        type="text"
                        value={festival?.title || ''}
                        onChange={e => setFestival(prev => prev ? { ...prev, title: e.target.value } : { id: '1', title: e.target.value, description: '', targetDate: '' })}
                        placeholder="e.g. મંદિર આગામી મહોત્સવ ઉત્સવ"
                        className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/70">વર્ણન (Description)</label>
                      <textarea
                        value={festival?.description || ''}
                        onChange={e => setFestival(prev => prev ? { ...prev, description: e.target.value } : { id: '1', title: '', description: e.target.value, targetDate: '' })}
                        placeholder="e.g. શ્રાવણ સુદ પૂનમના રોજ સવારે દિવ્ય આરતી તથા ભંડારાનું આયોજન."
                        className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors min-h-24 resize-y"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb828]/70">તારીખ (Target Date)</label>
                      <input
                        type="date"
                        value={festival?.targetDate ? new Date(festival.targetDate).toISOString().split('T')[0] : ''}
                        onChange={e => setFestival(prev => prev ? { ...prev, targetDate: new Date(e.target.value).toISOString() } : { id: '1', title: '', description: '', targetDate: new Date(e.target.value).toISOString() })}
                        className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 mt-6 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-95"
                  >
                    Save Festival Info
                  </button>
                </form>
              </div>

              {/* Daily Events */}
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col h-full relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-gold-500/10 p-2.5 rounded-xl border border-gold-500/20">
                      <Clock className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white">દૈનિક કાર્યક્રમ (Daily Events)</h3>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">Manage Schedule</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newEvent: DailyEvent = { title: 'નવો કાર્યક્રમ', time: '08:00 AM', description: 'વિગત ઉમેરો' };
                      handleSaveDailyEvent(newEvent);
                    }}
                    className="p-2 bg-gold-500/10 text-gold-400 border border-gold-500/20 hover:bg-gold-500 hover:text-maroon-900 rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                  {dailyEvents.map(event => (
                    <div key={event.id} className="bg-black/35 rounded-2xl p-4 border border-gold-500/10 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={event.title}
                            onChange={e => handleSaveDailyEvent({ ...event, title: e.target.value })}
                            className="w-full bg-transparent border-b border-gold-500/30 pb-1 text-sm font-bold text-white focus:outline-none focus:border-gold-500 transition-colors placeholder:text-white/30"
                            placeholder="Title (શીર્ષક)"
                          />
                          <input
                            type="text"
                            value={event.description}
                            onChange={e => handleSaveDailyEvent({ ...event, description: e.target.value })}
                            className="w-full bg-transparent border-b border-gold-500/30 pb-1 text-xs text-white/70 focus:outline-none focus:border-gold-500 transition-colors placeholder:text-white/30"
                            placeholder="Description (વર્ણન)"
                          />
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-gold-500/70" />
                            <input
                              type="text"
                              value={event.time}
                              onChange={e => handleSaveDailyEvent({ ...event, time: e.target.value })}
                              className="bg-transparent border-none text-xs font-mono font-bold text-gold-400 focus:outline-none w-28"
                              placeholder="08:00 AM"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => event.id && handleDeleteDailyEvent(event.id.toString())}
                          className="self-start p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {dailyEvents.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-white/40 uppercase tracking-widest font-bold">કોઈ ઇવેન્ટ ઉપલબ્ધ નથી</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        )}

        {/* ─── DATABASE BACKUPS TAB ─── */}
        {activeTab === 'database_admin' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-saffron to-gold-500">
                ડેટાબેઝ મેનેજમેન્ટ (Database Management)
              </h2>
              <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold">Manage system backups and snapshots</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-gold-500/10 p-2.5 rounded-xl border border-gold-500/20">
                      <Database className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white">ડેટાબેઝ બેકઅપ અને રીસ્ટોર (Database Backups)</h3>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">Restore previous snapshots</p>
                    </div>
                  </div>
                  <button
                    onClick={handleBackup}
                    className="px-4 py-2.5 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] active:scale-95 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> નવો બેકઅપ બનાવો (Create Backup)
                  </button>
                </div>

                <div className="space-y-3 relative z-10">
                  {backups.map((backup, idx) => {
                    const date = new Date(backup.createdAt);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-black/35 rounded-2xl p-4 border border-gold-500/10">
                        <div>
                          <div className="text-sm font-bold text-white mb-1">{backup.filename}</div>
                          <div className="text-xs text-white/50">
                            {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-2">•</span>
                            {(backup.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewBackup(backup.filename)}
                            className="px-4 py-2 bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-bold rounded-xl transition-all hover:bg-gold-500/20 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            ડેટા જુઓ (View)
                          </button>
                          <button
                            onClick={() => handleRestore(backup.filename)}
                            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-bold rounded-xl transition-all shadow-[0_0_10px_rgba(212,175,55,0.2)] hover:scale-105 flex items-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            રીસ્ટોર (Restore)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {backups.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs text-white/40 uppercase tracking-widest font-bold">કોઈ બેકઅપ ઉપલબ્ધ નથી</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View Backup Data Table */}
            {viewingBackup && (
              <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl overflow-hidden shadow-lg backdrop-blur-md animate-fade-in mt-6">
                <div className="p-6 border-b border-gold-500/15 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gold-500/5">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-white">બેકઅપ ડેટા (Backup Data)</h3>
                    <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold mt-0.5">{viewingBackup}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/50" />
                      <input
                        type="text"
                        placeholder="શોધો (વર્ષ, નામ, ગામ...)"
                        value={backupSearchQuery}
                        onChange={e => setBackupSearchQuery(e.target.value)}
                        className="bg-black/50 border border-gold-500/20 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-gold-500 w-full placeholder-gold-500/30"
                      />
                    </div>
                    <button
                      onClick={exportBackupToExcel}
                      className="px-4 py-2.5 bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-maroon-900 border border-gold-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Export Excel
                    </button>
                    <button
                      onClick={() => setViewingBackup(null)}
                      className="px-4 py-2.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                    >
                      <X className="w-4 h-4" /> બંધ કરો
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-black/60 sticky top-0 z-20 backdrop-blur-md">
                      <tr className="text-gold-500/80 text-[10px] uppercase tracking-widest border-b border-gold-500/20">
                        <th className="p-4 font-extrabold whitespace-nowrap">Token</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">નામ (Name)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">ગામ (Village)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">મોબાઈલ (Mobile)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">તારીખ (Date)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">સમય (Time)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">વર્ષ (Year)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-500/10 text-white/90">
                      {backupDevotees
                        .filter(d => 
                          d.name.toLowerCase().includes(backupSearchQuery.toLowerCase()) ||
                          d.village.toLowerCase().includes(backupSearchQuery.toLowerCase()) ||
                          d.mobile.includes(backupSearchQuery) ||
                          new Date(d.registrationTime).getFullYear().toString().includes(backupSearchQuery) ||
                          new Date(d.registrationTime).toLocaleDateString('en-IN').includes(backupSearchQuery)
                        )
                        .map((d) => {
                          const dt = new Date(d.registrationTime);
                          return (
                            <tr key={d.id} className="hover:bg-gold-500/5 transition-colors">
                              <td className="p-4 font-mono text-sm font-bold text-saffron">{d.tokenNumber}</td>
                              <td className="p-4 font-semibold text-sm">{d.name}</td>
                              <td className="p-4 text-[#f0e6d0]/80 text-xs">{d.village}</td>
                              <td className="p-4 text-[#f0e6d0]/80 text-xs font-mono">{d.mobile}</td>
                              <td className="p-4 text-[#f0e6d0]/60 text-xs">{dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                              <td className="p-4 text-[#f0e6d0]/60 text-xs">{dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="p-4 text-gold-400 font-bold text-xs">{dt.getFullYear()}</td>
                            </tr>
                          );
                      })}
                      {backupDevotees.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-white/40 text-sm">માહિતી ઉપલબ્ધ નથી (No data found)</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── DEDICATED RESTORE VIEW TAB ─── */}
        {activeTab === 'restore' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-saffron to-gold-500">
                રીસ્ટોર ડેટા (Restore Data)
              </h2>
              <p className="text-xs text-gold-500/60 uppercase tracking-widest font-bold">Filter and view restored devotee history</p>
            </div>

            <div className="bg-[#121015]/65 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md shadow-lg flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-end gap-4 bg-black/40 p-5 rounded-2xl border border-gold-500/10">
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gold-500/80">Select Backup File</label>
                  <select
                    value={selectedRestoreBackup}
                    onChange={(e) => fetchRestoreBackupData(e.target.value)}
                    className="w-full bg-black/50 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="">-- બેકઅપ ફાઈલ પસંદ કરો --</option>
                    {backups.map(b => (
                      <option key={b.filename} value={b.filename}>{b.filename}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gold-500/80">વર્ષ (Year)</label>
                  <select
                    value={restoreFilterYear}
                    onChange={(e) => setRestoreFilterYear(e.target.value)}
                    className="w-full bg-black/50 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="all">બધા વર્ષો (All)</option>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                  </select>
                </div>

                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gold-500/80">મહિનો (Month)</label>
                  <select
                    value={restoreFilterMonth}
                    onChange={(e) => setRestoreFilterMonth(e.target.value)}
                    className="w-full bg-black/50 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="all">બધા મહિના (All)</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m.toString()}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gold-500/80">તારીખ (Date)</label>
                  <select
                    value={restoreFilterDate}
                    onChange={(e) => setRestoreFilterDate(e.target.value)}
                    className="w-full bg-black/50 border border-gold-500/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="all">બધી તારીખ (All)</option>
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                      <option key={d} value={d.toString()}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRestoreBackup ? (
                <div className="overflow-x-auto max-h-[500px] border border-gold-500/20 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-black/60 sticky top-0 z-20 backdrop-blur-md">
                      <tr className="text-gold-500/80 text-[10px] uppercase tracking-widest border-b border-gold-500/20">
                        <th className="p-4 font-extrabold whitespace-nowrap">Token</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">નામ (Name)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">ગામ (Village)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">તારીખ (Date)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">સમય (Time)</th>
                        <th className="p-4 font-extrabold whitespace-nowrap">વર્ષ (Year)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-500/10 text-white/90">
                      {filteredRestoreDevotees.map((d) => {
                        const dt = new Date(d.registrationTime);
                        return (
                          <tr key={d.id} className="hover:bg-gold-500/5 transition-colors">
                            <td className="p-4 font-mono text-sm font-bold text-saffron">{d.tokenNumber}</td>
                            <td className="p-4 font-semibold text-sm">{d.name}</td>
                            <td className="p-4 text-[#f0e6d0]/80 text-xs">{d.village}</td>
                            <td className="p-4 text-[#f0e6d0]/60 text-xs">{dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td className="p-4 text-[#f0e6d0]/60 text-xs">{dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="p-4 text-gold-400 font-bold text-xs">{dt.getFullYear()}</td>
                          </tr>
                        );
                      })}
                      {filteredRestoreDevotees.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-white/40 text-sm">માહિતી ઉપલબ્ધ નથી (No data found)</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-white/30 text-sm font-bold border border-dashed border-gold-500/20 rounded-2xl">
                  Please select a backup file to view the restored data.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODAL: SCHEDULE PREVIEW LOCKSCREEN ─── */}
        {showSchedulePreview && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 print:hidden">
            <div className="max-w-xl w-full bg-[#121015] border-2 border-gold-500/40 rounded-[32px] p-8 text-center relative shadow-[0_0_50px_rgba(212,175,55,0.25)] space-y-6">
              <button
                onClick={() => setShowSchedulePreview(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Animated Golden Clock */}
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gold-500/10 to-transparent rounded-full border border-gold-500/30 flex items-center justify-center relative">
                <svg className="w-12 h-12 text-gold-400 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" className="origin-[12px_12px] animate-spin" style={{ transformOrigin: '12px 12px', animationDuration: '6s' }} />
                </svg>
                <div className="absolute inset-0 border border-gold-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-saffron to-gold-500">
                  🔒 Registration is Closed
                </h3>
                <p className="text-xs text-white/40 uppercase tracking-widest font-extrabold">Preview Mode (નોંધણી બંધ છે)</p>
              </div>

              <div className="p-5 bg-black/45 border border-gold-500/10 rounded-2xl space-y-3 max-w-md mx-auto">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ffb828]/60 block">અગામી સમયપત્રક (Next Opening Window)</span>
                <div className="text-sm font-semibold text-white/90">
                  Registration opens on: <span className="text-gold-400 font-serif font-bold">{scheduleData.startDay || 'Sunday'}</span> at <span className="text-gold-400 font-mono font-bold">{scheduleData.startTime || '08:00 AM'}</span>
                </div>
                {scheduleData.startDate && (
                  <div className="text-xs text-white/40">
                    Date: {scheduleData.startDate} to {scheduleData.endDate || 'N/A'}
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              <div className="space-y-4 max-w-sm mx-auto">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#ffb828]/50 block">નોંધણી શરૂ થવામાં બાકી સમય (Countdown Timer)</span>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Days", value: mockPreviewCountdown.days },
                    { label: "Hours", value: mockPreviewCountdown.hours },
                    { label: "Minutes", value: mockPreviewCountdown.minutes },
                    { label: "Seconds", value: mockPreviewCountdown.seconds }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-black/50 border border-gold-500/15 rounded-xl p-3 flex flex-col gap-1 items-center justify-center">
                      <span className="font-mono text-2xl font-extrabold text-saffron">{item.value.toString().padStart(2, '0')}</span>
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-white/40">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gold-500/10">
                <button
                  type="button"
                  onClick={() => setShowSchedulePreview(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 font-extrabold text-xs rounded-xl active:scale-95"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

      </section>

      {/* ─── MODAL: QR PASS PREVIEW ─── */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#121015] border-2 border-gold-500/40 rounded-3xl p-6 md:p-8 max-w-sm w-full relative shadow-[0_0_50px_rgba(212,175,55,0.3)] text-center space-y-6">
            <button
              onClick={() => setSelectedPass(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h4 className="font-serif text-sm font-bold text-gold-500 tracking-wider">ટાઇગર ચેહર રાજ આશ્રમ ઉવાસદ</h4>
              <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">Divine Darshan Entry Pass</p>
            </div>

            <div className="border border-gold-500/20 rounded-2xl p-4 bg-black/40 space-y-4">
              <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl border border-gold-500/20 flex items-center justify-center">
                <QRCodeCanvas 
                  value={JSON.stringify({
                    token: selectedPass.tokenNumber.toString().padStart(3, '0'),
                    name: selectedPass.name,
                    village: selectedPass.village,
                    mobile: selectedPass.mobile,
                    entryTime: new Date(selectedPass.registrationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temple: "ટાઇગર ચેહર રાજ આશ્રમ ઉવાસદ"
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
                  <span>ભક્તનું નામ:</span>
                  <span className="text-white font-semibold">{selectedPass.name}</span>
                </div>
                <div className="flex justify-between items-center text-white/50 border-b border-white/5 pb-1">
                  <span>ગામ (Village):</span>
                  <span className="text-white font-semibold">{selectedPass.village}</span>
                </div>
                <div className="flex justify-between items-center text-white/50 pb-1">
                  <span>મોબાઈલ:</span>
                  <span className="text-white font-semibold">{selectedPass.mobile}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> પ્રિન્ટ પાસ (Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT DEVOTEE DETAILS ─── */}
      {editingDevotee && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#121015] border border-gold-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setEditingDevotee(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-lg font-bold text-gold-400 mb-4 border-b border-gold-500/10 pb-2">
              વિગતો સુધારો (Edit Devotee Details)
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gold-500/80">નામ (Full Name)</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gold-500/80">ગામ (Village)</label>
                <input
                  type="text"
                  required
                  value={editFormData.village}
                  onChange={e => setEditFormData({ ...editFormData, village: e.target.value })}
                  className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gold-500/80">મોબાઈલ નંબર (Mobile)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={editFormData.mobile}
                  onChange={e => setEditFormData({ ...editFormData, mobile: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gold-500/80">સ્થિતિ (Status)</label>
                <select
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full bg-black/40 border border-gold-500/20 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors font-bold"
                >
                  <option value="pending">Pending (બાકી)</option>
                  <option value="approved">Approved (મંજૂર)</option>
                  <option value="rejected">Rejected (અસ્વીકાર)</option>
                  <option value="completed">Completed (પૂર્ણ)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-saffron text-maroon-900 text-xs font-extrabold rounded-xl transition-all"
                >
                  સુધારો સાચવો (Save changes)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDevotee(null)}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all"
                >
                  રદ કરો (Cancel)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printing Styles overlay */}
      <style>{`
        @media print {
          nav, aside, footer, button, select, input, .fixed {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          section, .max-w-sm {
            width: 100% !important;
            max-width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}
