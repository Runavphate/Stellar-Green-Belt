#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, symbol_short, IntoVal, Val, Symbol, vec};

#[contract]
pub struct StakingPool;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    RewardToken,
    StakedBalance(Address),
}

#[contractimpl]
impl StakingPool {
    pub fn initialize(env: Env, reward_token: Address) {
        if env.storage().instance().has(&DataKey::RewardToken) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::RewardToken, &reward_token);
    }

    pub fn stake(env: Env, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");
        
        let mut balance: i128 = env.storage().persistent().get(&DataKey::StakedBalance(user.clone())).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&DataKey::StakedBalance(user.clone()), &balance);

        env.events().publish((symbol_short!("stake"), user.clone()), amount);
    }

    pub fn claim_rewards(env: Env, user: Address) {
        user.require_auth();
        
        let balance: i128 = env.storage().persistent().get(&DataKey::StakedBalance(user.clone())).unwrap_or(0);
        assert!(balance > 0, "no staked balance");
        
        // Mock reward logic: 10% of staked amount
        let reward_amount = balance / 10;
        assert!(reward_amount > 0, "reward too small");
        
        // INTER-CONTRACT CALL
        let reward_token: Address = env.storage().instance().get(&DataKey::RewardToken).unwrap();
        
        let args = vec![&env, user.clone().into_val(&env), reward_amount.into_val(&env)];
        env.invoke_contract::<Val>(&reward_token, &Symbol::new(&env, "mint"), args);

        // Emit real-time event for frontend tracking
        env.events().publish((symbol_short!("claim"), user.clone()), reward_amount);
    }
}
