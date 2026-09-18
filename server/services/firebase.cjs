const admin = require('firebase-admin');

let initialized = false;
let initError = null;
let _db = null;
let _auth = null;
let _resolvedProjectId = null;
let _warnedPrivateKeyJson = false;

function isFirebaseEnabled() {
  return process.env.FIREBASE_SYNC_ENABLED !== 'false';
}

function _extractServiceAccountFromJsonEnv(rawPrivateKey) {
  if (!rawPrivateKey) return null;
  const trimmed = String(rawPrivateKey).trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return null;
    const projectId = parsed.project_id || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = parsed.private_key;
    if (!privateKey) return null;
    if (!_warnedPrivateKeyJson) {
      _warnedPrivateKeyJson = true;
      console.warn(
        '[FIREBASE] Detectado FIREBASE_PRIVATE_KEY como JSON completo do service-account. ' +
        'Extraindo campos automaticamente. Recomendacao VERCEL: extraia apenas a chave privada ' +
        'para as variaveis separadas FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (apenas a key string).'
      );
    }
    return { projectId, clientEmail, privateKey };
  } catch (err) {
    console.error('[FIREBASE] Falha ao tentar JSON.parse no FIREBASE_PRIVATE_KEY. Erro sintaxe JSON.');
    return null;
  }
}

function initFirebase() {
  if (initialized) return { ok: true, error: null };
  if (!isFirebaseEnabled()) {
    initialized = true;
    initError = 'FIREBASE_SYNC_ENABLED=false';
    return { ok: false, error: initError };
  }

  try {
    const certPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let projectId = process.env.FIREBASE_PROJECT_ID;
    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    let credential = null;
    if (certPath) {
      const fs = require('fs');
      const path = require('path');
      const resolved = path.resolve(certPath);
      if (fs.existsSync(resolved)) {
        const loaded = require(resolved);
        credential = admin.credential.cert(loaded);
        projectId = projectId || loaded.project_id;
        clientEmail = clientEmail || loaded.client_email;
      }
    }

    if (!credential) {
      const fromJson = _extractServiceAccountFromJsonEnv(rawPrivateKey);
      if (fromJson) {
        projectId = projectId || fromJson.projectId;
        clientEmail = clientEmail || fromJson.clientEmail;
        rawPrivateKey = fromJson.privateKey;
      }

      if (projectId && clientEmail && rawPrivateKey) {
        const privateKey = String(rawPrivateKey).replace(/\\n/g, '\n');
        if (
          !privateKey.includes('SUBSTITUA_PELA_SUA_CHAVE') &&
          privateKey.includes('PRIVATE KEY')
        ) {
          credential = admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          });
        }
      }
    }

    if (!credential) {
      initialized = true;
      initError = 'Credenciais Firebase não configuradas (verifique .env)';
      console.warn('[FIREBASE] Admin SDK não inicializado:', initError);
      return { ok: false, error: initError };
    }

    admin.initializeApp({
      credential,
      databaseURL: `https://${projectId || ''}.firebaseio.com`,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    _resolvedProjectId = projectId;
    initialized = true;
    initError = null;
    try {
      _db = admin.firestore();
      _db.settings({ ignoreUndefinedProperties: true });
    } catch { _db = admin.firestore(); }
    try { _auth = admin.auth(); } catch { _auth = null; }

    console.log(`[FIREBASE] Admin SDK inicializado. FONTE PRIMARIA Firestore. Projeto: ${projectId || '(desconhecido)'}`);
    return { ok: true, error: null };
  } catch (e) {
    initialized = true;
    initError = e && e.message ? e.message : String(e);
    console.error('[FIREBASE] Falha ao inicializar Admin SDK:', initError);
    return { ok: false, error: initError };
  }
}

function getFirestore() {
  if (!initialized) initFirebase();
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK não inicializado. Verifique credenciais e .env.');
  }
  if (_db) return _db;
  try {
    _db = admin.firestore();
    _db.settings({ ignoreUndefinedProperties: true });
    return _db;
  } catch (e) {
    throw new Error('getFirestore() falhou: ' + (e && e.message || String(e)));
  }
}

function getAuth() {
  if (!initialized) initFirebase();
  if (!admin.apps.length) return null;
  if (_auth) return _auth;
  try { _auth = admin.auth(); return _auth; } catch { return null; }
}

function getTimestamp() {
  return admin.firestore.Timestamp.now();
}

function getTimestampNow() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function increment(delta = 1) {
  return admin.firestore.FieldValue.increment(Number(delta) || 1);
}

function arrayUnion(...items) {
  return admin.firestore.FieldValue.arrayUnion(...items);
}

function arrayRemove(...items) {
  return admin.firestore.FieldValue.arrayRemove(...items);
}

function getResolvedProjectId() {
  return _resolvedProjectId || process.env.FIREBASE_PROJECT_ID || null;
}

module.exports = {
  admin,
  initFirebase,
  getFirestore,
  getAuth,
  getTimestamp,
  getTimestampNow,
  increment,
  arrayUnion,
  arrayRemove,
  getResolvedProjectId,
  isFirebaseEnabled,
  isInitialized: () => initialized && admin.apps.length > 0 && initError === null,
  getInitError: () => initError,
};
