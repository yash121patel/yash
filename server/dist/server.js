// server.ts
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
import fs from "fs";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
var app = express();
app.use(cors());
var server = http.createServer(app);
var io = new Server(server, {
  cors: {
    origin: "*"
  }
});
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json());
var db = new Database("db.sqlite");
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

  CREATE TABLE IF NOT EXISTS daily_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    time TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS upcoming_festival (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    targetDate TEXT
  );
`);
try {
  db.exec(`ALTER TABLE live_tv_settings ADD COLUMN liveEnabled INTEGER DEFAULT 0`);
} catch (e) {
}
db.prepare(`
  INSERT OR IGNORE INTO live_tv_settings (id, youtubeUrl, streamTitle, description, autoplay, mute, liveEnabled)
  VALUES ('1', 'https://www.youtube.com/watch?v=5HlOasjK5yA', 'Live Temple Darshan Aarti', '\u0AB6\u0ACD\u0AB0\u0AC0 \u0A9A\u0AC7\u0AB9\u0AB0 \u0AAE\u0ABE\u0A81 \u0AA8\u0ABE \u0AB2\u0ABE\u0A88\u0AB5 \u0AA6\u0AB0\u0ACD\u0AB6\u0AA8', 1, 1, 0)
`).run();
db.prepare(`
  INSERT OR IGNORE INTO registration_schedule (
    id, registrationStatus, startDay, startDate, startTime, endDate, endTime, timezone, maxTokens, maxTokensPerDay, allowEarlyRegistration, autoCloseAfterLimitReached, enabled
  ) VALUES (
    '1', 'Scheduled', 'Sunday', '', '08:00 AM', '', '08:00 PM', 'Asia/Kolkata', 500, 500, 0, 1, 1
  )
`).run();
db.prepare(`
  INSERT OR IGNORE INTO upcoming_festival (id, title, description, targetDate)
  VALUES ('1', '\u0AAE\u0A82\u0AA6\u0ABF\u0AB0 \u0A86\u0A97\u0ABE\u0AAE\u0AC0 \u0AAE\u0AB9\u0ACB\u0AA4\u0ACD\u0AB8\u0AB5 \u0A89\u0AA4\u0ACD\u0AB8\u0AB5 \u0A85\u0AA8\u0AC7 \u0AAD\u0A82\u0AA1\u0ABE\u0AB0\u0ACB', '\u0AB6\u0ACD\u0AB0\u0ABE\u0AB5\u0AA3 \u0AB8\u0AC1\u0AA6 \u0AAA\u0AC2\u0AA8\u0AAE\u0AA8\u0ABE \u0AB0\u0ACB\u0A9C \u0AB8\u0AB5\u0ABE\u0AB0\u0AC7 \u0AA6\u0ABF\u0AB5\u0ACD\u0AAF \u0A86\u0AB0\u0AA4\u0AC0 \u0AA4\u0AA5\u0ABE \u0AAD\u0A82\u0AA1\u0ABE\u0AB0\u0ABE\u0AA8\u0AC1\u0A82 \u0A86\u0AAF\u0ACB\u0A9C\u0AA8.', '2026-08-28')
