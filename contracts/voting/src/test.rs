#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_create_proposal() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    env.mock_all_auths();

    let title = String::from_str(&env, "Test Proposal");
    let description = String::from_str(&env, "Test Description");
    
    let proposal_id = client.create_proposal(&creator, &title, &description, &100);
    assert_eq!(proposal_id, 0);
    assert_eq!(client.get_proposal_count(), 1);

    let proposal = client.get_proposal(&0);
    assert_eq!(proposal.title, title);
    assert_eq!(proposal.yes_votes, 0);
    assert_eq!(proposal.no_votes, 0);
}

#[test]
fn test_vote() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    env.mock_all_auths();

    let title = String::from_str(&env, "Test Proposal");
    let description = String::from_str(&env, "Test Description");
    let proposal_id = client.create_proposal(&creator, &title, &description, &100);

    client.vote(&voter, &proposal_id, &true);

    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.yes_votes, 1);
    assert_eq!(proposal.no_votes, 0);
}

#[test]
#[should_panic(expected = "already voted")]
fn test_double_vote() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    env.mock_all_auths();

    let title = String::from_str(&env, "Test Proposal");
    let description = String::from_str(&env, "Test Description");
    let proposal_id = client.create_proposal(&creator, &title, &description, &100);

    client.vote(&voter, &proposal_id, &true);
    client.vote(&voter, &proposal_id, &false); // Should panic
}

#[test]
#[should_panic(expected = "voting period ended")]
fn test_voting_period_ended() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    env.mock_all_auths();

    let title = String::from_str(&env, "Test Proposal");
    let description = String::from_str(&env, "Test Description");
    
    // Create proposal with very short duration
    let proposal_id = client.create_proposal(&creator, &title, &description, &5);

    // Advance ledger sequence past end_ledger
    env.ledger().set_sequence(env.ledger().sequence() + 10);

    client.vote(&voter, &proposal_id, &true); // Should panic
}
