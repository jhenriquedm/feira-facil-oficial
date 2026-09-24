/**
 * Utilities for normalizing, formatting and validating product brands.
 * Enforces brand optionality and duplicity rules:
 * - Brand is completely optional.
 * - Missing or invalid brand is never displayed as 'null' or 'undefined'.
 * - Duplicity rule: Same category and same product name is allowed IF:
 *   - Both have different brands (e.g. "Arroz Tio João" and "Arroz Camil").
 *   - One has a brand and the other has NO brand (e.g. "Arroz Tio João" and "Arroz").
 *   - NEVER two identical brands for the same product name in the same category.
 *   - NEVER two products with NO brand for the same product name in the same category.
 */

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeBrand(rawBrand?: string | null): string {
  if (rawBrand === null || rawBrand === undefined) return '';
  const trimmed = String(rawBrand).replace(/\s+/g, ' ').trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed || 
    lower === 'null' || 
    lower === 'undefined' || 
    lower === 'none' || 
    lower === 'n/a' || 
    lower === 'na' || 
    lower === '-' || 
    lower === '--' || 
    lower === '---' ||
    lower === 'sem marca'
  ) {
    return '';
  }
  return trimmed;
}

export function formatBrandDisplay(rawBrand?: string | null): string {
  return normalizeBrand(rawBrand);
}

export function isSameBrand(brandA?: string | null, brandB?: string | null): boolean {
  const normA = normalizeBrand(brandA);
  const normB = normalizeBrand(brandB);

  // Both have no brand
  if (!normA && !normB) {
    return true;
  }
  // One has brand and other doesn't
  if (!normA || !normB) {
    return false;
  }

  // Compare case-insensitively and accent-insensitively
  return stripAccents(normA).toLowerCase() === stripAccents(normB).toLowerCase();
}

export interface ProductIdentification {
  categoryId: string;
  name: string;
  brand?: string | null;
}

export function isProductDuplicate(
  existing: ProductIdentification,
  candidate: ProductIdentification
): boolean {
  if (existing.categoryId !== candidate.categoryId) {
    return false;
  }

  const existingName = stripAccents(existing.name.trim()).toLowerCase();
  const candidateName = stripAccents(candidate.name.trim()).toLowerCase();

  if (existingName !== candidateName) {
    return false;
  }

  // Same category and same name: check brand
  return isSameBrand(existing.brand, candidate.brand);
}
