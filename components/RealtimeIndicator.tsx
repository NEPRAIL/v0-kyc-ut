"use client"

import { useState } from "react"

export default function RealtimeIndicator() {
  const [status] = useState<"online">("online")

  const color = "bg-green-500"
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      Live
    </div>
  )
}
