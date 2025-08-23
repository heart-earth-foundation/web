import { StorageError, StorageResult } from './mod'

interface WalletRecord {
  id: string
  encryptedData: string
  salt: string
  iv: string
  createdAt: number
}

export class IndexedDBWrapper {
  private static readonly DB_NAME = 'HeartEarthWallet'
  private static readonly DB_VERSION = 1
  private static readonly STORE_NAME = 'wallets'
  private static readonly WALLET_ID = 'main'

  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  static async storeWallet(encryptedData: string, salt: string, iv: string): Promise<StorageResult<void>> {
    try {
      const db = await this.openDB()
      
      const transaction = db.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)

      const walletRecord: WalletRecord = {
        id: this.WALLET_ID,
        encryptedData,
        salt,
        iv,
        createdAt: Date.now()
      }

      return new Promise((resolve) => {
        const request = store.put(walletRecord)

        request.onerror = () => {
          resolve(StorageResult.err({
            code: 'DB_ERROR',
            message: 'Failed to store wallet data'
          }))
        }

        request.onsuccess = () => {
          resolve(StorageResult.ok(undefined))
        }
      })
    } catch (error) {
      return StorageResult.err({
        code: 'DB_ERROR',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  static async loadWallet(): Promise<StorageResult<{ encryptedData: string; salt: string; iv: string }>> {
    try {
      const db = await this.openDB()
      
      const transaction = db.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)

      return new Promise((resolve) => {
        const request = store.get(this.WALLET_ID)

        request.onerror = () => {
          resolve(StorageResult.err({
            code: 'DB_ERROR',
            message: 'Failed to load wallet data'
          }))
        }

        request.onsuccess = () => {
          const result = request.result as WalletRecord | undefined

          if (!result) {
            resolve(StorageResult.err({
              code: 'NOT_FOUND',
              message: 'No wallet found'
            }))
            return
          }

          resolve(StorageResult.ok({
            encryptedData: result.encryptedData,
            salt: result.salt,
            iv: result.iv
          }))
        }
      })
    } catch (error) {
      return StorageResult.err({
        code: 'DB_ERROR',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  static async walletExists(): Promise<boolean> {
    try {
      const result = await this.loadWallet()
      return result.success
    } catch {
      return false
    }
  }

  static async deleteWallet(): Promise<StorageResult<void>> {
    try {
      const db = await this.openDB()
      
      const transaction = db.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)

      return new Promise((resolve) => {
        const request = store.delete(this.WALLET_ID)

        request.onerror = () => {
          resolve(StorageResult.err({
            code: 'DB_ERROR',
            message: 'Failed to delete wallet'
          }))
        }

        request.onsuccess = () => {
          resolve(StorageResult.ok(undefined))
        }
      })
    } catch (error) {
      return StorageResult.err({
        code: 'DB_ERROR',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }
}