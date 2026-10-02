import { Category, Product } from '../types';
import { normalizeBrand } from './brand';

/**
 * Normalize text for deep comparison:
 * - lowercase
 * - strips diacritics / accents (é -> e, ã -> a, etc.)
 * - removes non-alphanumeric noise
 * - collapses whitespace
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize basic Portuguese singular/plural to compare lemmas
 * e.g. "ovos" -> "ovo", "pães" -> "pao", "tomates" -> "tomate", "maçãs" -> "maca"
 */
export function toPortugueseSingular(word: string): string {
  const w = normalizeSearchString(word);
  if (w.length <= 3) return w;

  if (w.endsWith('oes') || w.endsWith('aes') || w.endsWith('aos')) {
    return w.slice(0, -3) + 'ao';
  }
  if (w.endsWith('res') || w.endsWith('zes') || w.endsWith('nes')) {
    return w.slice(0, -2);
  }
  if (w.endsWith('is') && (w.endsWith('ais') || w.endsWith('eis') || w.endsWith('ois') || w.endsWith('uis'))) {
    return w.slice(0, -2) + 'l';
  }
  if (w.endsWith('ns')) {
    return w.slice(0, -2) + 'm';
  }
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('is')) {
    return w.slice(0, -1);
  }
  return w;
}

// Common generic filler words in Brazilian receipts to ignore during core lemma matching
const GENERIC_RECEIPT_STOPWORDS = new Set([
  'esp', 'kg', 'un', 'und', 'unid', 'unidade', 'g', 'gr', 'gramas', 'kilo', 'kilos',
  'bco', 'br', 'pto', 'gd', 'gde', 'pq', 'md', 'c', 'com', 'sem', 's',
  'tipo', 'tp', 'pct', 'pacote', 'cx', 'caixa', 'lt', 'lata', 'gf', 'garrafa',
  'pt', 'pote', 'bj', 'bdj', 'bandeja', 'fd', 'fardo', 'peca', 'pedaco',
  'resfriado', 'resf', 'congelado', 'cong', 'nacional', 'nac', 'importado', 'imp',
  'extra', 'ext', 'especial', 'tradicional', 'trad', 'inteiro', 'int', 'fatiado', 'fat',
  'ml', 'litro', 'litros', 'l', '30un', '20un', '12un', '10un', '6un', 'duzia'
]);

/**
 * Extract meaningful semantic tokens from a product string
 */
export function extractProductTokens(str: string): string[] {
  const normalized = normalizeSearchString(str);
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);
  const significant = words.filter(w => !GENERIC_RECEIPT_STOPWORDS.has(w));
  return significant.length > 0 ? significant : words;
}

export interface MatchResult {
  matchedProduct: Product | null;
  matchedCategory: Category | null;
  confidence: 'barcode' | 'exact' | 'singular' | 'token_match' | 'fuzzy' | 'none';
  suggestedName: string;
  suggestedCategoryId: string;
  suggestedCategoryName: string;
}

/**
 * Intelligent matcher that associates a receipt item with the user's existing catalog.
 * Priority rules:
 * 1. Barcode match (if available)
 * 2. Exact match (accent and case insensitive)
 * 3. Singular/Plural match (e.g. "Acem" === "Acém", "Ovo" === "Ovos")
 * 4. Key lemma token match (e.g. "Acem Esp Kg" contains "acem" matching user product "Acém")
 * 5. String similarity
 */
