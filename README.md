# Tiny Brain Wallet

> Don't trust verify

## Contents

- [Goal](#goal)
  - [Minimal Dependencies](#minimal-dependencies)
- [Crypto](#crypto)
  - [Bitcoin](#bitcoin)
- [Security](#security)
  - [Layer 1: OS-Provided Encryption (Wallet File Protection)](#layer-1-os-provided-encryption-wallet-file-protection)
  - [Layer 2: Password-Based Encryption (Mnemonic Protection)](#layer-2-password-based-encryption-mnemonic-protection)
  - [Security Architecture Summary](#security-architecture-summary)
- [Architecture](#architecture)
  - [Inter-Process Communication (IPC)](#inter-process-communication-ipc)
- [File Structure](#file-structure)
- [Core Functionalities (IPC Handlers)](#core-functionalities-ipc-handlers)
  - [Wallet Management](#wallet-management)
  - [Bitcoin Operations](#bitcoin-operations)
  - [Application](#application)
- [License](#license)

## Goal

The goal of this project is to create an **easy-to-audit crypto HD wallet** with a **minimal set of dependencies**. By keeping the dependency tree small and the architecture simple, security auditors and developers can quickly understand and verify the wallet's behavior without navigating through complex dependency chains.

### Minimal Dependencies

The wallet aims to keep dependencies to a minimum. Current runtime dependencies:

- **bitcoinjs-lib** - Core Bitcoin protocol implementation
- **tiny-secp256k1** - Minimal secp256k1 cryptographic operations
- **ecpair** - Elliptic curve key pair management
- **bip32** - BIP32 hierarchical deterministic key derivation
- **bip39** - BIP39 mnemonic generation / seed derivation
- **electron** - Desktop application framework
- **react** - UI framework
- **react-dom** - React DOM renderer
- **react-router** - Routing

All other functionality is implemented from scratch to maintain transparency and auditability.

## Crypto

This section summarizes the cryptographic primitives and protocol features currently implemented in the wallet.

### Bitcoin

- **API provider**: [Mempool](https://mempool.space/)
- **Supported address type**: Native SegWit (P2WPKH)
- **UTXO management**: UTXO discovery and selection

---

## Security

The wallet implements a **two-layer encryption system** to protect your funds against different attack vectors:

### Layer 1: OS-Provided Encryption (Wallet File Protection)

The entire wallet file is encrypted using the operating system's native encryption system:

- **Windows**: Data Protection API (DPAPI)
- **macOS**: Keychain Services
- **Linux**: libsecret (Secret Service API)

This encryption is **machine-specific** and tied to your user account. The encrypted wallet file cannot be decrypted on a different machine, even if someone steals the `.wal` file. This prevents attackers from copying your wallet file and accessing it on their own system.

**Protection**: Prevents wallet file theft and unauthorized access from different machines.

### Layer 2: Password-Based Encryption (Mnemonic Protection)

Inside the encrypted wallet file, the BIP39 mnemonic is **additionally encrypted** with a user-provided password. Private keys are derived from the mnemonic when needed.

- **Encryption Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with SHA-256 (100,000 iterations)
- **Password Requirement**: Minimum 12 characters

This second layer of encryption protects your mnemonic in case an unauthorized person gains **physical access** to your machine. Even if they can decrypt the wallet file using your OS credentials, they still need your wallet password (minimum 12 characters) to decrypt the mnemonic.

**Protection**: Provides defense-in-depth against physical access attacks and gives you time to move funds if your machine is compromised.

### Security Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│  Wallet File (.wal)                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Encrypted with OS safeStorage                    │  │
│  │  (DPAPI/Keychain/libsecret)                       │  │
│  │  → Machine-specific, cannot be moved              │  │
│  └───────────────────────────────────────────────────┘  │
│                    │                                    │
│                    ▼                                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Wallet Data (JSON)                               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  mnemonicEncrypted                          │  │  │
│  │  │  (AES-GCM + PBKDF2, 100k iterations)        │  │  │
│  │  │  → Requires password (min 12 chars)         │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture

### Inter-Process Communication (IPC)

The application follows a strict separation of concerns between the **main process** (Node.js) and the **renderer process** (browser/UI):

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (UI)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Components, Screens, Hooks                    │   │
│  │  - Pure UI logic only                                │   │
│  │  - No cryptographic operations                       │   │
│  │  - No wallet file I/O                                │   │
│  │  - No transaction signing                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          │ IPC Calls                        │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ipc.tsx (Ipc class)                                 │   │
│  │  - Wrapper for window.api calls                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ contextBridge (preload.ts)
                          │
┌─────────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ipc.ts (registerHandlers)                           │   │
│  │  - Core functionality handlers                       │   │
│  │  - All sensitive operations                          │   │
│  │  - Cryptographic functions                           │   │
│  │  - Wallet management                                 │   │
│  │  - Transaction signing                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  utils/                                              │   │
│  │  - wallet.ts (Wallet storage & management)           │   │
│  │  - crypto.ts (Encryption/decryption)                 │   │
│  │  - btc-address.ts (Address generation)               │   │
│  │  - btc-transaction.ts (Transaction building)         │   │
│  │  - mempool-client.ts (Blockchain queries)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle**: The renderer process performs **no cryptographic operations**. All encryption/decryption, key derivation, and transaction signing occur exclusively in the main process. The renderer communicates with the main process through IPC handlers defined in `src/main/ipc.ts`.

---

## File Structure

```
tiny-brain-wallet/
│
├── src/
│   │
│   ├── main/                          # Main Electron process (Node.js)
│   │   ├── index.ts                   # Electron app entry point, window management
│   │   ├── ipc.ts                     # ⭐ Core IPC handlers - all sensitive operations
│   │   ├── preload.ts                 # Context bridge exposing safe API to renderer
│   │   ├── tsconfig.json              # TypeScript configuration
│   │   │
│   │   ├── utils/                     # Core wallet functionality
│   │   │   ├── wallet.ts              # Wallet storage, retrieval, transaction signing
│   │   │   ├── crypto.ts              # Encryption, decryption, SHA256 hashing
│   │   │   ├── btc-address.ts         # Bitcoin address generation (P2WPKH)
│   │   │   ├── btc-transaction.ts     # Transaction building and construction
│   │   │   └── mempool-client.ts      # Mempool.space API client for blockchain data
│   │   │
│   │   └── helpers/
│   │       └── countDecimals.ts       # Utility for decimal counting
│   │
│   ├── renderer/                      # Renderer process (Browser/UI)
│   │   ├── index.tsx                  # React app entry point
│   │   ├── _layout.tsx                # Root layout component
│   │   ├── ipc.tsx                    # IPC client wrapper (calls window.api)
│   │   ├── const.ts                   # Application constants
│   │   │
│   │   ├── components/                # Reusable UI components
│   │   │
│   │   ├── screens/                    # Application screens/pages
│   │   │
│   │   ├── hooks/                     # React custom hooks
│   │   │
│   │   ├── modals/                    # Modal components
│   │   │
│   │   ├── helpers/                   # UI helper functions
│   │   │
│   │   ├── assets/                    # Static assets
│   │   │
│   │   ├── public/                    # Public files (HTML, CSS)
│   │   │
│   │   └── dist/                      # Build output (generated)
│   │
│   └── types.d.ts                     # Shared TypeScript type definitions
│
├── package.json                       # Dependencies and project metadata
├── package-lock.json                  # Dependency lock file
├── Makefile                           # Build and development commands
└── README.md                          # This file
```

---

## Core Functionalities (IPC Handlers)

All core functionalities are declared in `src/main/ipc.ts`. The renderer process communicates with these handlers via inter-process communication. The following operations are available:

### Wallet Management

- `store-wallet` - Store a new wallet (encrypted)
- `get-wallets` - Retrieve list of all wallets
- `get-wallet-node` - Derive an address (from mnemonic + path) and return mempool data
- `delete-wallet` - Delete a wallet file

### Bitcoin Operations

- `derive-path` - Build a BIP32 derivation path from options
- `generate-mnemonic` - Generate a new BIP39 mnemonic
- `is-address-valid` - Validate Bitcoin address
- `send-transaction` - Create, sign, and broadcast transaction

### Application

- `restart-window` - Restart the application window

---

## License

MIT