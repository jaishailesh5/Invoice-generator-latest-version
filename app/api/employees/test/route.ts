import { NextResponse } from "next/server"
import { getDb, generateId } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await getDb()

  try {
    console.log("Testing employee database operations")

    // Check if employees table exists
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'")
    if (tables.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employees table does not exist",
        },
        { status: 500 },
      )
    }

    // Count employees
    const employeeCount = await db.get("SELECT COUNT(*) as count FROM employees")

    // Test inserting a test employee
    const testId = `test-${generateId()}`
    await db.run(
      `
      INSERT INTO employees (
        id, first_name, last_name, bill_rate, pay_rate, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
      [testId, "Test", "Employee", 100, 50, "active"],
    )

    // Verify the employee was inserted
    const testEmployee = await db.get("SELECT * FROM employees WHERE id = ?", [testId])

    // Delete the test employee
    await db.run("DELETE FROM employees WHERE id = ?", [testId])

    return NextResponse.json({
      success: true,
      message: "Employee database operations successful",
      details: {
        tableExists: tables.length > 0,
        employeeCount: employeeCount?.count || 0,
        testEmployeeCreated: !!testEmployee,
        testEmployee,
      },
    })
  } catch (error) {
    console.error("Error testing employee database operations:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Database test failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
