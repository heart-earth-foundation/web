'use client'

import { useState } from 'react'
import { WalletData } from '@/app/page'
import { SecureWallet } from '@/lib/secure_wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'

interface CreateWalletScreenProps {
  onWalletCreated: (data: WalletData) => void
  onBack: () => void
}

export default function CreateWalletScreen({ onWalletCreated, onBack }: CreateWalletScreenProps) {
  const [step, setStep] = useState<'password' | 'mnemonic' | 'confirm'>('password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [savedMnemonic, setSavedMnemonic] = useState(false)
  const [error, setError] = useState('')
  const [wallet] = useState(() => new SecureWallet())

  const generateMnemonic = async () => {
    // Initialize WASM first
    await SecureWallet.initWASM()
    // Use real WASM mnemonic generation
    return await wallet.generateMnemonic()
  }

  const generateAddresses = async (mnemonic: string) => {
    // Create account using WASM wallet 
    await SecureWallet.initWASM()
    const account = await wallet.createAccount(mnemonic, 0, 0)
    return {
      peerAddress: account.peer_id,
      blockchainAddress: account.blockchain_address
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!password.match(/^[\x20-\x7E]*$/)) {
      setError('Password must contain only ASCII characters')
      return
    }

    const generated = await generateMnemonic()
    setMnemonic(generated)
    setStep('mnemonic')
  }

  const handleMnemonicConfirm = async () => {
    if (!savedMnemonic) {
      setError('Please confirm you have saved your mnemonic phrase')
      return
    }
    
    try {
      // Actually store the wallet in IndexedDB
      await SecureWallet.initWASM()
      const account = await wallet.createWallet(password)
      
      onWalletCreated({
        name: 'main',
        mnemonic,
        password,
        peerAddress: account.peer_id,
        blockchainAddress: account.blockchain_address
      })
    } catch (error) {
      setError('Failed to create wallet: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const renderPasswordStep = () => (
    <div className="container mx-auto px-6 py-8">
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create New Wallet</CardTitle>
            <CardDescription>Set up your wallet with a secure password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="password">Password (ASCII only)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Generate Wallet
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderMnemonicStep = () => (
    <div className="container mx-auto px-6 py-8">
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">⚠️ SAVE YOUR RECOVERY PHRASE</CardTitle>
            <CardDescription>This phrase will ONLY be shown ONCE!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertDescription className="font-semibold">
                Write down this phrase and keep it safe! You will need it to recover your wallet.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-6 rounded-lg border">
              <p className="font-mono text-lg text-center leading-relaxed">
                {mnemonic}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <Checkbox
                id="saved"
                checked={savedMnemonic}
                onCheckedChange={(checked) => setSavedMnemonic(checked as boolean)}
              />
              <Label 
                htmlFor="saved" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have saved my recovery phrase
              </Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Go Back
              </Button>
              <Button 
                onClick={handleMnemonicConfirm}
                disabled={!savedMnemonic}
                className="flex-1"
              >
                Create Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  switch (step) {
    case 'password':
      return renderPasswordStep()
    case 'mnemonic':
      return renderMnemonicStep()
    default:
      return renderPasswordStep()
  }
}