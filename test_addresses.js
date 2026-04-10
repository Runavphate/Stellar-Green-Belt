const StellarSdk = require('@stellar/stellar-sdk');

const candidates = [
  'CBP27JPS5NTILBDKMGJGELJDNZM2I44FBO5EBLH4NWKXB7HM2BVCGNFY',
  'CDFPSTMKYRX6SLPYSIFDIK734YZ5RCH63SKAYOPYKXIZUDBBASA4DVDO',
  'CC55LDHDDIIXQ4XQEBCVZVWH7I6OUEZ65UNH7IYOIVEXNX2GS5VJ75KK',
  'CDALV5UWZFGQTJVPJC2REU762SIVXVBLSGHYJNN4ZVGTU66DFREXFKBL'
];

console.log('=== Testing Contract Addresses ===\n');
candidates.forEach(addr => {
  try {
    const contractAddr = StellarSdk.Address.fromString(addr);
    const scAddress = contractAddr.toScAddress();
    const scval = contractAddr.toScVal();
    console.log(`✓ ${addr}`);
    console.log(`  Starts with C: ${addr[0] === 'C'}`);
    console.log(`  Length: ${addr.length}`);
    console.log(`  ScVal switch: ${scval.switch().name}`);
  } catch(e) {
    console.log(`✗ ${addr}`);
    console.log(`  Error: ${e.message}`);
  }
});
