import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../training.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = 'WAL');

export const db = sqlite;