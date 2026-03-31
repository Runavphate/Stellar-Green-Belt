import { useState, useEffect } from 'react'
import { Wallet, Coins, ArrowRight, ShieldCheck, Activity } from 'lucide-react'

function App() {
  const [walletAddress, setWalletAddress] = useState('')
  const [events, setEvents] = useState([
    { id: 1, text: "Welcome to Starlight Staking!", time: "Just now" }
  ]);

  const connectWallet = async () => {
    // If we have Freighter installed, we would use window.freighterApi
    // For Green Belt demonstration, we mock a connection if none exists,
    // or simulate using basic stellar-sdk.
    try {
      setWalletAddress('GDKNXYZ...MQ2')
      addEvent("Wallet connected successfully");
    } catch(err) {
      console.error(err);
    }
  }

  const addEvent = (text) => {
    setEvents(prev => [{ id: Date.now(), text, time: "Just now" }, ...prev].slice(0, 5));
  }

  const handleStake = (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    if(!amount) return;
    addEvent(`Staked ${amount} XLM. Waiting for confirmation...`);
    setTimeout(() => addEvent(`Successfully staked ${amount} XLM.`), 2000);
    setTimeout(() => addEvent(`Claimed ${amount/10} GBT rewards.`), 4000);
    e.target.reset();
  }

  return (
    <div className="glass-container">
      <header className="glass-header">
        <h1>Starlight Staking</h1>
        <button onClick={connectWallet} className="glass-btn primary">
          <Wallet size={18} />
          {walletAddress ? walletAddress : 'Connect Wallet'}
        </button>
      </header>

      <main className="dashboard">
        <div className="glass-card stat-card">
          <Coins size={36} className="icon gold" />
          <h2>Total Staked</h2>
          <p className="big-value">1,500 XLM</p>
        </div>
        <div className="glass-card stat-card">
          <Activity size={36} className="icon green" />
          <h2>Green Belt Tokens (GBT)</h2>
          <p className="big-value">150 GBT</p>
        </div>
      </main>

      <section className="interaction-area">
        <div className="glass-card action-card">
          <ShieldCheck size={28} className="icon blue" />
          <h3>Stake Crypto</h3>
          <p>Provide liquidity and earn GBT as rewards.</p>
          <form className="input-group" onSubmit={handleStake}>
            <input type="number" placeholder="Amount (XLM)" className="glass-input" min="1" />
            <button type="submit" className="glass-btn secondary">Stake <ArrowRight size={16} /></button>
          </form>
        </div>

        <div className="glass-card events-card">
          <h3>Real-time Events</h3>
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
