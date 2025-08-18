import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Home, Search, Zap } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-6">
          <div className="text-8xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            404
          </div>
          <h1 className="text-4xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            The page you're looking for doesn't exist or has been moved to a different location.
          </p>
        </div>

        <Card className="bg-card border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link href="/">
                  <Home className="w-5 h-5 mr-2" />
                  Go Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent">
                <Link href="/shop">
                  <Search className="w-5 h-5 mr-2" />
                  Browse Shop
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Zap className="w-4 h-4" />
          <span className="text-sm">Powered by KYCut Shop</span>
        </div>
      </div>
    </div>
  )
}
