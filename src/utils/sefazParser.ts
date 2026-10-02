import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { OcrExtractedItem, OcrResultData } from '../components/ReceiptOcrModal';

// Brazilian State UF mapping from 2-digit code
export const UF_IBGE_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
};

// Automatic Product Category Classifier based on keywords
export function inferProductCategory(productName: string): string {
  const norm = productName.toLowerCase();
  
  if (/\b(carne|frango|bife|costela|linguica|linguiça|alcatra|patinho|picanha|maminha|acem|acém|file|filé|peito|coxa|sobrecoxa|bacon|pernil|suino|suíno|boi|bovino|porco|salsicha|tilapia|tilápia|peixe|camarao|camarão|salmao|salmão|perd|sadia|seara|friboi)\b/i.test(norm)) {
    return 'Açougue';
  }
  if (/\b(leite|queijo|manteiga|margarina|iogurte|requeijao|requeijão|mussarela|mucarela|mozzarella|parmesao|parmesão|ricota|coalhada|danone|yakult|activia|ovo|ovos)\b/i.test(norm)) {
    return 'Laticínios';
  }
  if (/\b(arroz|feijao|feijão|macarrao|macarrão|oleo|óleo|azeite|farinha|acucar|açúcar|sal|cafe|café|milho|ervilha|molho|extrato|molho de tomate|maionese|ketchup|mostarda|vinagre|trigo|massa|miojo|sopa)\b/i.test(norm)) {
    return 'Mercearia';
  }
  if (/\b(banana|maca|maçã|laranja|limao|limão|tomate|cebola|batata|cenoura|alface|alho|mamao|mamão|uva|manga|abacaxi|melancia|melao|melão|abacate|pimentao|pimentão|repolho|couve|cheiro verde|legume|fruta|verdura)\b/i.test(norm)) {
    return 'Hortifruti';
  }
  if (/\b(sabao|sabão|detergente|amaciante|desinfetante|cloro|agua sanitaria|água sanitária|esponja|bombril|ypê|ype|omo|brilhante|veja|sapolio|lustra moveis|papel toalha|guardanapo|saco de lixo|lixeira)\b/i.test(norm)) {
    return 'Limpeza';
  }
  if (/\b(refrigerante|coca-cola|coca|guarana|guaraná|pepsi|fanta|suco|agua|água|cerveja|chopp|vinho|vodka|energetico|energético|cha|chá|heineken|brahma|skol|amstel)\b/i.test(norm)) {
    return 'Bebidas';
  }
  if (/\b(shampoo|condicionador|sabonete|creme dental|pasta de dente|escova|desodorante|papel higienico|papel higiênico|absorvente|cotonete|fio dental|barbear|gillete|fralda)\b/i.test(norm)) {
    return 'Higiene';
  }
  if (/\b(pao|pão|biscoito|bolacha|bolo|torrada|croissant|panetone|sonho|salgado|salgadinho|rosca)\b/i.test(norm)) {
    return 'Padaria';
  }

  return 'Mercearia';
}