export function findBestMatchingProduct(
  rawItemName: string,
  rawBrand: string | undefined,
  barcode: string | undefined,
  existingProducts: Product[],
  existingCategories: Category[]
): MatchResult {
  const normItem = normalizeSearchString(rawItemName);
  const singularItem = toPortugueseSingular(normItem);
  const itemTokens = extractProductTokens(rawItemName);
  const singularItemTokens = itemTokens.map(t => toPortugueseSingular(t));
  const cleanBarcode = barcode ? barcode.trim().replace(/\D/g, '') : '';
  const normBrand = rawBrand ? normalizeBrand(rawBrand) : '';

  // 1. Barcode Match
  if (cleanBarcode && cleanBarcode.length >= 7) {
    const byBarcode = existingProducts.find(p => p.barcode && p.barcode.trim().replace(/\D/g, '') === cleanBarcode);
    if (byBarcode) {
      const cat = existingCategories.find(c => c.id === byBarcode.categoryId) || null;
      return {
        matchedProduct: byBarcode,
        matchedCategory: cat,
        confidence: 'barcode',
        suggestedName: byBarcode.name,
        suggestedCategoryId: byBarcode.categoryId,
        suggestedCategoryName: cat?.name || 'Geral'
      };
    }
  }

  // 2. Exact Normalized Name Match
  const exactMatch = existingProducts.find(p => {
    const normP = normalizeSearchString(p.name);
    if (normP === normItem) return true;
    return false;
  });

  if (exactMatch) {
    const cat = existingCategories.find(c => c.id === exactMatch.categoryId) || null;
    return {
      matchedProduct: exactMatch,
      matchedCategory: cat,
      confidence: 'exact',
      suggestedName: exactMatch.name,
      suggestedCategoryId: exactMatch.categoryId,
      suggestedCategoryName: cat?.name || 'Geral'
    };
  }

  // 3. Singular / Plural Exact Match
  const singularMatch = existingProducts.find(p => {
    const normP = normalizeSearchString(p.name);
    const singP = toPortugueseSingular(normP);
    return singP === singularItem || singP === normItem || normP === singularItem;
  });

  if (singularMatch) {
    const cat = existingCategories.find(c => c.id === singularMatch.categoryId) || null;
    return {
      matchedProduct: singularMatch,
      matchedCategory: cat,
      confidence: 'singular',
      suggestedName: singularMatch.name,
      suggestedCategoryId: singularMatch.categoryId,
      suggestedCategoryName: cat?.name || 'Geral'
    };
  }

  // 4. Token / Lemma Substring Match
  // E.g. Receipt item "Acem Esp Kg" contains token "acem", user catalog has "Acém"
  // E.g. Receipt item "Ovo Naturaves Bco Gd C 30un" contains token "ovo", user catalog has "Ovos"
  // E.g. Receipt item "Alface Crespa Hidrop" contains token "alface", user catalog has "Alface"
  // E.g. Receipt item "Tomate Saladete Kg" contains token "tomate", user catalog has "Tomate"
  let bestTokenProduct: Product | null = null;
  let bestTokenScore = 0;

  for (const p of existingProducts) {
    const normP = normalizeSearchString(p.name);
    const singP = toPortugueseSingular(normP);
    const pTokens = extractProductTokens(p.name);
    const singularPTokens = pTokens.map(t => toPortugueseSingular(t));

    // Case A: Catalog product is a single core keyword (e.g. "Acém", "Ovos", "Alface", "Tomate", "Cebola", "Batata", "Picanha")
    if (pTokens.length === 1) {
      const coreWord = singularPTokens[0];
      if (singularItemTokens.includes(coreWord) || itemTokens.includes(normP) || itemTokens.includes(singP)) {
        // High confidence match!
        const score = 100 - (itemTokens.length * 2);
        if (score > bestTokenScore) {
          bestTokenScore = score;
          bestTokenProduct = p;
        }
      }
    } else {
      // Case B: Catalog product is multi-word (e.g. "Leite Integral", "Feijão Carioca", "Sabão em Pó")
      const matchedTokensCount = singularPTokens.filter(pt => singularItemTokens.includes(pt)).length;
      if (matchedTokensCount === singularPTokens.length) {
        // All catalog product keywords exist inside receipt item!
        const score = 200 + (matchedTokensCount * 10);
        if (score > bestTokenScore) {
          bestTokenScore = score;
          bestTokenProduct = p;
        }
      }
    }
  }

  if (bestTokenProduct && bestTokenScore > 0) {
    const cat = existingCategories.find(c => c.id === bestTokenProduct!.categoryId) || null;
    return {
      matchedProduct: bestTokenProduct,
      matchedCategory: cat,
      confidence: 'token_match',
      suggestedName: bestTokenProduct.name,
      suggestedCategoryId: bestTokenProduct.categoryId,
      suggestedCategoryName: cat?.name || 'Geral'
    };
  }

  // 5. No product match found -> Fallback category determination
  const resolvedCategory = findBestMatchingCategory('', rawItemName, existingCategories);

  return {
    matchedProduct: null,
    matchedCategory: resolvedCategory,
    confidence: 'none',
    suggestedName: rawItemName,
    suggestedCategoryId: resolvedCategory?.id || '',
    suggestedCategoryName: resolvedCategory?.name || ''
  };
}

