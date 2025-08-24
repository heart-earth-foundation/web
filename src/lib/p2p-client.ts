interface P2PMessage {
  topic: string
  data: string
  sender: string
  timestamp: number
  encrypted?: boolean
}

interface EncryptedMessage {
  type: 'publish'
  topic: string
  encrypted: boolean
  ciphertext: string
  nonce: string
  signature: any
  sender: string
}

interface P2PConnectionConfig {
  bootstrapUrl: string
  channel: string
  peerInfo: {
    peerId: string
    blockchainAddress: string
  }
}

export class P2PClient {
  private socket: WebSocket | null = null
  private config: P2PConnectionConfig
  private messageHandlers: ((message: P2PMessage) => void)[] = []
  private connectionHandlers: ((status: 'connected' | 'disconnected' | 'error') => void)[] = []
  private encryptionEnabled: boolean = true
  private peerKeys: Map<string, string> = new Map() // peerId -> x25519 public key
  private ourX25519Key: { public_key: string } | null = null
  private mnemonic: string | null = null
  
  constructor(config: P2PConnectionConfig) {
    this.config = config
  }

  async connect(mnemonic?: string): Promise<void> {
    this.mnemonic = mnemonic || null
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.config.bootstrapUrl)
        
        this.socket.onopen = async () => {
          console.log('Connected to P2P bootstrap node')
          
          // Initialize encryption keys if mnemonic provided
          if (this.mnemonic && this.encryptionEnabled) {
            await this.initializeEncryption()
          }
          
          this.notifyConnectionHandlers('connected')
          resolve()
        }
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data).catch(error => {
            console.error('Error handling message:', error)
          })
        }
        
        this.socket.onclose = () => {
          console.log('Disconnected from P2P network')
          this.notifyConnectionHandlers('disconnected')
        }
        
        this.socket.onerror = (error) => {
          console.error('P2P connection error:', error)
          this.notifyConnectionHandlers('error')
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async sendMessage(content: string, mnemonic?: string): Promise<boolean> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('P2P connection not ready')
      return false
    }

    const useMnemonic = mnemonic || this.mnemonic
    if (!useMnemonic) {
      console.error('No mnemonic available for message signing')
      return false
    }

    try {
      const { SecureWallet } = await import('./secure_wallet')
      const wallet = new SecureWallet()

      if (this.encryptionEnabled && this.ourX25519Key) {
        // Send encrypted message
        return this.sendEncryptedMessage(content, useMnemonic, wallet)
      } else {
        // Send plain message (backward compatibility)
        return this.sendPlainMessage(content, useMnemonic, wallet)
      }
    } catch (error) {
      console.error('Failed to send P2P message:', error)
      return false
    }
  }

  onMessage(handler: (message: P2PMessage) => void): void {
    this.messageHandlers.push(handler)
  }

  onConnectionChange(handler: (status: 'connected' | 'disconnected' | 'error') => void): void {
    this.connectionHandlers.push(handler)
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data)
      
      if (parsed.type === 'key_announcement') {
        // Store peer's public key
        this.peerKeys.set(parsed.sender, parsed.public_key)
        console.log(`Received X25519 public key from peer ${parsed.sender}:`, parsed.public_key)
      } else if (parsed.type === 'message' && parsed.topic === this.config.channel) {
        if (parsed.encrypted && this.encryptionEnabled) {
          // Handle encrypted message
          await this.handleEncryptedMessage(parsed)
        } else {
          // Handle plain message
          const message: P2PMessage = {
            topic: parsed.topic,
            data: parsed.data,
            sender: parsed.sender || 'unknown',
            timestamp: parsed.timestamp || Date.now(),
            encrypted: false
          }
          
          this.notifyMessageHandlers(message)
        }
      }
    } catch (error) {
      console.error('Failed to parse P2P message:', error)
    }
  }

  private async handleEncryptedMessage(parsed: any): Promise<void> {
    if (!this.mnemonic) {
      console.warn('Cannot decrypt message: no mnemonic available')
      return
    }

    // Check if we have the sender's public key
    const senderPublicKey = this.peerKeys.get(parsed.sender)
    if (!senderPublicKey) {
      console.warn(`Cannot decrypt message: no public key for sender ${parsed.sender}`)
      const message: P2PMessage = {
        topic: parsed.topic,
        data: '[Encrypted message - sender key unknown]',
        sender: parsed.sender || 'unknown',
        timestamp: parsed.timestamp || Date.now(),
        encrypted: true
      }
      this.notifyMessageHandlers(message)
      return
    }

    try {
      const { SecureWallet } = await import('./secure_wallet')
      const wallet = new SecureWallet()
      
      // Compute shared secret with the sender
      const sharedSecretHex = await wallet.computeSharedSecret(this.mnemonic, senderPublicKey, 0, 0)
      
      // Decrypt the message
      const decryptedData = await wallet.decryptMessage(
        parsed.ciphertext,
        parsed.nonce,
        sharedSecretHex,
        this.config.channel
      )

      const message: P2PMessage = {
        topic: parsed.topic,
        data: decryptedData,
        sender: parsed.sender || 'unknown',
        timestamp: parsed.timestamp || Date.now(),
        encrypted: true
      }

      this.notifyMessageHandlers(message)
      console.log(`Successfully decrypted message from peer ${parsed.sender}`)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      const message: P2PMessage = {
        topic: parsed.topic,
        data: '[Encrypted message - decryption failed]',
        sender: parsed.sender || 'unknown',
        timestamp: parsed.timestamp || Date.now(),
        encrypted: true
      }
      
      this.notifyMessageHandlers(message)
    }
  }

  private notifyMessageHandlers(message: P2PMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('Message handler error:', error)
      }
    })
  }

  private notifyConnectionHandlers(status: 'connected' | 'disconnected' | 'error'): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(status)
      } catch (error) {
        console.error('Connection handler error:', error)
      }
    })
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  getConnectionStatus(): string {
    if (!this.socket) return 'disconnected'
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'disconnected'
      default: return 'unknown'
    }
  }

  private async initializeEncryption(): Promise<void> {
    if (!this.mnemonic) return
    
    try {
      const { SecureWallet } = await import('./secure_wallet')
      const wallet = new SecureWallet()
      
      // Derive our X25519 key
      this.ourX25519Key = await wallet.deriveX25519Key(this.mnemonic, 0, 0)
      console.log('Encryption initialized with X25519 public key:', this.ourX25519Key.public_key)
      
      // Announce our public key to other peers
      await this.announcePublicKey()
    } catch (error) {
      console.error('Failed to initialize encryption:', error)
      this.encryptionEnabled = false
    }
  }

  private async announcePublicKey(): Promise<void> {
    if (!this.socket || !this.ourX25519Key || !this.mnemonic) return

    try {
      const { SecureWallet } = await import('./secure_wallet')
      const wallet = new SecureWallet()
      
      // Sign the key announcement
      const signature = await wallet.signP2PMessage(
        this.mnemonic,
        'p2p.heartearth.art',
        'https://p2p.heartearth.art',
        this.ourX25519Key.public_key
      )

      const keyMessage = {
        type: 'key_announcement',
        data: this.ourX25519Key.public_key,
        signature: signature,
        sender: this.config.peerInfo.peerId
      }

      this.socket.send(JSON.stringify(keyMessage))
      console.log('Announced X25519 public key to peers')
    } catch (error) {
      console.error('Failed to announce public key:', error)
    }
  }

  private async sendPlainMessage(content: string, mnemonic: string, wallet: any): Promise<boolean> {
    const signature = await wallet.signP2PMessage(
      mnemonic,
      'p2p.heartearth.art',
      'https://p2p.heartearth.art',
      content
    )

    const message = {
      type: 'publish',
      topic: this.config.channel,
      data: content,
      signature: signature,
      sender: this.config.peerInfo.peerId
    }

    this.socket!.send(JSON.stringify(message))
    return true
  }

  private async sendEncryptedMessage(content: string, mnemonic: string, wallet: any): Promise<boolean> {
    // Get all connected peers with known keys
    const peersWithKeys = Array.from(this.peerKeys.entries())
    
    if (peersWithKeys.length === 0) {
      console.warn('No peers with known encryption keys, sending plain message')
      return this.sendPlainMessage(content, mnemonic, wallet)
    }
    
    try {
      // For simplicity, encrypt with the first peer's key (in a group chat, we'd encrypt for all peers)
      const [peerID, theirPublicKeyHex] = peersWithKeys[0]
      
      // Compute shared secret with this peer
      const sharedSecretHex = await wallet.computeSharedSecret(mnemonic, theirPublicKeyHex, 0, 0)
      
      // Encrypt the message
      const encrypted = await wallet.encryptMessage(content, sharedSecretHex, this.config.channel)
      
      // Sign the encrypted payload
      const signature = await wallet.signP2PMessage(
        mnemonic,
        'p2p.heartearth.art',
        'https://p2p.heartearth.art',
        encrypted.ciphertext
      )

      const message: EncryptedMessage = {
        type: 'publish',
        topic: this.config.channel,
        encrypted: true,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        signature: signature,
        sender: this.config.peerInfo.peerId
      }

      this.socket!.send(JSON.stringify(message))
      console.log(`Sent encrypted message using shared secret with peer ${peerID}`)
      return true
    } catch (error) {
      console.error('Encryption failed, falling back to plain message:', error)
      return this.sendPlainMessage(content, mnemonic, wallet)
    }
  }

  setEncryptionEnabled(enabled: boolean): void {
    this.encryptionEnabled = enabled
  }
}

export const createP2PClient = (peerInfo: { peerId: string; blockchainAddress: string }) => {
  const client = new P2PClient({
    bootstrapUrl: 'wss://p2p.heartearth.art/ws',
    channel: '/art/dev/general/v1',
    peerInfo
  })
  
  // Enable encryption by default
  client.setEncryptionEnabled(true)
  
  return client
}