import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Zap, TrendingUp, Users, Award, Globe, ArrowRight } from "lucide-react"
import Link from "next/link"

const teamMembers = [
  {
    name: "Alex Chen",
    role: "Founder & CEO",
    description: "Former blockchain architect with 10+ years in fintech and cryptocurrency exchanges.",
    avatar: "/placeholder-user.jpg",
  },
  {
    name: "Sarah Rodriguez",
    role: "Head of Security",
    description: "Cybersecurity expert specializing in crypto payment systems and digital asset protection.",
    avatar: "/placeholder-user.jpg",
  },
  {
    name: "Marcus Thompson",
    role: "Lead Developer",
    description: "Full-stack developer with expertise in blockchain integration and secure payment processing.",
    avatar: "/placeholder-user.jpg",
  },
]

const stats = [
  { label: "Active Users", value: "10,000+", icon: Users },
  { label: "Transactions", value: "$2.5M+", icon: TrendingUp },
  { label: "Success Rate", value: "99.9%", icon: Award },
  { label: "Countries", value: "50+", icon: Globe },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_70%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-semibold">
              About KYCut
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground">
              Revolutionizing Digital
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Commerce</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              We're building the future of secure, crypto-only marketplaces where privacy meets premium access. Our
              platform connects users with exclusive digital privileges from the world's leading platforms.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center card-professional">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-foreground">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At KYCut, we believe in a world where digital commerce is truly private, secure, and accessible to
                everyone. We're eliminating the barriers between users and premium digital services by creating a
                crypto-only marketplace that prioritizes anonymity and security.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our platform enables users to access exclusive privileges from leading platforms without compromising
                their privacy or dealing with traditional payment systems that track and store personal information.
              </p>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/shop">
                  Explore Marketplace
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <Card className="card-professional">
                <CardContent className="p-8">
                  <Shield className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-3">Privacy First</h3>
                  <p className="text-muted-foreground">
                    Complete anonymity with crypto-only payments. No personal data collection or tracking.
                  </p>
                </CardContent>
              </Card>
              <Card className="card-professional">
                <CardContent className="p-8">
                  <Zap className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-3">Instant Access</h3>
                  <p className="text-muted-foreground">
                    Immediate delivery of digital access tokens upon payment confirmation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