// Clean obscure Brazilian fiscal abbreviations into readable consumer titles
export function cleanProductDescription(raw: string): string {
  if (!raw) return 'Produto Sem Descrição';
  
  let name = raw.replace(/\s+/g, ' ').trim();

  // 1. Strip NFC-e metadata tails (quantities, units, prices, codes)
  // e.g. "Acem Esp Kg Qtde.:0,236 UN: KG Vl. Unit.: 37,95" -> "Acem Esp Kg"
  // e.g. "Ovo Naturaves Bco Gd C 30un Qtde.:1 UN: UN Vl. Unit.: 15,49" -> "Ovo Naturaves Bco Gd C 30un"
  name = name
    .replace(/\(Código:[^)]*\)/gi, '')
    .replace(/\bCódigo:\s*\d+/gi, '')
    .replace(/\b(?:Qtde?|Qtd|Quantidade)\.?\s*:\s*[0-9.,]+.*$/gi, '')
    .replace(/\bUN\s*:\s*[A-Za-z0-9]+.*$/gi, '')
    .replace(/\bVl\.?\s*(?:Unit|Total|Item|Unit[aá]rio)\.?\s*:\s*[0-9.,]+.*$/gi, '')
    .replace(/\bValor\s*(?:Unit|Total|Item|Unit[aá]rio)?\s*:\s*[0-9.,]+.*$/gi, '')
    .replace(/\b(?:x|X|\*)\s*[0-9.,]+\s+[0-9.,]+.*$/gi, '')
    .replace(/[\s\-\:\.\,]+$/, '')
    .trim();

  // If entire string is uppercase, convert to Title Case base first
  if (name === name.toUpperCase()) {
    name = name.toLowerCase().replace(/(^|\s)[a-z]/g, (l) => l.toUpperCase());
  }

  // Common fiscal abbreviations substitutions
  name = name
    .replace(/\bFILEZ\b/gi, 'Filé')
    .replace(/\bFGO\b/gi, 'Frango')
    .replace(/\bPERD\b/gi, 'Perdigão')
    .replace(/\bSAD\b/gi, 'Sadia')
    .replace(/\bSEAR\b/gi, 'Seara')
    .replace(/\bFRIBOI\b/gi, 'Friboi')
    .replace(/\bACUC\b/gi, 'Açúcar')
    .replace(/\bCRIST\b/gi, 'Cristal')
    .replace(/\bUNI\b/gi, 'União')
    .replace(/\bLEIT\b/gi, 'Leite')
    .replace(/\bCOND\b/gi, 'Condensado')
    .replace(/\bMOC\b/gi, 'Moça')
    .replace(/\bMOCA\b/gi, 'Moça')
    .replace(/\bDESINF\b/gi, 'Desinfetante')
    .replace(/\bDET\b/gi, 'Detergente')
    .replace(/\bSAB\b/gi, 'Sabão')
    .replace(/\bREFRIG\b/gi, 'Refrigerante')
    .replace(/\bBISC\b/gi, 'Biscoito')
    .replace(/\bBOL\b/gi, 'Bolacha')
    .replace(/\bCHOCOL\b/gi, 'Chocolate')
    .replace(/\bEXTR\b/gi, 'Extrato')
    .replace(/\bMOLH\b/gi, 'Molho')
    .replace(/\bTOMAT\b/gi, 'Tomate')
    .replace(/\bMAION\b/gi, 'Maionese')
    .replace(/\bMARG\b/gi, 'Margarina')
    .replace(/\bMANTEIG\b/gi, 'Manteiga')
    .replace(/\bQUEIJ\b/gi, 'Queijo')
    .replace(/\bMUSS\b/gi, 'Mussarela')
    .replace(/\bREQUEIJ\b/gi, 'Requeijão')
    .replace(/\bMAC\b/gi, 'Macarrão')
    .replace(/\bESPAG\b/gi, 'Espaguete')
    .replace(/\bARROZ TIO J\b/gi, 'Arroz Tio João')
    .replace(/\bARR\b/gi, 'Arroz')
    .replace(/\bFEIJ\b/gi, 'Feijão')
    .replace(/\bCARIO\b/gi, 'Carioca')
    .replace(/\bFAR\b/gi, 'Farinha')
    .replace(/\bTRIGO\b/gi, 'Trigo')
    .replace(/\bOLEO SOJ\b/gi, 'Óleo de Soja')
    .replace(/\bOL\b/gi, 'Óleo')
    .replace(/\bAG\b/gi, 'Água')
    .replace(/\bMIN\b/gi, 'Mineral')
    .replace(/\bS\/GAS\b/gi, 'sem Gás')
    .replace(/\bC\/GAS\b/gi, 'com Gás')
    .replace(/\bS\/G\b/gi, 'sem Gás')
    .replace(/\bC\/G\b/gi, 'com Gás');

  // Capitalize neatly
  return name.replace(/(^|\s)([a-záàâãéèêíïóôõöúçñ])/g, (m) => m.toUpperCase());
}

// Clean and normalize units
export function normalizeUnitString(rawUnit: string): string {
  const norm = (rawUnit || '').trim().toUpperCase();
  if (norm === 'KG' || norm === 'KILOGRAMA') return 'Kg';
  if (norm === 'G' || norm === 'GR' || norm === 'GRAMA' || norm === 'GRAMAS') return 'G';
  if (norm === 'L' || norm === 'LITRO' || norm === 'LITROS') return 'L';
  if (norm === 'ML' || norm === 'MILILITRO') return 'L';
  if (norm === 'BJ' || norm === 'BDJ' || norm === 'BANDEJA') return 'Bandeja';
  if (norm === 'PC' || norm === 'PCT' || norm === 'PACOTE') return 'Pacote';
  if (norm === 'CX' || norm === 'CXA' || norm === 'CAIXA') return 'Caixa';
  if (norm === 'LT' || norm === 'LATA') return 'Lata';
  if (norm === 'PT' || norm === 'POTE') return 'Pote';
  if (norm === 'GF' || norm === 'GARRAFA') return 'Garrafa';
  if (norm === 'FD' || norm === 'FARDO') return 'Fardo';
  return 'Un';
}

