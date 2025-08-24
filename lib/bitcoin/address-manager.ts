import { neon } from "@neondatabase/serverless"
import { getWalletInstance, encryptPrivateKey, HDWallet } from "./hd-wallet"

const sql = neon(process.env.DATABASE_URL!)

export interface BitcoinAddressRecord {
  id: string
  order_id: string
  address: string
  derivation_path: string
  private_key_encrypted: string
  amount_expected: number
  amount_received: number
  confirmations: number
  status: "pending" | "partial" | "paid" | "overpaid"
  first_seen?: Date
  confirmed_at?: Date
  created_at: Date
  updated_at: Date
}

export interface BitcoinTransaction {
  id: string
  address_id: string
  txid: string
  vout: number
  amount: number
  confirmations: number
  block_height?: number
  block_hash?: string
  received_at: Date
  confirmed_at?: Date
}

export class BitcoinAddressManager {
  private wallet: HDWallet
  private addressCounter = 0

  constructor() {
    this.wallet = getWalletInstance()
  }

  /**
   * Generate a new Bitcoin address for an order
   */
  async generateAddressForOrder(orderId: string, amountSatoshis: number): Promise<BitcoinAddressRecord> {
    // Get next address index
    const addressIndex = await this.getNextAddressIndex()

    // Generate address using HD wallet
    const addressData = this.wallet.generateOrderAddress(addressIndex)

    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(addressData.privateKey, orderId)

    // Store in database
    const result = await sql`
      INSERT INTO bitcoin_addresses (
        order_id, address, derivation_path, private_key_encrypted, amount_expected
      ) VALUES (
        ${orderId}, ${addressData.address}, ${addressData.derivationPath}, 
        ${encryptedPrivateKey}, ${amountSatoshis}
      )
      RETURNING *
    `

    return result[0] as BitcoinAddressRecord
  }

  /**
   * Get Bitcoin address for an order
   */
  async getAddressForOrder(orderId: string): Promise<BitcoinAddressRecord | null> {
    const result = await sql`
      SELECT * FROM bitcoin_addresses WHERE order_id = ${orderId} LIMIT 1
    `
    return (result[0] as BitcoinAddressRecord) || null
  }

  /**
   * Update address payment status
   */
  async updateAddressPayment(
    addressId: string,
    amountReceived: number,
    confirmations: number,
    txid?: string,
    vout?: number,
  ): Promise<void> {
    // Determine status based on amount received
    const address = await this.getAddressById(addressId)
    if (!address) return

    let status: "pending" | "partial" | "paid" | "overpaid" = "pending"
    if (amountReceived >= address.amount_expected) {
      status = amountReceived > address.amount_expected ? "overpaid" : "paid"
    } else if (amountReceived > 0) {
      status = "partial"
    }

    // Update address
    await sql`
      UPDATE bitcoin_addresses 
      SET amount_received = ${amountReceived},
          confirmations = ${confirmations},
          status = ${status},
          first_seen = COALESCE(first_seen, NOW()),
          confirmed_at = CASE WHEN ${confirmations} >= 1 THEN NOW() ELSE confirmed_at END,
          updated_at = NOW()
      WHERE id = ${addressId}
    `

    // Record transaction if provided
    if (txid && vout !== undefined) {
      await this.recordTransaction(addressId, txid, vout, amountReceived, confirmations)
    }
  }

  /**
   * Record a Bitcoin transaction
   */
  async recordTransaction(
    addressId: string,
    txid: string,
    vout: number,
    amount: number,
    confirmations: number,
    blockHeight?: number,
    blockHash?: string,
  ): Promise<void> {
    await sql`
      INSERT INTO bitcoin_transactions (
        address_id, txid, vout, amount, confirmations, block_height, block_hash,
        confirmed_at
      ) VALUES (
        ${addressId}, ${txid}, ${vout}, ${amount}, ${confirmations}, 
        ${blockHeight || null}, ${blockHash || null},
        ${confirmations >= 1 ? new Date() : null}
      )
      ON CONFLICT (txid, vout) DO UPDATE SET
        confirmations = EXCLUDED.confirmations,
        block_height = EXCLUDED.block_height,
        block_hash = EXCLUDED.block_hash,
        confirmed_at = CASE WHEN EXCLUDED.confirmations >= 1 THEN NOW() ELSE bitcoin_transactions.confirmed_at END
    `
  }

  /**
   * Get all addresses that need monitoring
   */
  async getActiveAddresses(): Promise<BitcoinAddressRecord[]> {
    const result = await sql`
      SELECT * FROM bitcoin_addresses 
      WHERE status IN ('pending', 'partial')
      AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `
    return result as BitcoinAddressRecord[]
  }

  /**
   * Get address by ID
   */
  private async getAddressById(addressId: string): Promise<BitcoinAddressRecord | null> {
    const result = await sql`
      SELECT * FROM bitcoin_addresses WHERE id = ${addressId} LIMIT 1
    `
    return (result[0] as BitcoinAddressRecord) || null
  }

  /**
   * Get next available address index
   */
  private async getNextAddressIndex(): Promise<number> {
    const result = await sql`
      SELECT COUNT(*) as count FROM bitcoin_addresses
    `
    return Number.parseInt(result[0].count) || 0
  }

  /**
   * Get current Bitcoin price in USD (placeholder - integrate with real API)
   */
  static async getBitcoinPrice(): Promise<number> {
    try {
      // In production, use a reliable Bitcoin price API
      const response = await fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
      const data = await response.json()
      return Number.parseFloat(data.bpi.USD.rate.replace(/,/g, ""))
    } catch (error) {
      console.error("Failed to fetch Bitcoin price:", error)
      // Fallback price (update this regularly)
      return 45000
    }
  }

  /**
   * Convert USD amount to satoshis
   */
  static async usdToSatoshis(usdAmount: number): Promise<number> {
    const btcPrice = await this.getBitcoinPrice()
    const btcAmount = usdAmount / btcPrice
    return HDWallet.btcToSatoshis(btcAmount)
  }
}

// Singleton instance
export const bitcoinAddressManager = new BitcoinAddressManager()
