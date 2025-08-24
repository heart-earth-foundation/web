'use client'

import { useState } from 'react'
import { WalletData } from '@/app/page'
import { SecureWallet } from '@/lib/secure_wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { debugIndexedDB, listAllDatabases } from '@/lib/debug-indexeddb'

interface LoginScreenProps {
  onLogin: (data: WalletData) => void
  onBack: () => void
}

export default function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallet] = useState(() => new SecureWallet())

  const generateAddresses = async (mnemonic: string) => {
    // WASM initialization now handled automatically in createAccount()
    const account = await wallet.createAccount(mnemonic, 0, 0)
    return {
      peerAddress: account.peer_id,
      blockchainAddress: account.blockchain_address
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if wallet exists first
      const exists = await wallet.walletExists()
      if (!exists) {
        setError('No wallet found. Please create a wallet first.')
        setLoading(false)
        return
      }

      // Try to unlock wallet with password
      const account = await wallet.unlockWallet(password)
      
      onLogin({
        name: 'main',
        mnemonic: account.blockchain_address, // Don't expose mnemonic in state
        password,
        peerAddress: account.peer_id,
        blockchainAddress: account.blockchain_address
      })
    } catch (err: any) {
      if (err.message?.includes('Invalid password')) {
        setError('Invalid password')
      } else if (err.message?.includes('No wallet found')) {
        setError('No wallet found. Please create a wallet first.')
      } else {
        setError('Failed to load wallet: ' + (err.message || 'Unknown error'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Access your existing wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    debugIndexedDB()
                    listAllDatabases()
                  }}
                  disabled={loading}
                >
                  Debug DB
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onBack} 
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Login'}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Wallet stored in: <span className="font-mono">~/.config/heart-earth/wallets/</span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}