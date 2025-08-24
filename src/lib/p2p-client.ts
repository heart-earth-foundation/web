interface P2PMessage {
  topic: string
  data: string
  sender: string
  timestamp: number
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
  
  constructor(config: P2PConnectionConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.config.bootstrapUrl)
        
        this.socket.onopen = () => {
          console.log('Connected to P2P bootstrap node')
          this.notifyConnectionHandlers('connected')
          resolve()
        }
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data)
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

  async sendMessage(content: string, mnemonic: string): Promise<boolean> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('P2P connection not ready')
      return false
    }

    try {
      // Import SecureWallet for signing
      const { SecureWallet } = await import('./secure_wallet')
      const wallet = new SecureWallet()
      
      // Sign the message with P2P authentication
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

      this.socket.send(JSON.stringify(message))
      return true
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

  private handleMessage(data: string): void {
    try {
      const parsed = JSON.parse(data)
      
      if (parsed.type === 'message' && parsed.topic === this.config.channel) {
        const message: P2PMessage = {
          topic: parsed.topic,
          data: parsed.data,
          sender: parsed.sender || 'unknown',
          timestamp: parsed.timestamp || Date.now()
        }
        
        this.notifyMessageHandlers(message)
      }
    } catch (error) {
      console.error('Failed to parse P2P message:', error)
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
}

export const createP2PClient = (peerInfo: { peerId: string; blockchainAddress: string }) => {
  return new P2PClient({
    bootstrapUrl: 'wss://p2p.heartearth.art/ws',
    channel: '/art/dev/general/v1',
    peerInfo
  })
}