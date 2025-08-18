import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Star, ArrowLeft, Shield, Zap, TrendingUp, CheckCircle } from "lucide-react"
import { notFound } from "next/navigation"

const products = [
  {
    id: "1",
    name: "KuCoin Token",
    description:
      "Premium cryptocurrency exchange access token with advanced trading features and institutional-grade security protocols.",
    fullDescription:
      "The KuCoin Token provides exclusive access to advanced trading features on one of the world's leading cryptocurrency exchanges. This premium access token includes reduced trading fees, priority customer support, advanced charting tools, and access to exclusive trading pairs. Perfect for professional traders and institutions looking to maximize their trading potential.",
    price: "299.99",
    rarity: "Epic",
    rarityColor: "bg-purple-500",
    logo: "https://cryptologos.cc/logos/kucoin-shares-kcs-logo.png",
    category: "Crypto Exchange",
    gradient: "from-purple-500 to-purple-700",
    rating: 4.9,
    reviews: 234,
    features: [
      "Reduced trading fees (up to 50% discount)",
      "Priority customer support",
      "Advanced charting and analytics tools",
      "Access to exclusive trading pairs",
      "Institutional-grade API access",
      "Enhanced security features",
    ],
    specifications: {
      "Access Level": "Premium",
      Validity: "Lifetime",
      Support: "24/7 Priority",
      "API Limits": "Enhanced",
      "Trading Pairs": "All + Exclusive",
    },
  },
  {
    id: "2",
    name: "PayPal Premium",
    description: "Enhanced payment processing privileges with global merchant access and reduced transaction fees.",
    fullDescription:
      "PayPal Premium access token unlocks enhanced payment processing capabilities for businesses and individuals. Enjoy reduced transaction fees, higher processing limits, advanced fraud protection, and priority dispute resolution. This token is perfect for e-commerce businesses, freelancers, and anyone who processes significant payment volumes.",
    price: "199.99",
    rarity: "Rare",
    rarityColor: "bg-blue-500",
    logo: "https://logos-world.net/wp-content/uploads/2020/07/PayPal-Logo.png",
    category: "Payment Gateway",
    gradient: "from-blue-500 to-blue-700",
    rating: 4.8,
    reviews: 189,
    features: [
      "Reduced transaction fees",
      "Higher processing limits",
      "Advanced fraud protection",
      "Priority dispute resolution",
      "Multi-currency support",
      "Enhanced reporting tools",
    ],
    specifications: {
      "Fee Reduction": "Up to 30%",
      "Processing Limit": "Enhanced",
      Support: "Priority",
      Currencies: "Global",
      Integration: "Full API",
    },
  },
]

interface ProductPageProps {
  params: {
    id: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = products.find((p) => p.id === params.id)

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">
            Shop
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <Button asChild variant="ghost" className="mb-8">
          <Link href="/shop">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  className={`aspect-square bg-gradient-to-br ${product.gradient} flex items-center justify-center relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                  <img
                    src={product.logo || "/placeholder.svg"}
                    alt={product.name}
                    className="w-48 h-48 object-contain filter drop-shadow-2xl relative z-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">Key Features</h3>
                <div className="space-y-3">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Badge className={`${product.rarityColor} text-white font-semibold shadow-md px-4 py-2 text-sm`}>
                  {product.rarity}
                </Badge>
                <span className="text-muted-foreground font-medium bg-muted px-4 py-2 rounded-full text-sm">
                  {product.category}
                </span>
              </div>

              <h1 className="text-4xl font-bold text-foreground mb-4">{product.name}</h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="ml-2 font-semibold">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">({product.reviews} reviews)</span>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed mb-8">{product.fullDescription}</p>

              <div className="flex items-center gap-6 mb-8">
                <span className="text-5xl font-bold text-foreground">${product.price}</span>
                <div className="text-sm text-muted-foreground">
                  <div>One-time payment</div>
                  <div>Lifetime access</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="flex-1 bg-primary hover:bg-primary/90 text-lg py-6">
                  <Zap className="w-5 h-5 mr-2" />
                  Purchase Now
                </Button>
                <Button variant="outline" size="lg" className="flex-1 text-lg py-6 bg-transparent">
                  Add to Cart
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-semibold text-sm">Secure Payment</div>
                  <div className="text-xs text-muted-foreground">Crypto only</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <div className="font-semibold text-sm">Instant Access</div>
                  <div className="text-xs text-muted-foreground">Immediate delivery</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="font-semibold text-sm">Lifetime Support</div>
                  <div className="text-xs text-muted-foreground">24/7 assistance</div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">Specifications</h3>
                <div className="space-y-4">
                  {Object.entries(product.specifications).map(([key, value], index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-foreground">{key}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                      {index < Object.entries(product.specifications).length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
