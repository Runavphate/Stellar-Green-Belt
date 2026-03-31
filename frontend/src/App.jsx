import { useState, useEffect } from 'react'
import { Wallet, Coins, ArrowRight, ShieldCheck, Activity } from 'lucide-react'
import { isConnected, setAllowed, getPublicKey, signTransaction } from '@stellar/freighter-api'
import * as StellarSdk from '@stellar/stellar-sdk'

// Replace with the successfully deployed Staking Pool Contract ID on TESTNET
const STAKING_CONTRACT_ID = 'CDFPSTMKYRX6SLPYSIFDIK734YZ5RCH663SKAYOPYKXIZUDBBASA4DVDO'

function App() {
  const [walletAddress, setWalletAddress] = useState('')
  const [events, setEvents] = useState([
    { id: 1, text: "Welcome to Starlight Staking Testnet!", time: "System" }
  ]);
  const [isStaking, setIsStaking] = useState(false);

  // Initialize Soroban RPC Server
  const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');

  const addEvent = (text) => {
    setEvents(prev => [{ id: Date.now(), text, time: "Just now" }, ...prev].slice(0, 5));
  }

  const connectWallet = async () => {
    try {
      if (await isConnected()) {
        await setAllowed()
        const pubKey = await getPublicKey()
        setWalletAddress(pubKey)
        addEvent("Freighter Wallet connected successfully!")
      } else {
        alert("Please install Freighter extension.")
      }
    } catch(err) {
      console.error(err);
      addEvent("Error connecting wallet.");
    }
  }

  const handleStake = async (e) => {
    e.preventDefault();
    if(!walletAddress) {
      alert("Please connect wallet first!")
      return;
    }
    const amount = e.target.elements[0].value;
    if(!amount || amount <= 0) return;

    try {
      setIsStaking(true);
      addEvent(`Staking ${amount} XLM... Awaiting Freighter signature.`);

      // 1. Fetch source account from Horizon or RPC
      const account = await server.getAccount(walletAddress);

      // 2. Build the exact Soroban Invocation payload natively
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
      .addOperation(StellarSdk.Operation.invokeHostFunction({
        func: StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
          new StellarSdk.InvokeContractArgs({
            contractAddress: new StellarSdk.Address(STAKING_CONTRACT_ID).toScAddress(),
            functionName: 'stake',
            args: [
              new StellarSdk.Address(walletAddress).toScVal(),
              StellarSdk.nativeToScVal(amount, { type: 'i128' })
            ],
          })
        ),
        auth: []
      }))
      .setTimeout(60)
      .build();

      // 3. Simulate Transaction
      const simulatedTx = await server.simulateTransaction(tx);
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulatedTx)) {
        throw new Error(simulatedTx.error);
      }

      // 4. Assemble the transaction with Soroban Data
      // (This handles state footprint requirements for the contract)
      const assembledTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simulatedTx);

      // 5. Sign the assembled payload with Freighter
      const signedXdr = await signTransaction(assembledTx.toXDR(), { network: 'TESTNET' });
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);

      // 6. Submit to Soroban RPC
      const sendResponse = await server.sendTransaction(signedTransaction);
      if (sendResponse.status !== 'PENDING') {
        throw new Error(`Transaction submission failed: ${sendResponse.hash}`);
      }
      
      addEvent(`Successfully signed! Tx pending on Testnet: ${sendResponse.hash.slice(0, 8)}...`);

      // 7. Poll for final confirmation
      let result;
      while (!result || result.status === 'NOT_FOUND') {
        await new Promise(r => setTimeout(r, 2000));
        result = await server.getTransaction(sendResponse.hash);
      }

      if (result.status === 'SUCCESS') {
         addEvent(`Staking confirmed on blockchain! ✅`);
      } else {
         addEvent(`Transaction failed on chain. ❌`);
      }

      e.target.reset();
    } catch(err) {
      console.error(err);
      addEvent(`Stake transaction aborted.`);
    } finally {
      setIsStaking(false);
    }
  }

  return (
    <div className="glass-container">
      <header className="glass-header">
        <h1>Starlight Staking (Testnet)</h1>
        <button onClick={connectWallet} className="glass-btn primary">
          <Wallet size={18} />
          {walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}` : 'Connect Freighter'}
        </button>
      </header>

      <main className="dashboard">
        <div className="glass-card stat-card">
          <Coins size={36} className="icon gold" />
          <h2>Total Staked on Contract</h2>
          <p className="big-value">--- XLM</p>
        </div>
        <div className="glass-card stat-card">
          <Activity size={36} className="icon green" />
          <h2>Available Starlight Tokens</h2>
          <p className="big-value">--- SLT</p>
        </div>
      </main>

      <section className="interaction-area">
        <div className="glass-card action-card">
          <ShieldCheck size={28} className="icon blue" />
          <h3>Stake Crypto</h3>
          <p>Provide liquidity and earn SLT securely on the Stellar Testnet.</p>
          <form className="input-group" onSubmit={handleStake}>
            <input type="number" placeholder="Amount (XLM)" className="glass-input" min="1" disabled={isStaking} />
            <button type="submit" className="glass-btn secondary" disabled={isStaking}>
              {isStaking ? 'Signing...' : <>Stake <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <div className="glass-card events-card">
          <h3>Testnet Real-time Events</h3>
          <ul className="event-list">
            {events.map(ev => (
              <li key={ev.id}>
                <strong>{ev.text}</strong> <span>{ev.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

export default App
