export async function GET() {
  return Response.json({ message: "API is working", timestamp: new Date().toISOString() })
}

export async function POST() {
  return Response.json({ message: "POST endpoint working" })
}
