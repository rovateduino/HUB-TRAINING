-- ============================================
-- MIGRACAO 0004 - SISTEMA DE CERTIFICACAO
-- Certificados de conclusao + configuracoes (carga horaria, assinaturas)
-- Idempotente: CREATE TABLE IF NOT EXISTS
-- Camada nova; nao altera tabelas existentes.
-- ============================================

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_number TEXT NOT NULL UNIQUE,
  seq INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  training_name TEXT NOT NULL,
  modality TEXT NOT NULL,
  workload_hours TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage REAL NOT NULL,
  completion_date TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  signer1_name TEXT,
  signer1_role TEXT,
  signer2_name TEXT,
  signer2_role TEXT,
  status TEXT NOT NULL DEFAULT 'VALID',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON certificates(issue_date);

-- Um certificado valido por usuario (reemissao usa o mesmo registro)
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_user_unique ON certificates(user_id);

-- Configuracoes do certificado (carga horaria, assinaturas) — editavel pelo ADMIN.
-- Sem padrao inventado: workload_hours e signatarios nascem NULL.
CREATE TABLE IF NOT EXISTS certificate_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  workload_hours TEXT,
  modality TEXT NOT NULL DEFAULT 'Treinamento profissional interno',
  signer1_name TEXT,
  signer1_role TEXT,
  signer2_name TEXT,
  signer2_role TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO certificate_settings (id) VALUES (1);
