"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import QRCode from "qrcode"

interface BitcoinPaymentProps {
  orderId: string
  address: string
  amount: number // in satoshis
  amountUSD: number
  status: string
  expiresAt?: string
}

export function BitcoinPayment({ orderId, address, amount, amountUSD, status, expiresAt }: BitcoinPaymentProps) {
  const [qrCode, setQrCode] = useState("")
  const [timeLeft, setTimeLeft] = useState("")
  const [orderStatus, setOrderStatus] = useState(status)
  const { toast } = useToast()

  const btcAmount = (amount / 100000000).toFixed(8)

  useEffect(() => {
    // Generate QR code
    const generateQR = async () => {
      try {
        const qr = await QRCode.toDataURL(`bitcoin:${address}?amount=${btcAmount}`)
        setQrCode(qr)
      } catch (error) {
        console.error("Failed to generate QR code:", error)
      }
    }
    generateQR()
  }, [address, btcAmount])

  useEffect(() => {
    // Update countdown timer
    if (!expiresAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const difference = expiry - now

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`)
      } else {
        setTimeLeft("Expired")
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  useEffect(() => {
    // Poll for payment status updates
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.status !== orderStatus) {
            setOrderStatus(data.status)
            if (data.status === "paid" || data.status === "confirmed") {
              toast({
                title: "Payment received!",
                description: "Your payment has been detected and is being processed.",
              })
            }
          }
        }
      } catch (error) {
        console.error("Failed to check payment status:", error)
      }
    }

    if (orderStatus === "pending") {
      const interval = setInterval(pollStatus, 10000) // Check every 10 seconds
      return () => clearInterval(interval)
    }
  }, [orderId, orderStatus, toast])

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    toast({
      title: "Address copied",
      description: "Bitcoin address copied to clipboard",
    })
  }

  const copyAmount = () => {
    navigator.clipboard.writeText(btcAmount)
    toast({
      title: "Amount copied",
      description: "Bitcoin amount copied to clipboard",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "confirmed":
        return "default"
      case "pending":
        return "secondary"
      case "expired":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bitcoin Payment</CardTitle>
            <Badge variant={getStatusColor(orderStatus)}>{orderStatus}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {orderStatus === "pending" && (
            <>
              <div className="text-center">
                {qrCode && (
                  <img src={qrCode || "/placeholder.svg"} alt="Bitcoin QR Code" className="mx-auto mb-4 rounded-lg" />
                )}
                <p className="text-sm text-muted-foreground">
                  Scan QR code with your Bitcoin wallet or copy the details below
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bitcoin Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{address}</code>
                    <Button variant="outline" size="sm" onClick={copyAddress}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">{btcAmount} BTC</code>
                    <Button variant="outline" size="sm" onClick={copyAmount}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">≈ ${amountUSD.toFixed(2)} USD</p>
                </div>

                {timeLeft && timeLeft !== "Expired" && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Payment expires in</p>
                    <p className="text-2xl font-mono font-bold">{timeLeft}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {orderStatus === "paid" && (
            <div className="text-center p-6 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-green-600 dark:text-green-400 mb-2">
                <RefreshCw className="h-8 w-8 mx-auto" />
              </div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">Payment Received</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Waiting for blockchain confirmations...</p>
            </div>
          )}

          {orderStatus === "confirmed" && (
            <div className="text-center p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-blue-600 dark:text-blue-400 mb-2">
                <ExternalLink className="h-8 w-8 mx-auto" />
              </div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Payment Confirmed</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Your order is being processed and will be delivered soon.
              </p>
            </div>
          )}

          {orderStatus === "expired" && (
            <div className="text-center p-6 bg-red-50 dark:bg-red-950 rounded-lg">
              <h3 className="font-semibold text-red-800 dark:text-red-200">Payment Expired</h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                This payment window has expired. Please create a new order.
              </p>
              <Button className="mt-4" onClick={() => (window.location.href = "/shop")}>
                Return to Shop
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
