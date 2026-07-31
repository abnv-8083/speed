// ── Web Crypto AES-GCM vault encryption ───────────────────────
// Vault blob stored in MongoDB via Express API.
// Master password is NEVER sent to the server.

import { api } from '../../api';

const DEVICE_KEY = 'pm_device_id';
const ITER       = 200_000;

// ── Helpers ─────────────────────────────────────────────────────
function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b642buf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── API row helpers ──────────────────────────────────────────────
async function fetchRow() {
  try {
    return await api.getVault(getDeviceId());
  } catch {
    return null;
  }
}

async function upsertRow(fields) {
  await api.upsertVault({ device_id: getDeviceId(), ...fields });
}

// ── Public API ───────────────────────────────────────────────────
export async function isVaultSetup() {
  const row = await fetchRow();
  return !!row?.encrypted_data;
}

export async function setupVault(password) {
  const salt    = crypto.getRandomValues(new Uint8Array(16));
  const b64Salt = buf2b64(salt);
  const key     = await deriveKey(password, salt);
  const iv      = crypto.getRandomValues(new Uint8Array(12));
  const enc     = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify([]))
  );
  await upsertRow({ salt: b64Salt, iv: buf2b64(iv), encrypted_data: buf2b64(enc) });
}

export async function verifyPassword(password) {
  try { await loadVault(password); return true; }
  catch { return false; }
}

export async function loadVault(password) {
  const row = await fetchRow();
  if (!row?.encrypted_data) return [];
  const salt = b642buf(row.salt);
  const key  = await deriveKey(password, salt);
  try {
    const dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b642buf(row.iv) },
      key,
      b642buf(row.encrypted_data)
    );
    return JSON.parse(new TextDecoder().decode(dec));
  } catch {
    throw new Error('Decryption failed — wrong password.');
  }
}

export async function saveVault(password, entries) {
  const row  = await fetchRow();
  const salt = row?.salt
    ? b642buf(row.salt)
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(entries))
  );
  await upsertRow({ salt: buf2b64(salt), iv: buf2b64(iv), encrypted_data: buf2b64(enc) });
}

export async function clearVault() {
  await api.deleteVault(getDeviceId());
  localStorage.removeItem(DEVICE_KEY);
}

// ── Password generator ───────────────────────────────────────────
const UPPER  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER  = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMS   = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function generatePassword({ length = 16, upper = true, lower = true, digits = true, symbols = true } = {}) {
  let pool = '';
  if (upper)   pool += UPPER;
  if (lower)   pool += LOWER;
  if (digits)  pool += DIGITS;
  if (symbols) pool += SYMS;
  if (!pool)   pool  = LOWER;
  const arr = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(arr, n => pool[n % pool.length]).join('');
}

// ── Strength checker ─────────────────────────────────────────────
export function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { score: 1, label: 'Weak',   color: '#ef4444' };
  if (score <= 4) return { score: 2, label: 'Fair',   color: '#f59e0b' };
  if (score <= 5) return { score: 3, label: 'Good',   color: '#10b981' };
  return              { score: 4, label: 'Strong', color: '#4F46E5' };
}