// Extract brand from description
export function extractBrandFromDescription(desc: string): string {
  const norm = desc.toLowerCase();
  const brands = [
    'perdigao', 'perdigão', 'sadia', 'seara', 'friboi', 'aurora', 'uniao', 'união',
    'camil', 'tio joao', 'tio joão', 'nestle', 'nestlé', 'moca', 'moça', 'itambe', 'itambé',
    'piracanjuba', 'parmalat', 'qualy', 'doriana', 'danone', 'vigor', 'ypê', 'ype', 'omo',
    'brilhante', 'ariel', 'comfort', 'downy', 'veja', 'pinho sol', 'coca-cola', 'coca cola',
    'pepsi', 'guarana antarctica', 'guaraná', 'fanta', 'heineken', 'brahma', 'skol', 'amstel',
    '3 coracoes', '3 corações', 'santa clara', 'melitta', 'pilao', 'pilão', 'marata', 'maratá',
    'bauducco', 'marilan', 'mira', 'mabel', 'trakinas', 'piraque', 'piraquê', 'barilla',
    'adria', 'dona benta', 'vilma', 'predilecta', 'quero', 'fugini', 'elefante', 'heinz',
    'hellmanns', 'hellmann\'s', 'liza', 'soya', 'coamo', 'colgate', 'sorriso', 'oral-b',
    'dove', 'palmolive', 'nivea', 'rexona', 'pantene', 'elseve', 'head & shoulders'
  ];

  for (const b of brands) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(norm)) {
      return b.replace(/(^|\s)[a-z]/g, (l) => l.toUpperCase());
    }
  }
  return '';
}

// Parse Brazilian number string ("16,98" or "1.250,50" -> 16.98)
export function parseBrlNumber(str: string): number {
  if (!str) return 0;
  const match = str.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]+|[0-9]+,[0-9]+|[0-9]+\.[0-9]+|[0-9]+)/);
  if (!match) return 0;
  const clean = match[1];
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
}

