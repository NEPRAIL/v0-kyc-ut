// BTCPay integration removed; provide a minimal stub to avoid import errors if any remain.
export class BTCPayClient {
  isReady(): boolean {
    return false
  }
  mapWebhookTypeToOrderStatus(_type: string): string | null {
    return null
  }
}

export const btcpayClient = new BTCPayClient()
