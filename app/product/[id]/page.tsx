import ProductClientPage from "./ProductClientPage"
import { allProducts } from "@/lib/data/products"

interface ProductPageProps {
  params: {
    id: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  return <ProductClientPage params={params} />
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = params.id
  const product = allProducts.find((p) => p.id === id)

  if (!product) {
    return {
      title: "Product Not Found",
    }
  }

  return {
    title: `${product?.name} - KYCut`,
    description: `Pre-verified ${product?.name} account with complete KYC verification. ${product?.category} account available for immediate delivery.`,
  }
}
