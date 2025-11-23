import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const db = await getDb()

    // Simple query to test connection
    await db.get("SELECT 1")

    return NextResponse.json({ connected: true })
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json({
      connected: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
