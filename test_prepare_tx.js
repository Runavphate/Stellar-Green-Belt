const StellarSdk = require('@stellar/stellar-sdk');
const { rpc: SorobanRpc } = StellarSdk;

async function test() {
  const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
  
  const kp = StellarSdk.Keypair.random();
  const walletAddress = kp.publicKey();
  const STAKING_CONTRACT_ID = 'CBP27JPS5NTILBDKMGJGELJDNZM2I44FBO5EBLH4NWKXB7HM2BVCGNFY';
  
  try {
    const account = new StellarSdk.Account(walletAddress, '0');
    
    const callerAddress = StellarSdk.Address.fromString(walletAddress);
    const contractAddress = StellarSdk.Address.fromString(STAKING_CONTRACT_ID);
    const amount = BigInt(100);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
    .addOperation(StellarSdk.Operation.invokeHostFunction({
      func: StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
        new StellarSdk.xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: 'stake',
          args: [
            callerAddress.toScVal(),
            StellarSdk.nativeToScVal(amount, { type: 'i128' })
          ],
        })
      ),
      auth: []
    }))
    .setTimeout(60)
    .build();
    
    console.log('Using prepareTransaction instead...');
    const preparedTx = await server.prepareTransaction(tx);
    console.log('Prepared tx type:', preparedTx.constructor.name);
    console.log('Prepared tx XDR (first 100):', preparedTx.toXDR().substring(0, 100));
    
  } catch(err) {
    console.error('ERROR:', err.message);
  }
}

test();
