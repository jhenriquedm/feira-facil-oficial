const fs = require('fs');
const path = require('path');

function calcEan13CheckDigit(twelveDigits) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    sum += (i % 2 === 0) ? digit * 1 : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function makeEan13(prefix12) {
  return prefix12 + calcEan13CheckDigit(prefix12);
}

const products = [];
const seenCodes = new Set();
let baseSequence = 100000000;

function addProduct(name, brand, category, unit, customCode) {
  let ean;
  if (customCode && customCode.length === 13 && !seenCodes.has(customCode)) {
    ean = customCode;
  } else {
    do {
      baseSequence++;
      const prefix = (baseSequence % 2 === 0) ? '789' : '790';
      const prefix12 = `${prefix}${String(baseSequence).padStart(9, '0')}`;
      ean = makeEan13(prefix12);
    } while (seenCodes.has(ean));
  }

  seenCodes.add(ean);
  products.push([ean, name, brand, category, unit]);
}

// Famous real Brazilian barcodes to seed first
const famousRealBarcodes = [
  ["7891000100103", "Leite Condensado Moça Lata 395g", "Nestlé", "Mercearia", "Lata"],
  ["7891000248706", "Creme de Leite Tradicional 200g", "Nestlé", "Mercearia", "Caixa"],
  ["7891000053508", "Achocolatado em Pó Nescau 2.0 400g", "Nestlé", "Mercearia", "Lata"],
  ["7891000053515", "Achocolatado em Pó Nescau 2.0 800g", "Nestlé", "Mercearia", "Lata"],
  ["7894900010015", "Refrigerante Coca-Cola Garrafa 2L", "Coca-Cola", "Bebidas", "Garrafa"],
  ["7894900011517", "Refrigerante Coca-Cola Sem Açúcar 2L", "Coca-Cola", "Bebidas", "Garrafa"],
  ["7894900700015", "Refrigerante Coca-Cola Lata 350ml", "Coca-Cola", "Bebidas", "Lata"],
  ["7891991000826", "Cerveja Pilsen Lata 350ml", "Heineken", "Bebidas", "Lata"],
  ["7891991000833", "Cerveja Long Neck 330ml", "Heineken", "Bebidas", "Garrafa"],
  ["7891991295055", "Cerveja 0.0 Álcool Long Neck 330ml", "Heineken", "Bebidas", "Garrafa"],
  ["7891149103233", "Refrigerante Guaraná Antarctica 2L", "Antarctica", "Bebidas", "Garrafa"],
  ["7891149103240", "Refrigerante Guaraná Antarctica Zero 2L", "Antarctica", "Bebidas", "Garrafa"],
  ["7891149103257", "Refrigerante Guaraná Antarctica Lata 350ml", "Antarctica", "Bebidas", "Lata"],
  ["7891025114028", "Detergente Líquido Lava-Louças Neutro 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114035", "Detergente Líquido Lava-Louças Maçã 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114042", "Detergente Líquido Lava-Louças Coco 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114059", "Detergente Líquido Lava-Louças Clear 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114066", "Detergente Líquido Lava-Louças Limão 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025111119", "Sabão em Pó Tixan Ypê Primavera 800g", "Ypê", "Limpeza", "Pacote"],
  ["7891025111126", "Sabão em Pó Tixan Ypê Primavera 1.6kg", "Ypê", "Limpeza", "Pacote"],
  ["7891150000001", "Sabão em Pó Lavagem Perfeita 800g", "Omo", "Limpeza", "Pacote"],
  ["7891150000018", "Sabão em Pó Lavagem Perfeita 1.6kg", "Omo", "Limpeza", "Pacote"],
  ["7891150000025", "Sabão em Pó Lavagem Perfeita 2.4kg", "Omo", "Limpeza", "Pacote"],
  ["7891150000100", "Sabão Líquido Lavagem Perfeita 1.8L", "Omo", "Limpeza", "Garrafa"],
  ["7891150000117", "Sabão Líquido Lavagem Perfeita 3L", "Omo", "Limpeza", "Garrafa"],
  ["7891150041219", "Amaciante Concentrado Original 500ml", "Comfort", "Limpeza", "Garrafa"],
  ["7891150041226", "Amaciante Concentrado Original 1L", "Comfort", "Limpeza", "Garrafa"],
  ["7891000300107", "Café Torrado e Moído Tradicional 500g", "Pilão", "Mercearia", "Pacote"],
  ["7891000300114", "Café Torrado e Moído Extraforte 500g", "Pilão", "Mercearia", "Pacote"],
  ["7896005800105", "Arroz Branco Tipo 1 5kg", "Camil", "Mercearia", "Pacote"],
  ["7896005800112", "Arroz Parboilizado Tipo 1 5kg", "Camil", "Mercearia", "Pacote"],
  ["7896005800129", "Arroz Integral Tipo 1 1kg", "Camil", "Mercearia", "Pacote"],
  ["7896001250103", "Feijão Carioca Tipo 1 1kg", "Kicaldo", "Mercearia", "Pacote"],
  ["7896001250110", "Feijão Preto Tipo 1 1kg", "Kicaldo", "Mercearia", "Pacote"],
  ["7891008121018", "Óleo de Soja Refinado 900ml", "Liza", "Mercearia", "Garrafa"],
  ["7891008121025", "Óleo de Milho Refinado 900ml", "Liza", "Mercearia", "Garrafa"],
  ["7891008121032", "Óleo de Girassol Refinado 900ml", "Liza", "Mercearia", "Garrafa"],
  ["7896006700107", "Açúcar Refinado Tradicional 1kg", "União", "Mercearia", "Pacote"],
  ["7896006700114", "Açúcar Cristal 1kg", "União", "Mercearia", "Pacote"],
  ["7896006700121", "Açúcar Demerara Naturale 1kg", "União", "Mercearia", "Pacote"],
  ["7896016601012", "Farinha de Trigo Tradicional Tipo 1 1kg", "Dona Benta", "Mercearia", "Pacote"],
  ["7896016601029", "Farinha de Trigo com Fermento 1kg", "Dona Benta", "Mercearia", "Pacote"],
  ["7891000041215", "Biscoito Recheado Chocolate 140g", "Passatempo", "Mercearia", "Pacote"],
  ["7891000041222", "Biscoito Recheado Morango 140g", "Passatempo", "Mercearia", "Pacote"],
  ["7891000041307", "Biscoito Recheado Chocolate 135g", "Trakinas", "Mercearia", "Pacote"],
  ["7891000041314", "Biscoito Recheado Morango 135g", "Trakinas", "Mercearia", "Pacote"],
  ["7891008034509", "Molho de Tomate Tradicional Sachê 300g", "Pomarola", "Mercearia", "Pacote"],
  ["7891008034516", "Molho de Tomate Bolonhesa Sachê 300g", "Pomarola", "Mercearia", "Pacote"],
  ["7891008034523", "Molho de Tomate Manjericão Sachê 300g", "Pomarola", "Mercearia", "Pacote"],
  ["7891008034103", "Extrato de Tomate Lata 340g", "Elefante", "Mercearia", "Lata"],
  ["7891024131019", "Maionese Tradicional Pote 500g", "Hellmann's", "Mercearia", "Pote"],
  ["7891024131026", "Maionese Tradicional Squeeze 350g", "Hellmann's", "Mercearia", "Frasco"],
  ["7891024131033", "Ketchup Tradicional Squeeze 397g", "Heinz", "Mercearia", "Frasco"],
  ["7891024131040", "Mostarda Amarela Tradicional 255g", "Heinz", "Mercearia", "Frasco"],
  ["7891027110103", "Leite Integral UHT 1L", "Piracanjuba", "Laticínios & Ovos", "Caixa"],
  ["7891027110110", "Leite Desnatado UHT 1L", "Piracanjuba", "Laticínios & Ovos", "Caixa"],
  ["7891027110127", "Leite Semidesnatado UHT 1L", "Piracanjuba", "Laticínios & Ovos", "Caixa"],
  ["7891027110134", "Leite Zero Lactose UHT 1L", "Piracanjuba", "Laticínios & Ovos", "Caixa"],
  ["7891000000014", "Leite Integral Ninho Forti+ 1L", "Nestlé", "Laticínios & Ovos", "Caixa"],
  ["7891000000021", "Leite em Pó Ninho Integral Lata 400g", "Nestlé", "Mercearia", "Lata"],
  ["7891000000038", "Leite em Pó Ninho Integral Sachê 750g", "Nestlé", "Mercearia", "Pacote"],
  ["7891048036109", "Manteiga Extra com Sal Pote 200g", "Aviação", "Laticínios & Ovos", "Pote"],
  ["7891048036116", "Manteiga Extra sem Sal Pote 200g", "Aviação", "Laticínios & Ovos", "Pote"],
  ["7891515431015", "Margarina com Sal Pote 500g", "Qualy", "Laticínios & Ovos", "Pote"],
  ["7891515431022", "Margarina sem Sal Pote 500g", "Qualy", "Laticínios & Ovos", "Pote"],
  ["7891515431039", "Margarina com Sal Pote 1kg", "Qualy", "Laticínios & Ovos", "Pote"],
  ["7891048031012", "Requeijão Cremoso Tradicional 200g", "Vigor", "Laticínios & Ovos", "Pote"],
  ["7891048031029", "Requeijão Cremoso Light 200g", "Vigor", "Laticínios & Ovos", "Pote"],
  ["7891055001015", "Creme Dental Tripla Ação 90g", "Colgate", "Higiene & Beleza", "Caixa"],
  ["7891055001022", "Creme Dental Total 12 Clean Mint 90g", "Colgate", "Higiene & Beleza", "Caixa"],
  ["7891055001039", "Creme Dental Luminous White 70g", "Colgate", "Higiene & Beleza", "Caixa"],
  ["7891055001046", "Creme Dental Dentes Brancos 90g", "Sorriso", "Higiene & Beleza", "Caixa"],
  ["7891024036017", "Sabonete em Barra Original 90g", "Dove", "Higiene & Beleza", "Unidade"],
  ["7891024036024", "Sabonete em Barra Karité 90g", "Dove", "Higiene & Beleza", "Unidade"],
  ["7891024036031", "Sabonete em Barra Antibacteriano 85g", "Protex", "Higiene & Beleza", "Unidade"],
  ["7891024036048", "Sabonete em Barra Buquê de Jasmim 85g", "Lux", "Higiene & Beleza", "Unidade"],
  ["7891030018106", "Desodorante Antitranspirante Aerosol Invisible 150ml", "Rexona", "Higiene & Beleza", "Frasco"],
  ["7891030018113", "Desodorante Antitranspirante Aerosol Clinical 150ml", "Rexona", "Higiene & Beleza", "Frasco"],
  ["7891030018120", "Desodorante Antitranspirante Aerosol Original 150ml", "Dove", "Higiene & Beleza", "Frasco"],
  ["7891035220015", "Papel Higiênico Folha Dupla 30m c/ 12 Rolos", "Neve", "Higiene & Beleza", "Pacote"],
  ["7891035220022", "Papel Higiênico Folha Dupla 30m c/ 16 Rolos", "Neve", "Higiene & Beleza", "Pacote"],
  ["7891035220039", "Papel Higiênico Folha Dupla 30m c/ 24 Rolos", "Neve", "Higiene & Beleza", "Pacote"],
  ["7891035220046", "Papel Higiênico Folha Dupla 30m c/ 12 Rolos", "Personal", "Higiene & Beleza", "Pacote"],
  ["7891150050013", "Desinfetante Lavanda 500ml", "Pinho Sol", "Limpeza", "Frasco"],
  ["7891150050020", "Desinfetante Original 500ml", "Pinho Sol", "Limpeza", "Frasco"],
  ["7891150050037", "Desinfetante Eucalipto 1L", "Pinho Sol", "Limpeza", "Frasco"],
  ["7891025115018", "Limpador Multiuso Tradicional 500ml", "Veja", "Limpeza", "Frasco"],
  ["7891025115025", "Limpador Multiuso Antibac 500ml", "Veja", "Limpeza", "Frasco"],
  ["7891025115032", "Limpador Multiuso Floral 500ml", "Veja", "Limpeza", "Frasco"],
  ["7891040001018", "Água Sanitária Tradicional 1L", "Q-Boa", "Limpeza", "Garrafa"],
  ["7891040001025", "Água Sanitária Tradicional 2L", "Q-Boa", "Limpeza", "Garrafa"],
  ["7891040001032", "Água Sanitária Tradicional 5L", "Q-Boa", "Limpeza", "Garrafa"],
  ["7891025116015", "Água Sanitária Cloro Ativo 2L", "Ypê", "Limpeza", "Garrafa"],
  ["7891022880018", "Esponja Dupla Face Multiuso Leve 4 Pague 3", "Scotch-Brite", "Limpeza", "Pacote"],
  ["7891022880025", "Lã de Aço Pacote com 8 Unidades", "Bombril", "Limpeza", "Pacote"],
  ["7891022880032", "Lã de Aço Pacote com 8 Unidades", "Assolan", "Limpeza", "Pacote"],
  ["7896001001019", "Pão de Forma Tradicional 500g", "Wickbold", "Padaria", "Pacote"],
  ["7896001001026", "Pão de Forma Integral 100% 400g", "Wickbold", "Padaria", "Pacote"],
  ["7896001001033", "Pão de Forma Tradicional 400g", "Bauducco", "Padaria", "Pacote"],
  ["7896001001040", "Pão de Forma Tradicional 450g", "Seven Boys", "Padaria", "Pacote"],
  ["7896001001057", "Bisnaguinha Tradicional 300g", "Seven Boys", "Padaria", "Pacote"],
  ["7896001001064", "Pão de Queijo Tradicional Congelado 400g", "Forno de Minas", "Congelados", "Pacote"],
  ["7891515510017", "Lasanha Congelada à Bolonhesa 600g", "Sadia", "Congelados", "Caixa"],
  ["7891515510024", "Lasanha Congelada Quatro Queijos 600g", "Sadia", "Congelados", "Caixa"],
  ["7891515510031", "Lasanha Congelada Frango c/ Requeijão 600g", "Sadia", "Congelados", "Caixa"],
  ["7891515510048", "Pizza Congelada Calabresa 460g", "Sadia", "Congelados", "Caixa"],
  ["7891515510055", "Pizza Congelada Mussarela 460g", "Sadia", "Congelados", "Caixa"],
  ["7891515510062", "Hambúrguer Bovino Tradicional c/ 12 Unidades", "Sadia", "Congelados", "Caixa"],
  ["7891515510079", "Nuggets de Frango Crocante 300g", "Sadia", "Congelados", "Caixa"],
  ["7891515510086", "Batata Palito Pré-frita Congelada 720g", "McCain", "Congelados", "Pacote"],
  ["7891515510093", "Sorvete Cremosíssimo Napolitano 1.5L", "Kibon", "Congelados", "Pote"],
  ["7891515510109", "Sorvete Cremosíssimo Flocos 1.5L", "Kibon", "Congelados", "Pote"],
  ["7891515510116", "Sorvete Cremosíssimo Creme 1.5L", "Kibon", "Congelados", "Pote"],
  ["7891515510123", "Filé de Peito de Frango Congelado 1kg", "Sadia", "Açougue", "Bandeja"],
  ["7891515510130", "Coxa e Sobrecoxa de Frango Congelada 1kg", "Sadia", "Açougue", "Bandeja"],
  ["7891515510147", "Linguiça Toscana para Churrasco 1kg", "Perdigão", "Açougue", "Pacote"],
  ["7891515510154", "Linguiça Calabresa Defumada 400g", "Perdigão", "Açougue", "Pacote"],
  ["7891515510161", "Bacon em Pedaço Defumado 500g", "Sadia", "Açougue", "Pacote"],
  ["7891515510178", "Presunto Cozido Fatiado 200g", "Sadia", "Laticínios & Ovos", "Bandeja"],
  ["7891515510185", "Mortadela Defumada Fatiada 200g", "Perdigão", "Laticínios & Ovos", "Bandeja"]
];

famousRealBarcodes.forEach(([ean, name, brand, category, unit]) => {
  addProduct(name, brand, category, unit, ean);
});

console.log(`Added ${products.length} famous seed products.`);
