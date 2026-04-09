import { useState, useEffect, useRef, useCallback } from 'react'
import { isConnected, requestAccess, signTransaction, getNetwork } from '@stellar/freighter-api'
import * as StellarSdk from '@stellar/stellar-sdk'
import { Server as RpcServer, Api as RpcApi } from '@stellar/stellar-sdk/rpc'

const VOTING_CONTRACT_ID = 'CAZLCX7HB4K7VUXBIO27UODIHGVOJ3FGVWK5BTEVHGN275RKEVVE4KEX'
const RPC_URL = 'https://soroban-testnet.stellar.org'
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET

// ── Helpers ──────────────────────────────────────────────────────────────────

const server = new RpcServer(RPC_URL)

async function simulateReadCall(funcName, args = []) {
  const kp = StellarSdk.Keypair.random()
  const account = new StellarSdk.Account(kp.publicKey(), '0')
  const contract = new StellarSdk.Contract(VOTING_CONTRACT_ID)
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(funcName, ...args))
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (RpcApi.isSimulationError(sim)) throw new Error(sim.error)
  const result = sim.result?.retval
  return result
}

function scValToJs(val) {
  if (!val) return null
  const type = val.switch().name
  if (type === 'scvU32') return val.u32()
  if (type === 'scvU64') return Number(val.u64())
  if (type === 'scvI32') return val.i32()
  if (type === 'scvI128') {
    const hi = BigInt(val.i128().hi().toString())
    const lo = BigInt(val.i128().lo().toString())
    return Number((hi << 64n) | lo)
  }
  if (type === 'scvString') return val.str().toString()
  if (type === 'scvSymbol') return val.sym().toString()
  if (type === 'scvBool') return val.b()
  if (type === 'scvBytes') return val.bytes().toString('hex')
  if (type === 'scvAddress') return StellarSdk.Address.fromScVal(val).toString()
  // Contract structs come back as scvMap with scvSymbol keys
  if (type === 'scvMap' || type === 'scvStruct') {
    const obj = {}
    val.map().forEach(entry => {
      const keyType = entry.key().switch().name
      const key = keyType === 'scvSymbol' ? entry.key().sym().toString()
                : keyType === 'scvString' ? entry.key().str().toString()
                : scValToJs(entry.key())
      obj[key] = scValToJs(entry.val())
    })
    return obj
  }
  if (type === 'scvVec') return val.vec().map(scValToJs)
  return null
}

function ledgerToMinutes(ledgers) {
  return Math.round(ledgers / 5)
}

