import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("neuropulse.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    neural_points INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_log_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'mood', 'sleep', 'activity', 'eating', 'brain_waves', 'routine'
    value TEXT, -- JSON stringified data
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT, -- 'user', 'model'
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/user", (req, res) => {
    const email = "muzaffarabbas34148@gmail.com"; // Hardcoded for this session
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(email, "User");
      user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    }
    res.json(user);
  });

  app.get("/api/logs", (req, res) => {
    const email = "muzaffarabbas34148@gmail.com";
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!user) return res.json([]);
    const logs = db.prepare("SELECT * FROM logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 100").all(user.id);
    res.json(logs);
  });

  app.post("/api/logs", (req, res) => {
    const email = "muzaffarabbas34148@gmail.com";
    const { type, value } = req.body;
    const user = db.prepare("SELECT id, neural_points, streak, last_log_date FROM users WHERE email = ?").get(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    db.prepare("INSERT INTO logs (user_id, type, value) VALUES (?, ?, ?)").run(user.id, type, JSON.stringify(value));

    // Update Neural Points and Streak
    const today = new Date().toISOString().split('T')[0];
    let newPoints = user.neural_points + 10;
    let newStreak = user.streak;

    if (user.last_log_date !== today) {
      newStreak = (user.last_log_date === new Date(Date.now() - 86400000).toISOString().split('T')[0]) ? user.streak + 1 : 1;
      newPoints += 50; // Bonus for daily log
    }

    db.prepare("UPDATE users SET neural_points = ?, streak = ?, last_log_date = ? WHERE id = ?").run(newPoints, newStreak, today, user.id);

    res.json({ success: true, neural_points: newPoints, streak: newStreak });
  });

  app.get("/api/chat-history", (req, res) => {
    const email = "muzaffarabbas34148@gmail.com";
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!user) return res.json([]);
    const history = db.prepare("SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY created_at ASC").all(user.id);
    res.json(history);
  });

  app.post("/api/chat-history", (req, res) => {
    const email = "muzaffarabbas34148@gmail.com";
    const { role, content } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!user) return res.status(404).json({ error: "User not found" });
    db.prepare("INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)").run(user.id, role, content);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
