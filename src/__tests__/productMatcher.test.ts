import { describe, it, expect } from 'vitest';
import { findBestMatchingProduct, findBestMatchingCategory, toPortugueseSingular, extractProductTokens } from '../utils/productMatcher';
import { Product, Category } from '../types';

describe('Smart Product & Category Matcher Engine', () => {
  const mockCategories: Category[] = [
    { id: 'cat_acougue', name: 'Açougue', iconName: 'Beef', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'cat_laticinios', name: 'Laticínios & Ovos', iconName: 'Egg', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'cat_hortifruti', name: 'Hortifruti', iconName: 'Apple', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'cat_mercearia', name: 'Mercearia', iconName: 'Package', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'cat_limpeza', name: 'Limpeza', iconName: 'Sparkles', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'cat_bebidas', name: 'Bebidas', iconName: 'Wine', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' }
  ];

  const mockProducts: Product[] = [
    { id: 'prod_acem', name: 'Acém', categoryId: 'cat_acougue', unit: 'Kg', brand: '', lastPrice: 38.0, isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'prod_ovos', name: 'Ovos', categoryId: 'cat_laticinios', unit: 'Bandeja', brand: '', lastPrice: 16.0, isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'prod_alface', name: 'Alface', categoryId: 'cat_hortifruti', unit: 'Unidade', brand: '', lastPrice: 3.5, isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'prod_picanha', name: 'Picanha', categoryId: 'cat_acougue', unit: 'Kg', brand: 'Friboi', lastPrice: 69.9, barcode: '7891234567890', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' },
    { id: 'prod_arroz', name: 'Arroz', categoryId: 'cat_mercearia', unit: 'Pacote', brand: 'Tio João', lastPrice: 28.0, isActive: true, userId: 'user1', createdAt: '', updatedAt: '' }
  ];

  it('correctly maps lemma and singulars in Portuguese', () => {
    expect(toPortugueseSingular('ovos')).toBe('ovo');
    expect(toPortugueseSingular('Ovo')).toBe('ovo');
    expect(toPortugueseSingular('pães')).toBe('pao');
    expect(toPortugueseSingular('tomates')).toBe('tomate');
    expect(toPortugueseSingular('limões')).toBe('limao');
    expect(toPortugueseSingular('Acém')).toBe('acem');
  });

  it('extracts significant tokens ignoring generic receipt filler words', () => {
    const tokens = extractProductTokens('Acem Esp Kg');
    expect(tokens).toEqual(['acem']);

    const eggTokens = extractProductTokens('Ovo Naturaves Bco Gd C 30un');
    expect(eggTokens).toEqual(['ovo', 'naturaves']);
  });

  it('matches "Acem Esp Kg" to existing product "Acém" in category "Açougue"', () => {
    const match = findBestMatchingProduct('Acem Esp Kg', undefined, undefined, mockProducts, mockCategories);
    expect(match.matchedProduct).not.toBeNull();
    expect(match.matchedProduct?.id).toBe('prod_acem');
    expect(match.suggestedName).toBe('Acém');
    expect(match.suggestedCategoryId).toBe('cat_acougue');
    expect(match.suggestedCategoryName).toBe('Açougue');
  });

  it('matches "Ovo Naturaves Bco Gd C 30un" to existing product "Ovos" in category "Laticínios & Ovos"', () => {
    const match = findBestMatchingProduct('Ovo Naturaves Bco Gd C 30un', 'Naturaves', undefined, mockProducts, mockCategories);
    expect(match.matchedProduct).not.toBeNull();
    expect(match.matchedProduct?.id).toBe('prod_ovos');
    expect(match.suggestedName).toBe('Ovos');
    expect(match.suggestedCategoryId).toBe('cat_laticinios');
    expect(match.suggestedCategoryName).toBe('Laticínios & Ovos');
  });

  it('matches barcode directly when available', () => {
    const match = findBestMatchingProduct('Carne Especial', undefined, '7891234567890', mockProducts, mockCategories);
    expect(match.matchedProduct?.id).toBe('prod_picanha');
    expect(match.confidence).toBe('barcode');
    expect(match.suggestedName).toBe('Picanha');
  });

  it('infers compatible category when product is completely new', () => {
    const match = findBestMatchingProduct('Banana Prata', undefined, undefined, mockProducts, mockCategories);
    expect(match.matchedProduct).toBeNull();
    expect(match.suggestedCategoryId).toBe('cat_hortifruti');
    expect(match.suggestedCategoryName).toBe('Hortifruti');
  });

  it('leaves category empty when no compatible category exists', () => {
    const limitedCategories: Category[] = [
      { id: 'cat_acougue', name: 'Açougue', iconName: 'Beef', isActive: true, userId: 'user1', createdAt: '', updatedAt: '' }
    ];
    const cat = findBestMatchingCategory('', 'Livro de Receitas', limitedCategories);
    expect(cat).toBeNull();
  });
});
