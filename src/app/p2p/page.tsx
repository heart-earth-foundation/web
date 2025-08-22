import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Network, Clock } from "lucide-react"

export default function P2PPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <Network className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-4xl font-bold">P2P Network</h1>
          <p className="text-xl text-muted-foreground">Coming soon!</p>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>In Development</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              P2P network interface is being built for the Heart Earth network.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}