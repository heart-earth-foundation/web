'use client'

import { useState, useEffect, useRef } from 'react'
import { WalletData } from '@/app/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { P2PClient, createP2PClient } from '@/lib/p2p-client'

interface DashboardScreenProps {
  walletData: WalletData | null
  onLogout: () => void
}

interface Message {
  id: string
  sender: string
  content: string
  timestamp: number
}

export default function DashboardScreen({ walletData, onLogout }: DashboardScreenProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [connectedPeers, setConnectedPeers] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const p2pClientRef = useRef<P2PClient | null>(null)

  useEffect(() => {
    if (!walletData) return

    // Initialize real P2P client
    const client = createP2PClient({
      peerId: walletData.peerAddress,
      blockchainAddress: walletData.blockchainAddress
    })

    p2pClientRef.current = client

    // Set up message handler
    client.onMessage((message) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: message.sender,
        content: message.data,
        timestamp: message.timestamp
      }])
    })

    // Set up connection handler
    client.onConnectionChange((status) => {
      if (status === 'connected') {
        setConnectionStatus('connected')
        // In a real implementation, we'd get peer list from the network
        setConnectedPeers(['Bootstrap Node'])
      } else if (status === 'disconnected') {
        setConnectionStatus('disconnected')
        setConnectedPeers([])
      } else if (status === 'error') {
        setConnectionStatus('disconnected')
        setConnectedPeers([])
      }
    })

    // Connect to P2P network
    client.connect().catch(error => {
      console.error('Failed to connect to P2P network:', error)
      setConnectionStatus('disconnected')
    })

    // Cleanup on unmount
    return () => {
      client.disconnect()
    }
  }, [walletData])


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !p2pClientRef.current) return

    // Send message via P2P client
    const success = p2pClientRef.current.sendMessage(messageInput)
    
    if (success) {
      // Add message to local display (it will also come back from the network)
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'You',
        content: messageInput,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, newMessage])
      setMessageInput('')
    } else {
      console.error('Failed to send message - not connected to P2P network')
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="min-h-[80vh] space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Heart Earth Dashboard</h1>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="gossip">Gossip</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Info</CardTitle>
                  <CardDescription>Your wallet details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Wallet Name</Label>
                    <p className="font-mono">{walletData?.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Blockchain Address</Label>
                    <p className="font-mono text-sm break-all">
                      {walletData?.blockchainAddress}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>P2P Identity</CardTitle>
                  <CardDescription>Network connection details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Peer ID</Label>
                    <p className="font-mono text-sm break-all">
                      {walletData?.peerAddress}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                        {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Network Info</CardTitle>
                <CardDescription>Connection details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Bootstrap Node</Label>
                    <p className="font-mono text-sm">p2p.heartearth.art</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Channel</Label>
                    <p className="font-mono text-sm">/art/dev/general/v1</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Connected Peers</Label>
                    <p className="text-sm">{connectedPeers.length}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Protocol</Label>
                    <p className="text-sm">libp2p (TCP + Gossipsub)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gossip" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>#general</CardTitle>
                    <CardDescription>Developer channel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-64 w-full rounded-md border p-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="text-sm mb-2">
                          <span className="text-muted-foreground">[{formatTime(msg.timestamp)}]</span>
                          <span className="font-semibold ml-2">&lt;{msg.sender}&gt;</span>
                          <span className="ml-2">{msg.content}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type message here..."
                        disabled={connectionStatus !== 'connected'}
                      />
                      <Button 
                        type="submit"
                        disabled={connectionStatus !== 'connected'}
                      >
                        Send
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Channels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="default" className="w-full justify-start">
                      # general
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-green-500" />
                      <span className="text-sm">You</span>
                    </div>
                    {connectedPeers.map((peer, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-green-500" />
                        <span className="text-sm">{peer.slice(0, 8)}...</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select defaultValue="dark">
                      <SelectTrigger id="theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Button variant="destructive">
                      Delete Wallet
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This will permanently delete your wallet from this device
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}