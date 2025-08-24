"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, Clock, Send, CheckCircle, MessageCircle, Shield, Phone } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate form submission
    setIsSubmitted(true)
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_70%)]" />

        {/* Material Art Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl rotate-12 blur-sm animate-pulse" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-accent/30 to-primary/30 rounded-2xl -rotate-12 blur-sm animate-pulse delay-1000" />
        <div className="absolute bottom-40 left-1/4 w-20 h-20 bg-gradient-to-br from-primary/25 to-accent/25 rounded-full blur-sm animate-pulse delay-2000" />
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl rotate-45 blur-sm animate-pulse delay-500" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-semibold">
              Get In Touch
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground">
              Contact
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Us</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Have questions about our platform? Need support with your purchase? We're here to help you navigate the
              future of secure digital commerce.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Get in Touch</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                We're committed to providing exceptional support to our users. Reach out to us through any of the
                channels below.
              </p>
            </div>

            <div className="space-y-6">
              <Card className="card-professional">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Email Support</h3>
                      <p className="text-muted-foreground text-sm mb-2">Get help with your account or purchases</p>
                      <p className="text-primary font-medium">support@kycut.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secure Messaging Apps Section */}
              <Card className="card-professional">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Secure Messaging</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-border hover:bg-muted"
                      asChild
                    >
                      <a href="https://t.me/kycut_support" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-5 h-5 mr-3 text-blue-400" />
                        <span className="text-foreground">Telegram</span>
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-border hover:bg-muted"
                      asChild
                    >
                      <a href="https://signal.me/#eu/kycut_support" target="_blank" rel="noopener noreferrer">
                        <Shield className="w-5 h-5 mr-3 text-blue-500" />
                        <span className="text-foreground">Signal</span>
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-border hover:bg-muted"
                      asChild
                    >
                      <a
                        href="threema://compose?text=Hello%20KYCut%20Support"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Phone className="w-5 h-5 mr-3 text-green-500" />
                        <span className="text-foreground">Threema</span>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-professional">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Live Chat</h3>
                      <p className="text-muted-foreground text-sm mb-2">Real-time support for urgent issues</p>
                      <p className="text-primary font-medium">Available 24/7</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-professional">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary via-accent to-primary rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Response Time</h3>
                      <p className="text-muted-foreground text-sm mb-2">We typically respond within</p>
                      <p className="text-foreground font-medium">2-4 hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">Send us a Message</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground">
                      Thank you for contacting us. We'll get back to you within 2-4 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-foreground font-medium">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          placeholder="Enter your full name"
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          placeholder="Enter your email"
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-foreground font-medium">
                          Category
                        </Label>
                        <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                          <SelectTrigger className="bg-input border-border text-foreground focus:border-primary">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="general" className="text-popover-foreground hover:bg-muted">
                              General Inquiry
                            </SelectItem>
                            <SelectItem value="support" className="text-popover-foreground hover:bg-muted">
                              Technical Support
                            </SelectItem>
                            <SelectItem value="billing" className="text-popover-foreground hover:bg-muted">
                              Billing & Payments
                            </SelectItem>
                            <SelectItem value="partnership" className="text-popover-foreground hover:bg-muted">
                              Partnership
                            </SelectItem>
                            <SelectItem value="security" className="text-popover-foreground hover:bg-muted">
                              Security Concern
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-foreground font-medium">
                          Subject
                        </Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => handleChange("subject", e.target.value)}
                          placeholder="Brief description of your inquiry"
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-foreground font-medium">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        placeholder="Please provide details about your inquiry..."
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary min-h-[120px]"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
