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

console.log("Sample EAN:", makeEan13("789100010010"));
