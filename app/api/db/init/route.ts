import { NextResponse } from "next/server"
import { initDb } from "@/lib/db"

export async function POST() {
  try {
    console.log("API: Initializing database schema")
    const result = await initDb()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error initializing database:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
