import { describe, it, expect } from 'vitest';
import { Category, Product, Purchase, PurchaseItem } from '../types';

describe('Business Rules & Integrity Checks', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Hortifruti', iconName: 'Apple', isActive: true, createdAt: '2026-09-22', updatedAt: '2026-09-22', userId: 'user-1' },
    { id: 'cat-2', name: 'Açougue', iconName: 'Beef', isActive: true, createdAt: '2026-09-22', updatedAt: '2026-09-22', userId: 'user-1' },
    { id: 'cat-3', name: 'Bebidas', iconName: 'Wine', isActive: true, createdAt: '2026-09-22', updatedAt: '2026-09-22', userId: 'user-1' }
  ];

  const mockProducts: Product[] = [
    { id: 'prod-1', name: 'Maçã Fuji', categoryId: 'cat-1', unit: 'Kg', brand: 'Turma da Mônica', lastPrice: 8.5, isActive: true, createdAt: '2026-09-22', updatedAt: '2026-09-22', userId: 'user-1' },
    { id: 'prod-2', name: 'Picanha', categoryId: 'cat-2', unit: 'Kg', brand: 'Friboi', lastPrice: 69.9, isActive: true, createdAt: '2026-09-22', updatedAt: '2026-09-22', userId: 'user-1' }
  ];

  const mockPurchases: Purchase[] = [
    {
      id: 'pur-1',
      name: 'Feira Semanal',
      market: 'Supermercado Central',
      date: '2026-09-22',
      status: 'inProgress',
      type: 'weekly',
      budget: 200,
      total: 78.4,
      createdAt: '2026-09-22',
      updatedAt: '2026-09-22',
      userId: 'user-1'
    }
  ];

  const mockPurchaseItems: Record<string, PurchaseItem[]> = {
    'pur-1': [
      {
        id: 'item-1',
        purchaseId: 'pur-1',
        productId: 'prod-1',
        productName: 'Maçã Fuji',
        productBrand: 'Turma da Mônica',
        categoryId: 'cat-1',
        categoryName: 'Hortifruti',
        quantity: 2,
        unit: 'Kg',
        unitPrice: 8.5,
        isChecked: false
      }
    ]
  };

  it('correctly sorts categories alphabetically by name', () => {
    const sorted = [...mockCategories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    expect(sorted[0].name).toBe('Açougue');
    expect(sorted[1].name).toBe('Bebidas');
    expect(sorted[2].name).toBe('Hortifruti');
  });

  it('prevents category deletion when category is associated with existing products', () => {
    const isCategoryInUse = (catId: string) => {
      return mockProducts.some(p => p.categoryId === catId);
    };

    expect(isCategoryInUse('cat-1')).toBe(true);
    expect(isCategoryInUse('cat-2')).toBe(true);
    expect(isCategoryInUse('cat-3')).toBe(false); // cat-3 has no products, safe to delete
  });

  it('prevents product deletion when product is referenced in purchase lists', () => {
    const isProductInPurchases = (prodId: string) => {
      return Object.values(mockPurchaseItems).some(items => 
        items.some(item => item.productId === prodId)
      );
    };

    expect(isProductInPurchases('prod-1')).toBe(true);
    expect(isProductInPurchases('prod-2')).toBe(false); // prod-2 not in any list, safe to delete
  });

  it('calculates total budget and expense percentages correctly', () => {
    const purchase = mockPurchases[0];
    const total = purchase.total; // 78.4
    const budget = purchase.budget ?? 200; // 200
    const percentSpent = (total / budget) * 100;

    expect(percentSpent).toBeCloseTo(39.2);
    expect(total <= budget).toBe(true);
  });

  describe('Product Brand Optionality & Duplicity Rules', () => {
    // Import logic dynamically or test imported utils directly
    it('normalizes brand correctly and eliminates null/undefined variants', async () => {
      const { normalizeBrand, formatBrandDisplay } = await import('../utils/brand');

      expect(normalizeBrand(undefined)).toBe('');
      expect(normalizeBrand(null as any)).toBe('');
      expect(normalizeBrand('null')).toBe('');
      expect(normalizeBrand('NULL')).toBe('');
      expect(normalizeBrand('undefined')).toBe('');
      expect(normalizeBrand('   ')).toBe('');
      expect(normalizeBrand('N/A')).toBe('');
      expect(normalizeBrand('-')).toBe('');
      expect(normalizeBrand('  Camil  ')).toBe('Camil');

      expect(formatBrandDisplay(undefined)).toBe('');
      expect(formatBrandDisplay(null as any)).toBe('');
      expect(formatBrandDisplay('null')).toBe('');
      expect(formatBrandDisplay('Tio João')).toBe('Tio João');
    });

    it('enforces product duplicity rule according to user specification', async () => {
      const { isProductDuplicate } = await import('../utils/brand');

      const existingArrozTioJoao = { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'Tio João' };
      const existingArrozCamil = { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'Camil' };
      const existingArrozSemMarca = { categoryId: 'cat-mercearia', name: 'Arroz', brand: '' };

      // 1. Same name + same category + same brand -> DUPLICATE (Nunca dois de marcas iguais)
      expect(isProductDuplicate(existingArrozTioJoao, { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'Tio João' })).toBe(true);
      expect(isProductDuplicate(existingArrozTioJoao, { categoryId: 'cat-mercearia', name: 'arroz', brand: 'tio joao' })).toBe(true);

      // 2. Same name + same category + different brand -> ALLOWED (Dois com marcas diferentes)
      expect(isProductDuplicate(existingArrozTioJoao, { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'Camil' })).toBe(false);
      expect(isProductDuplicate(existingArrozCamil, { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'Tio João' })).toBe(false);

      // 3. Same name + same category + one with brand, one without brand -> ALLOWED
      expect(isProductDuplicate(existingArrozTioJoao, { categoryId: 'cat-mercearia', name: 'Arroz', brand: '' })).toBe(false);
      expect(isProductDuplicate(existingArrozSemMarca, { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'Tio João' })).toBe(false);

      // 4. Same name + same category + BOTH without brand -> DUPLICATE (Nunca dois sem marca)
      expect(isProductDuplicate(existingArrozSemMarca, { categoryId: 'cat-mercearia', name: 'Arroz', brand: '' })).toBe(true);
      expect(isProductDuplicate(existingArrozSemMarca, { categoryId: 'cat-mercearia', name: 'Arroz', brand: undefined })).toBe(true);
      expect(isProductDuplicate(existingArrozSemMarca, { categoryId: 'cat-mercearia', name: 'Arroz', brand: 'null' })).toBe(true);

      // 5. Different category -> ALLOWED even if same name and both without brand
      expect(isProductDuplicate(existingArrozSemMarca, { categoryId: 'cat-graos', name: 'Arroz', brand: '' })).toBe(false);

      // 6. Different product name -> ALLOWED
      expect(isProductDuplicate(existingArrozTioJoao, { categoryId: 'cat-mercearia', name: 'Feijão', brand: 'Tio João' })).toBe(false);
    });
  });
});
