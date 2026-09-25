/**
 * Text formatting, sanitization and CPF helpers for Feira Fácil
 * Rules:
 * - No unwanted special characters permitted
 * - First letter of words capitalized (Title Case)
 * - Length limits enforced
 */

// Capitalize the first letter and remove unwanted special characters without stripping spaces while typing
export function sanitizeAndCapitalize(
  text: string, 
  maxLength: number = 40,
  allowNumbers: boolean = true
): string {
  if (!text) return '';

  // 1. Strip leading spaces, but preserve spaces between words and trailing spaces while user types
  let noLeading = text.replace(/^\s+/, '');
  if (!noLeading) return '';

  // 2. Remove special characters (keep letters, accented letters, spaces, and optionally numbers)
  // Also keep common safe punctuation like hyphen, dot, comma
  let pattern = allowNumbers ? /[^a-zA-Z0-9À-ÿ\s\-\.,]/g : /[^a-zA-ZÀ-ÿ\s\-\.,]/g;
  let cleaned = noLeading.replace(pattern, '');

  // 3. Limit maximum characters
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  // 4. Capitalize first letter of each word without stripping inner/trailing spaces
  return cleaned.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}

// Clean text for generic inputs without aggressive word-capitalization (e.g. bio, description)
export function sanitizeText(
  text: string, 
  maxLength: number = 200
): string {
  if (!text) return '';
  // Strip dangerous/unwanted special chars
  let cleaned = text.replace(/[^a-zA-Z0-9À-ÿ\s\-\.,!?:;@()/%]/g, '');
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  // Capitalize very first letter of sentences
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

// Format CPF: 000.000.000-00
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

// Clean CPF to digits only
export function cleanCPF(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Authentic Brazilian CPF validation algorithm (Modulo 11 check digits)
 * Rejects invalid length, all repeated digits, and incorrect check digits.
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  // Reject sequences like 000.000.000-00, 111.111.111-11, etc.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Calculate 1st verification digit
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let check1 = 11 - (sum1 % 11);
  if (check1 >= 10) check1 = 0;
  if (check1 !== parseInt(digits.charAt(9), 10)) return false;

  // Calculate 2nd verification digit
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  let check2 = 11 - (sum2 % 11);
  if (check2 >= 10) check2 = 0;
  if (check2 !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}

// Alias for isValidCPF
export const validateCPF = isValidCPF;

// Format Currency to BRL string representation
export function formatCurrencyBRL(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  if (isNaN(num) || num === null || num === undefined) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

/**
 * Money Mask Input helper for Brazilian Real (R$).
 * Enforces a maximum limit of 10 numeric digits.
 * Automatically formats cents dynamically: e.g. "1" -> "0,01", "1234" -> "12,34", "123456" -> "1.234,56"
 */
export function formatMoneyInput(value: string | number): string {
  if (value === undefined || value === null || value === '') return '0,00';
  
  // Convert number to integer cents representation if passed as number
  let digits: string;
  if (typeof value === 'number') {
    digits = Math.round(value * 100).toString();
  } else {
    // Keep only numeric characters
    digits = value.toString().replace(/\D/g, '');
  }

  // Max 10 digits limit
  digits = digits.slice(0, 10);

  if (!digits || digits === '0' || digits === '00') {
    return '0,00';
  }

  // Pad left if length < 3
  while (digits.length < 3) {
    digits = '0' + digits;
  }

  // Remove leading zeros for amounts >= 1 real
  digits = digits.replace(/^0+(?=\d{3})/, '');

  const cents = digits.slice(-2);
  const intPart = digits.slice(0, -2);

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInt},${cents}`;
}

/**
 * Parses formatted BRL money string ("1.234,56" or "R$ 1.234,56") to standard JavaScript number (1234.56).
 */
export function parseMoneyToNumber(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  
  const clean = value.toString()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Format Phone: (00) 00000-0000
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Sanitizes quantity / weight input:
 * - Accepts only numbers (0-9)
 * - If allowDecimal is true, allows at most one decimal separator (, or .)
 * - Strips all letters, accents, spaces, and special characters immediately
 * - Caps maximum input length (default 6 characters)
 */
export function sanitizeQuantityInput(
  value: string, 
  allowDecimal: boolean = true,
  maxLength: number = 6
): string {
  if (!value) return '';

  if (!allowDecimal) {
    // Strictly digits 0-9
    return value.replace(/\D/g, '').slice(0, maxLength);
  }

  // Remove any character that is not a digit, comma, or dot
  const cleanChars = value.replace(/[^0-9,\.]/g, '');

  // Keep at most one decimal separator (the first one)
  let separatorFound = false;
  let result = '';

  for (let i = 0; i < cleanChars.length; i++) {
    const char = cleanChars[i];
    if (char === ',' || char === '.') {
      if (!separatorFound) {
        result += char;
        separatorFound = true;
      }
    } else {
      result += char;
    }
  }

  return result.slice(0, maxLength);
}
