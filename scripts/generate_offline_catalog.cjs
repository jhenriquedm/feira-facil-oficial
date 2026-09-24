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

function addProduct(name, brand, category, unit, prefix = '789') {
  let ean;
  do {
    baseSequence++;
    const prefix12 = `${prefix}${String(baseSequence).padStart(9, '0')}`;
    ean = makeEan13(prefix12);
  } while (seenCodes.has(ean));

  seenCodes.add(ean);
  products.push([ean, name, brand, category, unit]);
}

// 1. MERCEARIA
const merceariaBrands = [
  'Camil', 'Tio João', 'Prato Fino', 'Kicaldo', 'Barilla', 'Dona Benta', 'Adria',
  'Piraquê', 'União', 'Liza', 'Soya', 'Gallo', 'Andorinha', 'Bauducco', 'Marilan',
  'Pilão', '3 Corações', 'Melitta', 'Nescau', 'Toddy', 'Heinz', 'Hellmann\'s',
  'Elefante', 'Pomarola', 'Quero', 'Fugini', 'Gomes da Costa', 'Coqueiro', 'Yoki',
  'Garoto', 'Lacta', 'Nestlé', 'Dr. Oetker', 'Sazón', 'Knorr', 'Maggi', 'Qualitá',
  'Caravelas', 'Renata', 'Vilma', 'Santa Amália', 'Mabel', 'Oreo', 'Club Social'
];

// Let's generate deep categories
console.log("Building catalog generator...");