// Parse date string (DD/MM/YYYY or YYYY-MM-DD -> YYYY-MM-DD)
export function parseBrlDate(str: string): string {
  if (!str) return new Date().toISOString().substring(0, 10);
  const dmyMatch = str.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m}-${d}`;
  }
  const ymdMatch = str.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().substring(0, 10);
}

/**
 * Parses Brazilian SEFAZ HTML page across all State portals
 */
export function parseSefazHtml(html: string, originalUrl?: string): OcrResultData {
  if (!html || typeof html !== 'string') {
    throw new Error('Conteúdo HTML da SEFAZ vazio.');
  }

  // Use DOMParser if available in browser/webview
  let doc: Document;
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  } else {
    // Fallback: minimal dummy Document for non-DOM environments
    doc = document.implementation.createHTMLDocument('sefaz');
    doc.body.innerHTML = html;
  }

  // 1. Store / Market Name extraction
  let market = '';
  
  // Try classic ENCAT classes
  const topoEl = doc.querySelector('#conteudo .txtTopo, .txtTopo, #u20, .header .empresa, .NFCE_Cabecalho, .txtTit');
  if (topoEl && topoEl.textContent?.trim()) {
    market = topoEl.textContent.trim();
  }

  if (!market) {
    const h4Els = Array.from(doc.querySelectorAll('h4, h3, h2, h1, b, strong, .titulo'));
    for (const el of h4Els) {
      const t = el.textContent?.trim() || '';
      if (t && !/portal|sefaz|governo|fazenda|nota fiscal|danfe|documento/i.test(t) && t.length > 3) {
        market = t;
        break;
      }
    }
  }

  if (!market) {
    const matchMarket = html.match(/(?:SUPERMERCADO|ATACAD|MERCADO|COMERCIO|HIPER|COM\.|VAREJO)[^<>\n\r]{3,60}/i);
    if (matchMarket) {
      market = matchMarket[0].replace(/&amp;/g, '&').trim();
    }
  }

  market = market.replace(/\s+/g, ' ').trim() || 'Supermercado';

  // 2. Date Extraction
  let date = new Date().toISOString().substring(0, 10);
  const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) {
    date = parseBrlDate(dateMatch[1]);
  }

  // 3. Total Amount Extraction
  let totalAmount: number | undefined = undefined;
  const totalEl = doc.querySelector('.totalNumb, #conteudo .totalNumb, .totalNivel, .txtMax, .total');
  if (totalEl && totalEl.textContent?.trim()) {
    totalAmount = parseBrlNumber(totalEl.textContent);
  }

  if (!totalAmount) {
    const matchTotal = html.match(/(?:VALOR A PAGAR|VALOR TOTAL|TOTAL R\$|Vl\. Total)\s*[:=]?\s*R?\$?\s*([0-9.,]+)/i);
    if (matchTotal) {
      totalAmount = parseBrlNumber(matchTotal[1]);
    }
  }

  // 4. Items Extraction
  const items: OcrExtractedItem[] = [];

  // Method A: Table rows `#tabResult tr` / `table.NFCE_Itens tr` / `.RItem`
  const itemRows = Array.from(doc.querySelectorAll('#tabResult tr, .RItem, table.NFCE_Itens tr, .linhaItens, .item, tr[id^="Item"]'));

  if (itemRows.length > 0) {
    for (const row of itemRows) {
      const rowText = row.textContent || '';
      if (!rowText.trim() || /código|descricao|qtde|unid|vl\.\s*unit/i.test(rowText) && row.querySelectorAll('th').length > 0) {
        continue;
      }

      // Name / Description
      const nameEl = row.querySelector('.txtTit, .txtItem, .descricao, .xProd, td:nth-child(1), .RCod + span');
      let name = nameEl?.textContent?.trim() || '';

      if (!name) {
        const spanTit = row.querySelector('span:first-child');
        if (spanTit && spanTit.textContent?.trim()) {
          name = spanTit.textContent.trim();
        }
      }

      // Barcode / Cod
      const codEl = row.querySelector('.RCod, .codigo, .cProd');
      let barcode = codEl?.textContent?.replace(/\D/g, '').trim() || '';
      if (!barcode) {
        const matchCode = rowText.match(/\(Código:\s*(\d+)\)/i);
        if (matchCode) barcode = matchCode[1];
      }

      // Quantity
      let quantity = 1;
      const qtdEl = row.querySelector('.Rqtd, .qtd, .quantidade, .qCom');
      if (qtdEl && qtdEl.textContent) {
        quantity = parseBrlNumber(qtdEl.textContent) || 1;
      } else {
        const matchQtd = rowText.match(/Qtde\.:?\s*([0-9.,]+)/i) || rowText.match(/QTD:?\s*([0-9.,]+)/i);
        if (matchQtd) quantity = parseBrlNumber(matchQtd[1]) || 1;
      }

      // Unit
      let unit = 'Un';
      const unEl = row.querySelector('.RUN, .un, .unidade, .uCom');
      if (unEl && unEl.textContent) {
        unit = normalizeUnitString(unEl.textContent.replace(/UN:?/gi, '').trim());
      } else {
        const matchUn = rowText.match(/UN:?\s*([A-Za-z]{1,4})/i) || rowText.match(/Unid:?\s*([A-Za-z]{1,4})/i);
        if (matchUn) unit = normalizeUnitString(matchUn[1]);
      }

      // Unit Price
      let unitPrice = 0;
      const unitPriceEl = row.querySelector('.RvlUnit, .vlUnit, .valorUnitario, .vUnCom');
      if (unitPriceEl && unitPriceEl.textContent) {
        unitPrice = parseBrlNumber(unitPriceEl.textContent);
      } else {
        const matchVlUnit = rowText.match(/Vl\.\s*Unit\.:?\s*([0-9.,]+)/i) || rowText.match(/Unitário:?\s*([0-9.,]+)/i);
        if (matchVlUnit) unitPrice = parseBrlNumber(matchVlUnit[1]);
      }

      // Total Price
      let totalPrice = 0;
      const totEl = row.querySelector('.valor, .RvlTot, .vlTot, .vProd, td:last-child');
      if (totEl && totEl.textContent) {
        totalPrice = parseBrlNumber(totEl.textContent);
      } else {
        const matchTot = rowText.match(/Vl\.\s*Total:?\s*([0-9.,]+)/i) || rowText.match(/Total:?\s*([0-9.,]+)/i);
        if (matchTot) totalPrice = parseBrlNumber(matchTot[1]);
      }

      if (!totalPrice && quantity > 0 && unitPrice > 0) {
        totalPrice = Number((quantity * unitPrice).toFixed(2));
      }
      if (!unitPrice && quantity > 0 && totalPrice > 0) {
        unitPrice = Number((totalPrice / quantity).toFixed(2));
      }

      if (name && (totalPrice > 0 || unitPrice > 0)) {
        // Clean name and extract brand/category
        const cleanName = cleanProductDescription(name.replace(/\(Código:.*?\)/gi, '').trim());
        const brand = extractBrandFromDescription(cleanName);
        const category = inferProductCategory(cleanName);

        items.push({
          id: `sefaz_${Date.now()}_${items.length}_${Math.random().toString(36).substr(2, 4)}`,
          name: cleanName,
          quantity: quantity > 0 ? quantity : 1,
          unit,
          unitPrice: unitPrice > 0 ? unitPrice : totalPrice,
          totalPrice: totalPrice > 0 ? totalPrice : unitPrice,
          category,
          brand,
          barcode: barcode && barcode.length >= 7 ? barcode : undefined,
          selected: true
        });
      }
    }
  }

  // Method B: Regex parsing on plain text if table selectors were empty
  if (items.length === 0) {
    const lineRegex = /(?:(\d{7,14})\s+)?([A-Z0-9\s\.\,\-\/\%]{3,45}?)\s+([0-9.,]+)\s*([A-Za-z]{1,4})\s*(?:x|X|\*|Vl\.\s*Unit\.:?)\s*([0-9.,]+)\s+([0-9.,]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = lineRegex.exec(html)) !== null) {
      const [, rawBarcode, rawName, rawQty, rawUn, rawUnitPrice, rawTotPrice] = match;
      const cleanName = cleanProductDescription(rawName);
      const qty = parseBrlNumber(rawQty) || 1;
      const unit = normalizeUnitString(rawUn);
      const unitPrice = parseBrlNumber(rawUnitPrice);
      const totPrice = parseBrlNumber(rawTotPrice) || Number((qty * unitPrice).toFixed(2));

      if (cleanName && cleanName.length > 2 && unitPrice > 0) {
        items.push({
          id: `sefaz_${Date.now()}_${items.length}_${Math.random().toString(36).substr(2, 4)}`,
          name: cleanName,
          quantity: qty,
          unit,
          unitPrice,
          totalPrice: totPrice,
          category: inferProductCategory(cleanName),
          brand: extractBrandFromDescription(cleanName),
          barcode: rawBarcode && rawBarcode.length >= 7 ? rawBarcode : undefined,
          selected: true
        });
      }
    }
  }

  // Ensure totalAmount aligns with items sum if missing or misparsed
  const itemsSum = items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
  if (!totalAmount || totalAmount <= 0 || (itemsSum > 0 && Math.abs(totalAmount - itemsSum) > itemsSum * 0.8)) {
    if (itemsSum > 0) {
      totalAmount = Number(itemsSum.toFixed(2));
    }
  }

  return {
    market,
    date,
    totalAmount,
    items
  };
}

