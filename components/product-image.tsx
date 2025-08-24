"use client"

interface ProductImageProps {
  productName: string
  type: "thumbnail" | "detail"
  className?: string
}

export function ProductImage({ productName, type, className = "" }: ProductImageProps) {
  const size = type === "thumbnail" ? 120 : 300

  const getDisplayText = () => {
    const brandMap: { [key: string]: string } = {
      // Crypto Exchanges
      Binance: "BN",
      Coinbase: "CB",
      Kraken: "KR",
      Bitfinex: "BF",
      Huobi: "HB",
      KuCoin: "KC",
      Gemini: "GM",
      Bitstamp: "BS",
      OKX: "OX",
      Bybit: "BB",

      // Neo Banks
      Revolut: "RV",
      N26: "N26",
      Monzo: "MZ",
      Starling: "ST",
      Chime: "CH",
      Varo: "VR",
      Current: "CR",
      Ally: "AL",
      Marcus: "MR",
      SoFi: "SF",

      // Traditional Banks
      Chase: "JP",
      "Wells Fargo": "WF",
      "Bank of America": "BA",
      Citibank: "CT",
      HSBC: "HS",
      Barclays: "BC",
      "Deutsche Bank": "DB",
      Santander: "SN",
      ING: "ING",
      "BNP Paribas": "BP",

      // Payment Services
      PayPal: "PP",
      Stripe: "ST",
      Square: "SQ",
      Wise: "WS",
      Remitly: "RM",
      "Western Union": "WU",
      MoneyGram: "MG",
      Skrill: "SK",
      Neteller: "NT",
      Payoneer: "PN",

      // E-commerce & Others
      Amazon: "AM",
      Apple: "AP",
      Google: "GO",
      Microsoft: "MS",
      Meta: "MT",
    }

    // Check if it's a known brand (case insensitive)
    const knownBrand = Object.keys(brandMap).find((brand) => productName.toLowerCase().includes(brand.toLowerCase()))

    if (knownBrand) {
      return brandMap[knownBrand]
    }

    const words = productName.split(/[\s-_]+/).filter((word) => word.length > 0)
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase()
    }
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }

  const displayText = getDisplayText()

  const getColorScheme = () => {
    const name = productName.toLowerCase()

    if (
      name.includes("crypto") ||
      name.includes("bitcoin") ||
      name.includes("binance") ||
      name.includes("coinbase") ||
      name.includes("kraken")
    ) {
      return "from-orange-400 via-yellow-500 to-amber-400" // Crypto gold theme
    }
    if (name.includes("bank") || name.includes("chase") || name.includes("wells") || name.includes("america")) {
      return "from-blue-500 via-indigo-500 to-blue-600" // Traditional bank blue
    }
    if (name.includes("paypal") || name.includes("stripe") || name.includes("payment")) {
      return "from-green-400 via-emerald-500 to-teal-500" // Payment green
    }
    if (name.includes("revolut") || name.includes("n26") || name.includes("monzo")) {
      return "from-purple-400 via-violet-500 to-purple-600" // Neo-bank purple
    }

    return "from-primary via-blue-500 to-purple-500" // Default gradient
  }

  return (
    <div
      className={`
        relative flex items-center justify-center rounded-2xl overflow-hidden
        bg-gradient-to-br from-card/80 via-card/60 to-card/40
        border border-border/50 backdrop-blur-xl
        transition-all duration-700 ease-out
        hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10
        hover:border-primary/30 hover:bg-gradient-to-br hover:from-card/90 hover:via-card/70 hover:to-card/50
        group cursor-pointer
        ${type === "thumbnail" ? "w-[120px] h-[120px]" : "w-[300px] h-[300px]"}
        ${className}
      `}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/20 animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center transform group-hover:scale-105 transition-all duration-500">
        <div
          className={`
            font-black tracking-wider
            bg-gradient-to-r ${getColorScheme()}
            bg-clip-text text-transparent
            drop-shadow-sm
            group-hover:drop-shadow-md
            transition-all duration-500
            ${type === "thumbnail" ? "text-3xl" : "text-6xl"}
          `}
          style={{
            textShadow: "0 0 20px rgba(99, 102, 241, 0.3)",
            WebkitTextStroke: type === "detail" ? "1px rgba(255,255,255,0.1)" : "none",
          }}
        >
          {displayText}
        </div>

        {type === "detail" && (
          <div className="mt-3 px-2 py-1 rounded-lg bg-background/20 backdrop-blur-sm border border-border/30">
            <div className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300">
              {productName}
            </div>
          </div>
        )}

        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  )
}