/**
 * Intelligent Category Resolver
 * Matches a category based on product semantics or direct category naming
 */
export function findBestMatchingCategory(
  categoryHint: string,
  productName: string,
  existingCategories: Category[]
): Category | null {
  if (existingCategories.length === 0) return null;

  const normHint = normalizeSearchString(categoryHint);
  const normProd = normalizeSearchString(productName);

  // 1. Direct match on category name or hint
  if (normHint) {
    const exactCat = existingCategories.find(c => normalizeSearchString(c.name) === normHint);
    if (exactCat) return exactCat;

    const partialCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes(normHint) || normHint.includes(n);
    });
    if (partialCat) return partialCat;
  }

  // 2. Semantic matching based on product keywords
  // Laticínios / Ovos
  if (/\b(leite|queijo|manteiga|margarina|iogurte|requeijao|mussarela|mucarela|mozzarella|parmesao|ricota|coalhada|danone|yakult|activia|ovo|ovos)\b/.test(normProd)) {
    const dairyCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('laticin') || n.includes('ovo') || n.includes('frio');
    });
    if (dairyCat) return dairyCat;
  }

  // Açougue / Carnes
  if (/\b(carne|frango|bife|costela|linguica|linguiça|alcatra|patinho|picanha|maminha|acem|file|peito|coxa|sobrecoxa|bacon|pernil|suino|boi|bovino|porco|salsicha|tilapia|peixe|camarao|salmao|friboi|seara|sadia|perdigao)\b/.test(normProd)) {
    const meatCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('acoug') || n.includes('carne') || n.includes('ave') || n.includes('peix');
    });
    if (meatCat) return meatCat;
  }

  // Hortifruti
  if (/\b(banana|maca|laranja|limao|tomate|cebola|batata|cenoura|alface|alho|mamao|uva|manga|abacaxi|melancia|melao|abacate|pimentao|repolho|couve|cheiro verde|legume|fruta|verdura|horti)\b/.test(normProd)) {
    const hortiCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('horti') || n.includes('frut') || n.includes('verdur') || n.includes('legum') || n.includes('feira');
    });
    if (hortiCat) return hortiCat;
  }

  // Limpeza
  if (/\b(sabao|detergente|amaciante|desinfetante|cloro|agua sanitaria|esponja|bombril|ype|omo|brilhante|veja|sapolio|lustra moveis|papel toalha|guardanapo|saco de lixo|lixeira|limpeza)\b/.test(normProd)) {
    const cleanCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('limpez') || n.includes('casa');
    });
    if (cleanCat) return cleanCat;
  }

  // Bebidas
  if (/\b(refrigerante|coca|guarana|pepsi|fanta|suco|agua|cerveja|chopp|vinho|vodka|energetico|cha|heineken|brahma|skol|amstel|bebida)\b/.test(normProd)) {
    const drinkCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('bebid') || n.includes('suco') || n.includes('cervej');
    });
    if (drinkCat) return drinkCat;
  }

  // Higiene
  if (/\b(shampoo|condicionador|sabonete|creme dental|pasta de dente|escova|desodorante|papel higienico|absorvente|cotonete|fio dental|barbear|gillete|fralda|higiene)\b/.test(normProd)) {
    const hygieneCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('higien') || n.includes('perfum') || n.includes('cuidad');
    });
    if (hygieneCat) return hygieneCat;
  }

  // Padaria
  if (/\b(pao|biscoito|bolacha|bolo|torrada|croissant|panetone|sonho|salgado|salgadinho|rosca|padaria)\b/.test(normProd)) {
    const bakeryCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('padar') || n.includes('panific') || n.includes('biscoit');
    });
    if (bakeryCat) return bakeryCat;
  }

  // Mercearia
  if (/\b(arroz|feijao|macarrao|oleo|azeite|farinha|acucar|sal|cafe|milho|ervilha|molho|extrato|maionese|ketchup|mostarda|vinagre|trigo|massa|miojo|sopa|mercearia)\b/.test(normProd)) {
    const groceryCat = existingCategories.find(c => {
      const n = normalizeSearchString(c.name);
      return n.includes('mercear') || n.includes('despens') || n.includes('alimento') || n.includes('grao');
    });
    if (groceryCat) return groceryCat;
  }

  // If no matching category rule applied, return null (requiring user selection)
  return null;
}
