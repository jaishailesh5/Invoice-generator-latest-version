import { type NextRequest, NextResponse } from "next/server"
import { migrateFromLocalStorage } from "@/lib/migrate-to-sqlite"
import { ensureDatabaseExists } from "@/lib/init-database"

export async function GET(request: NextRequest) {
  try {
    // Initialize the database with enhanced logging
    const result = await ensureDatabaseExists()

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Database initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === "migrate") {
      // Ensure database exists before migration
      const dbResult = await ensureDatabaseExists()
      if (!dbResult.success) {
        return NextResponse.json(dbResult, { status: 500 })
      }

      const result = await migrateFromLocalStorage()
      return NextResponse.json(result)
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `API error: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
