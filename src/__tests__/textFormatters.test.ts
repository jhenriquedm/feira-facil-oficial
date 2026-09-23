import { describe, it, expect } from 'vitest';
import { 
  sanitizeAndCapitalize, 
  formatMoneyInput, 
  parseMoneyToNumber, 
  formatCurrencyBRL, 
  formatCPF, 
  validateCPF 
} from '../utils/textFormatters';

describe('Text Formatters & Sanitizers', () => {
  describe('sanitizeAndCapitalize', () => {
    it('capitalizes first character and cleans forbidden special characters', () => {
      expect(sanitizeAndCapitalize('arroz integral')).toBe('Arroz Integral');
      expect(sanitizeAndCapitalize('feijão preto <script>')).toBe('Feijão Preto Script');
      expect(sanitizeAndCapitalize('  banana prata  ')).toBe('Banana Prata  ');
    });

    it('limits length according to maxLength parameter', () => {
      expect(sanitizeAndCapitalize('arroz super longo com muitos caracteres adicionais', 10)).toBe('Arroz Supe');
    });

    it('handles empty inputs gracefully', () => {
      expect(sanitizeAndCapitalize('')).toBe('');
      expect(sanitizeAndCapitalize('   ')).toBe('');
    });
  });

  describe('formatMoneyInput & parseMoneyToNumber', () => {
    it('formats numbers into Brazilian Real strings', () => {
      expect(formatMoneyInput('1000')).toBe('10,00');
      expect(formatMoneyInput('125')).toBe('1,25');
      expect(formatMoneyInput(25.5)).toBe('25,50');
      expect(formatMoneyInput(0)).toBe('0,00');
    });

    it('parses formatted BRL strings back to numeric floats', () => {
      expect(parseMoneyToNumber('10,00')).toBe(10);
      expect(parseMoneyToNumber('1.250,50')).toBe(1250.5);
      expect(parseMoneyToNumber('0,00')).toBe(0);
      expect(parseMoneyToNumber('')).toBe(0);
    });

    it('formats numbers for display with formatCurrencyBRL', () => {
      const formatted = formatCurrencyBRL(1250.5);
      expect(formatted).toContain('1.250,50');
      expect(formatted).toContain('R$');
    });
  });

  describe('CPF Formatting and Validation', () => {
    it('formats CPF with standard mask 000.000.000-00', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
      expect(formatCPF('123456')).toBe('123.456');
    });

    it('validates authentic CPFs and rejects invalid CPFs', () => {
      // Known invalid CPFs
      expect(validateCPF('111.111.111-11')).toBe(false);
      expect(validateCPF('000.000.000-00')).toBe(false);
      expect(validateCPF('123.456.789-00')).toBe(false);
      expect(validateCPF('invalid')).toBe(false);

      // Known valid CPF checksums
      expect(validateCPF('52998224725')).toBe(true);
      expect(validateCPF('529.982.247-25')).toBe(true);
    });
  });
});
