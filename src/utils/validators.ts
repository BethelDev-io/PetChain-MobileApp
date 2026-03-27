const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export const ERROR_MESSAGES = {
  email: 'Please enter a valid email address.',
  phone: 'Please enter a valid phone number (7–15 digits, optional leading +).',
  password: 'Password must be at least 8 characters, include 1 uppercase letter and 1 number.',
  date: 'Please enter a valid date.',
  nonEmptyString: 'Value must be a non-empty string.',
};

function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function isValidEmail(email: unknown): boolean {
  const v = normalize(email);
  return v.length > 0 && v.length <= 254 && EMAIL_REGEX.test(v);
}

export function isValidPhone(phone: unknown): boolean {
  const normalized = normalize(phone).replace(/[\s\-().]/g, '');
  return PHONE_REGEX.test(normalized);
}

export function isValidPassword(password: unknown): boolean {
  const v = normalize(password);
  return v.length >= 8 && /[A-Z]/.test(v) && /\d/.test(v);
}

export function isValidDate(date: unknown): boolean {
  const v = normalize(date);
  if (!v) return false;
  const parsed = new Date(v);
  if (isNaN(parsed.getTime())) return false;

  // Reject impossible calendar dates like 2024-02-30
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match.map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    return utc.getUTCFullYear() === y && utc.getUTCMonth() + 1 === m && utc.getUTCDate() === d;
  }

  return true;
}

export function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
