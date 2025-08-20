import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Star, ArrowLeft, Shield, Zap, CheckCircle, Clock, CreditCard } from "lucide-react"
import { notFound } from "next/navigation"
import { allProducts } from "@/lib/data/products"
import Image from "next/image"

function generateProductDetails(product: any) {
  const baseFeatures = [
    "KYC verification completed",
    "No ban risk guarantee",
    "Fast delivery (1-24 hours)",
    "24/7 customer support",
    "Account recovery assistance",
    "Secure handover process",
  ]

  const categorySpecificFeatures: Record<string, string[]> = {
    "neo-banks": ["Digital banking access", "Mobile app ready", "International transfers", "Multi-currency support"],
    "business-banks": [
      "Business account privileges",
      "Corporate banking features",
      "Higher transaction limits",
      "Professional support",
    ],
    "crypto-exchanges": [
      "Trading platform access",
      "Reduced trading fees",
      "Advanced order types",
      "API access available",
    ],
    "custom-name-banks": [
      "Personalized account setup",
      "Custom naming options",
      "Flexible configurations",
      "Tailored solutions",
    ],
    "spain-banks": [
      "Spanish banking compliance",
      "SEPA transfers enabled",
      "Local banking features",
      "Spanish customer support",
    ],
    "italy-banks": [
      "Italian banking compliance",
      "SEPA transfers enabled",
      "Local banking features",
      "Italian customer support",
    ],
    "germany-banks": [
      "German banking compliance",
      "SEPA transfers enabled",
      "Premium banking features",
      "German customer support",
    ],
  }

  const features = [...baseFeatures, ...(categorySpecificFeatures[product.category] || [])]

  const specifications = {
    "Account Type": product.category.replace("-", " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
    "Verification Status": "Fully Completed",
    "Delivery Time": "1-24 hours",
    Support: "24/7 Available",
    Warranty: "30-day guarantee",
    Region: getRegionFromCategory(product.category),
  }

  const fullDescription = generateDescription(product)

  return {
    ...product,
    features,
    specifications,
    fullDescription,
    rating: generateRating(product.rarity),
    reviews: generateReviewCount(product.price),
  }
}

function generateDescription(product: any): string {
  const descriptions: Record<string, string> = {
    "neo-banks": `Pre-verified ${product.name} digital banking account with complete KYC verification. This modern banking solution offers seamless digital transactions, mobile banking capabilities, and international transfer options. Perfect for individuals and businesses looking for flexible, technology-driven banking services without the hassle of lengthy verification processes.`,
    "business-banks": `Professional ${product.name} business banking account with full corporate verification completed. This premium business solution provides enhanced transaction limits, corporate banking features, and dedicated business support. Ideal for entrepreneurs, companies, and enterprises requiring immediate access to professional banking services.`,
    "crypto-exchanges": `Fully verified ${product.name} cryptocurrency exchange account with trading privileges activated. This account provides immediate access to crypto trading, reduced fees, advanced trading tools, and secure wallet services. Perfect for traders, investors, and crypto enthusiasts who want to start trading immediately without verification delays.`,
    "custom-name-banks": `Personalized ${product.name} banking account with custom configuration and full KYC completion. This tailored banking solution offers flexible account setup, custom naming options, and specialized features based on your requirements. Ideal for users seeking personalized banking experiences with immediate access.`,
    "spain-banks": `Verified ${product.name} Spanish banking account with full compliance and KYC completion. This account provides access to Spanish banking services, SEPA transfers, local payment methods, and Spanish customer support. Perfect for individuals and businesses operating in Spain or requiring Spanish banking services.`,
    "italy-banks": `Authenticated ${product.name} Italian banking account with complete verification and regulatory compliance. This account offers Italian banking privileges, SEPA integration, local payment solutions, and Italian language support. Ideal for users needing immediate access to Italian banking services.`,
    "germany-banks": `Premium ${product.name} German banking account with full verification and compliance standards met. This high-tier account provides access to German banking excellence, SEPA transfers, premium features, and German customer service. Perfect for users requiring top-tier European banking services.`,
  }

  return (
    descriptions[product.category] ||
    `Pre-verified ${product.name} account with complete KYC verification and immediate access to all platform features.`
  )
}

function getRegionFromCategory(category: string): string {
  const regions: Record<string, string> = {
    "neo-banks": "Global",
    "business-banks": "International",
    "crypto-exchanges": "Worldwide",
    "custom-name-banks": "Flexible",
    "spain-banks": "Spain/EU",
    "italy-banks": "Italy/EU",
    "germany-banks": "Germany/EU",
  }
  return regions[category] || "Global"
}

function generateRating(rarity: string): number {
  const ratings: Record<string, number> = {
    Common: 4.6,
    Uncommon: 4.7,
    Rare: 4.8,
    Epic: 4.9,
    Legendary: 4.9,
    Mythic: 5.0,
  }
  return ratings[rarity] || 4.5
}

function generateReviewCount(price: number): number {
  // Higher priced items tend to have fewer but more detailed reviews
  if (price >= 1000) return Math.floor(Math.random() * 50) + 25
  if (price >= 500) return Math.floor(Math.random() * 100) + 50
  if (price >= 200) return Math.floor(Math.random() * 200) + 100
  return Math.floor(Math.random() * 300) + 150
}

interface ProductPageProps {
  params: {
    id: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  const baseProduct = allProducts.find((p) => p.id === params.id)

  if (!baseProduct) {
    notFound()
  }

  const product = generateProductDetails(baseProduct)

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
                  className={`aspect-square bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                  {product.logo ? (
                    <Image
                      src={product.logo || "/placeholder.svg"}
                      alt={product.name}
                      width={192}
                      height={192}
                      className="object-contain filter drop-shadow-2xl relative z-10 bg-white/90 rounded-2xl p-4"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-white/20 rounded-2xl flex items-center justify-center relative z-10">
                      <span className="text-4xl font-bold text-white">{product.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">Key Features</h3>
                <div className="space-y-3">
                  {product.features.map((feature: string, index: number) => (
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
                  {product.category.replace("-", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
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
                  <div>Instant delivery</div>
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
                  <div className="font-semibold text-sm">No Ban Risk</div>
                  <div className="text-xs text-muted-foreground">Guaranteed safe</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <Clock className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <div className="font-semibold text-sm">Fast Delivery</div>
                  <div className="text-xs text-muted-foreground">1-24 hours</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <CreditCard className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="font-semibold text-sm">Best Pricing</div>
                  <div className="text-xs text-muted-foreground">Market leading</div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">Account Details</h3>
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
