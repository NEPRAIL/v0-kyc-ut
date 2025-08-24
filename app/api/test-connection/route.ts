import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Test connection API called")

    // Test basic functionality
    const testData = {
      success: true,
      message: "API is working",
      timestamp: new Date().toISOString(),
      env_check: {
        database_url: !!process.env.DATABASE_URL,
        node_env: process.env.NODE_ENV,
      },
    }

    console.log("[v0] Test data:", testData)
    return NextResponse.json(testData)
  } catch (error) {
    console.error("[v0] Test connection error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
