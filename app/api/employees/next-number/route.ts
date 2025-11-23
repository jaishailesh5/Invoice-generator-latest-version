import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const db = await getDb()

    // Query to find the highest employee number
    const result = await db.all(`
      SELECT employee_number 
      FROM employees 
      WHERE employee_number LIKE 'EMP-%'
    `)

    // Extract numbers from employee numbers
    const employeeNumbers = result
      .map((row) => row.employee_number || "EMP-0000")
      .filter((num) => num.startsWith("EMP-"))
      .map((num) => Number.parseInt(num.replace("EMP-", ""), 10))

    // Find the highest number, default to 0 if no employees exist
    const highestNumber = employeeNumbers.length > 0 ? Math.max(...employeeNumbers) : 0

    // Next number is highest + 1
    const nextNumber = highestNumber + 1

    return NextResponse.json({
      success: true,
      nextNumber: nextNumber,
    })
  } catch (error) {
    console.error("Error getting next employee number:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to get next employee number: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
