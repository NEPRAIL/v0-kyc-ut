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
    avatar: "/professional-male-avatar.png",
  },
  {
    name: "Sarah Rodriguez",
    role: "Head of Security",
    description: "Cybersecurity expert specializing in crypto payment systems and digital asset protection.",
    avatar: "/professional-female-avatar.png",
  },
  {
    name: "Marcus Thompson",
    role: "Lead Developer",
    description: "Full-stack developer with expertise in blockchain integration and secure payment processing.",
    avatar: "/professional-male-developer.png",
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
    <div className="min-h-screen bg-navy-900">
      <div className="relative overflow-hidden bg-navy-900">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-800/50 to-navy-900/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-4 py-2 text-sm font-semibold">
              About KYCut Shop
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-white">
              Revolutionizing Digital
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                {" "}
                Commerce
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
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
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-300 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border-y border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-white">Our Mission</h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                At KYCut Shop, we believe in a world where digital commerce is truly private, secure, and accessible to
                everyone. We're eliminating the barriers between users and premium digital services by creating a
                crypto-only marketplace that prioritizes anonymity and security.
              </p>
              <p className="text-lg text-slate-300 leading-relaxed">
                Our platform enables users to access exclusive privileges from leading platforms without compromising
                their privacy or dealing with traditional payment systems that track and store personal information.
              </p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/shop">
                  Explore Marketplace
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <Card className="card-professional">
                <CardContent className="p-8">
                  <Shield className="w-12 h-12 text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">Privacy First</h3>
                  <p className="text-slate-300">
                    Complete anonymity with crypto-only payments. No personal data collection or tracking.
                  </p>
                </CardContent>
              </Card>
              <Card className="card-professional">
                <CardContent className="p-8">
                  <Zap className="w-12 h-12 text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">Instant Access</h3>
                  <p className="text-slate-300">
                    Immediate delivery of digital access tokens upon payment confirmation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">Meet Our Team</h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Experienced professionals from fintech, blockchain, and cybersecurity backgrounds
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <Card
              key={index}
              className="text-center card-professional hover:bg-navy-700/50 transition-all duration-300"
            >
              <CardContent className="p-8">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center overflow-hidden">
                  <img
                    src={member.avatar || "/placeholder.svg"}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      target.nextElementSibling?.classList.remove("hidden")
                    }}
                  />
                  <div className="hidden w-16 h-16 text-white">
                    <Users className="w-full h-full" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-4">{member.role}</Badge>
                <p className="text-slate-300 leading-relaxed">{member.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center text-white space-y-8">
            <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join thousands of users who trust KYCut Shop for secure, private access to premium digital services.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-3 bg-white text-blue-600 hover:bg-slate-100"
              >
                <Link href="/shop">Browse Marketplace</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3 bg-transparent border-white text-white hover:bg-white hover:text-blue-600"
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
