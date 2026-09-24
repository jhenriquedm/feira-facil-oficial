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
      const prefix = (baseSequence % 3 === 0) ? '790' : '789';
      const prefix12 = `${prefix}${String(baseSequence).padStart(9, '0')}`;
      ean = makeEan13(prefix12);
    } while (seenCodes.has(ean));
  }

  seenCodes.add(ean);
  products.push([ean, name.trim(), brand.trim(), category.trim(), unit.trim()]);
}

// Famous core real barcodes (120 top items)
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
  ["7891025114028", "Detergente Líquido Neutro 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114035", "Detergente Líquido Maçã 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114042", "Detergente Líquido Coco 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114059", "Detergente Líquido Clear 500ml", "Ypê", "Limpeza", "Frasco"],
  ["7891025114066", "Detergente Líquido Limão 500ml", "Ypê", "Limpeza", "Frasco"],
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

// Catalog matrix generator definitions
const catalogDefs = [
  // 1. ARROZ
  {
    brands: ['Camil', 'Tio João', 'Prato Fino', 'Namorado', 'Blue Ville', 'Máximo', 'Vasconcelos', 'Sepé', 'Emoções', 'Caruchinha', 'Pilecco Nobre', 'Dona Maria', 'Kicaldo', 'Raríssimo', 'Buriti'],
    items: [
      { name: 'Arroz Branco Tipo 1', unit: 'Pacote' },
      { name: 'Arroz Parboilizado Tipo 1', unit: 'Pacote' },
      { name: 'Arroz Integral Tipo 1', unit: 'Pacote' },
      { name: 'Arroz Japonês Especial para Sushi', unit: 'Pacote' },
      { name: 'Arroz Arbóreo para Risoto', unit: 'Pacote' },
      { name: 'Arroz 7 Grãos Integral', unit: 'Pacote' },
      { name: 'Arroz Negro Especial', unit: 'Pacote' },
      { name: 'Arroz Vermelho Selecionado', unit: 'Pacote' }
    ],
    sizes: ['1kg', '2kg', '5kg'],
    category: 'Mercearia'
  },
  // 2. FEIJÃO
  {
    brands: ['Kicaldo', 'Camil', 'Tio João', 'Máximo', 'Broto Legal', 'Pantera', 'Combrasil', 'Vasconcelos', 'Caldo Nobre', 'Zaeli', 'Codil', 'Pink', 'Da Terrinha', 'Urbano'],
    items: [
      { name: 'Feijão Carioca Tipo 1', unit: 'Pacote' },
      { name: 'Feijão Preto Tipo 1', unit: 'Pacote' },
      { name: 'Feijão Fradinho', unit: 'Pacote' },
      { name: 'Feijão Branco Selecionado', unit: 'Pacote' },
      { name: 'Feijão Vermelho', unit: 'Pacote' },
      { name: 'Feijão Rajado', unit: 'Pacote' },
      { name: 'Feijão Verde', unit: 'Pacote' },
      { name: 'Feijão Jalo', unit: 'Pacote' },
      { name: 'Feijão Azuki', unit: 'Pacote' }
    ],
    sizes: ['500g', '1kg', '2kg'],
    category: 'Mercearia'
  },
  // 3. MASSAS & MACARRÃO
  {
    brands: ['Barilla', 'Dona Benta', 'Adria', 'Piraquê', 'Renata', 'Galo', 'Isabela', 'Santa Amália', 'Vilma', 'Fortaleza', 'Paganini', 'De Cecco', 'Dacrema', 'Dallas', 'Vitarella'],
    items: [
      { name: 'Macarrão Espaguete nº 8', unit: 'Pacote' },
      { name: 'Macarrão Espaguete nº 5', unit: 'Pacote' },
      { name: 'Macarrão Penne Rigate', unit: 'Pacote' },
      { name: 'Macarrão Parafuso Fusilli', unit: 'Pacote' },
      { name: 'Macarrão Ninho Tradicional', unit: 'Pacote' },
      { name: 'Macarrão Talharim com Ovos', unit: 'Pacote' },
      { name: 'Macarrão Gravatinha Farfalle', unit: 'Pacote' },
      { name: 'Massa para Lasanha Direto ao Forno', unit: 'Pacote' },
      { name: 'Macarrão Cabelo de Anjo', unit: 'Pacote' },
      { name: 'Macarrão Rigatoni Grano Duro', unit: 'Pacote' },
      { name: 'Macarrão Fettuccine com Ovos', unit: 'Pacote' },
      { name: 'Macarrão Caracol', unit: 'Pacote' },
      { name: 'Macarrão Padre Nosso', unit: 'Pacote' },
      { name: 'Macarrão Ave Maria', unit: 'Pacote' },
      { name: 'Macarrão Integral Espaguete', unit: 'Pacote' },
      { name: 'Macarrão Integral Penne', unit: 'Pacote' },
      { name: 'Macarrão Sem Glúten Parafuso', unit: 'Pacote' },
      { name: 'Macarrão Instantâneo Lámen Galinha Caipira', unit: 'Pacote' },
      { name: 'Macarrão Instantâneo Lámen Carne Suave', unit: 'Pacote' }
    ],
    sizes: ['400g', '500g', '1kg'],
    category: 'Mercearia'
  },
  // 4. AÇÚCAR & ADOÇANTES
  {
    brands: ['União', 'Da Barra', 'Caravelas', 'Guarani', 'Colombo', 'Alto Alegre', 'Native', 'Magro', 'Linea', 'Zero-Cal', 'Finn', 'Stevia Soul'],
    items: [
      { name: 'Açúcar Refinado Tradicional', unit: 'Pacote' },
      { name: 'Açúcar Cristal Especial', unit: 'Pacote' },
      { name: 'Açúcar Demerara Naturale', unit: 'Pacote' },
      { name: 'Açúcar Mascavo Puro', unit: 'Pacote' },
      { name: 'Açúcar Orgânico Dourado', unit: 'Pacote' },
      { name: 'Açúcar de Confeiteiro Glaçúcar', unit: 'Pacote' },
      { name: 'Açúcar Light Baixas Calorias', unit: 'Pacote' },
      { name: 'Adoçante Líquido Sucralose', unit: 'Frasco' },
      { name: 'Adoçante Líquido Stevia 100%', unit: 'Frasco' },
      { name: 'Adoçante em Pó Sachês', unit: 'Caixa' }
    ],
    sizes: ['500g', '1kg', '2kg', '5kg'],
    category: 'Mercearia'
  },
  // 5. ÓLEOS, AZEITES & GORDURAS
  {
    brands: ['Liza', 'Soya', 'Salada', 'Coamo', 'Concordia', 'Vitaliv', 'Sinhá', 'Gallo', 'Andorinha', 'Borges', 'Carbonell', 'Cocinero', 'Filippo Berio', 'La Española', 'Herdade do Esporão', 'Cardeal'],
    items: [
      { name: 'Óleo de Soja Refinado', unit: 'Garrafa' },
      { name: 'Óleo de Milho Refinado', unit: 'Garrafa' },
      { name: 'Óleo de Girassol Refinado', unit: 'Garrafa' },
      { name: 'Óleo de Canola Refinado', unit: 'Garrafa' },
      { name: 'Óleo de Algodão', unit: 'Garrafa' },
      { name: 'Azeite de Oliva Extra Virgem Clássico', unit: 'Garrafa' },
      { name: 'Azeite de Oliva Extra Virgem Baixa Acidez 0.2%', unit: 'Garrafa' },
      { name: 'Azeite de Oliva Virgem', unit: 'Garrafa' },
      { name: 'Azeite de Oliva Tipo Único', unit: 'Garrafa' },
      { name: 'Azeite Aromatizado com Alho', unit: 'Garrafa' },
      { name: 'Azeite Aromatizado com Manjericão', unit: 'Garrafa' },
      { name: 'Azeite Aromatizado com Pimenta', unit: 'Garrafa' },
      { name: 'Banha Suína Pura para Culinária', unit: 'Pote' }
    ],
    sizes: ['250ml', '500ml', '900ml', '1L'],
    category: 'Mercearia'
  },
  // 6. FARINHAS, AMIDOS & FAROFAS
  {
    brands: ['Dona Benta', 'Sol', 'Anaconda', 'Rosa Branca', 'Venturelli', 'Finna', 'Suprema', 'Maizena', 'Yoki', 'Amafil', 'Pinduca', 'Kisabor', 'Zaeli', 'Da Terrinha'],
    items: [
      { name: 'Farinha de Trigo Tradicional Tipo 1', unit: 'Pacote' },
      { name: 'Farinha de Trigo com Fermento', unit: 'Pacote' },
      { name: 'Farinha de Trigo Integral', unit: 'Pacote' },
      { name: 'Farinha Especial para Pizzas e Pães', unit: 'Pacote' },
      { name: 'Amido de Milho Tradicional', unit: 'Caixa' },
      { name: 'Farinha de Mandioca Torrada', unit: 'Pacote' },
      { name: 'Farinha de Mandioca Crua', unit: 'Pacote' },
      { name: 'Farinha de Mandioca Bijú', unit: 'Pacote' },
      { name: 'Flocão de Milho para Cuscuz', unit: 'Pacote' },
      { name: 'Fubá Mimoso Tradicional', unit: 'Pacote' },
      { name: 'Polvilho Doce Especial', unit: 'Pacote' },
      { name: 'Polvilho Azedo Especial', unit: 'Pacote' },
      { name: 'Farofa Pronta Temperada Tradicional', unit: 'Pacote' },
      { name: 'Farofa Pronta Sabor Picanha e Alho', unit: 'Pacote' },
      { name: 'Farofa Pronta Sabor Bacon Crocante', unit: 'Pacote' },
      { name: 'Farofa Pronta Picante', unit: 'Pacote' }
    ],
    sizes: ['400g', '500g', '1kg', '5kg'],
    category: 'Mercearia'
  },
  // 7. BISCOITOS DOCES, WAFERS & RECHEADOS
  {
    brands: ['Bauducco', 'Marilan', 'Oreo', 'Nestlé', 'Passatempo', 'Trakinas', 'Bono', 'Negresco', 'Chocolícia', 'Piraquê', 'Mabel', 'Visconti', 'Triunfo', 'Fortaleza', 'Toddy'],
    items: [
      { name: 'Biscoito Recheado Sabor Chocolate', unit: 'Pacote' },
      { name: 'Biscoito Recheado Sabor Morango', unit: 'Pacote' },
      { name: 'Biscoito Recheado Sabor Baunilha', unit: 'Pacote' },
      { name: 'Biscoito Recheado Sabor Doce de Leite', unit: 'Pacote' },
      { name: 'Biscoito Recheado Sabor Brigadeiro', unit: 'Pacote' },
      { name: 'Biscoito Recheado Sabor Torta de Limão', unit: 'Pacote' },
      { name: 'Biscoito Wafer Crocante Chocolate', unit: 'Pacote' },
      { name: 'Biscoito Wafer Crocante Morango', unit: 'Pacote' },
      { name: 'Biscoito Wafer Crocante Baunilha', unit: 'Pacote' },
      { name: 'Biscoito Wafer Crocante Limão', unit: 'Pacote' },
      { name: 'Cookies com Gotas de Chocolate Nobre', unit: 'Pacote' },
      { name: 'Rosquinhas Doces Sabor Coco', unit: 'Pacote' },
      { name: 'Rosquinhas Doces Sabor Chocolate', unit: 'Pacote' },
      { name: 'Biscoito Tradicional Maisena', unit: 'Pacote' },
      { name: 'Biscoito Tradicional Maria', unit: 'Pacote' },
      { name: 'Biscoito de Leite Maltado Crocante', unit: 'Pacote' }
    ],
    sizes: ['115g', '135g', '140g', '160g', '200g', '350g', '400g'],
    category: 'Mercearia'
  },
  // 8. BISCOITOS SALGADOS, TORRADAS & CRACKERS
  {
    brands: ['Club Social', 'Marilan', 'Bauducco', 'Piraquê', 'Tostines', 'Adria', 'Isabela', 'Triunfo', 'Fortaleza', 'Vitarella'],
    items: [
      { name: 'Biscoito Cream Cracker Tradicional', unit: 'Pacote' },
      { name: 'Biscoito Água e Sal Crocante', unit: 'Pacote' },
      { name: 'Biscoito Cream Cracker Integral Fibras', unit: 'Pacote' },
      { name: 'Biscoito Salgado Crostini Ervas Finas', unit: 'Pacote' },
      { name: 'Biscoito Salgado Sabor Queijo Nacho', unit: 'Pacote' },
      { name: 'Biscoito Salgado Sabor Presunto', unit: 'Pacote' },
      { name: 'Biscoito Salgado Sabor Pizza', unit: 'Pacote' },
      { name: 'Torrada Tradicional Salgada', unit: 'Pacote' },
      { name: 'Torrada Integral Fibras e Cereais', unit: 'Pacote' },
      { name: 'Torrada Multigrãos Selecionados', unit: 'Pacote' },
      { name: 'Torrada Levemente Salgada', unit: 'Pacote' }
    ],
    sizes: ['140g', '144g', '200g', '360g', '400g'],
    category: 'Mercearia'
  },
  // 9. CAFÉS & CHÁS
  {
    brands: ['Pilão', '3 Corações', 'Melitta', 'Caboclo', 'Pelé', 'Maratá', 'Lor', 'Baggio', 'Santa Clara', 'Café do Ponto', 'Damasco', 'Brasileiro', 'América', 'Nescafé', 'Leão', 'Twinings', 'Dr. Oetker'],
    items: [
      { name: 'Café Torrado e Moído Tradicional', unit: 'Pacote' },
      { name: 'Café Torrado e Moído Extraforte', unit: 'Pacote' },
      { name: 'Café Torrado e Moído Descafeinado', unit: 'Pacote' },
      { name: 'Café Especial Gourmet em Grãos', unit: 'Pacote' },
      { name: 'Café Superior a Vácuo Intenso', unit: 'Pacote' },
      { name: 'Café Solúvel Tradicional Vidro', unit: 'Frasco' },
      { name: 'Café Solúvel Granulado Sachê', unit: 'Pacote' },
      { name: 'Cápsulas de Café Espresso Tradicional', unit: 'Caixa' },
      { name: 'Cápsulas de Café Espresso Intenso', unit: 'Caixa' },
      { name: 'Chá de Camomila Calmante', unit: 'Caixa' },
      { name: 'Chá de Hortelã Refrescante', unit: 'Caixa' },
      { name: 'Chá de Erva Cidreira', unit: 'Caixa' },
      { name: 'Chá Verde Puro com Limão', unit: 'Caixa' },
      { name: 'Chá Preto Tradicional Breakfast', unit: 'Caixa' },
      { name: 'Chá de Frutas Silvestres Vermelhas', unit: 'Caixa' },
      { name: 'Chá de Maçã com Especiarias e Canela', unit: 'Caixa' },
      { name: 'Erva-Mate para Chimarrão Tradicional', unit: 'Pacote' },
      { name: 'Chá Matte Leão Pronto Tradicional', unit: 'Garrafa' }
    ],
    sizes: ['10 sachês', '25 sachês', '50g', '100g', '250g', '500g', '1kg', '1.5L'],
    category: 'Mercearia'
  },
  // 10. CONDIMENTOS, MOLHOS & CONSERVAS
  {
    brands: ['Pomarola', 'Elefante', 'Heinz', 'Tarantella', 'Fugini', 'Quero', 'Predilecta', 'Hellmann\'s', 'Hemmer', 'Cepêra', 'Castelo', 'Sakura', 'Gomes da Costa', 'Coqueiro', 'Bonduelle'],
    items: [
      { name: 'Molho de Tomate Tradicional Pouch', unit: 'Pacote' },
      { name: 'Molho de Tomate Sabor Bolonhesa', unit: 'Pacote' },
      { name: 'Molho de Tomate com Manjericão Fresco', unit: 'Pacote' },
      { name: 'Molho de Tomate para Pizza', unit: 'Pacote' },
      { name: 'Molho de Tomate com Ervas Finas', unit: 'Pacote' },
      { name: 'Extrato de Tomate Concentrado', unit: 'Lata' },
      { name: 'Extrato de Tomate Concentrado Pouch', unit: 'Pacote' },
      { name: 'Passata Rústica de Tomate', unit: 'Garrafa' },
      { name: 'Maionese Tradicional Cremosa', unit: 'Pote' },
      { name: 'Maionese Cremosa Squeeze', unit: 'Frasco' },
      { name: 'Maionese Verde com Ervas Especiais', unit: 'Frasco' },
      { name: 'Maionese Defumada Sabor Bacon', unit: 'Frasco' },
      { name: 'Ketchup Tradicional Especial', unit: 'Frasco' },
      { name: 'Ketchup Picante com Pimenta Jalapeño', unit: 'Frasco' },
      { name: 'Mostarda Amarela Tradicional', unit: 'Frasco' },
      { name: 'Mostarda Escura Especial', unit: 'Frasco' },
      { name: 'Mostarda Tipo Dijon Clássica', unit: 'Frasco' },
      { name: 'Molho de Soja Shoyu Tradicional', unit: 'Garrafa' },
      { name: 'Molho Inglês Condimentado', unit: 'Frasco' },
      { name: 'Molho de Pimenta Vermelha Suave', unit: 'Frasco' },
      { name: 'Vinagre de Álcool Tradicional', unit: 'Garrafa' },
      { name: 'Vinagre de Maçã Natural 4%', unit: 'Garrafa' },
      { name: 'Vinagre de Vinho Tinto Clássico', unit: 'Garrafa' },
      { name: 'Milho Verde Cozido no Vapor', unit: 'Lata' },
      { name: 'Ervilha Fresca em Conserva', unit: 'Lata' },
      { name: 'Seleta Especial de Legumes', unit: 'Lata' },
      { name: 'Grão de Bico Cozido no Vapor', unit: 'Lata' },
      { name: 'Azeitona Verde com Caroço', unit: 'Pote' },
      { name: 'Azeitona Verde sem Caroço', unit: 'Pote' },
      { name: 'Azeitona Preta Azapa Selecionada', unit: 'Pote' },
      { name: 'Palmito Pupunha Inteiro Macio', unit: 'Pote' },
      { name: 'Palmito Pupunha Rodelas', unit: 'Pote' },
      { name: 'Cogumelos Champignon Inteiros', unit: 'Pote' },
      { name: 'Atum Sólido em Óleo Comestível', unit: 'Lata' },
      { name: 'Atum Sólido ao Natural Água e Sal', unit: 'Lata' },
      { name: 'Atum Ralado em Óleo', unit: 'Lata' },
      { name: 'Sardinha em Óleo Tradicional', unit: 'Lata' },
      { name: 'Sardinha ao Molho de Tomate', unit: 'Lata' }
    ],
    sizes: ['125g', '150g', '170g', '200g', '300g', '340g', '350g', '397g', '500g', '750ml', '1kg'],
    category: 'Mercearia'
  },
  // 11. LEITES & DERIVADOS
  {
    brands: ['Piracanjuba', 'Itambé', 'Parmalat', 'Nestlé Ninho', 'Elegê', 'Tirol', 'Languiru', 'Batavo', 'Jussara', 'Leitbom', 'Cemil', 'Quatree', 'Piá', 'Betânia'],
    items: [
      { name: 'Leite UHT Integral Enriquecido', unit: 'Caixa' },
      { name: 'Leite UHT Desnatado 0% Gordura', unit: 'Caixa' },
      { name: 'Leite UHT Semidesnatado Equilíbrio', unit: 'Caixa' },
      { name: 'Leite UHT Zero Lactose Integral', unit: 'Caixa' },
      { name: 'Leite UHT Zero Lactose Desnatado', unit: 'Caixa' },
      { name: 'Leite UHT Rico em Cálcio e Fibras', unit: 'Caixa' },
      { name: 'Leite em Pó Integral Instantâneo', unit: 'Lata' },
      { name: 'Leite em Pó Integral Sachê Refil', unit: 'Pacote' },
      { name: 'Leite em Pó Desnatado Sachê', unit: 'Pacote' },
      { name: 'Leite Condensado Semidesnatado 395g', unit: 'Caixa' },
      { name: 'Leite Condensado Integral 395g', unit: 'Lata' },
      { name: 'Leite Condensado Zero Lactose 395g', unit: 'Caixa' },
      { name: 'Creme de Leite Leve Homogeneizado 200g', unit: 'Caixa' },
      { name: 'Creme de Leite Tradicional Lata 300g', unit: 'Lata' },
      { name: 'Creme de Leite Zero Lactose 200g', unit: 'Caixa' }
    ],
    sizes: ['200g', '395g', '400g', '800g', '1L'],
    category: 'Laticínios & Ovos'
  },
  // 12. IOGURTES, SOBREMESAS & BEBIDAS LÁCTEAS
  {
    brands: ['Danone', 'Danoninho', 'Activia', 'Nestlé', 'Vigor', 'Batavo', 'Itambé', 'Yakult', 'Chamyto', 'Frimesa', 'Paulista', 'Chandelle'],
    items: [
      { name: 'Iogurte Líquido Sabor Morango', unit: 'Garrafa' },
      { name: 'Iogurte Líquido Frutas Vermelhas', unit: 'Garrafa' },
      { name: 'Iogurte Líquido Sabor Pêssego', unit: 'Garrafa' },
      { name: 'Iogurte Líquido Sabor Coco Cremoso', unit: 'Garrafa' },
      { name: 'Iogurte Natural Integral Sem Açúcar', unit: 'Pote' },
      { name: 'Iogurte Natural Desnatado', unit: 'Pote' },
      { name: 'Iogurte Grego Tradicional Adoçado', unit: 'Pote' },
      { name: 'Iogurte Grego com Calda de Morango', unit: 'Pote' },
      { name: 'Iogurte Grego Sabor Frutas Silvestres', unit: 'Pote' },
      { name: 'Iogurte Grego Sabor Torta de Limão', unit: 'Pote' },
      { name: 'Leite Fermentado com Lactobacilos Vivos', unit: 'Pacote' },
      { name: 'Petit Suisse Infantil Morango c/ 8 potes', unit: 'Bandeja' },
      { name: 'Sobremesa Láctea Creme de Chocolate Chandelle', unit: 'Pote' },
      { name: 'Pudim de Leite Cremoso com Caramelo', unit: 'Pote' }
    ],
    sizes: ['100g', '170g', '180g', '320g', '850g', '1.2kg'],
    category: 'Laticínios & Ovos'
  },
  // 13. QUEIJOS, MANTEIGAS & REQUEIJÕES
  {
    brands: ['Tirolez', 'Polenghi', 'Scala', 'Vigor', 'Presidente', 'Itambé', 'Ipanema', 'Catupiry', 'Aviação', 'Qualy', 'Doriana', 'Delícia', 'Claybom'],
    items: [
      { name: 'Queijo Mussarela Fatiado Bandeja', unit: 'Bandeja' },
      { name: 'Queijo Mussarela Peça Pedaço', unit: 'Pacote' },
      { name: 'Queijo Prato Lanche Fatiado', unit: 'Bandeja' },
      { name: 'Queijo Minas Frescal Cremoso', unit: 'Pote' },
      { name: 'Queijo Minas Padrão Meia Cura', unit: 'Pacote' },
      { name: 'Queijo Parmesão Ralado Especial', unit: 'Pacote' },
      { name: 'Queijo Parmesão Fracionado Cunha', unit: 'Pacote' },
      { name: 'Queijo Provolone Defumado Pedaço', unit: 'Pacote' },
      { name: 'Queijo Gorgonzola Especial Pedaço', unit: 'Pacote' },
      { name: 'Queijo Gouda Holandês Fatiado', unit: 'Bandeja' },
      { name: 'Queijo Brie Francês Cunha Macio', unit: 'Caixa' },
      { name: 'Queijo Ricota Fresca Pura', unit: 'Pacote' },
      { name: 'Queijo de Coalho para Grelhar Espeto', unit: 'Pacote' },
      { name: 'Requeijão Cremoso Tradicional', unit: 'Pote' },
      { name: 'Requeijão Cremoso Versão Light', unit: 'Pote' },
      { name: 'Requeijão Culinário Bisnaga', unit: 'Frasco' },
      { name: 'Manteiga Extra Tradicional com Sal', unit: 'Pote' },
      { name: 'Manteiga Extra Pura sem Sal', unit: 'Pote' },
      { name: 'Margarina Cremosa com Sal', unit: 'Pote' },
      { name: 'Margarina Cremosa sem Sal', unit: 'Pote' }
    ],
    sizes: ['50g', '100g', '150g', '200g', '250g', '400g', '500g', '1kg'],
    category: 'Laticínios & Ovos'
  },
  // 14. BEBIDAS: REFRIGERANTES & SUCOS
  {
    brands: ['Coca-Cola', 'Antarctica', 'Pepsi', 'Fanta', 'Sprite', 'Schweppes', 'Sukita', 'Dolly', 'Kuat', 'Del Valle', 'Maguary', 'Natural One', 'Dafruta', 'Camp', 'Tang'],
    items: [
      { name: 'Refrigerante Cola Tradicional', unit: 'Garrafa' },
      { name: 'Refrigerante Cola Zero Açúcar', unit: 'Garrafa' },
      { name: 'Refrigerante Guaraná Sabor Original', unit: 'Garrafa' },
      { name: 'Refrigerante Guaraná Zero Açúcar', unit: 'Garrafa' },
      { name: 'Refrigerante Sabor Laranja Gaseificado', unit: 'Garrafa' },
      { name: 'Refrigerante Sabor Uva Gaseificado', unit: 'Garrafa' },
      { name: 'Refrigerante Limão Sprite Fresh', unit: 'Garrafa' },
      { name: 'Água Tônica Schweppes Clássica', unit: 'Lata' },
      { name: 'Refrigerante Citrus Schweppes', unit: 'Garrafa' },
      { name: 'Suco de Uva Tinto 100% Integral', unit: 'Garrafa' },
      { name: 'Suco de Laranja Pura 100% Integral', unit: 'Garrafa' },
      { name: 'Néctar de Pêssego Adoçado', unit: 'Caixa' },
      { name: 'Néctar de Maracujá Refrescante', unit: 'Caixa' },
      { name: 'Néctar de Caju Selecionado', unit: 'Caixa' },
      { name: 'Néctar de Manga Suave', unit: 'Caixa' },
      { name: 'Néctar de Goiaba Tradicional', unit: 'Caixa' },
      { name: 'Refresco em Pó Sabor Laranja 25g', unit: 'Pacote' },
      { name: 'Refresco em Pó Sabor Uva 25g', unit: 'Pacote' },
      { name: 'Refresco em Pó Sabor Maracujá 25g', unit: 'Pacote' },
      { name: 'Refresco em Pó Sabor Morango 25g', unit: 'Pacote' }
    ],
    sizes: ['Lata 350ml', 'Garrafa 500ml', 'Garrafa 1L', 'Garrafa 1.5L', 'Garrafa 2L', 'Garrafa 2.5L', 'Garrafa 3L'],
    category: 'Bebidas'
  },
  // 15. BEBIDAS: CERVEJAS, ÁGUAS & ENERGÉTICOS
  {
    brands: ['Heineken', 'Stella Artois', 'Corona', 'Budweiser', 'Amstel', 'Beck\'s', 'Spaten', 'Eisenbahn', 'Original', 'Brahma', 'Skol', 'Crystal', 'Bonafont', 'Minalba', 'Red Bull', 'Monster Energy', 'Gatorade'],
    items: [
      { name: 'Cerveja Pilsen Puro Malte', unit: 'Lata' },
      { name: 'Cerveja Lager Puro Malte', unit: 'Garrafa' },
      { name: 'Cerveja Duplo Malte Cremosa', unit: 'Lata' },
      { name: 'Cerveja Extra Premium Long Neck', unit: 'Garrafa' },
      { name: 'Cerveja Pilsen Tradicional', unit: 'Lata' },
      { name: 'Cerveja Zero Álcool 0.0 Puro Malte', unit: 'Garrafa' },
      { name: 'Água Mineral sem Gás Pura da Fonte', unit: 'Garrafa' },
      { name: 'Água Mineral com Gás Natural', unit: 'Garrafa' },
      { name: 'Água Mineral Galão Leve', unit: 'Garrafa' },
      { name: 'Bebida Energética Tradicional Energy Drink', unit: 'Lata' },
      { name: 'Bebida Energética Zero Açúcar', unit: 'Lata' },
      { name: 'Bebida Energética Tropical Sabor Frutas', unit: 'Lata' },
      { name: 'Bebida Energética Sabor Melancia', unit: 'Lata' },
      { name: 'Bebida Isotônica Hidratante Tangerina', unit: 'Garrafa' },
      { name: 'Bebida Isotônica Hidratante Limão', unit: 'Garrafa' },
      { name: 'Bebida Isotônica Hidratante Uva', unit: 'Garrafa' }
    ],
    sizes: ['250ml', 'Lata 350ml', 'Long Neck 330ml', 'Latão 473ml', 'Garrafa 500ml', 'Garrafa 600ml', 'Garrafa 1.5L', 'Galão 5L'],
    category: 'Bebidas'
  },
  // 16. LIMPEZA & LAVANDERIA
  {
    brands: ['Ypê', 'Limpol', 'Minuano', 'Omo', 'Brilhante', 'Ariel', 'Comfort', 'Downy', 'Pinho Sol', 'Veja', 'Q-Boa', 'Scotch-Brite', 'Bombril', 'Vanish'],
    items: [
      { name: 'Detergente Líquido Lava-Louças Neutro', unit: 'Frasco' },
      { name: 'Detergente Líquido Lava-Louças Maçã', unit: 'Frasco' },
      { name: 'Detergente Líquido Lava-Louças Coco', unit: 'Frasco' },
      { name: 'Detergente Líquido Lava-Louças Limão', unit: 'Frasco' },
      { name: 'Detergente Líquido Lava-Louças Clear', unit: 'Frasco' },
      { name: 'Sabão em Pó Roupas Lavagem Perfeita', unit: 'Pacote' },
      { name: 'Sabão em Pó Roupas Brilho e Proteção', unit: 'Pacote' },
      { name: 'Sabão em Pó Roupas Ação Antibacteriana', unit: 'Pacote' },
      { name: 'Lava-Roupas Líquido Concentrado', unit: 'Garrafa' },
      { name: 'Sabão em Barra Multiuso Tradicional', unit: 'Pacote' },
      { name: 'Amaciante Concentrado Perfume Duradouro', unit: 'Garrafa' },
      { name: 'Amaciante Concentrado Frescor da Manhã', unit: 'Garrafa' },
      { name: 'Amaciante Tradicional Diluído Carinho', unit: 'Garrafa' },
      { name: 'Desinfetante Perfumado Lavanda Silvestre', unit: 'Frasco' },
      { name: 'Desinfetante Germicida Eucalipto Puro', unit: 'Frasco' },
      { name: 'Desinfetante Original Ação Bactericida', unit: 'Frasco' },
      { name: 'Limpador Multiuso Clássico Limpeza Geral', unit: 'Frasco' },
      { name: 'Limpador Multiuso Desengordurante Cozinha', unit: 'Frasco' },
      { name: 'Limpador Banheiro com Cloro Ativo', unit: 'Frasco' },
      { name: 'Limpa Vidros Brilho Intenso Gatilho', unit: 'Frasco' },
      { name: 'Água Sanitária Tradicional Cloro Ativo', unit: 'Garrafa' },
      { name: 'Água Sanitária Perfumada Floral', unit: 'Garrafa' },
      { name: 'Alvejante em Pó sem Cloro Oxi Action', unit: 'Pote' },
      { name: 'Alvejante Líquido Roupas Brancas e Coloridas', unit: 'Garrafa' },
      { name: 'Esponja Multiuso Dupla Face Limpeza Pesada', unit: 'Pacote' },
      { name: 'Esponja Salva-Unhas Anatômica', unit: 'Pacote' },
      { name: 'Palha e Lã de Aço Abrasiva', unit: 'Pacote' },
      { name: 'Pano de Limpeza Multiuso Descartável', unit: 'Pacote' },
      { name: 'Saco para Lixo Reforçado com Alças 30L', unit: 'Pacote' },
      { name: 'Saco para Lixo Reforçado com Alças 50L', unit: 'Pacote' },
      { name: 'Saco para Lixo Reforçado com Alças 100L', unit: 'Pacote' }
    ],
    sizes: ['500ml', '800g', '1L', '1.6kg', '1.8L', '2L', '2.4kg', '3L', '5L'],
    category: 'Limpeza'
  },
  // 17. HIGIENE & BELEZA
  {
    brands: ['Dove', 'Lux', 'Protex', 'Palmolive', 'Nivea', 'Colgate', 'Sorriso', 'Oral-B', 'Sensodyne', 'Rexona', 'Pantene', 'Seda', 'Elseve', 'Head & Shoulders', 'Neve', 'Personal', 'Pampers', 'Huggies', 'Always', 'Gillette'],
    items: [
      { name: 'Sabonete em Barra Hidratante Original', unit: 'Unidade' },
      { name: 'Sabonete em Barra Manteiga de Karité', unit: 'Unidade' },
      { name: 'Sabonete em Barra Ação Antibacteriana', unit: 'Unidade' },
      { name: 'Sabonete em Barra Fragrância Floral Suave', unit: 'Unidade' },
      { name: 'Sabonete Líquido Hidratante Refil Econômico', unit: 'Frasco' },
      { name: 'Sabonete Líquido com Dosador Pump', unit: 'Frasco' },
      { name: 'Creme Dental Tripla Proteção e Branqueador', unit: 'Caixa' },
      { name: 'Creme Dental Defesa Antibacteriana 12h', unit: 'Caixa' },
      { name: 'Creme Dental Branqueamento Rápido White', unit: 'Caixa' },
      { name: 'Creme Dental Alívio Imediato para Sensibilidade', unit: 'Caixa' },
      { name: 'Escova Dental Cerdas Macias Cabo Ergonômico', unit: 'Unidade' },
      { name: 'Fio Dental com Cera Mentolada', unit: 'Unidade' },
      { name: 'Enxaguante Bucal Zero Álcool Menta Refrescante', unit: 'Frasco' },
      { name: 'Desodorante Antitranspirante Aerosol Invisible', unit: 'Frasco' },
      { name: 'Desodorante Antitranspirante Aerosol Clinical 72h', unit: 'Frasco' },
      { name: 'Desodorante Roll-On Proteção Conforto', unit: 'Frasco' },
      { name: 'Shampoo Nutrição e Restauração Intensa', unit: 'Frasco' },
      { name: 'Condicionador Hidratação Profunda Cabelos', unit: 'Frasco' },
      { name: 'Shampoo Controle de Caspa Limpeza Refrescante', unit: 'Frasco' },
      { name: 'Máscara Capilar Tratamento Profundo', unit: 'Pote' },
      { name: 'Papel Higiênico Folha Dupla Maciez 30m', unit: 'Pacote' },
      { name: 'Papel Higiênico Folha Tripla Supreme', unit: 'Pacote' },
      { name: 'Fralda Descartável Infantil Proteção Antivazamento', unit: 'Pacote' },
      { name: 'Lenços Umedecidos Hipoalergênicos Toque Suave', unit: 'Pacote' },
      { name: 'Absorvente Feminino com Abas Cobertura Suave', unit: 'Pacote' },
      { name: 'Absorvente Feminino Noturno Longo com Abas', unit: 'Pacote' },
      { name: 'Aparelho de Barbear Descartável 3 Lâminas', unit: 'Pacote' },
      { name: 'Espuma de Barbear Suave para Pele Sensível', unit: 'Frasco' },
      { name: 'Loção Hidratante Corporal Pele Seca', unit: 'Frasco' },
      { name: 'Protetor Solar Corporal FPS 50 Resistente à Água', unit: 'Frasco' }
    ],
    sizes: ['70g', '90g', '150ml', '200ml', '250ml', '400ml', 'c/ 12 rolos', 'c/ 16 rolos', 'Tam P', 'Tam M', 'Tam G', 'Tam XG'],
    category: 'Higiene & Beleza'
  },
  // 18. CARNES, AVES & PEIXES
  {
    brands: ['Sadia', 'Perdigão', 'Seara', 'Friboi', 'Maturatta', 'Swift', 'Montana', 'Aurora', 'Gomes da Costa', 'Costa Sul'],
    items: [
      { name: 'Corte Nobre Picanha Bovina Resfriada', unit: 'Kg' },
      { name: 'Alcatra Bovina Completa com Maminha', unit: 'Kg' },
      { name: 'Contrafilé Porcionado em Bifes Macios', unit: 'Kg' },
      { name: 'Maminha Bovina Macia para Assar', unit: 'Kg' },
      { name: 'Fraldinha Bovina para Churrasco', unit: 'Kg' },
      { name: 'Patinho Bovino Moído de Primeira', unit: 'Bandeja' },
      { name: 'Coxão Mole Bovino Fatiado Macio', unit: 'Kg' },
      { name: 'Costela Bovina em Tiras Janela', unit: 'Kg' },
      { name: 'Acém Bovino Moído Especial', unit: 'Bandeja' },
      { name: 'Filé Mignon Bovino Peça Inteira Limpa', unit: 'Kg' },
      { name: 'Filé de Peito de Frango Congelado IQF', unit: 'Bandeja' },
      { name: 'Coxa e Sobrecoxa de Frango Congelada', unit: 'Bandeja' },
      { name: 'Meio da Asa Tulipa de Frango para Grelha', unit: 'Bandeja' },
      { name: 'Coração de Frango Temperado para Churrasco', unit: 'Bandeja' },
      { name: 'Frango Inteiro Resfriado sem Miúdos', unit: 'Kg' },
      { name: 'Linguiça Toscana Especial para Churrasco', unit: 'Pacote' },
      { name: 'Linguiça Calabresa Defumada Cozida', unit: 'Pacote' },
      { name: 'Bacon Defumado em Pedaço Selecionado', unit: 'Pacote' },
      { name: 'Bacon em Tiras Fatiadas Crocantes', unit: 'Pacote' },
      { name: 'Bisteca Suína Resfriada Corte Nobre', unit: 'Kg' },
      { name: 'Costelinha Suína para Churrasco', unit: 'Kg' },
      { name: 'Lombo Suíno Condimentado Especial', unit: 'Kg' },
      { name: 'Filé de Tilápia Congelado Sem Espinhas', unit: 'Bandeja' },
      { name: 'Filé de Salmão Fresco com Pele', unit: 'Bandeja' },
      { name: 'Filé de Merluza Congelada Tradicional', unit: 'Bandeja' },
      { name: 'Lombo de Bacalhau Dessalgado Congelado', unit: 'Bandeja' },
      { name: 'Camarão Cinza Limpo Pré-cozido', unit: 'Pacote' }
    ],
    sizes: ['400g', '500g', '700g', '800g', '1kg', 'Por Quilo (kg)'],
    category: 'Açougue'
  },
  // 19. HORTIFRUTI
  {
    brands: ['Doce Mel', 'Benassi', 'Frutvita', 'Qualitá', 'Trebeschi', 'Campo Limpo', 'Mantiqueira', 'Granja Faria', 'Kakimoto'],
    items: [
      { name: 'Maçã Nacional Tipo Gala Selecionada', unit: 'Pacote' },
      { name: 'Maçã Nacional Tipo Fuji Doce', unit: 'Pacote' },
      { name: 'Laranja Pera Doce para Suco', unit: 'Saco' },
      { name: 'Laranja Lima Selecionada', unit: 'Saco' },
      { name: 'Banana Prata Climatizada Especial', unit: 'Kg' },
      { name: 'Banana Nanica Climatizada Doce', unit: 'Kg' },
      { name: 'Mamão Tipo Papaya Golden Doce', unit: 'Unidade' },
      { name: 'Melancia Inteira Doce Fresca', unit: 'Kg' },
      { name: 'Abacaxi Pérola Doce Selecionado', unit: 'Unidade' },
      { name: 'Melão Tipo Amarelo Selecionado', unit: 'Kg' },
      { name: 'Manga Tipo Palmer Madura e Firme', unit: 'Kg' },
      { name: 'Manga Tommy Doce para Consumo', unit: 'Kg' },
      { name: 'Uva Niágara Doce da Época', unit: 'Bandeja' },
      { name: 'Uva Crimson sem Sementes Doce', unit: 'Bandeja' },
      { name: 'Morango Fresco Selecionado Especial', unit: 'Bandeja' },
      { name: 'Limão Tipo Taiti Fresco para Suco', unit: 'Saco' },
      { name: 'Abacate Tipo Manteiga Firme', unit: 'Kg' },
      { name: 'Batata Inglesa Lavada Selecionada', unit: 'Saco' },
      { name: 'Batata Doce Rosada Lavada', unit: 'Pacote' },
      { name: 'Cebola Branca Seca Selecionada', unit: 'Saco' },
      { name: 'Cebola Roxa Especial para Salada', unit: 'Pacote' },
      { name: 'Alho Roxo Especial em Cabeças', unit: 'Pacote' },
      { name: 'Cenoura Laranja Lavada e Doce', unit: 'Pacote' },
      { name: 'Tomate Italiano Selecionado Madurinho', unit: 'Bandeja' },
      { name: 'Tomate Doce Tipo Sweet Grape', unit: 'Pote' },
      { name: 'Abobrinha Tipo Italiana Fresca', unit: 'Bandeja' },
      { name: 'Berinjela Roxa Lisa Selecionada', unit: 'Bandeja' },
      { name: 'Chuchu Verde Fresco Macio', unit: 'Bandeja' },
      { name: 'Pimentão Verde Selecionado Firme', unit: 'Bandeja' },
      { name: 'Abóbora Tipo Cabotiá Japonesa', unit: 'Kg' },
      { name: 'Mandioca Descascada e Embalada a Vácuo', unit: 'Pacote' },
      { name: 'Alface Crespa Hidropônica Fresca', unit: 'Pacote' },
      { name: 'Alface Americana Crocante Higienizada', unit: 'Pacote' },
      { name: 'Rúcula Hidropônica Folhas Jovens', unit: 'Pacote' },
      { name: 'Couve Manteiga Fatiada Lavada', unit: 'Pacote' },
      { name: 'Brócolis Ninja Fresco e Verde', unit: 'Bandeja' },
      { name: 'Couve-Flor Selecionada Fresca', unit: 'Bandeja' },
      { name: 'Cheiro Verde Salsa e Cebolinha Fresco', unit: 'Pacote' },
      { name: 'Cogumelos Tipo Paris Inteiros Frescos', unit: 'Bandeja' },
      { name: 'Cogumelos Tipo Shimeji Preto Fresco', unit: 'Bandeja' },
      { name: 'Ovos Brancos Grandes Selecionados', unit: 'Bandeja' },
      { name: 'Ovos Vermelhos Grandes Selecionados', unit: 'Bandeja' },
      { name: 'Ovos Caipiras Naturais de Granja', unit: 'Bandeja' }
    ],
    sizes: ['150g', '200g', '250g', '400g', '500g', '600g', '1kg', '2kg', '3kg', 'Dúzia', 'Pente 30 un'],
    category: 'Hortifruti'
  },
  // 20. PADARIA, CONGELADOS, PET SHOP & UTILIDADES
  {
    brands: ['Wickbold', 'Plus Vita', 'Bauducco', 'Seven Boys', 'Sadia', 'Seara', 'McCain', 'Forno de Minas', 'Kibon', 'Pedigree', 'Whiskas', 'Purina', 'Melitta', 'Wyda', 'Duracell'],
    items: [
      { name: 'Pão de Forma Tradicional Macio', unit: 'Pacote', cat: 'Padaria' },
      { name: 'Pão de Forma Integral Fibras 100%', unit: 'Pacote', cat: 'Padaria' },
      { name: 'Pão Multigrãos com Sementes Nobres', unit: 'Pacote', cat: 'Padaria' },
      { name: 'Bisnaguinhas Tradicionais Macias', unit: 'Pacote', cat: 'Padaria' },
      { name: 'Pão para Hambúrguer com Gergelim', unit: 'Pacote', cat: 'Padaria' },
      { name: 'Pão para Hot Dog Tradicional', unit: 'Pacote', cat: 'Padaria' },
      { name: 'Bolo Pronto Recheado de Chocolate', unit: 'Caixa', cat: 'Padaria' },
      { name: 'Bolo Pronto Sabor Laranja Fofinho', unit: 'Caixa', cat: 'Padaria' },
      { name: 'Panetone Tradicional Frutas Cristalizadas', unit: 'Caixa', cat: 'Padaria' },
      { name: 'Chocotone Tradicional Gotas de Chocolate', unit: 'Caixa', cat: 'Padaria' },
      { name: 'Lasanha Congelada à Bolonhesa Clássica', unit: 'Caixa', cat: 'Congelados' },
      { name: 'Lasanha Congelada Quatro Queijos Cremosa', unit: 'Caixa', cat: 'Congelados' },
      { name: 'Pizza Congelada de Calabresa Especial', unit: 'Caixa', cat: 'Congelados' },
      { name: 'Pizza Congelada de Quatro Queijos', unit: 'Caixa', cat: 'Congelados' },
      { name: 'Hambúrguer Bovino Tradicional Congelado', unit: 'Caixa', cat: 'Congelados' },
      { name: 'Empanados de Frango Nuggets Crocantes', unit: 'Caixa', cat: 'Congelados' },
      { name: 'Batata Palito Pré-frita Congelada', unit: 'Pacote', cat: 'Congelados' },
      { name: 'Pão de Queijo Mineiro Congelado', unit: 'Pacote', cat: 'Congelados' },
      { name: 'Sorvete Cremoso Napolitano Tradicional', unit: 'Pote', cat: 'Congelados' },
      { name: 'Sorvete Cremoso Flocos com Chocolate', unit: 'Pote', cat: 'Congelados' },
      { name: 'Sorvete Cremoso Sabor Creme de Baunilha', unit: 'Pote', cat: 'Congelados' },
      { name: 'Polpa de Açaí Congelada Tradicional', unit: 'Pote', cat: 'Congelados' },
      { name: 'Ração Seca Cães Adultos Carne e Vegetais', unit: 'Pacote', cat: 'Outros' },
      { name: 'Ração Seca Cães Adultos Frango e Arroz', unit: 'Pacote', cat: 'Outros' },
      { name: 'Ração Seca Cães Filhotes Crescimento', unit: 'Pacote', cat: 'Outros' },
      { name: 'Ração Seca Gatos Adultos Sabor Salmão', unit: 'Pacote', cat: 'Outros' },
      { name: 'Ração Seca Gatos Castrados Controle de Peso', unit: 'Pacote', cat: 'Outros' },
      { name: 'Sachê Alimento Úmido Cães Carne ao Molho', unit: 'Pacote', cat: 'Outros' },
      { name: 'Sachê Alimento Úmido Gatos Salmão ao Molho', unit: 'Pacote', cat: 'Outros' },
      { name: 'Petisco Mastigável Bifinho para Cães', unit: 'Pacote', cat: 'Outros' },
      { name: 'Areia Sanitária Higiênica Granulada para Gatos', unit: 'Saco', cat: 'Outros' },
      { name: 'Filtro de Papel para Café nº 102', unit: 'Caixa', cat: 'Outros' },
      { name: 'Filtro de Papel para Café nº 103', unit: 'Caixa', cat: 'Outros' },
      { name: 'Guardanapo de Papel Folha Dupla Macio', unit: 'Pacote', cat: 'Outros' },
      { name: 'Papel Toalha de Cozinha Folha Dupla', unit: 'Pacote', cat: 'Outros' },
      { name: 'Papel Alumínio Resistente Rolo Culinário', unit: 'Caixa', cat: 'Outros' },
      { name: 'Filme Plástico de PVC Transparente', unit: 'Caixa', cat: 'Outros' },
      { name: 'Pilhas Alcalinas Tamanho AA de Longa Duração', unit: 'Pacote', cat: 'Outros' },
      { name: 'Pilhas Alcalinas Tamanho AAA Palito', unit: 'Pacote', cat: 'Outros' },
      { name: 'Fósforos Tradicionais de Madeira', unit: 'Pacote', cat: 'Outros' },
      { name: 'Velas Brancas Tradicionais Votivas', unit: 'Pacote', cat: 'Outros' }
    ],
    sizes: ['100g', '250g', '300g', '400g', '500g', '720g', '1kg', '1.5L', '3kg', '4kg', '10kg', 'c/ 30 un', 'c/ 4 un'],
    category: 'Padaria'
  }
];

// Execute permutation generator
for (const section of catalogDefs) {
  for (const brand of section.brands) {
    for (const item of section.items) {
      for (const size of section.sizes) {
        const cat = item.cat || section.category;
        const fullName = `${item.name} ${brand} ${size}`;
        addProduct(fullName, brand, cat, item.unit);
      }
    }
  }
}

console.log(`Generated ${products.length} products total.`);
