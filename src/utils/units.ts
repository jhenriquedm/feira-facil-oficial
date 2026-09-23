export interface ProductUnitOption {
  value: string;
  label: string;
  shortLabel: string;
}

export const PRODUCT_UNITS: ProductUnitOption[] = [
  { value: 'Unidade', label: 'Unidade (un)', shortLabel: 'Unidade' },
  { value: 'Kg', label: 'Quilograma (kg)', shortLabel: 'Kg' },
  { value: 'Grama', label: 'Grama (g)', shortLabel: 'Grama' },
  { value: 'Litros', label: 'Litros (l)', shortLabel: 'Litros' },
  { value: 'Pacote', label: 'Pacote (pct)', shortLabel: 'Pacote' },
  { value: 'Caixa', label: 'Caixa (cx)', shortLabel: 'Caixa' },
  { value: 'Lata', label: 'Lata', shortLabel: 'Lata' },
  { value: 'Garrafa', label: 'Garrafa', shortLabel: 'Garrafa' },
  { value: 'Bandeja', label: 'Bandeja', shortLabel: 'Bandeja' },
  { value: 'Pote', label: 'Pote', shortLabel: 'Pote' },
  { value: 'Saco', label: 'Saco', shortLabel: 'Saco' },
];

/**
 * Normalizes any unit string (from barcode scanners, Open Food Facts, Gemini OCR, or legacy entries)
 * to one of the canonical unit values ('Unidade', 'Kg', 'Grama', 'Litros', 'Pacote', 'Caixa', 'Lata', 'Garrafa', 'Bandeja', 'Pote', 'Saco').
 */
export function normalizeProductUnit(rawUnit?: string): string {
  if (!rawUnit) return 'Unidade';
  const clean = rawUnit.trim().toLowerCase();

  if (['g', 'gr', 'g.', 'grama', 'gramas'].includes(clean)) return 'Grama';
  if (['kg', 'kg.', 'quilo', 'quilos', 'quilograma', 'quilogramas', 'kilo', 'kilos'].includes(clean)) return 'Kg';
  if (['l', 'l.', 'lt', 'litro', 'litros'].includes(clean)) return 'Litros';
  if (['un', 'un.', 'unid', 'unid.', 'unidade', 'unidades', 'unidade (un)', 'pc', 'peça', 'peca'].includes(clean)) return 'Unidade';
  if (['pct', 'pct.', 'pacote', 'pacotes', 'pacote (pct)'].includes(clean)) return 'Pacote';
  if (['cx', 'cx.', 'caixa', 'caixas', 'caixa (cx)'].includes(clean)) return 'Caixa';
  if (['lata', 'latas'].includes(clean)) return 'Lata';
  if (['garrafa', 'garrafas'].includes(clean)) return 'Garrafa';
  if (['bandeja', 'bandejas'].includes(clean)) return 'Bandeja';
  if (['pote', 'potes'].includes(clean)) return 'Pote';
  if (['saco', 'sacos'].includes(clean)) return 'Saco';

  // Check if it already matches one of the canonical options
  const matched = PRODUCT_UNITS.find(
    (u) => u.value.toLowerCase() === clean || u.label.toLowerCase() === clean
  );
  if (matched) return matched.value;

  return rawUnit;
}

/**
 * Returns user-friendly full label (e.g. 'Grama (g)' for 'Grama')
 */
export function getUnitLabel(rawUnit?: string): string {
  const normalized = normalizeProductUnit(rawUnit);
  const found = PRODUCT_UNITS.find((u) => u.value === normalized);
  return found ? found.label : (rawUnit || 'Unidade (un)');
}

/**
 * Returns clean card label displayed on product badges (e.g. 'Grama', 'Litros', 'Kg', 'Unidade')
 * Never displays single cryptic letters like 'G' or 'L'.
 */
export function getUnitCardDisplay(rawUnit?: string): string {
  const normalized = normalizeProductUnit(rawUnit);
  const found = PRODUCT_UNITS.find((u) => u.value === normalized);
  return found ? found.value : (rawUnit || 'Unidade');
}

/**
 * Legacy compatibility alias
 */
export function getUnitShortLabel(rawUnit?: string): string {
  return getUnitCardDisplay(rawUnit);
}
