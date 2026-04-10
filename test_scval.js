const StellarSdk = require('@stellar/stellar-sdk');

console.log('=== Testing ScVal Types ===\n');

// Test what nativeToScVal produces
const amount = BigInt(100);
const scval = StellarSdk.nativeToScVal(amount, { type: 'i128' });
console.log('Amount:', amount);
console.log('ScVal switch (type):', scval.switch());

// Get type name
try {
  if (scval.i128) console.log('Has i128:', scval.i128());
} catch(e) {}

// Check all integer types
console.log('\n=== Integer Type Discriminants ===');
const typeNames = Object.getOwnPropertyNames(StellarSdk.xdr.ScValType);
const intTypes = typeNames.filter(name => 
  name.includes('I') || name.includes('U') && (name.includes('32') || name.includes('64') || name.includes('128'))
);
intTypes.forEach(t => {
  try {
    const val = StellarSdk.xdr.ScValType[t]();
    console.log(`${t}: ${val.value}`);
  } catch(e) {}
});

// Test Address
console.log('\n=== Testing Address ===');
const validAddr = 'GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJHEMLNGXR4XNOBIOFFGXZ7XK';
try {
  const address = StellarSdk.Address.fromString(validAddr);
  const addrScval = address.toScVal();
  console.log('Address ScVal switch:', addrScval.switch());
} catch(e) {
  console.log('Address error:', e.message);
}

// List all contract IDs we have
console.log('\n=== Finding Valid Contract Address ===');
const fs = require('fs');
try {
  const contractId = fs.readFileSync('contracts/staking_id.txt', 'utf-8').trim();
  console.log('Contract ID from file:', contractId);
  const contractAddr = StellarSdk.Address.fromString(contractId);
  console.log('Contract address valid!');
} catch(e) {
  console.log('Contract ID error:', e.message);
}
