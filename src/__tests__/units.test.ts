import { describe, it, expect } from 'vitest';
import { 
  parseWeightQuantity, 
  formatQuantityDisplay, 
  formatWeightValueOnly, 
  isWeightUnit, 
  normalizeProductUnit 
} from '../utils/units';

describe('Unit and Weight Conversion Utilities', () => {
  describe('normalizeProductUnit and isWeightUnit', () => {
    it('correctly identifies weight-based units', () => {
      expect(isWeightUnit('Kg')).toBe(true);
      expect(isWeightUnit('kg')).toBe(true);
      expect(isWeightUnit('quilograma')).toBe(true);
      expect(isWeightUnit('kilo')).toBe(true);
      expect(isWeightUnit('Grama')).toBe(true);
      expect(isWeightUnit('g')).toBe(true);
      expect(isWeightUnit('gramas')).toBe(true);
      expect(isWeightUnit('Unidade')).toBe(false);
      expect(isWeightUnit('Litros')).toBe(false);
      expect(isWeightUnit(undefined)).toBe(false);
    });

    it('normalizes unit strings correctly', () => {
      expect(normalizeProductUnit('kg')).toBe('Kg');
      expect(normalizeProductUnit('g')).toBe('Grama');
      expect(normalizeProductUnit('un')).toBe('Unidade');
      expect(normalizeProductUnit('l')).toBe('Litros');
    });
  });

  describe('parseWeightQuantity - Intelligent Weight Conversion', () => {
    it('converts 4+ digit numbers to kg (grams to kg)', () => {
      expect(parseWeightQuantity('1000', 'Kg')).toBe(1);
      expect(parseWeightQuantity('1500', 'Kg')).toBe(1.5);
      expect(parseWeightQuantity('1700', 'Kg')).toBe(1.7);
      expect(parseWeightQuantity('2500', 'Kg')).toBe(2.5);
      expect(parseWeightQuantity('10000', 'Kg')).toBe(10);
      expect(parseWeightQuantity('15000', 'Kg')).toBe(15);
      expect(parseWeightQuantity('999000', 'Kg')).toBe(999);
    });

    it('limits conversion to maximum 999 kg', () => {
      expect(parseWeightQuantity('1000000', 'Kg')).toBe(999);
      expect(parseWeightQuantity('1500000', 'Kg')).toBe(999);
      expect(parseWeightQuantity('2000', 'Kg')).toBe(2);
      expect(parseWeightQuantity(9999999, 'Kg')).toBe(999);
    });

    it('converts 3-digit numbers to sub-kilo grams', () => {
      expect(parseWeightQuantity('500', 'Kg')).toBe(0.5);
      expect(parseWeightQuantity('750', 'Kg')).toBe(0.75);
      expect(parseWeightQuantity('250', 'Kg')).toBe(0.25);
      expect(parseWeightQuantity('100', 'Kg')).toBe(0.1);
      expect(parseWeightQuantity('999', 'Kg')).toBe(0.999);
    });

    it('keeps small 1-2 digit numbers as direct kilos', () => {
      expect(parseWeightQuantity('1', 'Kg')).toBe(1);
      expect(parseWeightQuantity('2', 'Kg')).toBe(2);
      expect(parseWeightQuantity('5', 'Kg')).toBe(5);
      expect(parseWeightQuantity('10', 'Kg')).toBe(10);
      expect(parseWeightQuantity('25', 'Kg')).toBe(25);
      expect(parseWeightQuantity('99', 'Kg')).toBe(99);
    });

    it('handles decimal inputs with dot or comma', () => {
      expect(parseWeightQuantity('1.5', 'Kg')).toBe(1.5);
      expect(parseWeightQuantity('1,5', 'Kg')).toBe(1.5);
      expect(parseWeightQuantity('1.7', 'Kg')).toBe(1.7);
      expect(parseWeightQuantity('1,7', 'Kg')).toBe(1.7);
      expect(parseWeightQuantity('0.5', 'Kg')).toBe(0.5);
      expect(parseWeightQuantity('0,5', 'Kg')).toBe(0.5);
      expect(parseWeightQuantity('1.500', 'Kg')).toBe(1.5);
      expect(parseWeightQuantity('1,500', 'Kg')).toBe(1.5);
    });

    it('handles non-weight units without weight conversion', () => {
      expect(parseWeightQuantity('1', 'Unidade')).toBe(1);
      expect(parseWeightQuantity('10', 'Unidade')).toBe(10);
      expect(parseWeightQuantity('100', 'Unidade')).toBe(100);
      expect(parseWeightQuantity('1000', 'Unidade')).toBe(1000);
    });
  });

  describe('formatQuantityDisplay and formatWeightValueOnly', () => {
    it('formats display strings cleanly without unnecessary trailing zeros', () => {
      expect(formatQuantityDisplay(1, 'Kg')).toBe('1 kg');
      expect(formatQuantityDisplay(1.5, 'Kg')).toBe('1,5 kg');
      expect(formatQuantityDisplay(1.7, 'Kg')).toBe('1,7 kg');
      expect(formatQuantityDisplay(0.5, 'Kg')).toBe('500g');
      expect(formatQuantityDisplay(0.75, 'Kg')).toBe('750g');
      expect(formatQuantityDisplay(2, 'Unidade')).toBe('2');
    });

    it('formats input values for direct editing correctly', () => {
      expect(formatWeightValueOnly(1, 'Kg')).toBe('1');
      expect(formatWeightValueOnly(1.5, 'Kg')).toBe('1,5');
      expect(formatWeightValueOnly(1.7, 'Kg')).toBe('1,7');
      expect(formatWeightValueOnly(0.5, 'Kg')).toBe('500');
      expect(formatWeightValueOnly(0.75, 'Kg')).toBe('750');
      expect(formatWeightValueOnly(3, 'Unidade')).toBe('3');
    });
  });
});
