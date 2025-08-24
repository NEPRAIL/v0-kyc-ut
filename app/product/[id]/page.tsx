import ProductClientPage from "./ProductClientPage"
import { allProducts } from "@/lib/data/products"

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateStaticParams() {
  return allProducts.map((product) => ({
    id: product.id,
  }))
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params
  return <ProductClientPage params={resolvedParams} />
}

export async function generateMetadata({ params }: ProductPageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams
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