`).run();
var existingEvents = db.prepare("SELECT count(*) as count FROM daily_events").get();
if (existingEvents.count === 0) {
  const insertEvent = db.prepare("INSERT INTO daily_events (id, title, time, description) VALUES (?, ?, ?, ?)");
  insertEvent.run(crypto.randomUUID(), "\u0AB8\u0AB5\u0ABE\u0AB0\u0AA8\u0AC0 \u0AAE\u0A82\u0A97\u0AB3\u0ABE \u0A86\u0AB0\u0AA4\u0AC0", "\u0AE6\u0AEC:\u0AE6\u0AE6 AM", "\u0AA6\u0AB0\u0AB0\u0ACB\u0A9C \u0AB8\u0AB5\u0ABE\u0AB0\u0AC7 \u0AA6\u0ABF\u0AB5\u0ACD\u0AAF \u0AAE\u0AB9\u0ABE \u0A86\u0AB0\u0AA4\u0AC0");
  insertEvent.run(crypto.randomUUID(), "\u0AAD\u0A95\u0ACD\u0AA4 \u0AAD\u0ACB\u0A9C\u0AA8 \u0AAA\u0ACD\u0AB0\u0AB8\u0ABE\u0AA6\u0AB6\u0ABE\u0AB3\u0ABE", "\u0AE7\u0AE7:\u0AE9\u0AE6 AM - \u0AE6\u0AE8:\u0AE6\u0AE6 PM", "\u0AB6\u0ACD\u0AB0\u0AC0 \u0A9A\u0AC7\u0AB9\u0AB0 \u0AAA\u0ACD\u0AB0\u0AB8\u0ABE\u0AA6 \u0AB5\u0ABF\u0AA4\u0AB0\u0AA3 \u0AAD\u0ACB\u0A9C\u0AA8\u0ABE\u0AB2\u0AAF");
  insertEvent.run(crypto.randomUUID(), "\u0AB8\u0ABE\u0A82\u0A9C\u0AA8\u0AC0 \u0AB8\u0A82\u0AA7\u0ACD\u0AAF\u0ABE \u0A86\u0AB0\u0AA4\u0AC0", "\u0AE6\u0AED:\u0AE6\u0AE6 PM", "\u0AB8\u0ABE\u0A82\u0A9C\u0AA8\u0ABE \u0AB8\u0AAE\u0AAF\u0AA8\u0AC0 \u0AA7\u0AC2\u0AAA \u0A86\u0AB0\u0AA4\u0AC0");
  insertEvent.run(crypto.randomUUID(), "\u0AB0\u0ABE\u0AA4\u0ACD\u0AB0\u0AC0 \u0AAD\u0A9C\u0AA8 \u0AB8\u0AA4\u0ACD\u0AB8\u0A82\u0A97 \u0AAE\u0A82\u0AA1\u0AB3", "\u0AE6\u0AEF:\u0AE6\u0AE6 PM", "\u0AB6\u0AA8\u0ABF\u0AB5\u0ABE\u0AB0 \u0A85\u0AA8\u0AC7 \u0AB0\u0AB5\u0ABF\u0AB5\u0ABE\u0AB0\u0AC7 \u0A96\u0ABE\u0AB8 \u0A86\u0AAF\u0ACB\u0A9C\u0AA8");
}
var generateToken = () => {
  const initToken = db.prepare("SELECT MAX(tokenNumber) as maxToken FROM devotees WHERE DATE(registrationTime, 'localtime') = DATE('now', 'localtime')").get();
  const nextToken = initToken && initToken.maxToken ? initToken.maxToken + 1 : 1;
  return nextToken;
};
app.post("/api/devotees", (req, res) => {
  try {
    const { name, village, mobile, language } = req.body;
    if (!name || !village || !mobile) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const settings = db.prepare("SELECT * FROM registration_schedule LIMIT 1").get();
    if (settings) {
      const statusObj = getScheduleStatus(settings);
      if (statusObj.status === "closed") {
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
    stmt.run(id, name, village, mobile, language || "en", tokenNumber, "pending");
    const devotee = { id, name, village, mobile, language, tokenNumber, status: "pending" };
    io.emit("new_devotee", devotee);
    io.emit("queue_update");
    if (settings) {
      const newStatusObj = getScheduleStatus(settings);
      if (newStatusObj.status === "closed") {
        io.emit("registration_schedule_update");
      }
    }
    performAutoBackup();
    res.json({ success: true, tokenNumber, id });
  } catch (error) {
    console.error("Error inserting devotee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/parse-speech", async (req, res) => {
  try {
    const { transcript, targetLanguage } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let scriptInstruction = "CRITICAL: Always return the Name and Village translated into the native script of the detected language.";
    if (targetLanguage === "gu-IN") {
      scriptInstruction = `CRITICAL for Gujarati (gu-IN):
      - Return Name and Village in Gujarati script (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0).
      - Common surnames: Patel=\u0AAA\u0A9F\u0AC7\u0AB2, Thakor=\u0AA0\u0ABE\u0A95\u0ACB\u0AB0, Rabari=\u0AB0\u0AAC\u0ABE\u0AB0\u0AC0, Vaghela=\u0AB5\u0ABE\u0A98\u0AC7\u0AB2\u0ABE.
      - Fix common STT mistakes: "Yash"=\u0AAF\u0AB6, "Narayanbhai"=\u0AA8\u0ABE\u0AB0\u0ABE\u0AAF\u0AA3\u0AAD\u0ABE\u0A88, "Trasvad/Traswad"=\u0AA4\u0ACD\u0AB0\u0ABE\u0AB8\u0AB5\u0ABE\u0AA1.
      - Keep full name with surname if spoken (e.g. "Patel Yash Narayanbhai" \u2192 "\u0AAA\u0A9F\u0AC7\u0AB2 \u0AAF\u0AB6 \u0AA8\u0ABE\u0AB0\u0ABE\u0AAF\u0AA3\u0AAD\u0ABE\u0A88").
      - Village names must stay as proper Gujarati place names, not English transliteration.`;
    }
    if (targetLanguage === "hi-IN") scriptInstruction = 'CRITICAL: Always return the Name and Village translated into the Hindi Devanagari script, regardless of the language they spoke. For example, if they say "Yash", return "\u092F\u0936".';
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a data extractor for a temple registration system in Gujarat, India.
      The user's speech transcript is provided below. It may be in Gujarati, Hindi, English, or a mix, and might be transliterated by speech-to-text.
      1. Detect the language spoken from the transcript.
      2. Extract Name, Village, and Mobile Number.
         - For mobile: extract ONLY 10 digits starting with 6-9 (Indian mobile). Strip words like "mobile", "number", "\u0AAE\u0ACB\u0AAC\u0ABE\u0A87\u0AB2", "\u0AA8\u0A82\u0AAC\u0AB0".
         - If digits are spoken as Gujarati/Hindi words (\u0A8F\u0A95, \u0AAC\u0AC7, zero, etc.), convert to digits.
         - If user says number in groups like "84 01 67 70 20", join them.
      3. ${scriptInstruction}
      If a field is missing or you are not sure, return an empty string for it.
      Return the output ONLY as a valid JSON object with keys: "name", "village", "mobile", "detectedLanguage" (use standard locale codes like 'gu-IN', 'hi-IN', 'en-IN', 'mr-IN', 'ta-IN').
      Do not wrap in markdown blocks.
      
      Transcript: ${transcript}`,
      config: {
        responseMimeType: "application/json"
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
app.get("/api/events", (req, res) => {
  try {
    const dailyEvents = db.prepare("SELECT * FROM daily_events").all();
    const festival = db.prepare("SELECT * FROM upcoming_festival WHERE id = '1'").get();
    res.json({ dailyEvents, festival });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/events/daily", (req, res) => {
  try {
    const { id, title, time, description } = req.body;
    const eventId = id || crypto.randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO daily_events (id, title, time, description)
      VALUES (?, ?, ?, ?)
    `).run(eventId, title, time, description);
    io.emit("events_update");
    res.json({ success: true, id: eventId });
  } catch (error) {
    console.error("Error saving daily event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.delete("/api/events/daily/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM daily_events WHERE id = ?").run(id);
    io.emit("events_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting daily event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/events/festival", (req, res) => {
  try {
    const { title, description, targetDate } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO upcoming_festival (id, title, description, targetDate)
      VALUES ('1', ?, ?, ?)
    `).run(title, description, targetDate);
    io.emit("events_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving festival:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/devotees", (req, res) => {
  try {
    const status = req.query.status;
    let query = "SELECT * FROM devotees";
    let params = [];
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
app.patch("/api/devotees/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status === "completed") {
      db.prepare("UPDATE devotees SET status = ?, completionTime = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    } else {
      db.prepare("UPDATE devotees SET status = ?, completionTime = NULL WHERE id = ?").run(status, id);
    }
    io.emit("status_update", { id, status });
    io.emit("queue_update");
    if (status === "completed") {
      const nextPending = db.prepare("SELECT tokenNumber FROM devotees WHERE status = 'pending' ORDER BY tokenNumber ASC LIMIT 1").get();
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
app.get("/api/queue/status", (req, res) => {
  try {
    const currentPending = db.prepare("SELECT * FROM devotees WHERE status = 'pending' ORDER BY tokenNumber ASC LIMIT 1").get();
    const completed = db.prepare("SELECT COUNT(*) as count FROM devotees WHERE status = 'completed' AND DATE(registrationTime) = DATE('now')").get();
    const pending = db.prepare("SELECT COUNT(*) as count FROM devotees WHERE status = 'pending' AND DATE(registrationTime) = DATE('now')").get();
    res.json({
      currentPendingToken: currentPending ? currentPending.tokenNumber : null,
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
app.post("/api/auth/login", (req, res) => {
  const { password, role } = req.body;
  if (role === "bhuvaji" && password === "bhuvaji123") {
    res.json({ token: "mock-jwt-token-bhuvaji", role: "bhuvaji" });
  } else if (role === "admin" && password === "admin123") {
    res.json({ token: "mock-jwt-token-admin", role: "admin" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});
app.get("/api/live/settings", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM live_tv_settings WHERE id = '1'").get();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const result = {
      youtubeUrl: settings.youtubeUrl,
      title: settings.streamTitle,
      description: settings.description,
      autoPlay: settings.autoplay === 1,
      muteAudio: settings.mute === 1,
      liveEnabled: settings.liveEnabled === 1
    };
    res.json(result);
  } catch (error) {
    console.error("Error getting live tv settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/live/status", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM live_tv_settings WHERE id = '1'").get();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const result = {
      liveEnabled: settings.liveEnabled === 1,
      youtubeUrl: settings.youtubeUrl,
      title: settings.streamTitle,
      description: settings.description
    };
    res.json(result);
  } catch (error) {
    console.error("Error getting live status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/live/settings", (req, res) => {
  try {
    console.log("POST /api/live/settings - Received request body:", req.body);
    const { youtubeUrl, title, description, autoPlay, muteAudio, liveEnabled } = req.body;
    const isLiveEnabled = liveEnabled === true || liveEnabled === 1 || liveEnabled === "true" ? 1 : 0;
    const isAutoPlay = autoPlay === true || autoPlay === 1 || autoPlay === "true" ? 1 : 0;
    const isMuteAudio = muteAudio === true || muteAudio === 1 || muteAudio === "true" ? 1 : 0;
    console.log(`Parsed SQLite values: liveEnabled=${isLiveEnabled}, autoplay=${isAutoPlay}, mute=${isMuteAudio}`);
    const result = db.prepare(`
      INSERT OR REPLACE INTO live_tv_settings (id, youtubeUrl, streamTitle, description, autoplay, mute, liveEnabled)
      VALUES ('1', ?, ?, ?, ?, ?, ?)
    `).run(
      youtubeUrl || "",
      title || "",
      description || "",
      isAutoPlay,
      isMuteAudio,
      isLiveEnabled
    );
    console.log("SQLite run result:", result);
    io.emit("live_tv_update");
    res.json({
      success: true,
      data: {
        youtubeUrl: youtubeUrl || "",
        title: title || "",
        description: description || "",
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
function parseDateTime(dateStr, timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
function getScheduleStatus(settings) {
  const { registrationStatus, startDay, startDate, startTime, endDate, endTime, maxTokens, autoCloseAfterLimitReached } = settings;
  const now = /* @__PURE__ */ new Date();
  const todayRegistrations = db.prepare("SELECT COUNT(*) as count FROM devotees WHERE DATE(registrationTime, 'localtime') = DATE('now', 'localtime')").get();
  const currentCount = todayRegistrations ? todayRegistrations.count : 0;
  if (currentCount >= maxTokens && (autoCloseAfterLimitReached === 1 || autoCloseAfterLimitReached === true)) {
    return {
      status: "closed",
      reason: "limit_reached",
      countdownSeconds: 0,
      nextOpenDay: startDay,
      nextOpenTime: startTime
    };
  }
  if (registrationStatus === "Enable") {
    return {
      status: "open",
      countdownSeconds: 0,
      nextOpenDay: startDay,
      nextOpenTime: startTime
    };
  }
  if (registrationStatus === "Disable") {
    return {
      status: "closed",
      reason: "disabled",
      countdownSeconds: 0,
      nextOpenDay: startDay,
      nextOpenTime: startTime
    };
  }
  if (registrationStatus === "Scheduled") {
    if (startDate && endDate) {
      const start2 = parseDateTime(startDate, startTime);
      const end2 = parseDateTime(endDate, endTime);
      if (now < start2) {
        return {
          status: "closed",
          reason: "before_start",
          countdownSeconds: Math.max(0, Math.floor((start2.getTime() - now.getTime()) / 1e3)),
          nextOpenDay: startDay,
          nextOpenTime: startTime,
          nextOpenDate: startDate
        };
      } else if (now >= start2 && now <= end2) {
        return {
          status: "open",
          countdownSeconds: Math.max(0, Math.floor((end2.getTime() - now.getTime()) / 1e3)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      } else {
        return {
          status: "closed",
          reason: "after_end",
          countdownSeconds: 0,
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      }
    }
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDayName = daysOfWeek[now.getDay()];
    const todayStr = now.toISOString().split("T")[0];
    const start = parseDateTime(todayStr, startTime);
    const end = parseDateTime(todayStr, endTime);
    if (startDay === "Every Day" || todayDayName === startDay) {
      if (now < start) {
        return {
          status: "closed",
          reason: "before_start",
          countdownSeconds: Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1e3)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      } else if (now >= start && now <= end) {
        return {
          status: "open",
          countdownSeconds: Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1e3)),
          nextOpenDay: startDay,
          nextOpenTime: startTime
        };
      } else {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + (startDay === "Every Day" ? 1 : 7));
        const nextDateStr = nextDate.toISOString().split("T")[0];
        const nextStart = parseDateTime(nextDateStr, startTime);
        return {
          status: "closed",
          reason: "after_end",
          countdownSeconds: Math.max(0, Math.floor((nextStart.getTime() - now.getTime()) / 1e3)),
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
      const nextDateStr = nextDate.toISOString().split("T")[0];
      const nextStart = parseDateTime(nextDateStr, startTime);
      return {
        status: "closed",
        reason: "scheduled_future",
        countdownSeconds: Math.max(0, Math.floor((nextStart.getTime() - now.getTime()) / 1e3)),
        nextOpenDay: startDay,
        nextOpenTime: startTime
      };
    }
  }
  return {
    status: "open",
    countdownSeconds: 0,
    nextOpenDay: startDay,
    nextOpenTime: startTime
  };
}
app.get("/api/registration-schedule", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM registration_schedule WHERE id = '1'").get();
    if (!settings) {
      return res.status(404).json({ error: "Schedule settings not found" });
    }
    const parsedSettings = {
      id: settings.id,
      registrationStatus: settings.registrationStatus,
      startDay: settings.startDay,
      startDate: settings.startDate,
      startTime: settings.startTime,
      endDate: settings.endDate,
      endTime: settings.endTime,
      timezone: settings.timezone,
      maxTokens: settings.maxTokens,
      maxTokensPerDay: settings.maxTokensPerDay,
      allowEarlyRegistration: settings.allowEarlyRegistration === 1,
      autoCloseAfterLimitReached: settings.autoCloseAfterLimitReached === 1,
      enabled: settings.enabled === 1
    };
    const scheduleInfo = getScheduleStatus(parsedSettings);
    res.json({ settings: parsedSettings, ...scheduleInfo });
  } catch (error) {
    console.error("Error getting registration schedule settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/registration-schedule", (req, res) => {
  try {
    const {
      registrationStatus,
      startDay,
      startDate,
      startTime,
      endDate,
      endTime,
      timezone,
      maxTokens,
      maxTokensPerDay,
      allowEarlyRegistration,
      autoCloseAfterLimitReached,
      enabled
    } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO registration_schedule (
        id, registrationStatus, startDay, startDate, startTime, endDate, endTime, 
        timezone, maxTokens, maxTokensPerDay, allowEarlyRegistration, 
        autoCloseAfterLimitReached, enabled
      ) VALUES ('1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      registrationStatus || "Scheduled",
      startDay || "Sunday",
      startDate || "",
      startTime || "08:00 AM",
      endDate || "",
      endTime || "08:00 PM",
      timezone || "Asia/Kolkata",
      maxTokens !== void 0 ? Number(maxTokens) : 500,
      maxTokensPerDay !== void 0 ? Number(maxTokensPerDay) : 500,
      allowEarlyRegistration ? 1 : 0,
      autoCloseAfterLimitReached ? 1 : 0,
      enabled !== void 0 ? enabled ? 1 : 0 : 1
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
      registrationStatus,
      startDay,
      startDate,
      startTime,
      endDate,
      endTime,
      timezone,
      maxTokens,
      maxTokensPerDay,
      allowEarlyRegistration,
      autoCloseAfterLimitReached,
      enabled
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
      registrationStatus || "Scheduled",
      startDay || "Sunday",
      startDate || "",
      startTime || "08:00 AM",
      endDate || "",
      endTime || "08:00 PM",
      timezone || "Asia/Kolkata",
      maxTokens !== void 0 ? Number(maxTokens) : 500,
      maxTokensPerDay !== void 0 ? Number(maxTokensPerDay) : 500,
      allowEarlyRegistration ? 1 : 0,
      autoCloseAfterLimitReached ? 1 : 0,
      enabled !== void 0 ? enabled ? 1 : 0 : 1
    );
    io.emit("registration_schedule_update");
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating registration schedule settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
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
var BACKUPS_DIR = path.join(process.cwd(), "backups");
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}
function performAutoBackup() {
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupFileName = `auto-backup-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    db.backup(backupPath).then(() => console.log(`Auto backup created: ${backupFileName}`)).catch((err) => console.error("Auto backup failed:", err));
  } catch (error) {
    console.error("Error creating auto backup:", error);
  }
}
app.post("/api/backup", (req, res) => {
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    db.backup(backupPath).then(() => {
      res.json({ success: true, message: "Backup created successfully", filename: backupFileName });
    }).catch((err) => {
      console.error("Backup failed:", err);
      res.status(500).json({ error: "Backup failed" });
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/backups", (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".sqlite")).map((filename) => {
      const stats = fs.statSync(path.join(BACKUPS_DIR, filename));
      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime.toISOString()
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(files);
  } catch (error) {
    console.error("Error listing backups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/backup/:filename/devotees", (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ error: "Filename is required" });
    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }
    const backupDb = new Database(backupPath, { readonly: true });
    try {
      const devotees = backupDb.prepare("SELECT * FROM devotees ORDER BY registrationTime DESC").all();
      res.json(devotees);
    } finally {
      backupDb.close();
    }
  } catch (error) {
    console.error("Error fetching backup devotees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/restore", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }
    db.close();
    fs.copyFileSync(backupPath, "db.sqlite");
    db = new Database("db.sqlite");
    io.emit("update_data");
    io.emit("events_update");
    io.emit("live_tv_update");
    io.emit("registration_schedule_update");
    res.json({ success: true, message: "Database restored successfully" });
  } catch (error) {
    console.error("Error restoring backup:", error);
    res.status(500).json({ error: "Internal server error" });
    try {
      if (!db.open) {
        db = new Database("db.sqlite");
      }
    } catch (e) {
    }
  }
});
var activeViewers = 0;
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
//# sourceMappingURL=server.js.map
