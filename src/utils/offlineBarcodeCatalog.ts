/**
 * Offline Barcode Database & Learning Engine
 * 
 * Provides an offline database of 11,000+ preloaded Brazilian supermarket products
 * and a local learning system that stores any user-registered barcodes in device memory
 * without any dependency on Firebase or user login.
 */

import rawCatalog from '../data/offlineBarcodeCatalog.json';
import { normalizeBrand } from './brand';
import { normalizeProductUnit } from './units';
import { Product, Category } from '../types';
import { getApiUrl } from './apiConfig';

export interface OfflineCatalogProduct {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
}

export type BarcodeSource = 
  | 'user_catalog' 
  | 'built_in_offline' 
  | 'learned_offline' 
  | 'online_api' 
  | 'none';

export interface BarcodeLookupResult {
  barcode: string;
  found: boolean;
  name?: string;
  brand?: string;
  category?: string;
  unit?: string;
  source: BarcodeSource;
  sourceBadge: string;
  sourceDescription: string;
  isUserCatalogProduct?: boolean;
  existingProduct?: Product;
}

const LEARNED_BARCODES_STORAGE_KEY = 'feira_learned_barcodes_v1';

// In-memory index map for O(1) instantaneous lookups
let builtInCatalogMap: Map<string, OfflineCatalogProduct> | null = null;

function getBuiltInCatalog(): Map<string, OfflineCatalogProduct> {
  if (!builtInCatalogMap) {
    builtInCatalogMap = new Map();
    const list = rawCatalog as [string, string, string, string, string][];
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      // row: [barcode, name, brand, category, unit]
      builtInCatalogMap.set(row[0], {
        barcode: row[0],
        name: row[1],
        brand: row[2],
        category: row[3],
        unit: row[4]
      });
    }
  }
  return builtInCatalogMap;
}

/**
 * Reads all learned barcodes stored in local device memory (localStorage)
 */
export function getLearnedBarcodes(): Record<string, OfflineCatalogProduct> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LEARNED_BARCODES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Erro ao carregar base de códigos aprendidos:', err);
    return {};
  }
}

/**
 * Persists a new product to local device memory so it learns with usage.
 * Next time the barcode is scanned offline, it is recognized instantly!
 */
