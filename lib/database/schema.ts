export interface User {
  id: string
  email: string
  username: string
  password_hash: string
  salt: string
  email_verified: boolean
  email_verification_token?: string
  email_verification_expires?: Date
  password_reset_token?: string
  password_reset_expires?: Date
  two_factor_secret?: string
  two_factor_enabled: boolean
  failed_login_attempts: number
  locked_until?: Date
  last_login?: Date
  created_at: Date
  updated_at: Date
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  expires_at: Date
  ip_address?: string
  user_agent?: string
  created_at: Date
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: "pending" | "paid" | "processing" | "completed" | "cancelled" | "refunded"
  total_amount: number
  btc_amount?: number
  btc_address?: string
  payment_status: "pending" | "partial" | "paid" | "overpaid" | "expired"
  payment_received: number
  payment_expires_at?: Date
  notes?: string
  created_at: Date
  updated_at: Date
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_price: number
  quantity: number
  created_at: Date
}

export interface BitcoinAddress {
  id: string
  order_id: string
  address: string
  derivation_path: string
  address_index: number
  is_used: boolean
  balance: number
  created_at: Date
  updated_at: Date
}

export type OrderStatus = Order["status"]
export type PaymentStatus = Order["payment_status"]
