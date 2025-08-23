export interface StorageError {
  code: 'DB_ERROR' | 'CRYPTO_ERROR' | 'NOT_FOUND' | 'INVALID_PASSWORD'
  message: string
}

export interface WalletStorage {
  storeWallet(mnemonic: string, password: string): Promise<void>
  loadWallet(password: string): Promise<string>
  walletExists(): Promise<boolean>
  deleteWallet(): Promise<void>
}

export class StorageResult<T> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: StorageError
  ) {}

  static ok<T>(data: T): StorageResult<T> {
    return new StorageResult(true, data)
  }

  static err<T>(error: StorageError): StorageResult<T> {
    return new StorageResult(false, null as any, error)
  }
}