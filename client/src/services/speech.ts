export class SpeechService {
  private recognition: any;
  private isSupported: boolean;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private finalTranscript = '';
  private isRunning = false;

  constructor(lang: string = 'gu-IN') {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;
      this.isSupported = true;
    } else {
      this.isSupported = false;
      console.warn("Speech recognition not supported in this browser.");
    }
  }

  setLang(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  start(
    onResult: (text: string) => void,
    onEnd: () => void,
    onError: (err: any) => void,
    options?: { silenceMs?: number }
  ) {
    if (!this.isSupported) {
      onError('not-supported');
      return;
    }

    this.abort();
    this.finalTranscript = '';
    const silenceMs = options?.silenceMs ?? 5000;

    const resetSilenceTimeout = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        this.stop();
      }, silenceMs);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += piece;
        } else {
          interimTranscript += piece;
        }
      }
      onResult((this.finalTranscript + interimTranscript).trim());
      resetSilenceTimeout();
    };

    this.recognition.onerror = (event: any) => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.isRunning = false;
      onError(event.error);
    };

    this.recognition.onend = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.isRunning = false;
      onResult(this.finalTranscript.trim());
      onEnd();
    };

    try {
      this.recognition.start();
      this.isRunning = true;
      resetSilenceTimeout();
    } catch (e) {
      this.isRunning = false;
      onError(e);
    }
  }

  stop() {
    if (this.isSupported && this.recognition && this.isRunning) {
      this.recognition.stop();
    }
  }

  abort() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.isSupported && this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore abort races
      }
    }
    this.isRunning = false;
    this.finalTranscript = '';
  }
}

const wordToDigitMap: Record<string, string> = {
  // English words
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'oh': '0', 'o': '0',

  // Gujarati script (standard)
  'શૂન્ય': '0', 'એક': '1', 'બે': '2', 'ત્રણ': '3', 'ચાર': '4',
  'પાંચ': '5', 'છ': '6', 'સાત': '7', 'આઠ': '8', 'નવ': '9',

  // ── Gujarati as Google STT actually outputs (Hinglish/colloquial) ──
  'ઝીરો': '0', 'ઝિરો': '0',           // zero (most common in gu-IN STT)
  'વન': '1',                           // one
  'ટૂ': '2', 'ટુ': '2',               // two
  'થ્રી': '3', 'ત્રી': '3',           // three
  'ફોર': '4', 'ફૉર': '4', 'શોર': '4', 'ચોર': '4', // four (शोर is common mis-transcription)
  'ફાઈવ': '5', 'ફાઇવ': '5',           // five
  'સિક્સ': '6', 'સિક': '6',           // six
  'સેવન': '7',                         // seven
  'એઇટ': '8', 'એઈટ': '8',             // eight
  'નાઈન': '9', 'નાઇન': '9',           // nine
  'ટેન': '10', 'ten': '10',

  // Hindi script (standard)
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
  'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',

  // Hindi STT colloquial
  'जीरो': '0', 'ज़ीरो': '0',
  'वन': '1', 'टू': '2', 'थ्री': '3', 'फोर': '4', 'फ़ोर': '4',
  'फाइव': '5', 'सिक्स': '6', 'सेवन': '7', 'एट': '8', 'नाइन': '9',

  // Gujarati Devanagari digits → ASCII
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',

  // Gujarati script digits → ASCII
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',

  // Romanized Gujarati/Hindi (typed or voice)
  'ek': '1', 'be': '2', 'tran': '3', 'char': '4', 'chaar': '4',
  'panch': '5', 'paanch': '5', 'chha': '6', 'chho': '6',
  'saat': '7', 'aath': '8', 'ath': '8', 'nav': '9', 'shunya': '0',
  'do': '2', 'teen': '3', 'tin': '3', 'nau': '9', 'nao': '9',
};

export const convertWordsToDigits = (text: string): string => {
  let processedText = text.toLowerCase();
  for (const [word, digit] of Object.entries(wordToDigitMap)) {
    // For English words, use word boundaries. For Indic words, just replace globally
    if (/^[a-z]+$/.test(word)) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      processedText = processedText.replace(regex, digit);
    } else {
      const regex = new RegExp(word, 'g');
      processedText = processedText.replace(regex, digit);
    }
  }
  return processedText;
};

export const extractMobileNumber = (text: string): string | null => {
  const normalized = convertWordsToDigits(text);
  const digitsOnly = normalized.replace(/\D/g, '');
  const match = digitsOnly.match(/(?:^91|91)?([6-9]\d{9})/);
  if (match) {
    return match[1];
  }

  const fallbackMatch = digitsOnly.match(/(\d{10})/);
  if (fallbackMatch) {
    return fallbackMatch[1];
  }

  return null;
};

export const normalizeSpeechText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}।॥\u0964\u0965]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const matchesConfirmation = (text: string, words: string[]): boolean => {
  const normalized = normalizeSpeechText(text);
  if (!normalized) return false;

  return words.some((word) => {
    const target = normalizeSpeechText(word);
    if (!target) return false;

    if (/^[a-z0-9]+$/i.test(target)) {
      const regex = new RegExp(`\\b${target}\\b`, 'i');
      return regex.test(normalized);
    }

    return normalized.includes(target) || normalized === target;
  });
};

export const processSpeechWithGemini = async (transcript: string, targetLanguage: string) => {
  try {
    const res = await fetch('/api/parse-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, targetLanguage })
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error in processSpeechWithGemini:", error);
    throw error;
  }
};

if ('speechSynthesis' in window) {
  // Try to load voices immediately
  window.speechSynthesis.getVoices();
  // Chrome / WebKit need this event
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export const speak = (text: string, lang: string, onEnd?: () => void) => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech before starting a new one
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  
  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    let voice = voices.find(v => v.lang === lang && v.name.includes('Google'));
    if (!voice) voice = voices.find(v => (v.lang === lang || v.lang.replace('_', '-') === lang));
    if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.name.includes('Google'));
    if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (!voice) voice = voices.find(v => v.lang.startsWith('hi'));
    
    if (voice) {
      utterance.voice = voice;
    }
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      onEnd(); // Continue even if speech fails
    };
  }
  
  window.speechSynthesis.speak(utterance);
};
