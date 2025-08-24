import * as bitcoin from "bitcoinjs-lib"
import * as bip32 from "bip32"
import * as bip39 from "bip39"
import { createHmacSignature } from "@/lib/auth/server-crypto"

// Bitcoin network configuration
const NETWORK = process.env.NODE_ENV === "production" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet

export interface HDWalletConfig {
  mnemonic: string
  passphrase?: string
  network?: bitcoin.Network
}

export interface BitcoinAddress {
  address: string
  privateKey: string
  publicKey: string
  derivationPath: string
}

export class HDWallet {
  private root: bip32.BIP32Interface
  private network: bitcoin.Network

  constructor(config: HDWalletConfig) {
    this.network = config.network || NETWORK

    // Generate seed from mnemonic
    const seed = bip39.mnemonicToSeedSync(config.mnemonic, config.passphrase)

    // Create root key from seed
    this.root = bip32.fromSeed(seed, this.network)
  }

  /**
   * Generate a child address for a specific order
   * Uses derivation path: m/44'/0'/0'/0/{orderIndex}
   */
  generateOrderAddress(orderIndex: number): BitcoinAddress {
    // BIP44 derivation path for Bitcoin
    const path = `m/44'/0'/0'/0/${orderIndex}`

    // Derive child key
    const child = this.root.derivePath(path)

    if (!child.privateKey) {
      throw new Error("Failed to derive private key")
    }

    // Generate P2WPKH (native segwit) address
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: this.network,
    })

    if (!address) {
      throw new Error("Failed to generate address")
    }

    return {
      address,
      privateKey: child.privateKey.toString("hex"),
      publicKey: child.publicKey.toString("hex"),
      derivationPath: path,
    }
  }

  /**
   * Get the master public key for watch-only wallet setup
   */
  getMasterPublicKey(): string {
    return this.root.neutered().toBase58()
  }

  /**
   * Validate a Bitcoin address
   */
  static isValidAddress(address: string, network?: bitcoin.Network): boolean {
    try {
      bitcoin.address.toOutputScript(address, network || NETWORK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Convert satoshis to BTC
   */
  static satoshisToBTC(satoshis: number): number {
    return satoshis / 100000000
  }

  /**
   * Convert BTC to satoshis
   */
  static btcToSatoshis(btc: number): number {
    return Math.round(btc * 100000000)
  }
}

// Singleton wallet instance
let walletInstance: HDWallet | null = null

export function getWalletInstance(): HDWallet {
  if (!walletInstance) {
    const mnemonic = process.env.BITCOIN_WALLET_MNEMONIC
    const passphrase = process.env.BITCOIN_WALLET_PASSPHRASE

    if (!mnemonic) {
      throw new Error("BITCOIN_WALLET_MNEMONIC environment variable is required")
    }

    walletInstance = new HDWallet({
      mnemonic,
      passphrase,
      network: NETWORK,
    })
  }

  return walletInstance
}

// Encryption helpers for storing private keys
export function encryptPrivateKey(privateKey: string, orderId: string): string {
  const encryptionKey = process.env.BITCOIN_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error("BITCOIN_ENCRYPTION_KEY environment variable is required")
  }

  // Simple encryption using HMAC (in production, use proper encryption like AES)
  return createHmacSignature(encryptionKey, `${privateKey}:${orderId}`)
}

export function decryptPrivateKey(encryptedKey: string, orderId: string): string {
  // This is a placeholder - in production, implement proper decryption
  // For now, we'll store keys encrypted but this would need proper AES decryption
  throw new Error("Private key decryption not implemented - use for emergency recovery only")
}
