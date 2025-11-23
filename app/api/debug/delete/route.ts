import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { table, id } = await request.json()

    if (!table || !id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: table and id" },
        { status: 400 },
      )
    }

    const db = await getDb()

    // Validate table name to prevent SQL injection
    const validTables = ["employees", "parties", "invoices", "monthly_hours", "employee_referrals"]
    if (!validTables.includes(table)) {
      return NextResponse.json({ success: false, message: "Invalid table name" }, { status: 400 })
    }

    // Log the current record
    const record = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id])
    console.log(`Current record in ${table}:`, record)

    // Perform the delete operation
    const result = await db.run(`DELETE FROM ${table} WHERE id = ?`, [id])

    // Verify deletion
    const checkRecord = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id])
    const deleted = checkRecord === undefined

    return NextResponse.json({
      success: true,
      message: `Delete operation completed for ${table} with ID ${id}`,
      result: {
        changes: result.changes,
        deleted,
        recordBefore: record,
        recordAfter: checkRecord,
      },
    })
  } catch (error) {
    console.error("Error in debug delete API:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Error in debug delete API: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
