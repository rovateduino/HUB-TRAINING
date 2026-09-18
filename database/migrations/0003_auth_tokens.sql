-- ============================================
-- MIGRACAO 0003 - TABELAS DE TOKENS DE AUTENTICACAO
-- Portaria controlada por ADM + recuperacao de senha
-- Idempotente: CREATE TABLE IF NOT EXISTS
-- ============================================

-- Tokens de Convite (pré-autorização do ADM para cadastro)
CREATE TABLE IF NOT EXISTS invite_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  email_restriction TEXT,
  created_by INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 1,
  remaining_uses INTEGER DEFAULT 1,
  revoked INTEGER DEFAULT 0,
  revoked_by INTEGER,
  revoked_at TEXT,
  used_by INTEGER,
  used_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id),
  FOREIGN KEY (revoked_by) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_created_by ON invite_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email_restriction);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);

-- Tokens de Reset de Senha (recuperacao de credenciais, 1 uso)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  used_by INTEGER,
  used_at TEXT,
  revoked INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_expires ON password_reset_tokens(expires_at);
