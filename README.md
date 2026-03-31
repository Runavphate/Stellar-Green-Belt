# Starlight Staking - Stellar Testnet Application

Welcome to **Starlight Staking**, a decentralized Web3 Application built for the Soroban ecosystem. 

## 📝 Overview
This open-source dApp provides users with a decentralized staking interface. Users can deploy real liquidity on the Stellar Testnet to receive "StarlightToken (SLT)" as rewards securely through the **Freighter Browser Extension**.

### Key Features
- **Inter-Contract Calls**: `StakingPool` contract invokes the `RewardToken` contract to mint and distribute tokens.
- **Custom Token**: We deployed `StarlightToken`, simulating an SRC-20 mint interface.
- **Freighter API Integration**: Natively integrated `@stellar/freighter-api` to route transaction payload signing safely.
- **Continuous Integration (CI/CD)**: A GitHub Action tests the build steps automatically.
- **Premium Glassmorphism Interface**: Fully built using layout tokens and `Vanilla CSS`.

## ✅ Submission Checklist Links

- **Smart Contract Address (Staking):** `CDFPSTMKYRX6SLPYSIFDIK734YZ5RCH663SKAYOPYKXIZUDBBASA4DVDO`
- **Smart Contract Address (Reward Token):** `CC55LDHDDIIXQ4XQEBCVZVWH7I6OUEZ665UNH7IYOIVEXNX2GS5VJ75KK`
- **Live Demo Link:** [Insert your deployed Vercel link here]

## 📸 Screenshots
*(Remember to push your own screenshot here)*
![Mobile View](./mobile-screenshot.png)

## 💻 Tech Stack
- **Smart Contracts:** Rust, Soroban SDK
- **Frontend:** React, Vite, Node.js, `lucide-react`, `@stellar/freighter-api`
- **Blockchain Interface:** `@stellar/stellar-sdk`
- **Styling:** Vanilla CSS (Outfit Font + Glassmorphism UI)

## 🚀 Installation & Usage

### Start Frontend (Testnet Configured)
Ensure you have the [Freighter Extension](https://www.freighter.app/) installed and switched to Testnet.
```bash
cd frontend
npm install
npm run dev
```
Visit http://localhost:5173. The UI will instantly display the dynamic staking dashboard and ask Freighter for permissions!

## 📖 Git History Requirements
This repository was meticulously crafted from start to finish via **10+ meaningful commits** tracking the full lifecycle of architecture, CI testing, and blockchain hookups.
