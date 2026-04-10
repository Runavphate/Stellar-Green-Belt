const StellarSdk = require('@stellar/stellar-sdk');

async function test() {
  const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
  
  // Generate a valid test keypair
  const kp = StellarSdk.Keypair.random();
  const walletAddress = kp.publicKey();
  const STAKING_CONTRACT_ID = 'CBP27JPS5NTILBDKMGJGELJDNZM2I44FBO5EBLH4NWKXB7HM2BVCGNFY';
  
  try {
    // Create a mock account (doesn't need to exist for building tx)
    const account = new StellarSdk.Account(walletAddress, '0');
    
    const callerAddress = StellarSdk.Address.fromString(walletAddress);
    const contractAddress = StellarSdk.Address.fromString(STAKING_CONTRACT_ID);
    const amount = BigInt(100);
    
    console.log('1. Building args...');
    const args = [
      callerAddress.toScVal(),
      StellarSdk.nativeToScVal(amount, { type: 'i128' })
    ];
    
    console.log('   Arg 0 (address):', args[0].switch().name);
    console.log('   Arg 1 (amount):', args[1].switch().name);
    
    console.log('\n2. Building InvokeContractArgs...');
    const invokeArgs = new StellarSdk.xdr.InvokeContractArgs({
      contractAddress: contractAddress.toScAddress(),
      functionName: 'stake',
      args: args,
    });
    console.log('   InvokeContractArgs created');
    
    console.log('\n3. Building HostFunction...');
    const hostFunc = StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(invokeArgs);
    console.log('   HostFunction created');
    
    console.log('\n4. Building operation...');
    const op = StellarSdk.Operation.invokeHostFunction({
      func: hostFunc,
      auth: []
    });
    console.log('   Operation created');
    
    console.log('\n5. Building transaction...');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
    .addOperation(op)
    .setTimeout(60)
    .build();
    console.log('   Transaction built');
    console.log('   Tx envelope XDR (first 100 chars):', tx.toEnvelope().toXDR('base64').substring(0, 100));
    
    console.log('\n6. Simulating...');
    const simResult = await server.simulateTransaction(tx);
    console.log('   Simulation result:', simResult);
    
  } catch(err) {
    console.error('ERROR:', err.message);
    if (err.response) {
      console.error('Response:', err.response.statusText, err.response.data);
    }
  }
}

test();
