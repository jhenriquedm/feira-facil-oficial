import { describe, it, expect } from 'vitest';
import { 
  parseSefazHtml, 
  parseQrCodeParameters, 
  cleanProductDescription, 
  inferProductCategory,
  normalizeUnitString,
  parseBrlNumber,
  parseBrlDate
} from '../utils/sefazParser';

describe('SEFAZ NFC-e Parser & Data Extractor', () => {
  it('correctly parses numbers in Brazilian Real format', () => {
    expect(parseBrlNumber('16,98')).toBe(16.98);
    expect(parseBrlNumber('R$ 1.250,50')).toBe(1250.50);
    expect(parseBrlNumber('0,854')).toBe(0.854);
    expect(parseBrlNumber('25.90')).toBe(25.90);
  });

  it('correctly parses dates in DD/MM/YYYY format', () => {
    expect(parseBrlDate('01/10/2026')).toBe('2026-10-01');
    expect(parseBrlDate('25/09/2026')).toBe('2026-09-25');
  });

  it('cleans obscure fiscal abbreviations and strips metadata tails into readable consumer titles', () => {
    expect(cleanProductDescription('FILEZ FGO PERD 1KG')).toBe('Filé Frango Perdigão 1kg');
    expect(cleanProductDescription('ACUC CRIST UNI 1KG')).toBe('Açúcar Cristal União 1kg');
    expect(cleanProductDescription('LEIT COND MOC TP 395G')).toBe('Leite Condensado Moça Tp 395g');
    expect(cleanProductDescription('DESINF PINHO SOL 1L')).toBe('Desinfetante Pinho Sol 1l');
    expect(cleanProductDescription('Acem Esp Kg Qtde.:0,236 UN: KG Vl. Unit.: 37,95')).toBe('Acem Esp Kg');
    expect(cleanProductDescription('Ovo Naturaves Bco Gd C 30un Qtde.:1 UN: UN Vl. Unit.: 15,49')).toBe('Ovo Naturaves Bco Gd C 30un');
    expect(cleanProductDescription('(Código: 789123456) Picanha Friboi Qtde.: 1,5 UN: KG Vl. Total: 85,00')).toBe('Picanha Friboi');
  });

  it('infers correct supermarket categories including eggs in dairy category', () => {
    expect(inferProductCategory('Filé de Frango Perdigão')).toBe('Açougue');
    expect(inferProductCategory('Acém Especial Bovino')).toBe('Açougue');
    expect(inferProductCategory('Picanha Friboi')).toBe('Açougue');
    expect(inferProductCategory('Leite Integral Piracanjuba')).toBe('Laticínios');
    expect(inferProductCategory('Ovo Naturaves Branco Grande 30un')).toBe('Laticínios');
    expect(inferProductCategory('Ovos Caipiras')).toBe('Laticínios');
    expect(inferProductCategory('Arroz Camil 5kg')).toBe('Mercearia');
    expect(inferProductCategory('Tomate Saladete')).toBe('Hortifruti');
    expect(inferProductCategory('Detergente Ypê')).toBe('Limpeza');
    expect(inferProductCategory('Refrigerante Coca-Cola 2L')).toBe('Bebidas');
    expect(inferProductCategory('Sabonete Dove')).toBe('Higiene');
  });

  it('normalizes units to standard formats', () => {
    expect(normalizeUnitString('KG')).toBe('Kg');
    expect(normalizeUnitString('BJ')).toBe('Bandeja');
    expect(normalizeUnitString('LATA')).toBe('Lata');
    expect(normalizeUnitString('LT')).toBe('Lata');
    expect(normalizeUnitString('PC')).toBe('Pacote');
    expect(normalizeUnitString('CX')).toBe('Caixa');
    expect(normalizeUnitString('UN')).toBe('Un');
  });

  it('parses typical SEFAZ HTML page with item rows and total', () => {
    const mockHtml = `
      <html>
        <body>
          <div id="conteudo">
            <div class="txtTopo">SUPERMERCADOS BH COM. DE ALIMENTOS S.A</div>
            <div>01/10/2026 14:03:57</div>
            <table id="tabResult">
              <tr class="RItem">
                <td class="txtTit">FILEZ FGO PERD 1KG (Código: 7891515614065)</td>
                <td class="Rqtd">Qtde.: 1</td>
                <td class="RUN">UN: BJ</td>
                <td class="RvlUnit">Vl. Unit.: 16,98</td>
                <td class="valor">16,98</td>
              </tr>
            </table>
            <div class="totalNumb">16,98</div>
          </div>
        </body>
      </html>
    `;

    const result = parseSefazHtml(mockHtml);
    expect(result.market).toBe('SUPERMERCADOS BH COM. DE ALIMENTOS S.A');
    expect(result.totalAmount).toBe(16.98);
    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toContain('Filé');
    expect(result.items[0].unitPrice).toBe(16.98);
    expect(result.items[0].totalPrice).toBe(16.98);
    expect(result.items[0].unit).toBe('Bandeja');
    expect(result.items[0].barcode).toBe('7891515614065');
  });

  it('extracts QR code v2 parameters from URL correctly', () => {
    const qrUrl = 'http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx?p=29261004641376047795650090000111301385831190|2|1|1|16.98|34.50|abc|1|hash';
    const params = parseQrCodeParameters(qrUrl);
    expect(params.chaveAcesso).toBe('29261004641376047795650090000111301385831190');
    expect(params.uf).toBe('BA');
    expect(params.totalAmount).toBe(16.98);
  });
});
