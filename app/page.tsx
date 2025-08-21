"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FadeIn } from "@/components/ui/fade-in"
import { Star, Shield, Zap, TrendingUp, ArrowRight, Sparkles, CheckCircle, Clock, Award } from "lucide-react"
import Image from "next/image"
import { getFeaturedProducts, verificationLevels } from "@/lib/data/products"
import { ScrollGradient } from "@/components/scroll-gradient"

const featuredBrands = getFeaturedProducts()

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollGradient />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.05),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="text-center space-y-8 sm:space-y-12">
            <FadeIn className="space-y-6 sm:space-y-8">
              <FadeIn delay={200}>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm sm:text-base font-semibold text-primary tracking-wider uppercase">
                    Premium KYC Marketplace
                  </span>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none">
                  <span className="text-white drop-shadow-lg">KYCut</span>
                </h1>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-sm sm:text-lg font-semibold text-muted-foreground tracking-wide">
                    Trusted by 10,000+ Users Worldwide
                  </span>
                  <Award className="w-5 h-5 text-primary" />
                </div>
              </FadeIn>

              <FadeIn delay={600}>
                <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto leading-relaxed font-medium px-4 sm:px-0">
                  Skip the KYC verification process with our pre-verified accounts.
                  <span className="text-white font-semibold"> No ban risk, instant delivery, premium quality.</span>
                </p>
              </FadeIn>
            </FadeIn>

            <FadeIn delay={800}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4 sm:px-0">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group"
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
                  className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 text-white transition-all duration-300 hover:scale-105 bg-transparent"
                >
                  <Link href="/login">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                    Sign In
                  </Link>
                </Button>
              </div>
            </FadeIn>

            {/* Stats Section */}
            <FadeIn delay={1000}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mt-16 sm:mt-20">
                {[
                  { number: "100+", label: "Verified Accounts" },
                  { number: "7", label: "Categories" },
                  { number: "24/7", label: "Support" },
                  { number: "99.9%", label: "Success Rate" },
                ].map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stat.number}
                    </div>
                    <div className="text-sm sm:text-base text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <FadeIn className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary tracking-wider uppercase">Featured</span>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Premium Verified Accounts
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl sm:max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            Hand-picked selection of our most popular pre-verified accounts across multiple verification levels
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredBrands.map((brand, index) => {
            const verificationInfo = verificationLevels[brand.verificationLevel]

            return (
              <FadeIn key={brand.id} delay={index * 100}>
                <Link href={`/product/${brand.id}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 card-professional overflow-hidden cursor-pointer">
                    <CardContent className="p-6 sm:p-8">
                      <div
                        className={`aspect-square bg-gradient-to-br ${verificationInfo.gradient} rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-300 group-hover:shadow-2xl`}
                      >
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20" />
                        <div className="absolute top-3 right-3 z-20">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg" />
                        </div>
                        {brand.logo ? (
                          <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 group-hover:scale-110 transition-transform duration-300">
                            <Image
                              src={brand.logo || "/placeholder.svg"}
                              alt={`${brand.name} logo`}
                              fill
                              className="object-contain filter brightness-0 invert drop-shadow-lg"
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
                            className={`${brand.verificationColor} text-white font-semibold shadow-md px-3 py-1.5 text-xs sm:text-sm transition-all duration-300 group-hover:scale-105`}
                          >
                            {brand.verificationLevel}
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground font-medium bg-secondary/20 backdrop-blur-sm px-3 py-1.5 rounded-full transition-all duration-300 group-hover:bg-secondary/30">
                            {brand.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 transition-colors duration-300 group-hover:text-primary">
                            {brand.name}
                          </h3>
                          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            {brand.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-white/10">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-2xl sm:text-3xl font-bold text-primary">${brand.price}</span>
                            <div className="flex items-center text-yellow-500">
                              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                              <span className="text-xs sm:text-sm ml-1 text-muted-foreground font-medium">
                                {brand.rating}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                            View Details
                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </FadeIn>
            )
          })}
        </div>

        <FadeIn delay={600} className="text-center mt-12 sm:mt-16">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="text-lg px-8 py-4 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 text-white transition-all duration-300 hover:scale-105 bg-transparent"
          >
            <Link href="/shop">
              View All Products
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </FadeIn>
      </div>

      {/* Features Section */}
      <div className="bg-card/30 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeIn className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">Why Choose KYCut?</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The most trusted marketplace for pre-verified accounts with unmatched quality and service
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                icon: Shield,
                title: "Zero Ban Risk",
                description:
                  "All accounts are professionally verified with legitimate KYC documents. Guaranteed safe with 99.9% success rate.",
                gradient: "from-green-500 to-emerald-600",
                features: ["Professional KYC", "Legitimate Documents", "99.9% Success Rate"],
              },
              {
                icon: Clock,
                title: "Instant Delivery",
                description:
                  "Get immediate access to your pre-verified accounts. No waiting periods, no verification delays, just instant access.",
                gradient: "from-blue-500 to-cyan-600",
                features: ["1-24 Hour Delivery", "Instant Access", "No Waiting"],
              },
              {
                icon: TrendingUp,
                title: "Premium Quality",
                description:
                  "Hand-picked accounts with the highest verification levels. Skip months of verification and start trading immediately.",
                gradient: "from-purple-500 to-pink-600",
                features: ["Premium Accounts", "High Verification", "Best Pricing"],
              },
            ].map((feature, index) => (
              <FadeIn key={index} delay={index * 200} direction="up">
                <div className="text-center group cursor-pointer">
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-2`}
                  >
                    <feature.icon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 transition-colors duration-300 group-hover:text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 px-4 sm:px-0 transition-colors duration-300 group-hover:text-white">
                    {feature.description}
                  </p>
                  <div className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/10 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">Ready to Get Started?</h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
              Join thousands of satisfied customers who trust KYCut for their pre-verified account needs
            </p>
            <Button
              asChild
              size="lg"
              className="text-xl px-12 py-5 bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
            >
              <Link href="/shop">
                <Sparkles className="w-6 h-6 mr-3" />
                Browse Marketplace
                <ArrowRight className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
