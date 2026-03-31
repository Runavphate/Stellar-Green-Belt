#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contract]
pub struct RewardToken;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
}

#[contractimpl]
impl RewardToken {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        // Since the caller is a contract (StakingPool), require_auth ensures the contract authorized the call.
        admin.require_auth();
        assert!(amount > 0, "amount must be positive");
        
        let mut balance = Self::get_balance(env.clone(), to.clone());
        balance += amount;
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &balance);
        
        env.events().publish((soroban_sdk::symbol_short!("mint"), to), amount);
    }

    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(user)).unwrap_or(0)
    }
}
