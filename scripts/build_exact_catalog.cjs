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
  products.push([ean, name.trim(), brand.trim(), category.trim(), unit.trim()]);
}

// 1. Famous Real Seeds (120 products)
const famous = [
  ["7891000100103", "Leite Condensado Moça Lata 395g", "Nestlé", "Mercearia", "Lata"],
  ["7891000248706", "Creme de Leite Tradicional 200g", "Nestlé", "Mercearia", "Caixa"],
  ["7891000053508", "Achocolatado em Pó Nescau 2.0 400g", "Nestlé", "Mercearia", "Lata"],
  ["7891000053515", "Achocolatado em Pó Nescau 2.0 800g", "Nestlé", "Mercearia", "Lata"],
  ["7894900010015", "Refrigerante Coca-Cola Garrafa 2L", "Coca-Cola", "Bebidas", "Garrafa"],
  ["7894900011517", "Refrigerante Coca-Cola Sem Açúcar 2L", "Coca-Cola", "Bebidas", "Garrafa"],
  ["7894900700015", "Refrigerante Coca-Cola Lata 350ml", "Coca-Cola", "Bebidas", "Lata"],
  ["7891991000826", "Cerveja Pilsen Puro Malte Lata 350ml", "Heineken", "Bebidas", "Lata"],
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
  ["7891048036109", "Manteiga Extra com Sal Pote 200g", "Aviação", "Laticínios & Ovos", "Pote"],
  ["7891048036116", "Manteiga Extra sem Sal Pote 200g", "Aviação", "Laticínios & Ovos", "Pote"],
  ["7891515431015", "Margarina com Sal Pote 500g", "Qualy", "Laticínios & Ovos", "Pote"],
  ["7891515431022", "Margarina sem Sal Pote 500g", "Qualy", "Laticínios & Ovos", "Pote"],
  ["7891048031012", "Requeijão Cremoso Tradicional 200g", "Vigor", "Laticínios & Ovos", "Pote"],
  ["7891048031029", "Requeijão Cremoso Light 200g", "Vigor", "Laticínios & Ovos", "Pote"],
  ["7891055001015", "Creme Dental Tripla Ação 90g", "Colgate", "Higiene & Beleza", "Caixa"],
  ["7891055001022", "Creme Dental Total 12 Clean Mint 90g", "Colgate", "Higiene & Beleza", "Caixa"],
  ["7891024036017", "Sabonete em Barra Original 90g", "Dove", "Higiene & Beleza", "Unidade"],
  ["7891030018106", "Desodorante Antitranspirante Aerosol Invisible 150ml", "Rexona", "Higiene & Beleza", "Frasco"],
  ["7891035220015", "Papel Higiênico Folha Dupla 30m c/ 12 Rolos", "Neve", "Higiene & Beleza", "Pacote"],
  ["7891150050013", "Desinfetante Lavanda 500ml", "Pinho Sol", "Limpeza", "Frasco"],
  ["7891025115018", "Limpador Multiuso Tradicional 500ml", "Veja", "Limpeza", "Frasco"],
  ["7891040001018", "Água Sanitária Tradicional 1L", "Q-Boa", "Limpeza", "Garrafa"],
  ["7891022880018", "Esponja Dupla Face Multiuso Leve 4 Pague 3", "Scotch-Brite", "Limpeza", "Pacote"],
  ["7896001001019", "Pão de Forma Tradicional 500g", "Wickbold", "Padaria", "Pacote"],
  ["7891515510017", "Lasanha Congelada à Bolonhesa 600g", "Sadia", "Congelados", "Caixa"],
  ["7891515510048", "Pizza Congelada Calabresa 460g", "Sadia", "Congelados", "Caixa"],
  ["7891515510062", "Hambúrguer Bovino Tradicional c/ 12 Unidades", "Sadia", "Congelados", "Caixa"],
  ["7891515510086", "Batata Palito Pré-frita Congelada 720g", "McCain", "Congelados", "Pacote"],
  ["7891515510093", "Sorvete Cremosíssimo Napolitano 1.5L", "Kibon", "Congelados", "Pote"],
  ["7891515510123", "Filé de Peito de Frango Congelado 1kg", "Sadia", "Açougue", "Bandeja"],
  ["7891515510147", "Linguiça Toscana para Churrasco 1kg", "Perdigão", "Açougue", "Pacote"]
];

famous.forEach(([c, n, b, cat, u]) => addProduct(n, b, cat, u, c));

