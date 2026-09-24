import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, PREDEFINED_PRODUCTS_RAW } from '../defaultData';
import { PRODUCT_UNITS } from '../utils/units';

describe('Predefined Catalog & Default Initial Products', () => {
  it('contains exactly 180 predefined products across the 9 standard categories', () => {
    expect(PREDEFINED_PRODUCTS_RAW).toHaveLength(180);
    const defaultCats = DEFAULT_CATEGORIES('test_user');
    const defaultProds = DEFAULT_PRODUCTS('test_user');

    expect(defaultCats).toHaveLength(9);
    expect(defaultProds).toHaveLength(180);
  });

  it('contains exactly 20 products for each of the 9 categories', () => {
    const defaultCats = DEFAULT_CATEGORIES('user_abc');
    const defaultProds = DEFAULT_PRODUCTS('user_abc');

    for (const cat of defaultCats) {
      const itemsInCat = defaultProds.filter(p => p.categoryId === cat.id);
      expect(itemsInCat).toHaveLength(20);
    }
  });

  it('guarantees unique IDs for all default products', () => {
    const prods = DEFAULT_PRODUCTS('unique_test_user');
    const ids = prods.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(180);
  });

  it('assigns basic data: valid name, categoryId, canonical unit, empty brand, and price 0', () => {
    const validCanonicalUnits = new Set(PRODUCT_UNITS.map(u => u.value));
    const prods = DEFAULT_PRODUCTS('user_val');

    for (const p of prods) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.categoryId.trim().length).toBeGreaterThan(0);
      expect(validCanonicalUnits.has(p.unit)).toBe(true);
      expect(p.brand).toBe('');
      expect(p.lastPrice).toBe(0);
      expect(p.isActive).toBe(true);
    }
  });

  it('matches all specified products in Açougue', () => {
    const prods = DEFAULT_PRODUCTS('test_u');
    const acougueProds = prods.filter(p => p.categoryId === 'cat_acougue_test_u');
    const names = acougueProds.map(p => p.name);

    expect(names).toContain('Acém');
    expect(names).toContain('Alcatra');
    expect(names).toContain('Bife bovino');
    expect(names).toContain('Contrafilé');
    expect(names).toContain('Costela bovina');
    expect(names).toContain('Costela suína');
    expect(names).toContain('Frango inteiro');
    expect(names).toContain('Linguiça calabresa');
    expect(names).toContain('Linguiça toscana');
    expect(names).toContain('Patinho');
    expect(names).toContain('Pernil suíno');
    expect(names).toContain('Sobrecoxa de frango');
  });

  it('matches all specified products in Mercearia', () => {
    const prods = DEFAULT_PRODUCTS('test_u');
    const merceariaProds = prods.filter(p => p.categoryId === 'cat_mercearia_test_u');
    const names = merceariaProds.map(p => p.name);

    expect(names).toContain('Arroz');
    expect(names).toContain('Feijão carioca');
    expect(names).toContain('Feijão preto');
    expect(names).toContain('Macarrão');
    expect(names).toContain('Óleo de soja');
    expect(names).toContain('Sal');
    expect(names).toContain('Açúcar');
    expect(names).toContain('Café');
    expect(names).toContain('Atum');
    expect(names).toContain('Sardinha');
  });

  it('allows user to edit and delete items from their list and reset if clean state occurs', () => {
    const initialList = DEFAULT_PRODUCTS('user_reset');
    expect(initialList).toHaveLength(180);

    // Simulate user editing an item
    const editedList = initialList.map(p => p.name === 'Arroz' ? { ...p, brand: 'Tio João', lastPrice: 28.5 } : p);
    expect(editedList.find(p => p.name === 'Arroz')?.brand).toBe('Tio João');

    // Simulate user deleting an item
    const filteredList = editedList.filter(p => p.name !== 'Acém');
    expect(filteredList).toHaveLength(179);

    // Reinstall or clean slate returns to default original list
    const freshReinstallList = DEFAULT_PRODUCTS('user_reset');
    expect(freshReinstallList).toHaveLength(180);
    expect(freshReinstallList.find(p => p.name === 'Acém')).toBeDefined();
    expect(freshReinstallList.find(p => p.name === 'Arroz')?.brand).toBe('');
  });
});
