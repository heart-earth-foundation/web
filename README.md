# Heart Earth Web Interface

A minimal Next.js TypeScript frontend for the Heart Earth P2P blockchain network.

## Features

- **Wallet Creation**: Generate 12-word mnemonic with encrypted storage
- **Login Flow**: Secure wallet authentication 
- **Dashboard**: Account info, P2P chat, and settings
- **Real-time Chat**: Gossipsub messaging with end-to-end encryption
- **Network Info**: Connected peers and bootstrap node status

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

Integrates with Heart Earth Rust backend via WebAssembly:
- **Wallet**: HD wallet with secp256k1 (blockchain) + ed25519 (P2P) derivation
- **P2P**: libp2p networking with WebSocket transport
- **Encryption**: X25519 key exchange with AES-256-GCM message encryption

## Flow

1. **Welcome** → Choose create wallet or login
2. **Create Wallet** → Set password → Save mnemonic → Dashboard  
3. **Login** → Enter password → Dashboard
4. **Dashboard** → Account info, gossip chat, settings

Frontend uses WebAssembly bindings to the Rust wallet and p2p crates.