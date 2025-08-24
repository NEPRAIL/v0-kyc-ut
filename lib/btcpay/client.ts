import crypto from "crypto"

interface CreateInvoiceParams {
  amountSats: number
  orderId: number
  description?: string
  buyerEmail?: string
}

interface BTCPayInvoice {
  id: string
  checkoutLink: string
  status: string
  amount: string
  currency: string
}

interface WebhookData {
  invoiceId: string
  type: string
  timestamp: number
  storeId: string
  deliveryId: string
}

export class BTCPayClient {
  private baseUrl: string | null
  private storeId: string | null
  private apiKey: string | null
  private webhookSecret: string | null
  private isConfigured: boolean

  constructor() {
    this.baseUrl = process.env.BTCPAY_SERVER_URL || null
    this.storeId = process.env.BTCPAY_STORE_ID || null
    this.apiKey = process.env.BTCPAY_API_KEY || null
    this.webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET || null

    this.isConfigured = !!(this.baseUrl && this.storeId && this.apiKey && this.webhookSecret)
  }

  isReady(): boolean {
    return this.isConfigured
  }

  async createInvoice({ amountSats, orderId, description, buyerEmail }: CreateInvoiceParams): Promise<BTCPayInvoice> {
    if (!this.isConfigured) {
      throw new Error("BTCPay Server is not configured")
    }

    const amountBTC = (amountSats / 100000000).toFixed(8)

    const invoiceData = {
      amount: amountBTC,
      currency: "BTC",
      metadata: {
        orderId: orderId.toString(),
        itemDesc: description || `Order #${orderId}`,
        buyerEmail,
      },
      checkout: {
        speedPolicy: "MediumSpeed",
        paymentMethods: ["BTC"],
        expirationMinutes: 30,
        monitoringMinutes: 60,
        paymentTolerance: 0,
        redirectURL: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`,
        redirectAutomatically: false,
        requiresRefundEmail: false,
      },
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stores/${this.storeId}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${this.apiKey}`,
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`BTCPay API error: ${response.status} - ${errorText}`)
      }

      const invoice = await response.json()

      return {
        id: invoice.id,
        checkoutLink: invoice.checkoutLink,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
      }
    } catch (error) {
      console.error("BTCPay createInvoice error:", error)
      throw new Error("Failed to create payment invoice")
    }
  }

  async getInvoice(invoiceId: string) {
    if (!this.isConfigured) {
      throw new Error("BTCPay Server is not configured")
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stores/${this.storeId}/invoices/${invoiceId}`, {
        headers: {
          Authorization: `token ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch invoice: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("BTCPay getInvoice error:", error)
      throw error
    }
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string): WebhookData | null {
    if (!this.isConfigured || !this.webhookSecret) {
      console.error("BTCPay webhook verification failed: not configured")
      return null
    }

    try {
      const signature = headers["btcpay-sig"]
      if (!signature) {
        console.error("Missing BTCPay signature header")
        return null
      }

      // Verify signature
      const expectedSignature = crypto.createHmac("sha256", this.webhookSecret).update(rawBody, "utf8").digest("hex")

      const providedSignature = signature.startsWith("sha256=") ? signature.slice(7) : signature

      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(providedSignature, "hex"))) {
        console.error("Invalid BTCPay webhook signature")
        return null
      }

      // Parse webhook data
      const webhookData = JSON.parse(rawBody)

      return {
        invoiceId: webhookData.invoiceId,
        type: webhookData.type,
        timestamp: webhookData.timestamp,
        storeId: webhookData.storeId,
        deliveryId: webhookData.deliveryId,
      }
    } catch (error) {
      console.error("BTCPay webhook verification error:", error)
      return null
    }
  }

  mapWebhookTypeToOrderStatus(webhookType: string): string | null {
    const statusMap: Record<string, string> = {
      InvoiceCreated: "unpaid",
      InvoiceReceivedPayment: "paid",
      InvoicePaymentSettled: "confirmed",
      InvoiceProcessing: "paid",
      InvoiceExpired: "expired",
      InvoiceInvalid: "cancelled",
    }

    return statusMap[webhookType] || null
  }
}

// Singleton instance
export const btcpayClient = new BTCPayClient()
