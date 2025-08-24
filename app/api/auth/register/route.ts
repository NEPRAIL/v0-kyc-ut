import { type NextRequest, NextResponse } from "next/server"
import { createUser, getUserByEmail, getUserByUsername } from "@/lib/auth/database"
import { hashPassword, validatePassword, isValidEmail, isValidUsername } from "@/lib/auth/security"
import { generateSecureTokenServer } from "@/lib/auth/server-crypto"

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json()

    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json({ error: "Email, username, and password are required" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters and contain only letters, numbers, and underscores" },
        { status: 400 },
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: "Password validation failed", details: passwordValidation.errors },
        { status: 400 },
      )
    }

    // Check if user already exists
    const existingUserByEmail = await getUserByEmail(email)
    if (existingUserByEmail) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    const existingUserByUsername = await getUserByUsername(username)
    if (existingUserByUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
    }

    // Hash password
    const { hash, salt } = await hashPassword(password)

    // Generate email verification token
    const emailVerificationToken = generateSecureTokenServer()

    // Create user
    const user = await createUser({
      email,
      username,
      password_hash: hash,
      password_salt: salt,
      email_verification_token: emailVerificationToken,
    })

    // TODO: Send email verification email
    console.log(`Email verification token for ${email}: ${emailVerificationToken}`)

    return NextResponse.json(
      {
        message: "User registered successfully. Please check your email to verify your account.",
        userId: user.id,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