/**
 * Extracts QR Code v2 parameters from the URL itself (chNFe, vNF, date, UF)
 */
export function parseQrCodeParameters(qrText: string): Partial<OcrResultData> & { chaveAcesso?: string; uf?: string } {
  if (!qrText) return {};

  let chaveAcesso = '';
  let totalAmount: number | undefined = undefined;
  let date = new Date().toISOString().substring(0, 10);
  let uf = 'BA';

  // 1. Chave de acesso (44 digits)
  const chaveMatch = qrText.match(/(\d{44})/);
  if (chaveMatch) {
    chaveAcesso = chaveMatch[1];
    const ufCode = chaveAcesso.substring(0, 2);
    if (UF_IBGE_MAP[ufCode]) {
      uf = UF_IBGE_MAP[ufCode];
    }
    const yearMonth = chaveAcesso.substring(2, 6);
    if (yearMonth.length === 4) {
      const yy = yearMonth.substring(0, 2);
      const mm = yearMonth.substring(2, 4);
      date = `20${yy}-${mm}-01`;
    }
  }

  // 2. Query param `p=` splitting
  // Format: chNFe|nVersao|tpAmb|cDest|dhEmi|vNF|vICMS|digVal|cIdToken|cHashQRCode
  const pParam = qrText.includes('p=') ? qrText.split('p=')[1].split('&')[0] : '';
  if (pParam) {
    const decodedP = decodeURIComponent(pParam);
    const parts = decodedP.split('|');
    if (parts.length >= 5) {
      if (!chaveAcesso && parts[0]?.length === 44) {
        chaveAcesso = parts[0];
      }
      // Value vNF is index 4, 5, or 6
      for (let i = 4; i < Math.min(parts.length, 7); i++) {
        const partVal = parts[i]?.trim();
        if (/^\d+(\.\d{1,2})?$/.test(partVal)) {
          const val = parseFloat(partVal);
          if (val > 0 && !totalAmount) {
            totalAmount = val;
            break;
          }
        }
      }
    }
  }

  return {
    chaveAcesso,
    uf,
    date,
    totalAmount
  };
}

