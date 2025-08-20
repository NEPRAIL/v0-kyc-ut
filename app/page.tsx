import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FadeIn } from "@/components/ui/fade-in"
import { Star, Shield, Zap, TrendingUp, ArrowRight, Sparkles } from "lucide-react"
import Image from "next/image"
import { getFeaturedProducts } from "@/lib/data/products"
import { ScrollGradient } from "@/components/scroll-gradient"

const featuredBrands = getFeaturedProducts()

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollGradient />

      <div className="relative overflow-hidden bg-gradient-scroll">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(22,78,99,0.1),transparent_70%)] bg-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="text-center space-y-8 sm:space-y-12">
            <FadeIn className="space-y-6 sm:space-y-8">
              <FadeIn delay={200}>
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text drop-shadow-sm animate-pulse text-transparent border-0">
                    KYCut
                  </span>
                  <br />
                </h1>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
                  <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-secondary animate-pulse" />
                  <span className="text-sm sm:text-lg font-semibold text-muted-foreground tracking-wide uppercase animate-fade-in">
                    Premium Digital Marketplace
                  </span>
                  <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-secondary animate-pulse" />
                </div>
              </FadeIn>

              <FadeIn delay={600}>
                <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto leading-relaxed font-medium px-4 sm:px-0">
                  Skip the KYC verification process with our pre-verified accounts.
                  <span className="text-primary font-semibold"> No ban risk, fast delivery, best pricing.</span>
                </p>
              </FadeIn>
            </FadeIn>

            <FadeIn delay={800}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4 sm:px-0">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-3 sm:py-4 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                >
                  <Link href="/shop">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                    Enter Marketplace
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-3 sm:py-4 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 bg-transparent hover:scale-105"
                >
                  <Link href="/login">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                    Sign In
                  </Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <FadeIn className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Pre-Verified Accounts
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl sm:max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            Choose from 100+ pre-verified accounts across 7 categories - from crypto exchanges to business banks
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredBrands.map((brand, index) => (
            <FadeIn key={brand.id} delay={index * 100}>
              <Link href={`/product/${brand.id}`}>
                <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 bg-card border-0 shadow-lg overflow-hidden cursor-pointer">
                  <CardContent className="p-6 sm:p-8">
                    <div
                      className={`aspect-square bg-gradient-to-br ${brand.gradient} rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-300 group-hover:shadow-2xl`}
                    >
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20" />
                      {brand.logo ? (
                        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 group-hover:scale-110 transition-transform duration-300">
                          <Image
                            src={brand.logo || "/placeholder.svg"}
                            alt={`${brand.name} logo`}
                            fill
                            className="object-contain filter brightness-0 invert"
                            sizes="(max-width: 768px) 64px, (max-width: 1024px) 80px, 96px"
                          />
                        </div>
                      ) : (
                        <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white relative z-10 group-hover:scale-110 transition-transform duration-300">
                          {brand.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`${brand.rarityColor} text-white font-semibold shadow-md px-2 sm:px-3 py-1 text-xs sm:text-sm transition-all duration-300 group-hover:scale-105`}
                        >
                          {brand.rarity}
                        </Badge>
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium bg-muted px-2 sm:px-3 py-1 rounded-full transition-all duration-300 group-hover:bg-muted/80">
                          {brand.category}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-2 sm:mb-3 transition-colors duration-300 group-hover:text-primary">
                          {brand.name}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {brand.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-2xl sm:text-3xl font-bold text-card-foreground">${brand.price}</span>
                          <div className="flex items-center text-yellow-500">
                            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                            <span className="text-xs sm:text-sm ml-1 text-muted-foreground font-medium">
                              {brand.rating}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Click to view →
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                icon: Shield,
                title: "No Ban Risk",
                description:
                  "All accounts are professionally verified with legitimate KYC documents. Zero risk of suspension or bans.",
                gradient: "from-primary to-secondary",
              },
              {
                icon: Star,
                title: "Fast Delivery",
                description:
                  "Instant access to your pre-verified accounts. No waiting for verification processes or document approval.",
                gradient: "from-secondary to-primary",
              },
              {
                icon: TrendingUp,
                title: "Best Pricing",
                description:
                  "Competitive prices for premium verified accounts. Skip months of verification delays and start immediately.",
                gradient: "from-primary via-secondary to-primary",
              },
            ].map((feature, index) => (
              <FadeIn key={index} delay={index * 200} direction="up">
                <div className="text-center group cursor-pointer">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r ${feature.gradient} rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-2`}
                  >
                    <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-3 sm:mb-4 transition-colors duration-300 group-hover:text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4 sm:px-0 transition-colors duration-300 group-hover:text-foreground">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
