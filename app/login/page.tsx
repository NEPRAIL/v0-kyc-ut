"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Zap, Shield, Mail, Lock, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        console.log("[v0] Attempting login with:", { emailOrUsername: formData.email })

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailOrUsername: formData.email, // Can be email or username
            password: formData.password,
          }),
        })

        console.log("[v0] Login response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] Login error:", errorData)
          toast.error(errorData.error || "Login failed")
          return
        }

        const data = await response.json()
        console.log("[v0] Login successful:", data)

        if (data.success) {
          toast.success("Login successful!")
          router.push("/account")
        } else {
          toast.error(data.error || "Login failed")
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match")
          return
        }

        if (!formData.username.trim()) {
          toast.error("Username is required")
          return
        }

        console.log("[v0] Attempting registration with:", {
          username: formData.username,
          email: formData.email,
        })

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
          }),
        })

        console.log("[v0] Register response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] Register error:", errorData)
          toast.error(errorData.error || "Registration failed")
          return
        }

        const data = await response.json()
        console.log("[v0] Registration successful:", data)

        if (data.success) {
          toast.success("Account created successfully!")
          router.push("/welcome")
        } else {
          toast.error(data.error || "Registration failed")
        }
      }
    } catch (error) {
      console.error("[v0] Auth error:", error)
      toast.error("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              KYCut
            </span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{isLogin ? "Welcome Back" : "Create Account"}</h1>
            <p className="text-slate-300">
              {isLogin ? "Sign in with email or username" : "Join the secure marketplace"}
            </p>
          </div>
        </div>

        <Card className="card-professional">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex bg-navy-800 rounded-lg p-1">
                <Button
                  variant={isLogin ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsLogin(true)}
                  className={`px-6 ${
                    isLogin
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "text-slate-300 hover:text-white hover:bg-navy-700"
                  }`}
                >
                  Sign In
                </Button>
                <Button
                  variant={!isLogin ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsLogin(false)}
                  className={`px-6 ${
                    !isLogin
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "text-slate-300 hover:text-white hover:bg-navy-700"
                  }`}
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      placeholder="Choose a username"
                      className="bg-navy-800 border-navy-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium">
                  {isLogin ? "Email or Username" : "Email Address"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type={isLogin ? "text" : "email"}
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder={isLogin ? "Enter email or username" : "Enter your email"}
                    className="bg-navy-800 border-navy-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Enter your password"
                    className="bg-navy-800 border-navy-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      placeholder="Confirm your password"
                      className="bg-navy-800 border-navy-600 text-white placeholder:text-slate-400 focus:border-blue-500 pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="remember" className="rounded bg-navy-800 border-navy-600" />
                    <Label htmlFor="remember" className="text-slate-300">
                      Remember me
                    </Label>
                  </div>
                  <Link href="/forgot-password" className="text-blue-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
                disabled={isLoading}
              >
                <Shield className="w-5 h-5 mr-2" />
                {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-navy-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-navy-800 px-2 text-slate-400">Security Features</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-white">Crypto-Only Payments</div>
                    <div className="text-slate-300">Complete privacy and anonymity</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-600/10 rounded-lg border border-blue-600/20">
                  <Zap className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-white">Self-Hosted Authentication</div>
                    <div className="text-slate-300">Your data stays secure</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-slate-300">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Button
                variant="link"
                className="p-0 h-auto text-blue-400 hover:underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-400">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-blue-400 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-400 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
