import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/session"

// Protected routes that require authentication
const protectedRoutes = ["/account", "/admin", "/orders"]
const authRoutes = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get("session")?.value

  // Get user from session
  const user = sessionToken ? await getSessionUser(sessionToken) : null

  // Redirect authenticated users away from auth pages
  if (user && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/account", request.url))
  }

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Add user info to headers for server components
  const response = NextResponse.next()
  if (user) {
    response.headers.set("x-user-id", user.id)
    response.headers.set("x-user-email", user.email)
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
}