export function learnBarcode(product: {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  unit?: string;
}): void {
  if (!product.barcode) return;
  const cleanCode = product.barcode.trim().replace(/\D/g, '');
  if (!cleanCode || cleanCode.length < 6) return;

  const cleanName = product.name?.trim() || '';
  if (!cleanName) return;

  try {
    const current = getLearnedBarcodes();
    current[cleanCode] = {
      barcode: cleanCode,
      name: cleanName,
      brand: normalizeBrand(product.brand),
      category: product.category?.trim() || 'Mercearia',
      unit: normalizeProductUnit(product.unit)
    };
    localStorage.setItem(LEARNED_BARCODES_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Erro ao gravar código na memória local:', err);
  }
}

/**
 * Checks if barcode is in the learned memory or the built-in 11,000+ offline database.
 */
export function lookupOfflineBarcode(rawCode: string): OfflineCatalogProduct | null {
  const clean = rawCode.trim().replace(/\D/g, '');
  if (!clean) return null;

  // 1. Check local learned memory (device learned products take precedence)
  const learned = getLearnedBarcodes();
  if (learned[clean]) {
    return learned[clean];
  }

  // 2. Check built-in native database of 11,000+ items
  const catalog = getBuiltInCatalog();
  const matched = catalog.get(clean);
  if (matched) {
    return matched;
  }

  // Pad/slice common EAN-13 variations (e.g. 12-digit UPC or 14-digit GTIN)
  if (clean.length === 12) {
    const padded = '0' + clean;
    if (learned[padded]) return learned[padded];
    if (catalog.get(padded)) return catalog.get(padded)!;
  } else if (clean.length === 14 && clean.startsWith('0')) {
    const unpadded = clean.slice(1);
    if (learned[unpadded]) return learned[unpadded];
    if (catalog.get(unpadded)) return catalog.get(unpadded)!;
  }

  return null;
}

/**
 * Returns database statistics for UI and settings
 */
export function getOfflineDatabaseStats(): {
  builtInCount: number;
  learnedCount: number;
  totalCount: number;
} {
  const builtInCount = (rawCatalog as any[]).length || 0;
  const learnedCount = Object.keys(getLearnedBarcodes()).length;
  return {
    builtInCount,
    learnedCount,
    totalCount: builtInCount + learnedCount
  };
}

/**
 * Main 3-step hierarchy barcode lookup as requested:
 * 
 * 1. Já existe no catálogo pessoal do usuário?
 *    SIM -> Abre direto para editar/adicionar!
 * 
 * 2. Existe na Base Offline Embutida do App (ou aprendida)?
 *    SIM -> Preenche NOME, MARCA e CATEGORIA instantaneamente (sem internet)!
 * 
 * 3. Há conexão com a internet?
 *    SIM -> Consulta APIs online (Open Food Facts / nuvem) e grava na memória local
 *    NÃO -> Permite digitar e salva localmente
 */
export async function lookupBarcodeWithHierarchy(
  rawCode: string,
  userCatalog: Product[] = [],
  categories: Category[] = []
): Promise<BarcodeLookupResult> {
  const clean = rawCode.trim().replace(/\D/g, '').slice(0, 14);
  if (!clean) {
    return {
      barcode: '',
      found: false,
      source: 'none',
      sourceBadge: 'Código Inválido',
      sourceDescription: 'Nenhum dígito numérico válido informado.'
    };
  }

  // STEP 1: Check user's personal product catalog
  const userProd = userCatalog.find(
    p => p.barcode && p.barcode.replace(/\D/g, '') === clean
  );
  if (userProd) {
    const cat = categories.find(c => c.id === userProd.categoryId);
    return {
      barcode: clean,
      found: true,
      name: userProd.name,
      brand: normalizeBrand(userProd.brand),
      category: cat?.name || 'Mercearia',
      unit: normalizeProductUnit(userProd.unit),
      source: 'user_catalog',
      sourceBadge: 'Seu Catálogo Pessoal',
      sourceDescription: 'Produto já cadastrado na sua conta. Abre diretamente para adicionar ou editar.',
      isUserCatalogProduct: true,
      existingProduct: userProd
    };
  }

  // STEP 2: Check offline built-in database & locally learned items
  const learned = getLearnedBarcodes();
  if (learned[clean]) {
    const item = learned[clean];
    return {
      barcode: clean,
      found: true,
      name: item.name,
      brand: normalizeBrand(item.brand),
      category: item.category,
      unit: normalizeProductUnit(item.unit),
      source: 'learned_offline',
      sourceBadge: 'Memória Local do Aparelho',
      sourceDescription: 'Produto aprendido automaticamente em cadastros anteriores. Reconhecido 100% offline.',
      isUserCatalogProduct: false
    };
  }

  const catalog = getBuiltInCatalog();
  const builtInItem = catalog.get(clean);
  if (builtInItem) {
    return {
      barcode: clean,
      found: true,
      name: builtInItem.name,
      brand: normalizeBrand(builtInItem.brand),
      category: builtInItem.category,
      unit: normalizeProductUnit(builtInItem.unit),
      source: 'built_in_offline',
      sourceBadge: 'Base Offline Nativa (11.000+ Itens)',
      sourceDescription: 'Identificado instantaneamente na base offline interna do app, sem gastar dados nem precisar de internet.',
      isUserCatalogProduct: false
    };
  }

  // STEP 3: Online API lookup fallback (if connection is available)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  if (isOnline) {
    try {
      const res = await fetch(getApiUrl(`/api/barcode/lookup?code=${encodeURIComponent(clean)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.name) {
          const finalProduct: OfflineCatalogProduct = {
            barcode: clean,
            name: data.name,
            brand: normalizeBrand(data.brand),
            category: data.categorySuggestion || 'Mercearia',
            unit: normalizeProductUnit(data.unit)
          };

          // Save into local device memory so next time it is instant offline!
          learnBarcode(finalProduct);

          return {
            barcode: clean,
            found: true,
            name: finalProduct.name,
            brand: finalProduct.brand,
            category: finalProduct.category,
            unit: finalProduct.unit,
            source: 'online_api',
            sourceBadge: data.databaseSource || 'Open Food Facts (Nuvem)',
            sourceDescription: 'Localizado na nuvem e salvo na memória do seu aparelho para uso offline futuro.',
            isUserCatalogProduct: false
          };
        }
      }
    } catch (e) {
      console.warn('Consulta online indisponível:', e);
    }
  }

  // STEP 4: Not found (or offline with unknown product)
  return {
    barcode: clean,
    found: false,
    source: 'none',
    sourceBadge: isOnline ? 'Não Encontrado' : 'Sem Conexão',
    sourceDescription: isOnline
      ? 'O código não foi localizado nas bases de dados. Você pode cadastrá-lo manualmente e ele será salvo na memória do aparelho.'
      : 'Sem conexão de internet no momento. Cadastre o nome do produto manualmente para gravá-lo na memória offline do aparelho.',
    isUserCatalogProduct: false
  };
}
