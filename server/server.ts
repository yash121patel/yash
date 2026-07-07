import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
const PORT = 3000;

app.use(express.json());

// Initialize SQLite Database
const db = new Database("db.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS devotees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    village TEXT NOT NULL,
    mobile TEXT NOT NULL,
    language TEXT NOT NULL,
    tokenNumber INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    registrationTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    completionTime DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS live_tv_settings (
    id TEXT PRIMARY KEY,
    youtubeUrl TEXT NOT NULL,
    streamTitle TEXT,
    description TEXT,
    autoplay INTEGER DEFAULT 1,
    mute INTEGER DEFAULT 1,
    liveEnabled INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS registration_schedule (
    id TEXT PRIMARY KEY,
    registrationStatus TEXT DEFAULT 'Scheduled',
    startDay TEXT DEFAULT 'Sunday',
    startDate TEXT DEFAULT '',
    startTime TEXT DEFAULT '08:00 AM',
    endDate TEXT DEFAULT '',
    endTime TEXT DEFAULT '08:00 PM',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    maxTokens INTEGER DEFAULT 500,
    maxTokensPerDay INTEGER DEFAULT 500,
    allowEarlyRegistration INTEGER DEFAULT 0,
    autoCloseAfterLimitReached INTEGER DEFAULT 1,
    enabled INTEGER DEFAULT 1
  );
`);

// Force reset the table if old schema exists
try {
  db.exec(`ALTER TABLE live_tv_settings ADD COLUMN liveEnabled INTEGER DEFAULT 0`);
} catch (e) {
  // column already exists or table doesn't exist yet
}

db.prepare(`
  INSERT OR IGNORE INTO live_tv_settings (id, youtubeUrl, streamTitle, description, autoplay, mute, liveEnabled)
  VALUES ('1', 'https://www.youtube.com/watch?v=5HlOasjK5yA', 'Live Temple Darshan Aarti', 'શ્રી ચેહર માઁ ના લાઈવ દર્શન', 1, 1, 0)
`).run();

db.prepare(`
  INSERT OR IGNORE INTO registration_schedule (
    id, registrationStatus, startDay, startDate, startTime, endDate, endTime, timezone, maxTokens, maxTokensPerDay, allowEarlyRegistration, autoCloseAfterLimitReached, enabled
  ) VALUES (
    '1', 'Scheduled', 'Sunday', '', '08:00 AM', '', '08:00 PM', 'Asia/Kolkata', 500, 500, 0, 1, 1
  )
`).run();

// Simple Admin user store for auth (in a real app, hash passwords and store in DB)
const JWT_SECRET = "chehar_maa_secret_key_2024";

// Token generator logic
const generateToken = () => {
  const initToken = db.prepare("SELECT MAX(tokenNumber) as maxToken FROM devotees WHERE DATE(registrationTime, 'localtime') = DATE('now', 'localtime')").get() as { maxToken: number | null };
  const nextToken = initToken && initToken.maxToken ? initToken.maxToken + 1 : 1;
  return nextToken;
};

// --- API ROUTES ---

// Submit Devotee
app.post("/api/devotees", (req, res) => {
  try {
    const { name, village, mobile, language } = req.body;
    
    if (!name || !village || !mobile) {
       res.status(400).json({ error: "Missing required fields" });
       return;
    }

    // Check registration schedule before allowing registration
    const settings = db.prepare("SELECT * FROM registration_schedule LIMIT 1").get() as any;
    if (settings) {
      const statusObj = getScheduleStatus(settings);
      if (statusObj.status === 'closed') {
        res.status(403).json({ error: "Registration is currently closed.", reason: statusObj.reason });
        return;
      }
    }

    const tokenNumber = generateToken();
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO devotees (id, name, village, mobile, language, tokenNumber, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, village, mobile, language || "en", tokenNumber, 'pending');

    const devotee = { id, name, village, mobile, language, tokenNumber, status: 'pending' };
    
    // Broadcast to all clients
    io.emit("new_devotee", devotee);
    io.emit("queue_update");

    if (settings) {
      const newStatusObj = getScheduleStatus(settings);
      if (newStatusObj.status === 'closed') {
        io.emit("registration_schedule_update");
      }
    }

    res.json({ success: true, tokenNumber, id });
  } catch (error) {
    console.error("Error inserting devotee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Parse Speech to JSON using Gemini
app.post("/api/parse-speech", async (req, res) => {
  try {
    const { transcript, targetLanguage } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let scriptInstruction = 'CRITICAL: Always return the Name and Village translated into the native script of the detected language.';
    if (targetLanguage === 'gu-IN') {
      scriptInstruction = `CRITICAL for Gujarati (gu-IN):
      - Return Name and Village in Gujarati script (ગુજરાતી).
      - Common surnames: Patel=પટેલ, Thakor=ઠાકોર, Rabari=રબારી, Vaghela=વાઘેલા.
      - Fix common STT mistakes: "Yash"=યશ, "Narayanbhai"=નારાયણભાઈ, "Trasvad/Traswad"=ત્રાસવાડ.
      - Keep full name with surname if spoken (e.g. "Patel Yash Narayanbhai" → "પટેલ યશ નારાયણભાઈ").
      - Village names must stay as proper Gujarati place names, not English transliteration.`;
    }
    if (targetLanguage === 'hi-IN') scriptInstruction = 'CRITICAL: Always return the Name and Village translated into the Hindi Devanagari script, regardless of the language they spoke. For example, if they say "Yash", return "यश".';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a data extractor for a temple registration system in Gujarat, India.
      The user's speech transcript is provided below. It may be in Gujarati, Hindi, English, or a mix, and might be transliterated by speech-to-text.
      1. Detect the language spoken from the transcript.
      2. Extract Name, Village, and Mobile Number.
         - For mobile: extract ONLY 10 digits starting with 6-9 (Indian mobile). Strip words like "mobile", "number", "મોબાઇલ", "નંબર".
         - If digits are spoken as Gujarati/Hindi words (એક, બે, zero, etc.), convert to digits.
         - If user says number in groups like "84 01 67 70 20", join them.
      3. ${scriptInstruction}
      If a field is missing or you are not sure, return an empty string for it.
      Return the output ONLY as a valid JSON object with keys: "name", "village", "mobile", "detectedLanguage" (use standard locale codes like 'gu-IN', 'hi-IN', 'en-IN', 'mr-IN', 'ta-IN').
      Do not wrap in markdown blocks.
      
      Transcript: ${transcript}`,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      res.json(JSON.parse(response.text));
    } else {
      res.status(400).json({ error: "Failed to generate content" });
    }
  } catch (error) {
    console.error("Error parsing speech:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Devotees
app.get("/api/devotees", (req, res) => {
  try {
    const status = req.query.status as string;
    let query = "SELECT * FROM devotees";
    let params: any[] = [];
    
    if (status) {
      query += " WHERE status = ? AND DATE(registrationTime, 'localtime') = DATE('now', 'localtime') ORDER BY tokenNumber ASC";
      params.push(status);
    } else {
      query += " WHERE DATE(registrationTime, 'localtime') = DATE('now', 'localtime') ORDER BY tokenNumber ASC";
    }

    const devotees = db.prepare(query).all(...params);
    res.json({ devotees });
  } catch (error) {
    console.error("Error fetching devotees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Devotee Status (Bhuvaji actions)
app.patch("/api/devotees/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === 'completed') {
       db.prepare("UPDATE devotees SET status = ?, completionTime = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    } else {
       db.prepare("UPDATE devotees SET status = ?, completionTime = NULL WHERE id = ?").run(status, id);
    }

    io.emit("status_update", { id, status });
    io.emit("queue_update");
    
    // Announce the next token
    if (status === 'completed') {
      const nextPending = db.prepare("SELECT tokenNumber FROM devotees WHERE status = 'pending' ORDER BY tokenNumber ASC LIMIT 1").get() as { tokenNumber: number } | undefined;
      if (nextPending) {
        io.emit("announce_next", { tokenNumber: nextPending.tokenNumber });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete Devotee
app.delete("/api/devotees/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM devotees WHERE id = ?").run(id);
    io.emit("queue_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting devotee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Edit Devotee details & status
app.patch("/api/devotees/:id/details", (req, res) => {
  try {
    const { id } = req.params;
    const { name, village, mobile, status } = req.body;
    
    db.prepare(`
      UPDATE devotees 
      SET name = COALESCE(?, name),
          village = COALESCE(?, village),
          mobile = COALESCE(?, mobile),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, village, mobile, status, id);
    
    io.emit("queue_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error editing devotee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Current Running Token
app.get("/api/queue/status", (req, res) => {
  try {
    const currentPending = db.prepare("SELECT * FROM devotees WHERE status = 'pending' ORDER BY tokenNumber ASC LIMIT 1").get();
    const completed = db.prepare("SELECT COUNT(*) as count FROM devotees WHERE status = 'completed' AND DATE(registrationTime) = DATE('now')").get() as { count: number };
    const pending = db.prepare("SELECT COUNT(*) as count FROM devotees WHERE status = 'pending' AND DATE(registrationTime) = DATE('now')").get() as { count: number };
    
    res.json({
      currentPendingToken: currentPending ? (currentPending as any).tokenNumber : null,
      stats: {
        completed: completed.count,
        pending: pending.count,
        total: completed.count + pending.count
      }
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Auth
app.post("/api/auth/login", (req, res) => {
  const { password, role } = req.body;
  if (role === 'bhuvaji' && password === 'bhuvaji123') {
    res.json({ token: 'mock-jwt-token-bhuvaji', role: 'bhuvaji' });
  } else if (role === 'admin' && password === 'admin123') {
    res.json({ token: 'mock-jwt-token-admin', role: 'admin' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// GET Live TV Settings
app.get("/api/live/settings", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM live_tv_settings WHERE id = '1'").get();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const result = {
      youtubeUrl: (settings as any).youtubeUrl,
      title: (settings as any).streamTitle,
      description: (settings as any).description,
      autoPlay: (settings as any).autoplay === 1,
      muteAudio: (settings as any).mute === 1,
      liveEnabled: (settings as any).liveEnabled === 1
    };
    res.json(result);
  } catch (error) {
    console.error("Error getting live tv settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET Live TV Status (New endpoint for requirements)
app.get("/api/live/status", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM live_tv_settings WHERE id = '1'").get();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const result = {
      liveEnabled: (settings as any).liveEnabled === 1,
      youtubeUrl: (settings as any).youtubeUrl,
      title: (settings as any).streamTitle,
      description: (settings as any).description
    };
    res.json(result);
  } catch (error) {
    console.error("Error getting live status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST Live TV Settings
app.post("/api/live/settings", (req, res) => {
  try {
    console.log("POST /api/live/settings - Received request body:", req.body);
    const { youtubeUrl, title, description, autoPlay, muteAudio, liveEnabled } = req.body;
    
    // Map boolean values to 1 or 0 for SQLite
    const isLiveEnabled = liveEnabled === true || liveEnabled === 1 || liveEnabled === 'true' ? 1 : 0;
    const isAutoPlay = autoPlay === true || autoPlay === 1 || autoPlay === 'true' ? 1 : 0;
    const isMuteAudio = muteAudio === true || muteAudio === 1 || muteAudio === 'true' ? 1 : 0;
    
    console.log(`Parsed SQLite values: liveEnabled=${isLiveEnabled}, autoplay=${isAutoPlay}, mute=${isMuteAudio}`);

    const result = db.prepare(`
      INSERT OR REPLACE INTO live_tv_settings (id, youtubeUrl, streamTitle, description, autoplay, mute, liveEnabled)
      VALUES ('1', ?, ?, ?, ?, ?, ?)
    `).run(
      youtubeUrl || '',
      title || '',
      description || '',
      isAutoPlay,
      isMuteAudio,
      isLiveEnabled
    );

    console.log("SQLite run result:", result);

    io.emit("live_tv_update");
    res.json({
      success: true,
      data: {
        youtubeUrl: youtubeUrl || '',
        title: title || '',
        description: description || '',
        autoPlay: isAutoPlay === 1,
        muteAudio: isMuteAudio === 1,
        liveEnabled: isLiveEnabled === 1
      }
    });
  } catch (error) {
    console.error("Error inserting live tv settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT Live TV Settings is removed in favor of POST.

function parseDateTime(dateStr: string, timeStr: string): Date {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getScheduleStatus(settings: any) {
  const { registrationStatus, startDay, startDate, startTime, endDate, endTime, maxTokens, autoCloseAfterLimitReached } = settings;
  const now = new Date();
  
  // Count total registered devotees today
  const todayRegistrations = db.prepare("SELECT COUNT(*) as count FROM devotees WHERE DATE(registrationTime, 'localtime') = DATE('now', 'localtime')").get() as { count: number };
  const currentCount = todayRegistrations ? todayRegistrations.count : 0;
  
  if (currentCount >= maxTokens && (autoCloseAfterLimitReached === 1 || autoCloseAfterLimitReached === true)) {
    return {
      status: 'closed',
      reason: 'limit_reached',
      countdownSeconds: 0,
      nextOpenDay: startDay,
      nextOpenTime: startTime
    };
  }

  if (registrationStatus === 'Enable') {
    return {
      status: 'open',
      countdownSeconds: 0,
      nextOpenDay: startDay,
      nextOpenTime: startTime
    };
  }
  
  if (registrationStatus === 'Disable') {
    return {
      status: 'closed',
      reason: 'disabled',
      countdownSeconds: 0,
      nextOpenDay: startDay,
      nextOpenTime: startTime
    };
  }

  // Scheduled mode
  if (registrationStatus === 'Scheduled') {
    if (startDate && endDate) {
      const start = parseDateTime(startDate, startTime);
      const end = parseDateTime(endDate, endTime);
      
      if (now < start) {
        return {
          status: 'closed',
          reason: 'before_start',
          countdownSeconds: Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000)),
          nextOpenDay: startDay,
          nextOpenTime: startTime,
          nextOpenDate: startDate
        };
      } else if (now >= start && now <= end) {
        return {
          status: 'open',
          countdownSeconds: Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      } else {
        return {
          status: 'closed',
          reason: 'after_end',
          countdownSeconds: 0,
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      }
    }
    
    // Weekly scheduled fallback
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = daysOfWeek[now.getDay()];
    const todayStr = now.toISOString().split('T')[0];
    
    const start = parseDateTime(todayStr, startTime);
    const end = parseDateTime(todayStr, endTime);
    
    if (startDay === 'Every Day' || todayDayName === startDay) {
      if (now < start) {
        return {
          status: 'closed',
          reason: 'before_start',
          countdownSeconds: Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      } else if (now >= start && now <= end) {
        return {
          status: 'open',
          countdownSeconds: Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      } else {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + (startDay === 'Every Day' ? 1 : 7));
        const nextDateStr = nextDate.toISOString().split('T')[0];
        const nextStart = parseDateTime(nextDateStr, startTime);
        
        return {
          status: 'closed',
          reason: 'after_end',
          countdownSeconds: Math.max(0, Math.floor((nextStart.getTime() - now.getTime()) / 1000)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      }
    } else {
      const currentDayIdx = now.getDay();
      const targetDayIdx = daysOfWeek.indexOf(startDay);
      let daysUntil = (targetDayIdx - currentDayIdx + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + daysUntil);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const nextStart = parseDateTime(nextDateStr, startTime);
      
      return {
        status: 'closed',
        reason: 'scheduled_future',
        countdownSeconds: Math.max(0, Math.floor((nextStart.getTime() - now.getTime()) / 1000)),
        nextOpenDay: startDay,
        nextOpenTime: startTime
      };
    }
  }

  return {
    status: 'open',
    countdownSeconds: 0,
    nextOpenDay: startDay,
    nextOpenTime: startTime
  };
}

// GET Registration Schedule
app.get("/api/registration-schedule", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM registration_schedule WHERE id = '1'").get();
    if (!settings) {
      return res.status(404).json({ error: "Schedule settings not found" });
    }
    const parsedSettings = {
      id: (settings as any).id,
      registrationStatus: (settings as any).registrationStatus,
      startDay: (settings as any).startDay,
      startDate: (settings as any).startDate,
      startTime: (settings as any).startTime,
      endDate: (settings as any).endDate,
      endTime: (settings as any).endTime,
      timezone: (settings as any).timezone,
      maxTokens: (settings as any).maxTokens,
      maxTokensPerDay: (settings as any).maxTokensPerDay,
      allowEarlyRegistration: (settings as any).allowEarlyRegistration === 1,
      autoCloseAfterLimitReached: (settings as any).autoCloseAfterLimitReached === 1,
      enabled: (settings as any).enabled === 1
    };
    const scheduleInfo = getScheduleStatus(parsedSettings);
    res.json({ settings: parsedSettings, ...scheduleInfo });
  } catch (error) {
    console.error("Error getting registration schedule settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST/PUT Registration Schedule
app.post("/api/registration-schedule", (req, res) => {
  try {
    const { 
      registrationStatus, startDay, startDate, startTime, endDate, endTime, 
      timezone, maxTokens, maxTokensPerDay, allowEarlyRegistration, 
      autoCloseAfterLimitReached, enabled 
    } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO registration_schedule (
        id, registrationStatus, startDay, startDate, startTime, endDate, endTime, 
        timezone, maxTokens, maxTokensPerDay, allowEarlyRegistration, 
        autoCloseAfterLimitReached, enabled
      ) VALUES ('1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      registrationStatus || 'Scheduled',
      startDay || 'Sunday',
      startDate || '',
      startTime || '08:00 AM',
      endDate || '',
      endTime || '08:00 PM',
      timezone || 'Asia/Kolkata',
      maxTokens !== undefined ? Number(maxTokens) : 500,
      maxTokensPerDay !== undefined ? Number(maxTokensPerDay) : 500,
      allowEarlyRegistration ? 1 : 0,
      autoCloseAfterLimitReached ? 1 : 0,
      enabled !== undefined ? (enabled ? 1 : 0) : 1
    );

    io.emit("registration_schedule_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error setting registration schedule settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/registration-schedule", (req, res) => {
  try {
    const { 
      registrationStatus, startDay, startDate, startTime, endDate, endTime, 
      timezone, maxTokens, maxTokensPerDay, allowEarlyRegistration, 
      autoCloseAfterLimitReached, enabled 
    } = req.body;

    db.prepare(`
      UPDATE registration_schedule
      SET registrationStatus = ?,
          startDay = ?,
          startDate = ?,
          startTime = ?,
          endDate = ?,
          endTime = ?,
          timezone = ?,
          maxTokens = ?,
          maxTokensPerDay = ?,
          allowEarlyRegistration = ?,
          autoCloseAfterLimitReached = ?,
          enabled = ?
      WHERE id = '1'
    `).run(
      registrationStatus || 'Scheduled',
      startDay || 'Sunday',
      startDate || '',
      startTime || '08:00 AM',
      endDate || '',
      endTime || '08:00 PM',
      timezone || 'Asia/Kolkata',
      maxTokens !== undefined ? Number(maxTokens) : 500,
      maxTokensPerDay !== undefined ? Number(maxTokensPerDay) : 500,
      allowEarlyRegistration ? 1 : 0,
      autoCloseAfterLimitReached ? 1 : 0,
      enabled !== undefined ? (enabled ? 1 : 0) : 1
    );

    io.emit("registration_schedule_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating registration schedule settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE Registration Schedule
app.delete("/api/registration-schedule", (req, res) => {
  try {
    db.prepare(`
      UPDATE registration_schedule
      SET registrationStatus = 'Disable',
          enabled = 0
      WHERE id = '1'
    `).run();
    io.emit("registration_schedule_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting registration schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE Live TV Settings
app.delete("/api/live-tv", (req, res) => {
  try {
    db.prepare(`
      UPDATE live_tv_settings
      SET youtubeUrl = '',
          liveEnabled = 0
      WHERE id = '1'
    `).run();
    io.emit("live_tv_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting live tv settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Socket.io connection
let activeViewers = 0;
io.on("connection", (socket) => {
  activeViewers++;
  io.emit("viewer_count_update", activeViewers);
  console.log("A user connected:", socket.id, "Total active:", activeViewers);
  
  socket.on("disconnect", () => {
    activeViewers = Math.max(0, activeViewers - 1);
    io.emit("viewer_count_update", activeViewers);
    console.log("User disconnected:", socket.id, "Total active:", activeViewers);
  });
});

async function startServer() {
  const distPath = path.join(process.cwd(), "../client/dist");
  app.use(express.static(distPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        res.status(404).send("Not Found");
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
