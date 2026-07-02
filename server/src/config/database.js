import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dbDir, 'asciiman.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS image_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT,
      category TEXT,
      quality_score REAL DEFAULT 0,
      status TEXT DEFAULT 'candidate' CHECK(status IN ('candidate','selected','rejected','posted')),
      thumbnail_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER REFERENCES image_candidates(id),
      image_url TEXT,
      ascii_output_path TEXT,
      caption TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','posted','failed')),
      facebook_post_id TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      posted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      automation_enabled INTEGER DEFAULT 0,
      posting_time TEXT DEFAULT '10:00',
      selected_categories TEXT DEFAULT '["art","nature","architecture","portrait","history"]',
      predefined_caption TEXT DEFAULT 'Character by character. Another daily creation by Mr. Bit. #MrBit',
      sources_config TEXT DEFAULT '{"wikimedia":true,"artinstitute":true,"unsplash":false,"pexels":false,"pixabay":false, "metmuseum":true, "openverse":true}'
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_created ON image_candidates(created_at);
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON image_candidates(status);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
  `);

  // Seed settings if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM settings');
  const count = countStmt.get().count;
  
  if (count === 0) {
    db.exec('INSERT INTO settings (id) VALUES (1)');
  }
}   

export default db;
