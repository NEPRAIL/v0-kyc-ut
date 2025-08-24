import { z } from "zod"

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(31, "Username must be at most 31 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address").max(255, "Email must be at most 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
})

export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, "Email or username is required")
    .max(255, "Email or username must be at most 255 characters"),
  password: z.string().min(1, "Password is required").max(128, "Password must be at most 128 characters"),
})

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters").optional(),
  scopes: z
    .array(z.string())
    .default(["read:orders"])
    .refine(
      (scopes) =>
        scopes.every((scope) => ["read:orders", "write:orders", "read:profile", "write:profile"].includes(scope)),
      "Invalid scope provided",
    ),
})

export const revokeApiKeySchema = z.object({
  apiKey: z
    .string()
    .min(1, "API key is required")
    .regex(/^ak_live_[a-f0-9]+_.+$/, "Invalid API key format"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email must be at most 255 characters"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
})
