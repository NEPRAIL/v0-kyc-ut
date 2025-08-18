import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Product {
  id: string
  name: string
  description: string
  image_url: string
  season_name: string
  rarity_name: string
  rarity_color: string
  price: number
  stock: number
}

export interface User {
  id: string
  name: string | null
  email: string
  role: string
}

export async function getProducts(): Promise<Product[]> {
  try {
    const result = await sql`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.image_url,
        s.name as season_name,
        r.name as rarity_name,
        r.color as rarity_color,
        l.price,
        l.stock
      FROM products p
      LEFT JOIN seasons s ON p.season_id = s.id
      LEFT JOIN rarities r ON p.rarity_id = r.id
      LEFT JOIN listings l ON p.id = l.product_id
      WHERE l.is_active = true
      ORDER BY r.name, p.name
    `
    return result as Product[]
  } catch (error) {
    console.log("[v0] Database query failed, returning mock data:", error)
    return getMockProducts()
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `
    return (result[0] as User) || null
  } catch (error) {
    console.log("[v0] User query failed:", error)
    return null
  }
}

function getMockProducts(): Product[] {
  return [
    {
      id: "1",
      name: "Arcade Season 1 Rank 1 Token",
      description: "Exclusive gold token for top performers",
      image_url: "/green-arcade-token.png",
      season_name: "Season 1",
      rarity_name: "Legendary",
      rarity_color: "#FFD700",
      price: 299,
      stock: 5,
    },
    {
      id: "2",
      name: "Arcade Season 1 Rank 2 Token",
      description: "Premium silver token for high achievers",
      image_url: "/green-arcade-token.png",
      season_name: "Season 1",
      rarity_name: "Epic",
      rarity_color: "#9333EA",
      price: 199,
      stock: 12,
    },
    {
      id: "3",
      name: "Arcade Season 1 Participation Token",
      description: "Standard token for all participants",
      image_url: "/green-arcade-token.png",
      season_name: "Season 1",
      rarity_name: "Common",
      rarity_color: "#6B7280",
      price: 49,
      stock: 100,
    },
  ]
}