/**
 * Universal SEFAZ Fetcher:
 * - Direct Native HTTP in APK via CapacitorHttp (bypasses CORS completely)
 * - Dev server proxy
 * - Public CORS proxies as web fallback
 */
export async function fetchSefazQrCodeData(qrCodeUrl: string): Promise<OcrResultData> {
  let targetUrl = (qrCodeUrl || '').trim();

  if (!targetUrl) {
    throw new Error('Nenhum link de QR Code foi informado.');
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    if (targetUrl.includes('sefaz.') || targetUrl.includes('fazenda.') || targetUrl.includes('nfce')) {
      targetUrl = `http://${targetUrl}`;
    }
  }

  let html = '';
  let fetchError: Error | null = null;

  // Strategy 1: Native CapacitorHttp (For Android APK / Mobile - 100% reliable direct connection)
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url: targetUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        connectTimeout: 12000,
        readTimeout: 15000
      });

      if (res.data) {
        html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      }
    } catch (err: any) {
      console.warn('Native CapacitorHttp fetch error:', err);
      fetchError = err;
    }
  }

  // Strategy 2: Local server route (Web development environment)
  if (!html && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    try {
      const res = await fetch('/api/sefaz/parse-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeUrl: targetUrl })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.items) && json.items.length > 0) {
          return json;
        }
      }
    } catch {
      // ignore
    }
  }

  // Strategy 3: Public Web CORS Proxy (for browser testing)
  if (!html) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, {
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 100) {
            html = text;
            break;
          }
        }
      } catch {
        // try next proxy
      }
    }
  }

  // Strategy 4: Direct browser fetch (if CORS is allowed by the SEFAZ portal)
  if (!html) {
    try {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // ignore
    }
  }

  // If HTML was retrieved, parse it
  if (html && html.length > 50) {
    const parsedData = parseSefazHtml(html, targetUrl);
    if (parsedData.items && parsedData.items.length > 0) {
      return parsedData;
    }
  }

  // Fallback Strategy 5: Parse parameters from QR Code url (Chave de Acesso, Total, UF)
  const qrParams = parseQrCodeParameters(targetUrl);
  if (qrParams.chaveAcesso) {
    const ufLabel = qrParams.uf ? `SEFAZ ${qrParams.uf}` : 'SEFAZ';
    return {
      market: `Cupom Fiscal (${ufLabel})`,
      date: qrParams.date || new Date().toISOString().substring(0, 10),
      totalAmount: qrParams.totalAmount,
      items: [
        {
          id: `item_qr_${Date.now()}`,
          name: `Compra NFC-e (${ufLabel})`,
          quantity: 1,
          unit: 'Un',
          unitPrice: qrParams.totalAmount || 0,
          totalPrice: qrParams.totalAmount || 0,
          category: 'Mercearia',
          brand: '',
          selected: true
        }
      ]
    };
  }

  throw new Error(
    fetchError?.message ||
    'Não foi possível extrair os itens da SEFAZ neste momento. Verifique se o QR Code do cupom é legível ou adicione os itens manualmente.'
  );
}
