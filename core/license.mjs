export const TERMS_VERSION = '2026-11-12-draft-1';
export const TERMS_URL = 'https://carrosseisquevendem.com.br/termos';
export const PRIVACY_URL = 'https://carrosseisquevendem.com.br/privacidade';
export const LICENSE_API_URL = 'https://carrossell-license.carrossell-matheus.workers.dev';
export const LICENSE_TOKEN_DAYS = 30;
export const LICENSE_GRACE_DAYS = 14;
export const LICENSE_MAX_DEVICES = 3;
export const LICENSE_MIGRATION_START = '2026-11-12T00:00:00-03:00';
export const LICENSE_MIGRATION_UNTIL = '2027-01-11T00:00:00-03:00';

const DAY_MS = 24 * 60 * 60 * 1000;

function millis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return Date.parse(value);
}

export function normalizeLicenseEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validLicenseAcceptance(accepted, termsVersion, acceptedAt) {
  return accepted === true && termsVersion === TERMS_VERSION
    && isValidIsoTimestamp(acceptedAt);
}

function isValidIsoTimestamp(value) {
  const match = typeof value === 'string'
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value)
    : null;
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, 0);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return false;
  if (zone !== 'Z') {
    const offsetHour = Number(offsetHourText), offsetMinute = Number(offsetMinuteText);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return false;
  }
  return Number.isFinite(Date.parse(value));
}

export async function sha256DeviceId(installId) {
  if (typeof installId !== 'string' || !installId.trim()) throw new TypeError('ID de instalação inválido.');
  const bytes = new TextEncoder().encode(installId);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function parseLicenseTokenPayload(token) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  try {
    const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature || extra !== undefined) return null;
    const decode = (value) => {
      const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))));
    };
    const header = decode(encodedHeader);
    const claims = decode(encodedPayload);
    if (header?.alg !== 'HS256' || header?.typ !== 'JWT' || !Number.isInteger(claims?.exp)
      || !/^[a-f0-9]{64}$/.test(claims?.email_hash || '') || !/^[a-f0-9]{64}$/.test(claims?.device_hash || '')
      || typeof claims?.terms_version !== 'string' || !validLicenseAcceptance(true, claims.terms_version, claims.accepted_at)) return null;
    return { exp: claims.exp, email_hash: claims.email_hash, device_hash: claims.device_hash,
      terms_version: claims.terms_version, accepted_at: claims.accepted_at };
  } catch { return null; }
}

export function isInMigration(now = Date.now()) {
  const current = millis(now);
  return Number.isFinite(current) && current >= Date.parse(LICENSE_MIGRATION_START)
    && current < Date.parse(LICENSE_MIGRATION_UNTIL);
}

export function needsRevalidation(now, expiresAt) {
  const expires = millis(expiresAt);
  return !Number.isFinite(expires) || millis(now) >= expires;
}

export function inGrace(now, expiresAt, graceUntil) {
  const current = millis(now);
  const expires = millis(expiresAt);
  const grace = millis(graceUntil);
  return Number.isFinite(current) && Number.isFinite(expires) && Number.isFinite(grace)
    && current > expires && current <= grace;
}

export function maskLicenseEmail(email) {
  const normalized = normalizeLicenseEmail(email);
  if (!normalized) return null;
  const [local, domain] = normalized.split('@');
  const visible = local.length < 3 ? `${local[0]}*` : `${local[0]}${'*'.repeat(Math.min(5, local.length - 2))}${local.at(-1)}`;
  return `${visible}@${domain}`;
}

export function parseLicenseStatus(value, now = Date.now()) {
  const source = value && typeof value === 'object' ? value : {};
  const expiresAt = typeof source.expiresAt === 'string' ? source.expiresAt
    : typeof source.expires_at === 'string' ? source.expires_at : null;
  const graceUntil = typeof source.graceUntil === 'string' ? source.graceUntil
    : typeof source.grace_until === 'string' ? source.grace_until : null;
  return {
    activated: source.activated === true,
    expiresAt: Number.isFinite(Date.parse(expiresAt || '')) ? expiresAt : null,
    graceUntil: Number.isFinite(Date.parse(graceUntil || '')) ? graceUntil : null,
    termsVersion: typeof source.termsVersion === 'string' ? source.termsVersion
      : typeof source.terms_version === 'string' ? source.terms_version : null,
    acceptedAt: typeof source.acceptedAt === 'string' && Number.isFinite(Date.parse(source.acceptedAt)) ? source.acceptedAt : null,
    emailMasked: typeof source.emailMasked === 'string' ? source.emailMasked : null,
    code: typeof source.code === 'string' ? source.code : null,
    migration: isInMigration(now),
  };
}

export function warningMessageKind(value, now = Date.now()) {
  const status = parseLicenseStatus(value, now);
  if (status.code === 'device_limit') return 'device_limit';
  if (status.code === 'rate_limited') return 'rate_limited';
  if (status.activated && inGrace(now, status.expiresAt, status.graceUntil)) return 'grace';
  if (status.code === 'offline') return 'offline';
  if (!status.activated) return status.migration ? 'migration' : 'not_activated';
  if (needsRevalidation(now, status.expiresAt)) return 'revalidation_required';
  if (status.code === 'revalidation_failed') return 'revalidation_failed';
  return null;
}

export function graceUntilFor(expiresAt) {
  const expiry = millis(expiresAt);
  return Number.isFinite(expiry) ? new Date(expiry + LICENSE_GRACE_DAYS * DAY_MS).toISOString() : null;
}
