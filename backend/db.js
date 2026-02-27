import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'chainverify.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  -- Single unified users table: role = 'user' | 'admin' | 'superadmin'
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    email          TEXT    UNIQUE NOT NULL,
    password_hash  TEXT    NOT NULL,
    role           TEXT    DEFAULT 'user',
    company_name   TEXT    DEFAULT '',
    company_type   TEXT    DEFAULT 'University',
    wallet_address TEXT    DEFAULT '',
    is_active      INTEGER DEFAULT 1,
    created_at     INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    hash             TEXT UNIQUE NOT NULL,
    student_name     TEXT,
    student_email    TEXT,
    certificate_type TEXT,
    course_name      TEXT,
    issued_by        TEXT,
    issuer_wallet    TEXT,
    ipfs_url         TEXT,
    tx_hash          TEXT,
    issued_at        INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS verify_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    user_name   TEXT,
    user_email  TEXT,
    cert_hash   TEXT,
    issued_by   TEXT,
    is_valid    INTEGER,
    verified_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

export default db;
