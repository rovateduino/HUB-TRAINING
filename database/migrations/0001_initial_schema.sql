-- ============================================
-- MIGRAÇÃO INICIAL - CRIAÇÃO DAS TABELAS PRINCIPAIS
-- ============================================

-- GOVERNANÇA
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT,
  role_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL
);

-- INFRAESTRUTURA
CREATE TABLE IF NOT EXISTS equipment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technical_equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type_id INTEGER,
  function TEXT,
  location TEXT,
  system TEXT,
  status TEXT DEFAULT 'ACTIVE',
  version TEXT,
  source TEXT,
  technical_notes TEXT,
  specifications TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS equipment_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  description TEXT,
  relation_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

-- TREINAMENTO
CREATE TABLE IF NOT EXISTS training_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  order_num INTEGER NOT NULL,
  category TEXT,
  estimated_duration INTEGER,
  prerequisites TEXT,
  status TEXT DEFAULT 'PENDING_TECHNICAL_VALIDATION',
  version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS training_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  objective TEXT,
  content TEXT NOT NULL,
  technical_notes TEXT,
  warnings TEXT,
  classification TEXT,
  images TEXT,
  documents TEXT,

  estimated_duration INTEGER,
  status TEXT DEFAULT 'PENDING_TECHNICAL_VALIDATION',
  version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  status TEXT DEFAULT 'NOT_STARTED',
  progress INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  checkpoints_completed INTEGER DEFAULT 0,
  total_checkpoints INTEGER DEFAULT 0,
  last_accessed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS lesson_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  type TEXT DEFAULT 'MULTIPLE_CHOICE',
  order_num INTEGER DEFAULT 0,
  points INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkpoint_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  order_num INTEGER DEFAULT 0,
  is_correct INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checkpoint_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checkpoint_id INTEGER NOT NULL,
  selected_option_id INTEGER,
  is_correct INTEGER,
  attempt_number INTEGER DEFAULT 1,
  answered_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- SIMULADO
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  difficulty TEXT DEFAULT 'MEDIUM',
  explanation TEXT,
  is_active INTEGER DEFAULT 1,
  module_id INTEGER,
  order_num INTEGER DEFAULT 0,
  version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  order_num INTEGER DEFAULT 0,
  is_correct INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  time_spent INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_option_id INTEGER,
  is_correct INTEGER,
  time_spent INTEGER,
  answered_at TEXT
);

-- AUDITORIA
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  content TEXT,
  change_description TEXT,
  author_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- TABELA LEGADA (compatibilidade)
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate TEXT NOT NULL,
  identifier TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  answers TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);