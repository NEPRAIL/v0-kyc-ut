import { requireAuth } from "@/lib/auth/middleware"
import { CheckoutForm } from "@/components/checkout/checkout-form"

export default async function CheckoutPage() {
  await requireAuth()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Checkout</h1>
        <CheckoutForm />
      </div>
    </div>
  )
}
