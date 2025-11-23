import { NextResponse } from "next/server"
import { repairDatabase } from "@/lib/db"

export async function POST() {
  try {
    const result = await repairDatabase()

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error("Database repair API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Database repair failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
