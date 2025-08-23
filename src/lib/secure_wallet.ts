import { SecureWalletStorage } from './storage/wallet_storage'

// WASM imports - these will be available after we copy WASM package
declare global {
  interface Window {
    wasm?: {
      generate_mnemonic(): string
      create_account(mnemonic: string, account: number, index: number): string
      create_p2p_connection(mnemonic: string, account: number, index: number): string
    }
  }
}

export interface WalletAccount {
  blockchain_address: string
  peer_id: string
  account_number: number
  index: number
}

export class SecureWallet {
  private storage = new SecureWalletStorage()

  async generateMnemonic(): Promise<string> {
    if (!window.wasm) {
      throw new Error('WASM module not loaded')
    }
    return window.wasm.generate_mnemonic()
  }

  async createWallet(password: string): Promise<WalletAccount> {
    const mnemonic = await this.generateMnemonic()
    await this.storage.storeWallet(mnemonic, password)
    return this.createAccount(mnemonic, 0, 0)
  }

  async unlockWallet(password: string): Promise<WalletAccount> {
    const mnemonic = await this.storage.loadWallet(password)
    return this.createAccount(mnemonic, 0, 0)
  }

  async walletExists(): Promise<boolean> {
    return this.storage.walletExists()
  }

  async deleteWallet(): Promise<void> {
    return this.storage.deleteWallet()
  }

  async createAccount(mnemonic: string, account_number: number = 0, index: number = 0): Promise<WalletAccount> {
    if (!window.wasm) {
      throw new Error('WASM module not loaded')
    }

    const result = window.wasm.create_account(mnemonic, account_number, index)
    return JSON.parse(result)
  }

  async createP2PConnection(mnemonic: string, account_number: number = 0, index: number = 0): Promise<{
    peer_id: string
    blockchain_address: string
    status: string
  }> {
    if (!window.wasm) {
      throw new Error('WASM module not loaded')
    }

    const result = window.wasm.create_p2p_connection(mnemonic, account_number, index)
    return JSON.parse(result)
  }

  static async initWASM(): Promise<void> {
    try {
      // This will be implemented when we copy WASM package
      const wasmModule = await import('../../wasm-pkg')
      await wasmModule.default()
      
      window.wasm = {
        generate_mnemonic: wasmModule.generate_mnemonic,
        create_account: wasmModule.create_account,
        create_p2p_connection: wasmModule.create_p2p_connection
      }
    } catch (error) {
      console.error('Failed to initialize WASM:', error)
      throw new Error('WASM initialization failed')
    }
  }
}