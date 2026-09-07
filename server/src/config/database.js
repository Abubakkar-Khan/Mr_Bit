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

function safeAddColumn(tableName, columnName, columnDef) {
  try {
    const tableInfo = db.pragma(`table_info(${tableName})`);
    const exists = tableInfo.some((col) => col.name === columnName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    }
  } catch (err) {
    console.warn(`Migration check for ${tableName}.${columnName}:`, err.message);
  }
}

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
      selected_categories TEXT DEFAULT '["digital art trending","concept art","cyberpunk landscape","retro anime aesthetic"]',
      predefined_caption TEXT DEFAULT 'Discovered via Pinterest. Converted to 1-bit retro art by Mr. Bit. #MrBit #RetroArt',
      sources_config TEXT DEFAULT '{"pinterest":true}'
    );

    CREATE TABLE IF NOT EXISTS pipeline_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      stage TEXT NOT NULL,
      level TEXT DEFAULT 'INFO' CHECK(level IN ('DEBUG','INFO','WARN','ERROR')),
      message TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_created ON image_candidates(created_at);
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON image_candidates(status);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON pipeline_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_stage ON pipeline_logs(stage);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON pipeline_logs(level);
  `);

  // Safe migrations for image_candidates
  safeAddColumn('image_candidates', 'saves_count', 'INTEGER DEFAULT 0');
  safeAddColumn('image_candidates', 'width', 'INTEGER DEFAULT 0');
  safeAddColumn('image_candidates', 'height', 'INTEGER DEFAULT 0');
  safeAddColumn('image_candidates', 'opencv_sharpness', 'REAL DEFAULT 0');
  safeAddColumn('image_candidates', 'opencv_contrast', 'REAL DEFAULT 0');
  safeAddColumn('image_candidates', 'onnx_aesthetic_score', 'REAL DEFAULT 0');
  safeAddColumn('image_candidates', 'filter_stage', "TEXT DEFAULT 'candidate'");
  safeAddColumn('image_candidates', 'filter_reason', "TEXT DEFAULT ''");

  // Safe migrations for settings
  safeAddColumn('settings', 'posts_per_day', 'INTEGER DEFAULT 1');
  safeAddColumn('settings', 'pinterest_queries', `TEXT DEFAULT '["digital art trending", "concept art", "cyberpunk landscape", "retro anime aesthetic", "cinematic illustration"]'`);
  safeAddColumn('settings', 'min_saves', 'INTEGER DEFAULT 50');
  safeAddColumn('settings', 'min_dimension', 'INTEGER DEFAULT 600');
  safeAddColumn('settings', 'max_dimension', 'INTEGER DEFAULT 2048');
  safeAddColumn('settings', 'min_sharpness', 'REAL DEFAULT 20.0');
  safeAddColumn('settings', 'min_aesthetic_score', 'REAL DEFAULT 5.0');

  // Seed settings if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM settings');
  const count = countStmt.get().count;
  
  if (count === 0) {
    db.exec('INSERT INTO settings (id) VALUES (1)');
  }
}   

export default db;
