import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    console.log("API: Fetching all monthly hours from database")
    const db = await getDb()

    // Get all monthly hours records
    const records = await db.all(`
      SELECT employee_id, month_year, hours 
      FROM monthly_hours
      ORDER BY month_year
    `)

    // Convert to the format expected by the frontend
    const monthlyHours: Record<string, Record<string, number>> = {}

    for (const record of records) {
      if (!monthlyHours[record.month_year]) {
        monthlyHours[record.month_year] = {}
      }
      monthlyHours[record.month_year][record.employee_id] = record.hours
    }

    return NextResponse.json({
      success: true,
      monthlyHours,
    })
  } catch (error) {
    console.error("Error fetching monthly hours:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch monthly hours: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
