import { NextResponse } from "next/server"
import { createEmployee, getEmployees } from "@/lib/data/employees"
import type { Employee } from "@/lib/data/employees"

export async function GET() {
  try {
    console.log("API: Fetching all employees from database")
    const employees = await getEmployees()
    return NextResponse.json({ success: true, employees })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch employees: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { referrals, ...employee } = data as Omit<Employee, "created_at" | "updated_at"> & {
      referrals?: Array<{ id: string; fee: number }>
    }

    console.log("API: Creating new employee:", employee)
    console.log("API: With referrals:", referrals)

    if (
      !employee.first_name ||
      !employee.last_name ||
      employee.bill_rate === undefined ||
      employee.pay_rate === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "First name, last name, bill rate, and pay rate are required",
        },
        { status: 400 },
      )
    }

    const newEmployee = await createEmployee(employee, referrals)
    return NextResponse.json({ success: true, employee: newEmployee })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to create employee: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
