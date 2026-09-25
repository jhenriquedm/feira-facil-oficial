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

/**
 * Checks whether the specified unit represents a weight-based measurement (Kg or Grama).
 */
export function isWeightUnit(rawUnit?: string): boolean {
  const norm = normalizeProductUnit(rawUnit);
  return norm === 'Kg' || norm === 'Grama';
}

/**
 * Parses user input for quantity/weight.
 * Supports:
 * - Decimals with comma or dot: "1,7", "1.7", "1,5", "1.5", "0,5", "0.5", "1,500", "1.500" -> 1.7, 1.5, 0.5, 1.5
 * - Grams integer input (3 digits or 4+ digits):
 *   - "1000", "1500", "1700", "2500" -> 1.0, 1.5, 1.7, 2.5 kg
 *   - "500", "750", "999" -> 0.5, 0.75, 0.999 kg
 * - Direct kg integers (1 to 99): "1", "2", "5", "10", "25" -> 1, 2, 5, 10, 25 kg
 * - Limit: Maximum 999 kg
 */
export function parseWeightQuantity(input: string | number, unit?: string): number {
  const MAX_WEIGHT_KG = 999;

  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 1;
    let val = input;
    if (isWeightUnit(unit)) {
      if (val >= 100) {
        val = val / 1000;
      }
      const finalVal = Number(val.toFixed(3));
      return Math.min(MAX_WEIGHT_KG, Math.max(0.001, finalVal));
    }
    return Math.min(9999, Math.max(1, Math.round(val)));
  }

  if (!input || typeof input !== 'string') return 1;
  const raw = input.trim().toLowerCase().replace(/kg|quilos?|kilos?|gramas?|g/g, '').trim();
  if (!raw) return 1;

  // Check if string has comma or dot
  if (raw.includes(',') || raw.includes('.')) {
    const cleanNum = raw.replace(/\s/g, '');
    let val: number;
    if (cleanNum.includes(',') && cleanNum.includes('.')) {
      const withoutThousand = cleanNum.replace(/\./g, '').replace(',', '.');
      val = parseFloat(withoutThousand);
    } else {
      val = parseFloat(cleanNum.replace(',', '.'));
    }

    if (!isNaN(val) && val > 0) {
      if (isWeightUnit(unit)) {
        if (val >= 1000) {
          val = val / 1000;
        }
        const finalVal = Number(val.toFixed(3));
        return Math.min(MAX_WEIGHT_KG, Math.max(0.001, finalVal));
      }
      return Math.min(9999, Math.max(1, Math.round(val)));
    }
  }

  // Pure integer input
  const intVal = parseFloat(raw);
  if (isNaN(intVal) || intVal <= 0) return 1;

  if (isWeightUnit(unit)) {
    // If 100 or greater (e.g. 100 -> 0.1, 500 -> 0.5, 1000 -> 1.0, 1500 -> 1.5, 1700 -> 1.7, 999000 -> 999)
    if (intVal >= 100) {
      const inKg = intVal / 1000;
      return Number(Math.min(MAX_WEIGHT_KG, Math.max(0.001, inKg)).toFixed(3));
    }
    // Small values (1 to 99) are direct kg
    return Number(Math.min(MAX_WEIGHT_KG, Math.max(0.001, intVal)).toFixed(3));
  }

  return Math.min(9999, Math.max(1, Math.round(intVal)));
}

/**
 * Returns user-friendly formatted display for quantity:
 * - For weight units (Kg / Grama):
 *   - 1.7 -> "1,7 kg"
 *   - 1.5 -> "1,5 kg"
 *   - 1 -> "1 kg"
 *   - 0.5 -> "500g"
 *   - 0.75 -> "750g"
 * - For other units:
 *   - 2 -> "2"
 */
export function formatQuantityDisplay(qty: number, unit?: string): string {
  if (isWeightUnit(unit)) {
    if (qty < 1 && qty > 0) {
      const grams = Math.round(qty * 1000);
      return `${grams}g`;
    }
    const formatted = qty.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    return `${formatted} kg`;
  }
  return String(qty);
}

/**
 * Returns dynamic price label for items based on unit:
 * - Weight units (Kg / Grama): 'Valor Kg/g' (or 'Valor do Kg/g')
 * - Regular items: 'Preço Unitário' (or 'Unitário')
 */
export function getPriceLabel(unit?: string, short: boolean = false): string {
  if (isWeightUnit(unit)) {
    return short ? 'Valor Kg/g' : 'Valor do Kg/g';
  }
  return short ? 'Unitário' : 'Preço Unitário';
}

/**
 * Returns raw numeric text suitable for editing directly in the stepper input box:
 * - 0.5 (Kg) -> "500"
 * - 1.5 (Kg) -> "1,5"
 * - 1.7 (Kg) -> "1,7"
 * - 1 (Kg) -> "1"
 * - 2 (Un) -> "2"
 */
export function formatWeightValueOnly(qty: number, unit?: string): string {
  if (isWeightUnit(unit)) {
    if (qty < 1 && qty > 0) {
      return String(Math.round(qty * 1000));
    }
    return qty.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }
  return String(qty);
}