function formatTimeLeft(endLedger, currentLedger) {
  if (currentLedger === 0) return '...'
  const diff = endLedger - currentLedger
  if (diff <= 0) return 'Ended'
  const mins = ledgerToMinutes(diff)
  if (mins < 60) return `${mins}m left`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m left` : `${hrs}h left`
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function App() {
  const [wallet, setWallet] = useState('')
  const [proposals, setProposals] = useState([])
  const [selected, setSelected] = useState(null)
  const [currentLedger, setCurrentLedger] = useState(0)
  const [loadingProposals, setLoadingProposals] = useState(true)
  const [txStatus, setTxStatus] = useState({ type: '', msg: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', duration: '1440' })
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState(null)
  const counterRef = useRef(0)

  const notify = useCallback((type, msg) => {
    setTxStatus({ type, msg })
    if (type !== 'loading') setTimeout(() => setTxStatus({ type: '', msg: '' }), 5000)
  }, [])

  // ── Read current ledger ────────────────────────────────────────────────────
  useEffect(() => {
    server.getLatestLedger().then(l => setCurrentLedger(l.sequence)).catch(() => {})
    const t = setInterval(() => {
      server.getLatestLedger().then(l => setCurrentLedger(l.sequence)).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  // ── Load proposals ─────────────────────────────────────────────────────────
  const loadProposals = useCallback(async () => {
    setLoadingProposals(true)
    try {
      const countVal = await simulateReadCall('get_proposal_count')
      const count = scValToJs(countVal) ?? 0
      const all = []
      for (let i = count - 1; i >= 0; i--) {
        const pVal = await simulateReadCall('get_proposal', [
          StellarSdk.xdr.ScVal.scvU32(i),
        ])
        const p = scValToJs(pVal)
        if (p) all.push({ id: i, ...p })
      }
      setProposals(all)
      if (all.length > 0 && selected === null) setSelected(all[0].id)
    } catch (e) {
      console.error('loadProposals error:', e)
    } finally {
      setLoadingProposals(false)
    }
  }, [selected])

  useEffect(() => { loadProposals() }, [])

  // ── Connect wallet ─────────────────────────────────────────────────────────
  const connectWallet = async () => {
    try {
      if (!(await isConnected())) { alert('Install Freighter wallet extension.'); return }
      const res = await requestAccess()
      const key = typeof res === 'string' ? res : (res?.address || res?.publicKey || '')
      if (key && StellarSdk.StrKey.isValidEd25519PublicKey(key)) {
        setWallet(key)
      } else {
        alert('Could not read wallet address.')
      }
    } catch (e) { console.error(e) }
  }

  // ── Send signed transaction ────────────────────────────────────────────────
  const sendTx = async (funcName, args) => {
    const account = await server.getAccount(wallet)
    const freighterNet = await getNetwork()
    const passphrase = freighterNet.networkPassphrase || NETWORK_PASSPHRASE
    const contract = new StellarSdk.Contract(VOTING_CONTRACT_ID)

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: passphrase,
    })
      .addOperation(contract.call(funcName, ...args))
      .setTimeout(60)
      .build()

    const prepared = await server.prepareTransaction(tx)
    const xdr = prepared.toXDR()
    const { signedTxXdr, error } = await signTransaction(xdr, { networkPassphrase: passphrase })
    if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error))

    const signed = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, passphrase)
    const send = await server.sendTransaction(signed)
    if (send.status !== 'PENDING') throw new Error(`Submit failed: ${send.errorResult || send.status}`)

    let result
    let attempts = 0
    while ((!result || result.status === 'NOT_FOUND') && attempts < 20) {
      await new Promise(r => setTimeout(r, 2000))
      result = await server.getTransaction(send.hash)
      attempts++
    }
    if (result?.status !== 'SUCCESS') throw new Error(`Transaction failed: ${result?.status}`)
    return result
  }

  // ── Create proposal ────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!wallet) { alert('Connect Freighter first!'); return }
    if (!form.title.trim()) { notify('error', 'Title is required.'); return }
    setSubmitting(true)
    notify('loading', 'Creating proposal on-chain…')
    try {
      const callerAddr = StellarSdk.Address.fromString(wallet)
      await sendTx('create_proposal', [
        callerAddr.toScVal(),
        StellarSdk.xdr.ScVal.scvString(form.title.trim()),
        StellarSdk.xdr.ScVal.scvString(form.description.trim()),
        StellarSdk.xdr.ScVal.scvU32(parseInt(form.duration) || 1440),
      ])
      notify('success', 'Proposal created! ✅')
      setForm({ title: '', description: '', duration: '1440' })
      setShowCreate(false)
      await loadProposals()
    } catch (err) {
      console.error(err)
      notify('error', `Failed: ${err.message?.substring(0, 80)}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Vote ──────────────────────────────────────────────────────────────────
  const handleVote = async (proposalId, approve) => {
    if (!wallet) { alert('Connect Freighter first!'); return }
    setVotingId(proposalId)
    notify('loading', `Casting ${approve ? 'Yes ✅' : 'No ❌'} vote…`)
    try {
      const voterAddr = StellarSdk.Address.fromString(wallet)
      await sendTx('vote', [
        voterAddr.toScVal(),
        StellarSdk.xdr.ScVal.scvU32(proposalId),
        StellarSdk.xdr.ScVal.scvBool(approve),
      ])
      notify('success', `Vote cast! ${approve ? '✅ Yes' : '❌ No'}`)
      await loadProposals()
    } catch (err) {
      console.error(err)
      const msg = err.message || ''
      if (msg.includes('already voted')) notify('error', 'You already voted on this proposal.')
      else if (msg.includes('voting period ended')) notify('error', 'This proposal has ended.')
      else notify('error', `Vote failed: ${msg.substring(0, 80)}`)
    } finally {
      setVotingId(null)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedProposal = proposals.find(p => p.id === selected)
  const isExpired = selectedProposal ? currentLedger > selectedProposal.end_ledger : false
  const totalVotes = selectedProposal ? (selectedProposal.yes_votes + selectedProposal.no_votes) : 0
  const yesPct = totalVotes > 0 ? Math.round((selectedProposal.yes_votes / totalVotes) * 100) : 0
  const noPct = totalVotes > 0 ? Math.round((selectedProposal.no_votes / totalVotes) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">🗳️</span>
          <div>
            <h1 className="logo-title">Stellar Vote</h1>
            <p className="logo-sub">On-chain governance · Testnet</p>
          </div>
        </div>
        <div className="header-right">
          {wallet && (
            <div className="wallet-badge">
              <span className="wallet-dot" />
              {wallet.slice(0, 4)}…{wallet.slice(-4)}
            </div>
          )}
          <button className="btn btn-primary" onClick={connectWallet}>
            {wallet ? '🔄 Switch' : '🔗 Connect Wallet'}
          </button>
        </div>
      </header>

      {/* Toast */}
      {txStatus.msg && (
        <div className={`toast toast-${txStatus.type}`}>
          {txStatus.type === 'loading' && <span className="spinner" />}
          {txStatus.msg}
        </div>
      )}

      <div className="main-layout">
        {/* Sidebar — Proposal List */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Proposals</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(v => !v)}>
              {showCreate ? '✕ Cancel' : '+ New'}
            </button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <form className="create-form" onSubmit={handleCreate}>
              <input
                className="field"
                placeholder="Title *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={64}
                required
              />
              <textarea
                className="field"
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                maxLength={256}
              />
              <select
                className="field"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              >
                <option value="300">~1 hour</option>
                <option value="1440">~5 hours</option>
                <option value="4320">~15 hours</option>
                <option value="17280">~2.5 days</option>
              </select>
              <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Submitting…</> : '🚀 Create Proposal'}
              </button>
            </form>
          )}

          {/* Proposal Cards */}
          {loadingProposals ? (
            <div className="loading-list">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="empty-state">
              <p>No proposals yet.</p>
              <p>Be the first to create one!</p>
            </div>
          ) : (
            <ul className="proposal-list">
              {proposals.map(p => {
                const expired = currentLedger > p.end_ledger
                const total = p.yes_votes + p.no_votes
                return (
                  <li
                    key={p.id}
                    className={`proposal-card ${selected === p.id ? 'active' : ''}`}
                    onClick={() => setSelected(p.id)}
                  >
                    <div className="proposal-card-top">
                      <span className="proposal-title">{p.title}</span>
                      <span className={`badge ${expired ? 'badge-ended' : 'badge-active'}`}>
                        {expired ? 'Ended' : 'Live'}
                      </span>
                    </div>
                    <div className="proposal-card-stats">
                      <span className="vote-yes-mini">✅ {p.yes_votes}</span>
                      <span className="vote-no-mini">❌ {p.no_votes}</span>
                      <span className="vote-total-mini">{total} votes</span>
                    </div>
                    <div className="mini-bar">
                      <div className="mini-bar-yes" style={{ width: total > 0 ? `${Math.round(p.yes_votes / total * 100)}%` : '0%' }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Detail Panel */}
        <main className="detail-panel">
          {!selectedProposal ? (
            <div className="detail-empty">
              <div className="detail-empty-icon">🗳️</div>
              <h2>Select a proposal</h2>
              <p>Choose a proposal from the list to view details and cast your vote.</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <div className="detail-meta">
                    <span className={`badge ${isExpired ? 'badge-ended' : 'badge-active'}`}>
                      {isExpired ? '🔒 Ended' : '🟢 Active'}
                    </span>
                    <span className="detail-time">
                      {formatTimeLeft(selectedProposal.end_ledger, currentLedger)}
                    </span>
                    <span className="detail-ledger">Ledger #{selectedProposal.end_ledger}</span>
                  </div>
                  <h2 className="detail-title">{selectedProposal.title}</h2>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={loadProposals} title="Refresh">
                  🔄
                </button>
              </div>

              {selectedProposal.description && (
                <p className="detail-description">{selectedProposal.description}</p>
              )}

              <div className="detail-creator">
                Created by <code>{selectedProposal.creator?.slice(0, 8)}…{selectedProposal.creator?.slice(-6)}</code>
              </div>

              {/* Vote bars */}
              <div className="vote-section">
                <div className="vote-stat">
                  <div className="vote-stat-header">
                    <span className="vote-label yes">✅ Yes</span>
                    <span className="vote-count">{selectedProposal.yes_votes} votes · {yesPct}%</span>
                  </div>
                  <div className="vote-bar-bg">
                    <div className="vote-bar-fill yes-fill" style={{ width: `${yesPct}%` }} />
                  </div>
                </div>
                <div className="vote-stat">
                  <div className="vote-stat-header">
                    <span className="vote-label no">❌ No</span>
                    <span className="vote-count">{selectedProposal.no_votes} votes · {noPct}%</span>
                  </div>
                  <div className="vote-bar-bg">
                    <div className="vote-bar-fill no-fill" style={{ width: `${noPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="total-votes-row">
                <span className="total-votes-label">Total votes cast</span>
                <span className="total-votes-count">{totalVotes}</span>
              </div>

              {/* Vote buttons */}
              {!isExpired ? (
                <div className="vote-actions">
                  {!wallet ? (
                    <div className="connect-prompt">
                      <p>Connect your Freighter wallet to vote</p>
                      <button className="btn btn-primary" onClick={connectWallet}>🔗 Connect Wallet</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="btn btn-vote yes-btn"
                        onClick={() => handleVote(selectedProposal.id, true)}
                        disabled={votingId === selectedProposal.id}
                      >
                        {votingId === selectedProposal.id ? <span className="spinner" /> : '✅'}
                        Vote Yes
                      </button>
                      <button
                        className="btn btn-vote no-btn"
                        onClick={() => handleVote(selectedProposal.id, false)}
                        disabled={votingId === selectedProposal.id}
                      >
                        {votingId === selectedProposal.id ? <span className="spinner" /> : '❌'}
                        Vote No
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="vote-ended-banner">
                  🔒 Voting has ended for this proposal
                  <div className="vote-verdict">
                    {totalVotes === 0
                      ? 'No votes were cast'
                      : yesPct > noPct
                      ? `✅ Passed with ${yesPct}% Yes`
                      : yesPct < noPct
                      ? `❌ Rejected with ${noPct}% No`
                      : '🤝 Tied vote'}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
