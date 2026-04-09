#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String, symbol_short,
};

// ── Storage keys ────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    ProposalCount,
    Proposal(u32),
    HasVoted(u32, Address),
}

// ── Data types ───────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub struct Proposal {
    pub title: String,
    pub description: String,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub end_ledger: u32,
    pub creator: Address,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct VotingContract;

#[contractimpl]
impl VotingContract {
    /// Create a new proposal.
    /// `duration_ledgers` — how many ledgers the vote stays open
    /// (~5 ledgers/min, so 1440 ≈ 5 hours).  Pass 0 to use default (1440).
    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        duration_ledgers: u32,
    ) -> u32 {
        creator.require_auth();

        let duration = if duration_ledgers == 0 { 1440 } else { duration_ledgers };
        let end_ledger = env.ledger().sequence() + duration;

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);

        let proposal = Proposal {
            title: title.clone(),
            description,
            yes_votes: 0,
            no_votes: 0,
            end_ledger,
            creator: creator.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(count), &proposal);

        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &(count + 1));

        env.events()
            .publish((symbol_short!("create"), creator), count);

        count // return new proposal id
    }

    /// Cast a vote. `approve = true` → yes, `false` → no.
    pub fn vote(env: Env, voter: Address, proposal_id: u32, approve: bool) {
        voter.require_auth();

        // Must not have voted already
        let voted_key = DataKey::HasVoted(proposal_id, voter.clone());
        assert!(
            !env.storage().persistent().has(&voted_key),
            "already voted"
        );

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        // Must still be open
        assert!(
            env.ledger().sequence() <= proposal.end_ledger,
            "voting period ended"
        );

        if approve {
            proposal.yes_votes += 1;
        } else {
            proposal.no_votes += 1;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        // Mark voter as having voted
        env.storage().persistent().set(&voted_key, &true);

        env.events()
            .publish((symbol_short!("vote"), voter), (proposal_id, approve));
    }

    /// Read a single proposal by ID.
    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found")
    }

    /// Total number of proposals ever created.
    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }
}
