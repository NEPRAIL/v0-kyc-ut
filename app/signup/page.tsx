import { validateRequest } from "@/lib/auth/lucia"
import { redirect } from "next/navigation"
import { SignupForm } from "@/components/auth/signup-form"
import Link from "next/link"

export default async function SignupPage() {
  const { user } = await validateRequest()
  if (user) {
    redirect("/shop")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <SignupForm />
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
