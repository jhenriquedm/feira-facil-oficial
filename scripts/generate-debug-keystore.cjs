const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const keystorePath = path.join(__dirname, '..', 'android', 'app', 'debug.keystore');

if (fs.existsSync(keystorePath)) {
  console.log('debug.keystore already exists at:', keystorePath);
  process.exit(0);
}

console.log('Generating reproducible debug.keystore...');

// 1. Generate RSA Key Pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// 2. Create Certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date(2020, 0, 1);
cert.validity.notAfter = new Date(2050, 0, 1);

const attrs = [
  { name: 'commonName', value: 'Android Debug' },
  { name: 'organizationName', value: 'Android' },
  { name: 'countryName', value: 'US' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

// 3. Create PKCS#12 keystore
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey,
  [cert],
  'android', // password
  {
    generateLocalKeyId: true,
    friendlyName: 'androiddebugkey', // alias
    algorithm: '3des'
  }
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const buffer = Buffer.from(p12Der, 'binary');

fs.writeFileSync(keystorePath, buffer);
console.log('Successfully generated debug.keystore at:', keystorePath, 'Size:', buffer.length, 'bytes');