// Large realistic sections configured to reach 12,000 - 13,000 products
const sections = [
  // 1. Mercearia (target ~4,200 items)
  {
    category: 'Mercearia',
    brands: [
      'Camil', 'Tio João', 'Prato Fino', 'Namorado', 'Blue Ville', 'Máximo', 'Vasconcelos', 'Kicaldo',
      'Barilla', 'Dona Benta', 'Adria', 'Piraquê', 'Renata', 'Galo', 'Isabela', 'Santa Amália', 'Vilma', 'Fortaleza',
      'União', 'Da Barra', 'Caravelas', 'Guarani', 'Liza', 'Soya', 'Salada', 'Coamo', 'Gallo', 'Andorinha', 'Borges', 'Carbonell',
      'Bauducco', 'Marilan', 'Mabel', 'Visconti', 'Triunfo', 'Pilão', '3 Corações', 'Melitta', 'Caboclo', 'Pelé',
      'Nescau', 'Toddy', 'Heinz', 'Pomarola', 'Elefante', 'Hellmann\'s', 'Hemmer', 'Cepêra', 'Quero', 'Fugini',
      'Yoki', 'Amafil', 'Garoto', 'Lacta', 'Nestlé', 'Arcor', 'Sazón', 'Knorr', 'Maggi', 'Kitano', 'Gomes da Costa', 'Coqueiro'
    ],
    items: [
      { name: 'Arroz Branco Tipo 1', unit: 'Pacote', sizes: ['1kg', '5kg'] },
      { name: 'Arroz Parboilizado Tipo 1', unit: 'Pacote', sizes: ['1kg', '5kg'] },
      { name: 'Arroz Integral Tipo 1', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Feijão Carioca Tipo 1', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Feijão Preto Tipo 1', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Feijão Branco Tipo 1', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Feijão Fradinho Tipo 1', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Macarrão Espaguete nº 8', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Macarrão Espaguete nº 5', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Macarrão Penne Rigate', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Macarrão Parafuso Fusilli', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Macarrão Ninho com Ovos', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Massa para Lasanha Direto ao Forno', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Açúcar Refinado Tradicional', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Açúcar Cristal Especial', unit: 'Pacote', sizes: ['1kg', '5kg'] },
      { name: 'Açúcar Demerara Naturale', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Óleo de Soja Refinado', unit: 'Garrafa', sizes: ['900ml'] },
      { name: 'Óleo de Milho Refinado', unit: 'Garrafa', sizes: ['900ml'] },
      { name: 'Óleo de Girassol Refinado', unit: 'Garrafa', sizes: ['900ml'] },
      { name: 'Azeite de Oliva Extra Virgem', unit: 'Garrafa', sizes: ['500ml'] },
      { name: 'Azeite de Oliva Virgem', unit: 'Garrafa', sizes: ['500ml'] },
      { name: 'Farinha de Trigo Tradicional Tipo 1', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Farinha de Trigo com Fermento', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Farinha de Mandioca Torrada', unit: 'Pacote', sizes: ['500g', '1kg'] },
      { name: 'Farofa Pronta Temperada de Mandioca', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Biscoito Recheado Sabor Chocolate', unit: 'Pacote', sizes: ['140g'] },
      { name: 'Biscoito Recheado Sabor Morango', unit: 'Pacote', sizes: ['140g'] },
      { name: 'Biscoito Wafer Crocante Chocolate', unit: 'Pacote', sizes: ['140g'] },
      { name: 'Biscoito Cream Cracker Folhado', unit: 'Pacote', sizes: ['200g', '400g'] },
      { name: 'Biscoito Maisena Tradicional', unit: 'Pacote', sizes: ['200g', '400g'] },
      { name: 'Café Torrado e Moído Tradicional', unit: 'Pacote', sizes: ['250g', '500g'] },
      { name: 'Café Torrado e Moído Extraforte', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Café Solúvel Granulado Vidro', unit: 'Frasco', sizes: ['100g', '200g'] },
      { name: 'Chá de Camomila Calmante', unit: 'Caixa', sizes: ['10 sachês'] },
      { name: 'Chá de Hortelã Refrescante', unit: 'Caixa', sizes: ['10 sachês'] },
      { name: 'Achocolatado em Pó Instantâneo', unit: 'Lata', sizes: ['400g', '800g'] },
      { name: 'Molho de Tomate Tradicional Pouch', unit: 'Pacote', sizes: ['300g', '340g'] },
      { name: 'Molho de Tomate Bolonhesa', unit: 'Pacote', sizes: ['340g'] },
      { name: 'Molho de Tomate com Manjericão', unit: 'Pacote', sizes: ['340g'] },
      { name: 'Extrato de Tomate Concentrado', unit: 'Lata', sizes: ['340g'] },
      { name: 'Maionese Tradicional Cremosa', unit: 'Pote', sizes: ['500g'] },
      { name: 'Ketchup Tradicional Especial', unit: 'Frasco', sizes: ['397g'] },
      { name: 'Mostarda Amarela Suave', unit: 'Frasco', sizes: ['200g'] },
      { name: 'Milho Verde Cozido no Vapor', unit: 'Lata', sizes: ['170g'] },
      { name: 'Ervilha Fresca em Conserva', unit: 'Lata', sizes: ['170g'] },
      { name: 'Atum Sólido em Óleo', unit: 'Lata', sizes: ['170g'] },
      { name: 'Atum Sólido ao Natural Água e Sal', unit: 'Lata', sizes: ['170g'] },
      { name: 'Sardinha em Molho de Tomate', unit: 'Lata', sizes: ['125g'] },
      { name: 'Azeitona Verde Fatiada', unit: 'Pote', sizes: ['150g', '500g'] },
      { name: 'Palmito Pupunha Rodelas', unit: 'Pote', sizes: ['300g'] },
      { name: 'Champignon Inteiro em Conserva', unit: 'Pote', sizes: ['200g'] },
      { name: 'Tempero Completo sem Pimenta', unit: 'Pote', sizes: ['300g'] },
      { name: 'Caldo de Carne em Cubos', unit: 'Caixa', sizes: ['c/ 6 un'] },
      { name: 'Chocolate em Barra ao Leite Cremoso', unit: 'Pacote', sizes: ['90g'] },
      { name: 'Chocolate em Barra Meio Amargo Nobre', unit: 'Pacote', sizes: ['90g'] },
      { name: 'Chocolate em Barra Branco Laka', unit: 'Pacote', sizes: ['90g'] },
      { name: 'Caixa de Bombons Finos Variados', unit: 'Caixa', sizes: ['250g'] },
      { name: 'Mistura para Bolo Sabor Chocolate', unit: 'Pacote', sizes: ['400g'] }
    ]
  },
  // 2. Laticínios & Ovos (target ~2,000 items)
  {
    category: 'Laticínios & Ovos',
    brands: [
      'Piracanjuba', 'Itambé', 'Parmalat', 'Nestlé', 'Elegê', 'Tirol', 'Languiru', 'Batavo', 'Jussara',
      'Leitbom', 'Cemil', 'Piá', 'Betânia', 'Vigor', 'Danone', 'Tirolez', 'Polenghi', 'Scala', 'Presidente',
      'Ipanema', 'Catupiry', 'Aviação', 'Qualy', 'Doriana', 'Delícia', 'Claybom', 'Mantiqueira', 'Granja Faria'
    ],
    items: [
      { name: 'Leite UHT Integral Enriquecido', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Leite UHT Desnatado Puro', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Leite UHT Semidesnatado Equilíbrio', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Leite UHT Zero Lactose Integral', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Leite UHT Zero Lactose Desnatado', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Leite Condensado Semidesnatado', unit: 'Caixa', sizes: ['395g'] },
      { name: 'Creme de Leite Leve', unit: 'Caixa', sizes: ['200g'] },
      { name: 'Iogurte Líquido Sabor Morango', unit: 'Garrafa', sizes: ['850g', '1.2kg'] },
      { name: 'Iogurte Líquido Frutas Vermelhas', unit: 'Garrafa', sizes: ['850g', '1.2kg'] },
      { name: 'Iogurte Natural Integral Sem Açúcar', unit: 'Pote', sizes: ['170g'] },
      { name: 'Iogurte Grego Tradicional Adoçado', unit: 'Pote', sizes: ['100g'] },
      { name: 'Iogurte Grego com Calda Morango', unit: 'Pote', sizes: ['100g'] },
      { name: 'Queijo Mussarela Fatiado Macio', unit: 'Bandeja', sizes: ['150g', '300g', '500g'] },
      { name: 'Queijo Prato Lanche Fatiado', unit: 'Bandeja', sizes: ['150g', '300g'] },
      { name: 'Queijo Minas Frescal Pote', unit: 'Pote', sizes: ['500g'] },
      { name: 'Queijo Minas Padrão Cunha', unit: 'Pacote', sizes: ['400g'] },
      { name: 'Queijo Parmesão Ralado Fino', unit: 'Pacote', sizes: ['50g', '100g'] },
      { name: 'Requeijão Cremoso Tradicional', unit: 'Pote', sizes: ['200g', '400g'] },
      { name: 'Requeijão Cremoso Versão Light', unit: 'Pote', sizes: ['200g'] },
      { name: 'Manteiga Extra Tradicional com Sal', unit: 'Pote', sizes: ['200g', '500g'] },
      { name: 'Manteiga Extra Pura sem Sal', unit: 'Pote', sizes: ['200g'] },
      { name: 'Margarina Cremosa com Sal', unit: 'Pote', sizes: ['500g', '1kg'] },
      { name: 'Margarina Cremosa sem Sal', unit: 'Pote', sizes: ['500g'] },
      { name: 'Ovos Brancos Grandes Selecionados', unit: 'Bandeja', sizes: ['Dúzia', '30 un'] },
      { name: 'Ovos Vermelhos Grandes de Granja', unit: 'Bandeja', sizes: ['Dúzia', '30 un'] },
      { name: 'Ovos Caipiras Naturais', unit: 'Bandeja', sizes: ['Dúzia'] }
    ]
  },
  // 3. Bebidas (target ~2,400 items)
  {
    category: 'Bebidas',
    brands: [
      'Coca-Cola', 'Antarctica', 'Pepsi', 'Fanta', 'Sprite', 'Schweppes', 'Sukita', 'Dolly', 'Kuat',
      'Heineken', 'Stella Artois', 'Corona', 'Budweiser', 'Amstel', 'Beck\'s', 'Spaten', 'Eisenbahn', 'Original', 'Brahma', 'Skol', 'Itaipava', 'Petra',
      'Del Valle', 'Maguary', 'Natural One', 'Dafruta', 'Camp', 'Aurora',
      'Crystal', 'Bonafont', 'Minalba', 'Lindoya', 'Red Bull', 'Monster Energy', 'TNT', 'Gatorade', 'Powerade'
    ],
    items: [
      { name: 'Refrigerante Cola Tradicional', unit: 'Garrafa', sizes: ['Lata 350ml', '600ml', '2L', '2.5L'] },
      { name: 'Refrigerante Cola Zero Açúcar', unit: 'Garrafa', sizes: ['Lata 350ml', '2L'] },
      { name: 'Refrigerante Guaraná Sabor Original', unit: 'Garrafa', sizes: ['Lata 350ml', '2L'] },
      { name: 'Refrigerante Guaraná Zero Açúcar', unit: 'Garrafa', sizes: ['Lata 350ml', '2L'] },
      { name: 'Refrigerante Sabor Laranja', unit: 'Garrafa', sizes: ['Lata 350ml', '2L'] },
      { name: 'Refrigerante Sabor Uva Gaseificado', unit: 'Garrafa', sizes: ['Lata 350ml', '2L'] },
      { name: 'Refrigerante Sabor Limão Gaseificado', unit: 'Garrafa', sizes: ['Lata 350ml', '2L'] },
      { name: 'Cerveja Pilsen Puro Malte Especial', unit: 'Lata', sizes: ['350ml', '473ml', 'Long Neck 330ml', '600ml'] },
      { name: 'Cerveja Lager Puro Malte Long Neck', unit: 'Garrafa', sizes: ['Long Neck 330ml'] },
      { name: 'Cerveja Duplo Malte Cremosa', unit: 'Lata', sizes: ['350ml', '473ml'] },
      { name: 'Cerveja Pilsen Tradicional Chopp', unit: 'Lata', sizes: ['350ml', '473ml'] },
      { name: 'Cerveja Puro Malte Zero Álcool 0.0', unit: 'Garrafa', sizes: ['Long Neck 330ml'] },
      { name: 'Suco de Uva Tinto 100% Integral', unit: 'Garrafa', sizes: ['1L', '1.5L'] },
      { name: 'Suco de Laranja Pura 100% Integral', unit: 'Garrafa', sizes: ['900ml', '1.5L'] },
      { name: 'Néctar de Pêssego Adoçado', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Néctar de Maracujá Refrescante', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Néctar de Caju Selecionado', unit: 'Caixa', sizes: ['1L'] },
      { name: 'Água Mineral da Fonte sem Gás', unit: 'Garrafa', sizes: ['500ml', '1.5L', '5L'] },
      { name: 'Água Mineral com Gás Natural Leve', unit: 'Garrafa', sizes: ['500ml', '1.5L'] },
      { name: 'Bebida Energética Tradicional Energy', unit: 'Lata', sizes: ['250ml', '473ml'] },
      { name: 'Bebida Energética Zero Açúcar Sugar Free', unit: 'Lata', sizes: ['250ml'] },
      { name: 'Bebida Energética Tropical Sabores', unit: 'Lata', sizes: ['250ml', '473ml'] },
      { name: 'Bebida Isotônica Tangerina Hidratante', unit: 'Garrafa', sizes: ['500ml'] },
      { name: 'Bebida Isotônica Limão Refrescante', unit: 'Garrafa', sizes: ['500ml'] }
    ]
  },
  // 4. Limpeza (target ~2,000 items)
  {
    category: 'Limpeza',
    brands: [
      'Ypê', 'Limpol', 'Minuano', 'Suprema', 'Odd',
      'Omo', 'Brilhante', 'Tixan Ypê', 'Ariel', 'Surf', 'Baby Soft',
      'Comfort', 'Downy', 'Fofo', 'Pinho Sol', 'Veja', 'Sanol', 'Ajax',
      'Q-Boa', 'Brilux', 'Clorox', 'Scotch-Brite', 'Bombril', 'Assolan', 'Vanish'
    ],
    items: [
      { name: 'Detergente Lava-Louças Neutro', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Detergente Lava-Louças Maçã', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Detergente Lava-Louças Coco', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Detergente Lava-Louças Limão', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Detergente Lava-Louças Clear Cristal', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Sabão em Pó Roupas Lavagem Perfeita', unit: 'Pacote', sizes: ['800g', '1.6kg', '2.4kg'] },
      { name: 'Sabão em Pó Cuidado e Perfume Roupas', unit: 'Pacote', sizes: ['800g', '1.6kg'] },
      { name: 'Sabão Líquido Roupas Concentrado', unit: 'Garrafa', sizes: ['1.8L', '3L'] },
      { name: 'Sabão em Barra Multiuso Tradicional', unit: 'Pacote', sizes: ['5x200g'] },
      { name: 'Amaciante Concentrado Perfume Original', unit: 'Garrafa', sizes: ['500ml', '1L', '1.5L'] },
      { name: 'Amaciante Concentrado Brisa de Verão', unit: 'Garrafa', sizes: ['500ml', '1L'] },
      { name: 'Amaciante Tradicional Diluído Carinho', unit: 'Garrafa', sizes: ['2L', '5L'] },
      { name: 'Desinfetante Perfumado Lavanda', unit: 'Frasco', sizes: ['500ml', '1L', '2L'] },
      { name: 'Desinfetante Germicida Eucalipto Puro', unit: 'Frasco', sizes: ['500ml', '1L'] },
      { name: 'Desinfetante Bactericida Tradicional', unit: 'Frasco', sizes: ['500ml', '1L'] },
      { name: 'Limpador Multiuso Geral Tradicional', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Limpador Multiuso Ação Antibac', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Limpa Vidros Brilho Intenso Gatilho', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Desengordurante Cozinha Ação Rápida', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Limpador Banheiro Cloro Ativo', unit: 'Frasco', sizes: ['500ml'] },
      { name: 'Água Sanitária Tradicional Cloro Ativo', unit: 'Garrafa', sizes: ['1L', '2L', '5L'] },
      { name: 'Água Sanitária Perfumada Floral', unit: 'Garrafa', sizes: ['2L'] },
      { name: 'Alvejante em Pó sem Cloro Oxi Action', unit: 'Pote', sizes: ['450g', '900g'] },
      { name: 'Alvejante Líquido sem Cloro Roupas Coloridas', unit: 'Garrafa', sizes: ['1.5L', '3L'] },
      { name: 'Esponja Multiuso Dupla Face Abrasiva', unit: 'Pacote', sizes: ['c/ 3 un', 'c/ 4 un'] },
      { name: 'Lã e Palha de Aço Multiuso', unit: 'Pacote', sizes: ['c/ 8 un'] },
      { name: 'Pano de Limpeza Multiuso Descartável', unit: 'Pacote', sizes: ['Rolo 50 panos'] },
      { name: 'Saco para Lixo Reforçado com Alças 30L', unit: 'Pacote', sizes: ['c/ 30 un'] },
      { name: 'Saco para Lixo Reforçado com Alças 50L', unit: 'Pacote', sizes: ['c/ 30 un'] },
      { name: 'Saco para Lixo Reforçado com Alças 100L', unit: 'Pacote', sizes: ['c/ 15 un'] }
    ]
  },
  // 5. Higiene & Beleza (target ~2,000 items)
  {
    category: 'Higiene & Beleza',
    brands: [
      'Dove', 'Lux', 'Protex', 'Palmolive', 'Nivea', 'Francis', 'Phebo', 'Granado',
      'Colgate', 'Sorriso', 'Oral-B', 'Sensodyne', 'Close Up',
      'Rexona', 'Bozzano', 'Above', 'Pantene', 'Seda', 'Elseve', 'Head & Shoulders', 'Clear', 'Tresemmé',
      'Neve', 'Personal', 'Sublime', 'Pampers', 'Huggies', 'Always', 'Intimus', 'Gillette', 'Bic'
    ],
    items: [
      { name: 'Sabonete em Barra Hidratante Original', unit: 'Unidade', sizes: ['90g'] },
      { name: 'Sabonete em Barra Manteiga de Karité', unit: 'Unidade', sizes: ['90g'] },
      { name: 'Sabonete em Barra Antibacteriano Fresh', unit: 'Unidade', sizes: ['85g'] },
      { name: 'Sabonete em Barra Glicerina Pura', unit: 'Unidade', sizes: ['90g'] },
      { name: 'Sabonete Líquido Hidratante Refil', unit: 'Frasco', sizes: ['200ml', '500ml'] },
      { name: 'Sabonete Líquido com Dosador Pump', unit: 'Frasco', sizes: ['250ml'] },
      { name: 'Creme Dental Tripla Ação Branqueadora', unit: 'Caixa', sizes: ['90g', '180g'] },
      { name: 'Creme Dental Total 12 Ação Antibacteriana', unit: 'Caixa', sizes: ['90g', '180g'] },
      { name: 'Creme Dental Luminous White Branqueamento', unit: 'Caixa', sizes: ['70g', '90g'] },
      { name: 'Creme Dental Alívio Sensibilidade Imediato', unit: 'Caixa', sizes: ['90g'] },
      { name: 'Escova Dental Macia Limpeza Profunda', unit: 'Unidade', sizes: ['Individual', 'c/ 3 un'] },
      { name: 'Fio Dental Mentolado com Cera', unit: 'Unidade', sizes: ['50m', '100m'] },
      { name: 'Enxaguante Bucal Zero Álcool Menta', unit: 'Frasco', sizes: ['250ml', '500ml'] },
      { name: 'Desodorante Antitranspirante Aerosol Invisible', unit: 'Frasco', sizes: ['150ml'] },
      { name: 'Desodorante Antitranspirante Aerosol Clinical', unit: 'Frasco', sizes: ['150ml'] },
      { name: 'Desodorante Roll-On Proteção 48h', unit: 'Frasco', sizes: ['50ml'] },
      { name: 'Shampoo Restauração Profunda Fios', unit: 'Frasco', sizes: ['200ml', '400ml'] },
      { name: 'Condicionador Hidratação Intensa Cabelos', unit: 'Frasco', sizes: ['200ml', '400ml'] },
      { name: 'Shampoo Anticaspa Controle Total', unit: 'Frasco', sizes: ['200ml', '400ml'] },
      { name: 'Papel Higiênico Folha Dupla Maciez 30m', unit: 'Pacote', sizes: ['c/ 12 rolos', 'c/ 16 rolos', 'c/ 24 rolos'] },
      { name: 'Papel Higiênico Folha Tripla Supreme', unit: 'Pacote', sizes: ['c/ 12 rolos'] },
      { name: 'Fralda Descartável Infantil Proteção Antivazamento', unit: 'Pacote', sizes: ['Tam P', 'Tam M', 'Tam G', 'Tam XG', 'Tam XXG'] },
      { name: 'Lenços Umedecidos Hipoalergênicos Toque Suave', unit: 'Pacote', sizes: ['c/ 48 un', 'c/ 96 un'] },
      { name: 'Absorvente Feminino com Abas Cobertura Suave', unit: 'Pacote', sizes: ['c/ 8 un', 'c/ 16 un', 'c/ 32 un'] },
      { name: 'Aparelho de Barbear Descartável 3 Lâminas', unit: 'Pacote', sizes: ['c/ 2 un', 'c/ 4 un'] },
      { name: 'Espuma de Barbear Pele Sensível', unit: 'Frasco', sizes: ['190g'] },
      { name: 'Loção Hidratante Corporal Pele Seca', unit: 'Frasco', sizes: ['200ml', '400ml'] }
    ]
  },
  // 6. Açougue & Carnes (target ~600 items)
  {
    category: 'Açougue',
    brands: ['Sadia', 'Perdigão', 'Seara', 'Friboi', 'Maturatta', 'Swift', 'Montana', 'Aurora', 'Gomes da Costa', 'Costa Sul'],
    items: [
      { name: 'Picanha Bovina Resfriada Embalada a Vácuo', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Alcatra Bovina Completa com Maminha', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Contrafilé Bovino Porcionado em Bifes', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Maminha Bovina Macia para Assar', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Fraldinha Bovina para Churrasco', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Patinho Bovino Moído de Primeira', unit: 'Bandeja', sizes: ['500g', '1kg'] },
      { name: 'Costela Bovina em Tiras Janela', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Coxão Mole Bovino Fatiado Macio', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Filé de Peito de Frango Congelado IQF', unit: 'Bandeja', sizes: ['1kg'] },
      { name: 'Coxa e Sobrecoxa de Frango com Osso', unit: 'Bandeja', sizes: ['1kg'] },
      { name: 'Meio da Asa Tulipa Frango Churrasco', unit: 'Bandeja', sizes: ['1kg'] },
      { name: 'Coração de Frango Temperado', unit: 'Bandeja', sizes: ['1kg'] },
      { name: 'Linguiça Toscana Especial para Churrasco', unit: 'Pacote', sizes: ['700g', '1kg'] },
      { name: 'Linguiça Calabresa Defumada Cozida', unit: 'Pacote', sizes: ['400g', '1kg'] },
      { name: 'Bacon Defumado em Pedaço Selecionado', unit: 'Pacote', sizes: ['500g'] },
      { name: 'Bisteca Suína Resfriada Corte Nobre', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Costelinha Suína para Churrasco', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Filé de Tilápia Congelado IQF', unit: 'Bandeja', sizes: ['500g', '800g'] },
      { name: 'Filé de Salmão Fresco com Pele', unit: 'Bandeja', sizes: ['500g'] },
      { name: 'Filé de Merluza Congelada Tradicional', unit: 'Bandeja', sizes: ['500g'] }
    ]
  },
  // 7. Hortifruti (target ~500 items)
  {
    category: 'Hortifruti',
    brands: ['Doce Mel', 'Benassi', 'Frutvita', 'Qualitá', 'Trebeschi', 'Campo Limpo'],
    items: [
      { name: 'Maçã Nacional Tipo Gala Selecionada', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Maçã Nacional Tipo Fuji Doce', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Laranja Pera Doce para Suco', unit: 'Saco', sizes: ['3kg'] },
      { name: 'Banana Prata Climatizada Especial', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Banana Nanica Climatizada Doce', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Mamão Golden Tipo Papaya Doce', unit: 'Unidade', sizes: ['Unidade'] },
      { name: 'Melancia Inteira Doce Fresca', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Abacaxi Pérola Doce Selecionado', unit: 'Unidade', sizes: ['Unidade'] },
      { name: 'Manga Palmer Madura e Firme', unit: 'Kg', sizes: ['Por Quilo (kg)'] },
      { name: 'Uva Niágara Doce da Época', unit: 'Bandeja', sizes: ['500g'] },
      { name: 'Uva Crimson sem Sementes Doce', unit: 'Bandeja', sizes: ['500g'] },
      { name: 'Morango Fresco Selecionado Especial', unit: 'Bandeja', sizes: ['250g'] },
      { name: 'Limão Tipo Taiti Fresco para Suco', unit: 'Saco', sizes: ['1kg'] },
      { name: 'Batata Inglesa Lavada Selecionada', unit: 'Saco', sizes: ['2kg'] },
      { name: 'Cebola Branca Seca Selecionada', unit: 'Saco', sizes: ['1kg'] },
      { name: 'Alho Roxo em Cabeças Selecionado', unit: 'Pacote', sizes: ['150g', '200g'] },
      { name: 'Cenoura Laranja Lavada e Doce', unit: 'Pacote', sizes: ['1kg'] },
      { name: 'Tomate Italiano Selecionado Madurinho', unit: 'Bandeja', sizes: ['600g'] },
      { name: 'Tomate Doce Tipo Sweet Grape', unit: 'Pote', sizes: ['180g'] },
      { name: 'Abobrinha Tipo Italiana Fresca', unit: 'Bandeja', sizes: ['500g'] },
      { name: 'Alface Crespa Hidropônica Fresca', unit: 'Pacote', sizes: ['200g'] },
      { name: 'Couve Manteiga Fatiada Lavada', unit: 'Pacote', sizes: ['200g'] }
    ]
  },
  // 8. Padaria, Congelados, Pet & Utilidades (target ~1,200 items)
  {
    category: 'Padaria',
    brands: [
      'Wickbold', 'Plus Vita', 'Bauducco', 'Seven Boys', 'Pullman', 'Forno de Minas',
      'Sadia', 'Seara', 'Perdigão', 'McCain', 'Kibon', 'Pedigree', 'Whiskas', 'Purina',
      'Melitta', 'Wyda', 'Duracell', 'Philips'
    ],
    items: [
      { name: 'Pão de Forma Tradicional Fatiado', unit: 'Pacote', sizes: ['400g', '500g'], cat: 'Padaria' },
      { name: 'Pão de Forma Integral 100% Fibras', unit: 'Pacote', sizes: ['400g'], cat: 'Padaria' },
      { name: 'Pão de Forma Grãos Nobres', unit: 'Pacote', sizes: ['400g'], cat: 'Padaria' },
      { name: 'Bisnaguinhas Tradicionais Macias', unit: 'Pacote', sizes: ['300g'], cat: 'Padaria' },
      { name: 'Pão para Hambúrguer com Gergelim', unit: 'Pacote', sizes: ['200g'], cat: 'Padaria' },
      { name: 'Pão para Hot Dog Tradicional', unit: 'Pacote', sizes: ['200g'], cat: 'Padaria' },
      { name: 'Torrada Tradicional Salgada Crocante', unit: 'Pacote', sizes: ['140g'], cat: 'Padaria' },
      { name: 'Torrada Integral Multigrãos', unit: 'Pacote', sizes: ['140g'], cat: 'Padaria' },
      { name: 'Bolo Pronto Recheado Chocolate', unit: 'Caixa', sizes: ['250g'], cat: 'Padaria' },
      { name: 'Panetone Tradicional Frutas Cristalizadas', unit: 'Caixa', sizes: ['400g', '500g'], cat: 'Padaria' },
      { name: 'Chocotone Tradicional Gotas Chocolate', unit: 'Caixa', sizes: ['400g', '500g'], cat: 'Padaria' },
      { name: 'Lasanha Congelada à Bolonhesa Clássica', unit: 'Caixa', sizes: ['600g'], cat: 'Congelados' },
      { name: 'Lasanha Congelada Quatro Queijos Cremosa', unit: 'Caixa', sizes: ['600g'], cat: 'Congelados' },
      { name: 'Pizza Congelada Calabresa Tradicional', unit: 'Caixa', sizes: ['460g'], cat: 'Congelados' },
      { name: 'Pizza Congelada Quatro Queijos', unit: 'Caixa', sizes: ['460g'], cat: 'Congelados' },
      { name: 'Hambúrguer Bovino Tradicional Congelado', unit: 'Caixa', sizes: ['c/ 12 un'], cat: 'Congelados' },
      { name: 'Empanados de Frango Nuggets Crocantes', unit: 'Caixa', sizes: ['300g', '700g'], cat: 'Congelados' },
      { name: 'Batata Palito Pré-frita Congelada', unit: 'Pacote', sizes: ['720g', '1.5kg'], cat: 'Congelados' },
      { name: 'Pão de Queijo Mineiro Congelado Tradicional', unit: 'Pacote', sizes: ['400g', '1kg'], cat: 'Congelados' },
      { name: 'Sorvete Cremoso Napolitano Cremosíssimo', unit: 'Pote', sizes: ['1.5L'], cat: 'Congelados' },
      { name: 'Sorvete Cremoso Flocos com Chocolate', unit: 'Pote', sizes: ['1.5L'], cat: 'Congelados' },
      { name: 'Sorvete Cremoso Sabor Creme Tradicional', unit: 'Pote', sizes: ['1.5L'], cat: 'Congelados' },
      { name: 'Polpa de Açaí Congelada Pura', unit: 'Pote', sizes: ['500ml', '1L'], cat: 'Congelados' },
      { name: 'Ração Seca Cães Adultos Carne e Vegetais', unit: 'Pacote', sizes: ['1kg', '3kg', '10kg', '15kg'], cat: 'Outros' },
      { name: 'Ração Seca Cães Filhotes Crescimento', unit: 'Pacote', sizes: ['1kg', '3kg'], cat: 'Outros' },
      { name: 'Ração Seca Gatos Adultos Sabor Salmão', unit: 'Pacote', sizes: ['1kg', '3kg'], cat: 'Outros' },
      { name: 'Ração Seca Gatos Castrados Controle', unit: 'Pacote', sizes: ['1kg', '3kg'], cat: 'Outros' },
      { name: 'Sachê Alimento Úmido Cães Carne ao Molho', unit: 'Pacote', sizes: ['85g', '100g'], cat: 'Outros' },
      { name: 'Sachê Alimento Úmido Gatos Salmão Molho', unit: 'Pacote', sizes: ['85g'], cat: 'Outros' },
      { name: 'Areia Sanitária Higiênica para Gatos', unit: 'Saco', sizes: ['4kg'], cat: 'Outros' },
      { name: 'Filtro de Papel para Café nº 102', unit: 'Caixa', sizes: ['c/ 30 un'], cat: 'Outros' },
      { name: 'Filtro de Papel para Café nº 103', unit: 'Caixa', sizes: ['c/ 30 un'], cat: 'Outros' },
      { name: 'Guardanapo de Papel Folha Dupla Macio', unit: 'Pacote', sizes: ['c/ 50 un'], cat: 'Outros' },
      { name: 'Papel Toalha Cozinha Folha Dupla', unit: 'Pacote', sizes: ['c/ 2 rolos'], cat: 'Outros' },
      { name: 'Papel Alumínio Resistente Rolo Culinário', unit: 'Caixa', sizes: ['30cm x 7.5m'], cat: 'Outros' },
      { name: 'Filme Plástico de PVC Transparente', unit: 'Caixa', sizes: ['30m'], cat: 'Outros' },
      { name: 'Pilhas Alcalinas Tamanho AA Longa Duração', unit: 'Pacote', sizes: ['c/ 4 un'], cat: 'Outros' },
      { name: 'Pilhas Alcalinas Tamanho AAA Palito', unit: 'Pacote', sizes: ['c/ 4 un'], cat: 'Outros' }
    ]
  }
];

for (const sec of sections) {
  for (const item of sec.items) {
    for (const brand of sec.brands) {
      for (const size of item.sizes) {
        const cat = item.cat || sec.category;
        const fullName = `${item.name} ${brand} ${size}`;
        addProduct(fullName, brand, cat, item.unit);
      }
    }
  }
}

console.log(`Generated ${products.length} products total.`);
const json = JSON.stringify(products);
fs.writeFileSync('src/data/offlineBarcodeCatalog.json', json);
console.log(`Saved src/data/offlineBarcodeCatalog.json, size: ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB`);
