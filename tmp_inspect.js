const path = require('path');
process.chdir(path.resolve(__dirname, 'frontend'));
const StellarSdk = require('@stellar/stellar-sdk');
console.log('HostFunctionType', StellarSdk.xdr.HostFunctionType._byValue);
console.log('ScValType', StellarSdk.xdr.ScValType._byValue);
