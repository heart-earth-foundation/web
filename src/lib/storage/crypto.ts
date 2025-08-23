import { StorageError, StorageResult } from './mod'
import { argon2id } from '@noble/hashes/argon2'

export class WebCrypto {
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 32

  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Use Argon2 to match CLI wallet exactly
    const passwordBytes = new TextEncoder().encode(password)
    
    // Argon2id with default parameters (matches Argon2::default() in Rust)
    const keyBytes = argon2id(passwordBytes, salt, {
      t: 3,      // iterations (Argon2 default)
      m: 4096,   // memory cost in KB (Argon2 default) 
      p: 1,      // parallelism (Argon2 default)
      dkLen: 32  // 32 bytes for AES-256
    })

    // Import the derived key into WebCrypto for AES-GCM
    return crypto.subtle.importKey(
      'raw',
      keyBytes,
      {
        name: 'AES-GCM',
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
  }

  static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
  }

  static async encrypt(data: string, password: string): Promise<StorageResult<{
    encryptedData: string
    salt: string
    iv: string
  }>> {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      
      const salt = this.generateSalt()
      const iv = this.generateIV()
      
      const key = await this.deriveKey(password, salt)
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        dataBuffer
      )

      const encryptedArray = new Uint8Array(encryptedBuffer)
      
      return StorageResult.ok({
        encryptedData: this.arrayBufferToBase64(encryptedArray),
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv)
      })
    } catch (error) {
      return StorageResult.err({
        code: 'CRYPTO_ERROR',
        message: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  static async decrypt(
    encryptedData: string,
    password: string,
    salt: string,
    iv: string
  ): Promise<StorageResult<string>> {
    try {
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData)
      const saltBuffer = this.base64ToArrayBuffer(salt)
      const ivBuffer = this.base64ToArrayBuffer(iv)
      
      const key = await this.deriveKey(password, new Uint8Array(saltBuffer))
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(ivBuffer)
        },
        key,
        encryptedBuffer
      )

      const decoder = new TextDecoder()
      const decryptedData = decoder.decode(decryptedBuffer)
      
      return StorageResult.ok(decryptedData)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'OperationError') {
        return StorageResult.err({
          code: 'INVALID_PASSWORD',
          message: 'Invalid password or corrupted data'
        })
      }
      
      return StorageResult.err({
        code: 'CRYPTO_ERROR',
        message: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    
    return btoa(binary)
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return bytes.buffer
  }
}