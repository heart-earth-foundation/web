import { SecureWalletStorage } from './storage/wallet_storage'

// WASM imports - these will be available after we copy WASM package
declare global {
  interface Window {
    wasm?: {
      generate_mnemonic(): string
      create_account(mnemonic: string, account: number, index: number): string
      create_p2p_connection(mnemonic: string, account: number, index: number): string
      sign_p2p_message(mnemonic: string, account_number: number, index: number, domain: string, blockchain_address: string, origin: string, message_content?: string): string
      create_simple_nonce(): string
      derive_x25519_key_from_account(mnemonic: string, account_number: number, index: number): string
      compute_shared_secret(mnemonic: string, account_number: number, index: number, their_public_key_hex: string): string
      encrypt_message_for_channel(message: string, shared_secret_hex: string, channel_id: string): string
      decrypt_message_for_channel(ciphertext_hex: string, nonce_hex: string, shared_secret_hex: string, channel_id: string): string
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
  private static wasmInitialized = false
  private static wasmInitPromise: Promise<void> | null = null

  async generateMnemonic(): Promise<string> {
    await SecureWallet.ensureWASMLoaded()
    return window.wasm!.generate_mnemonic()
  }

  async createWallet(password: string): Promise<WalletAccount> {
    const mnemonic = await this.generateMnemonic()
    await this.storage.storeWallet(mnemonic, password)
    return this.createAccount(mnemonic, 0, 0)
  }

  async unlockWallet(password: string): Promise<WalletAccount & { mnemonic: string }> {
    const mnemonic = await this.storage.loadWallet(password)
    const account = await this.createAccount(mnemonic, 0, 0)
    return { ...account, mnemonic }
  }

  async walletExists(): Promise<boolean> {
    return this.storage.walletExists()
  }

  async deleteWallet(): Promise<void> {
    return this.storage.deleteWallet()
  }

  async createAccount(mnemonic: string, account_number: number = 0, index: number = 0): Promise<WalletAccount> {
    await SecureWallet.ensureWASMLoaded()
    const result = window.wasm!.create_account(mnemonic, account_number, index)
    return JSON.parse(result)
  }

  async createP2PConnection(mnemonic: string, account_number: number = 0, index: number = 0): Promise<{
    peer_id: string
    blockchain_address: string
    status: string
  }> {
    await SecureWallet.ensureWASMLoaded()
    const result = window.wasm!.create_p2p_connection(mnemonic, account_number, index)
    return JSON.parse(result)
  }

  async signP2PMessage(
    mnemonic: string, 
    domain: string, 
    origin: string, 
    messageContent?: string,
    account_number: number = 0, 
    index: number = 0
  ): Promise<any> {
    await SecureWallet.ensureWASMLoaded()
    const account = await this.createAccount(mnemonic, account_number, index)
    const result = window.wasm!.sign_p2p_message(
      mnemonic, 
      account_number, 
      index, 
      domain, 
      account.blockchain_address, 
      origin, 
      messageContent
    )
    return JSON.parse(result)
  }

  async deriveX25519Key(mnemonic: string, account_number: number = 0, index: number = 0): Promise<{
    public_key: string
    secret_key_available: boolean
  }> {
    await SecureWallet.ensureWASMLoaded()
    const result = window.wasm!.derive_x25519_key_from_account(mnemonic, account_number, index)
    return JSON.parse(result)
  }

  async computeSharedSecret(
    mnemonic: string, 
    theirPublicKeyHex: string, 
    account_number: number = 0, 
    index: number = 0
  ): Promise<string> {
    await SecureWallet.ensureWASMLoaded()
    return window.wasm!.compute_shared_secret(mnemonic, account_number, index, theirPublicKeyHex)
  }

  async encryptMessage(
    message: string, 
    sharedSecretHex: string, 
    channelId: string
  ): Promise<{
    ciphertext: string
    nonce: string
  }> {
    await SecureWallet.ensureWASMLoaded()
    const result = window.wasm!.encrypt_message_for_channel(message, sharedSecretHex, channelId)
    return JSON.parse(result)
  }

  async decryptMessage(
    ciphertextHex: string, 
    nonceHex: string, 
    sharedSecretHex: string, 
    channelId: string
  ): Promise<string> {
    await SecureWallet.ensureWASMLoaded()
    return window.wasm!.decrypt_message_for_channel(ciphertextHex, nonceHex, sharedSecretHex, channelId)
  }

  static async ensureWASMLoaded(): Promise<void> {
    if (SecureWallet.wasmInitialized) {
      return
    }

    if (SecureWallet.wasmInitPromise) {
      return SecureWallet.wasmInitPromise
    }

    SecureWallet.wasmInitPromise = SecureWallet.initWASM()
    return SecureWallet.wasmInitPromise
  }

  private static async initWASM(): Promise<void> {
    try {
      console.log('Initializing WASM module...')
      const wasmModule = await import('../../wasm-pkg')
      await wasmModule.default()
      
      window.wasm = {
        generate_mnemonic: wasmModule.generate_mnemonic,
        create_account: wasmModule.create_account,
        create_p2p_connection: wasmModule.create_p2p_connection,
        sign_p2p_message: wasmModule.sign_p2p_message,
        create_simple_nonce: wasmModule.create_simple_nonce,
        derive_x25519_key_from_account: wasmModule.derive_x25519_key_from_account,
        compute_shared_secret: wasmModule.compute_shared_secret,
        encrypt_message_for_channel: wasmModule.encrypt_message_for_channel,
        decrypt_message_for_channel: wasmModule.decrypt_message_for_channel
      }
      
      SecureWallet.wasmInitialized = true
      console.log('WASM module initialized successfully')
    } catch (error) {
      SecureWallet.wasmInitPromise = null // Reset on failure
      console.error('Failed to initialize WASM:', error)
      throw new Error('WASM initialization failed: ' + (error as Error).message)
    }
  }
}