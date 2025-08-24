"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb } from "@/components/navigation/breadcrumb"
import { AddToCartButton } from "@/components/cart/add-to-cart-button"
import { ScrollToTop } from "@/components/ui/scroll-to-top"
import { Star, ArrowLeft, Shield, Zap, CheckCircle, Clock, CreditCard } from "lucide-react"
import { notFound } from "next/navigation"
import { allProducts } from "@/lib/data/products"
import { ProductImage } from "@/components/product-image"

function ScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])
  return null
}

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

export default function ProductClientPage({ params }: ProductPageProps) {
  const { id } = params
  const baseProduct = allProducts.find((p) => p.id === id)

  if (!baseProduct) {
    notFound()
  }

  const product = generateProductDetails(baseProduct)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTopOnMount />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        <Button
          asChild
          variant="ghost"
          className="mb-8 text-white hover:bg-white/10 animate-in fade-in-0 slide-in-from-left-4 duration-300"
        >
          <Link href="/shop">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
          {/* Product Image */}
          <div className="space-y-6">
            <Card className="overflow-hidden card-professional animate-in fade-in-0 slide-in-from-left-6 duration-500">
              <CardContent className="p-8 flex items-center justify-center">
                <ProductImage
                  productName={product.name}
                  type="detail"
                  className="transform hover:scale-105 transition-transform duration-300"
                />
              </CardContent>
            </Card>

            <Card className="card-professional animate-in fade-in-0 slide-in-from-left-6 duration-500 delay-200">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Key Features</h3>
                <div className="space-y-3">
                  {product.features.map((feature: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 animate-in fade-in-0 slide-in-from-left-2 duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Details */}
          <div className="space-y-8 animate-in fade-in-0 slide-in-from-right-6 duration-500">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Badge
                  className={`${product.verificationColor} text-white font-semibold shadow-md px-4 py-2 text-sm animate-in fade-in-0 scale-in-95 duration-300`}
                >
                  {product.verificationLevel}
                </Badge>
                <span className="text-muted-foreground font-medium bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm border border-border animate-in fade-in-0 scale-in-95 duration-300 delay-100">
                  {product.category.replace("-", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              </div>

              <h1 className="text-4xl font-bold text-white mb-4 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mb-6 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-100">
                <div className="flex items-center text-yellow-400">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="ml-2 font-semibold">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">({product.reviews} reviews)</span>
                <div className="text-3xl font-bold text-primary">${product.price}</div>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed mb-8 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-200">
                {product.fullDescription}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-300">
                <Button
                  size="lg"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Purchase Now
                </Button>
                <AddToCartButton
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    verificationLevel: product.verificationLevel,
                    category: product.category,
                  }}
                  variant="outline"
                  size="lg"
                  className="flex-1 text-lg py-6 text-white border-border hover:bg-white/10 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Shield, title: "No Ban Risk", subtitle: "Guaranteed safe", color: "text-blue-400" },
                  { icon: Clock, title: "Fast Delivery", subtitle: "1-24 hours", color: "text-blue-400" },
                  { icon: CreditCard, title: "Best Pricing", subtitle: "Market leading", color: "text-green-400" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="text-center p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border animate-in fade-in-0 scale-in-95 duration-300"
                    style={{ animationDelay: `${400 + index * 100}ms` }}
                  >
                    <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-2`} />
                    <div className="font-semibold text-sm text-white">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="card-professional animate-in fade-in-0 slide-in-from-right-6 duration-500 delay-500">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Account Details</h3>
                <div className="space-y-4">
                  {Object.entries(product.specifications).map(([key, value], index) => (
                    <div
                      key={index}
                      className="animate-in fade-in-0 slide-in-from-right-2 duration-300"
                      style={{ animationDelay: `${600 + index * 50}ms` }}
                    >
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-white">{key}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                      {index < Object.entries(product.specifications).length - 1 && <Separator className="bg-border" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <ScrollToTop />
      </div>
    </div>
  )
}
