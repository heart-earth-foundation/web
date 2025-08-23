import { WalletStorage, StorageResult } from './mod'
import { IndexedDBWrapper } from './indexeddb'
import { WebCrypto } from './crypto'

export class SecureWalletStorage implements WalletStorage {
  async storeWallet(mnemonic: string, password: string): Promise<void> {
    const encryptResult = await WebCrypto.encrypt(mnemonic, password)
    
    if (!encryptResult.success || !encryptResult.data) {
      throw new Error(encryptResult.error?.message || 'Encryption failed')
    }

    const { encryptedData, salt, iv } = encryptResult.data
    
    const storeResult = await IndexedDBWrapper.storeWallet(encryptedData, salt, iv)
    
    if (!storeResult.success) {
      throw new Error(storeResult.error?.message || 'Storage failed')
    }
  }

  async loadWallet(password: string): Promise<string> {
    const loadResult = await IndexedDBWrapper.loadWallet()
    
    if (!loadResult.success || !loadResult.data) {
      throw new Error(loadResult.error?.message || 'Failed to load wallet')
    }

    const { encryptedData, salt, iv } = loadResult.data
    
    const decryptResult = await WebCrypto.decrypt(encryptedData, password, salt, iv)
    
    if (!decryptResult.success || !decryptResult.data) {
      if (decryptResult.error?.code === 'INVALID_PASSWORD') {
        throw new Error('Invalid password')
      }
      throw new Error(decryptResult.error?.message || 'Decryption failed')
    }

    return decryptResult.data
  }

  async walletExists(): Promise<boolean> {
    return IndexedDBWrapper.walletExists()
  }

  async deleteWallet(): Promise<void> {
    const deleteResult = await IndexedDBWrapper.deleteWallet()
    
    if (!deleteResult.success) {
      throw new Error(deleteResult.error?.message || 'Failed to delete wallet')
    }
  }
}