import { getDb, generateId } from "@/lib/db"

export type Employee = {
  id: string
  employee_number?: string
  first_name: string
  last_name: string
  date_of_joining?: string
  bill_rate: number
  pay_rate: number
  vendor_name?: string
  bill_to_party_id?: string
  status?: "active" | "terminated"
  termination_date?: string
  employee_type?: "W2-Employee" | "1099-Contractor"
  created_at?: string
  updated_at?: string
}

export type EmployeeWithReferrals = Employee & {
  referrals?: Array<{
    id: string
    name: string
    fee: number
  }>
}

export async function getEmployees(): Promise<EmployeeWithReferrals[]> {
  const db = await getDb()

  try {
    console.log("Fetching all employees from database")
    // Get all employees
    const employees = await db.all<Employee[]>(`
      SELECT * FROM employees ORDER BY first_name, last_name
    `)
    console.log(`Retrieved ${employees.length} employees from database`)

    // Get referrals for each employee
    const result: EmployeeWithReferrals[] = []

    for (const employee of employees) {
      const referrals = await db.all(
        `
        SELECT er.id, er.referral_id, er.fee, p.name
        FROM employee_referrals er
        JOIN parties p ON er.referral_id = p.id
        WHERE er.employee_id = ?
      `,
        [employee.id],
      )

      result.push({
        ...employee,
        referrals: referrals.map((r) => ({
          id: r.referral_id,
          name: r.name,
          fee: r.fee,
        })),
      })
    }

    return result
  } catch (error) {
    console.error("Error fetching employees:", error)
    throw new Error(`Failed to fetch employees: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getEmployeeById(id: string): Promise<EmployeeWithReferrals | null> {
  const db = await getDb()

  try {
    // Get employee
    const employee = await db.get<Employee>(
      `
      SELECT * FROM employees WHERE id = ?
    `,
      [id],
    )

    if (!employee) return null

    // Get referrals
    const referrals = await db.all(
      `
      SELECT er.id, er.referral_id, er.fee, p.name
      FROM employee_referrals er
      JOIN parties p ON er.referral_id = p.id
      WHERE er.employee_id = ?
    `,
      [id],
    )

    return {
      ...employee,
      referrals: referrals.map((r) => ({
        id: r.referral_id,
        name: r.name,
        fee: r.fee,
      })),
    }
  } catch (error) {
    console.error(`Error fetching employee ${id}:`, error)
    throw new Error(`Failed to fetch employee: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getActiveEmployees() {
  const db = await getDb()
  try {
    return await db.all('SELECT * FROM employees WHERE status = "active" ORDER BY first_name, last_name')
  } catch (error) {
    console.error("Error fetching active employees:", error)
    throw new Error(`Failed to fetch active employees: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function createEmployee(
  employee: Omit<Employee, "created_at" | "updated_at">,
  referrals?: Array<{ id: string; fee: number }>,
) {
  const db = await getDb()

  try {
    console.log("Creating new employee in database:", employee)
    await db.exec("BEGIN TRANSACTION")

    const employeeId = employee.id || generateId()

    // Insert employee
    await db.run(
      `
      INSERT INTO employees (
        id, employee_number, first_name, last_name, date_of_joining, 
        bill_rate, pay_rate, vendor_name, bill_to_party_id, status, 
        termination_date, employee_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        employeeId,
        employee.employee_number || null,
        employee.first_name,
        employee.last_name,
        employee.date_of_joining || null,
        employee.bill_rate,
        employee.pay_rate,
        employee.vendor_name || null,
        employee.bill_to_party_id || null,
        employee.status || "active",
        employee.termination_date || null,
        employee.employee_type || "W2-Employee",
      ],
    )

    console.log(`Employee inserted with ID: ${employeeId}`)

    // Insert referrals
    if (referrals && referrals.length > 0) {
      console.log(`Adding ${referrals.length} referrals for employee ${employeeId}`)
      for (const referral of referrals) {
        const referralId = generateId()
        await db.run(
          `
          INSERT INTO employee_referrals (id, employee_id, referral_id, fee)
          VALUES (?, ?, ?, ?)
        `,
          [referralId, employeeId, referral.id, referral.fee],
        )
        console.log(`Added referral ${referral.id} with fee ${referral.fee}`)
      }
    }

    await db.exec("COMMIT")
    console.log("Employee creation transaction committed successfully")

    return { id: employeeId, ...employee }
  } catch (error) {
    await db.exec("ROLLBACK")
    console.error("Error creating employee:", error)
    throw new Error(`Failed to create employee: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id" | "created_at" | "updated_at">>,
  referrals?: Array<{ id: string; fee: number }>,
) {
  const db = await getDb()

  try {
    console.log(`Updating employee ${id} with:`, updates)
    await db.exec("BEGIN TRANSACTION")

    // Build update query
    const fields = Object.keys(updates).filter((key) => updates[key as keyof typeof updates] !== undefined)

    if (fields.length > 0) {
      const setClause = fields.map((field) => `${field} = ?`).join(", ")
      const values = fields.map((field) => updates[field as keyof typeof updates])

      await db.run(
        `
        UPDATE employees 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
        [...values, id],
      )
      console.log(`Updated employee fields: ${fields.join(", ")}`)
    }

    // Update referrals if provided
    if (referrals !== undefined) {
      // Delete existing referrals
      await db.run("DELETE FROM employee_referrals WHERE employee_id = ?", [id])
      console.log(`Deleted existing referrals for employee ${id}`)

      // Insert new referrals
      for (const referral of referrals) {
        const referralId = generateId()
        await db.run(
          `
          INSERT INTO employee_referrals (id, employee_id, referral_id, fee)
          VALUES (?, ?, ?, ?)
        `,
          [referralId, id, referral.id, referral.fee],
        )
        console.log(`Added new referral ${referral.id} with fee ${referral.fee}`)
      }
    }

    await db.exec("COMMIT")
    console.log("Employee update transaction committed successfully")

    return { id, ...updates }
  } catch (error) {
    await db.exec("ROLLBACK")
    console.error(`Error updating employee ${id}:`, error)
    throw new Error(`Failed to update employee: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function deleteEmployee(id: string) {
  const db = await getDb()

  try {
    console.log(`Deleting employee ${id}`)
    await db.exec("BEGIN TRANSACTION")

    // Delete referrals
    await db.run("DELETE FROM employee_referrals WHERE employee_id = ?", [id])
    console.log(`Deleted referrals for employee ${id}`)

    // Delete monthly hours
    await db.run("DELETE FROM monthly_hours WHERE employee_id = ?", [id])
    console.log(`Deleted monthly hours for employee ${id}`)

    // Delete employee
    await db.run("DELETE FROM employees WHERE id = ?", [id])
    console.log(`Deleted employee ${id}`)

    await db.exec("COMMIT")
    console.log("Employee deletion transaction committed successfully")

    return { success: true }
  } catch (error) {
    await db.exec("ROLLBACK")
    console.error(`Error deleting employee ${id}:`, error)
    throw new Error(`Failed to delete employee: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function updateMonthlyHours(employeeId: string, monthYear: string, hours: number) {
  const db = await getDb()
  try {
    console.log(`Updating monthly hours for employee ${employeeId}, month ${monthYear}: ${hours} hours`)

    // Check if record exists
    const existing = await db.get("SELECT * FROM monthly_hours WHERE employee_id = ? AND month_year = ?", [
      employeeId,
      monthYear,
    ])

    if (existing) {
      console.log(`Updating existing monthly hours record for ${employeeId}`)
      await db.run(
        "UPDATE monthly_hours SET hours = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND month_year = ?",
        [hours, employeeId, monthYear],
      )
    } else {
      console.log(`Creating new monthly hours record for ${employeeId}`)
      const id = generateId()
      await db.run("INSERT INTO monthly_hours (id, employee_id, month_year, hours) VALUES (?, ?, ?, ?)", [
        id,
        employeeId,
        monthYear,
        hours,
      ])
    }

    console.log(`Successfully updated hours for employee ${employeeId}`)
    return { success: true }
  } catch (error) {
    console.error(`Error updating monthly hours for employee ${employeeId}:`, error)
    throw new Error(`Failed to update monthly hours: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getMonthlyHours(monthYear: string) {
  const db = await getDb()
  try {
    console.log(`Fetching monthly hours for ${monthYear}`)
    const results = await db.all("SELECT employee_id, hours FROM monthly_hours WHERE month_year = ?", [monthYear])
    console.log(`Retrieved ${results.length} monthly hours records for ${monthYear}`)

    // Convert to the format expected by the frontend
    const hoursMap: Record<string, number> = {}
    for (const row of results) {
      hoursMap[row.employee_id] = row.hours
    }

    console.log("Converted hours map:", hoursMap)
    return hoursMap
  } catch (error) {
    console.error(`Error fetching monthly hours for ${monthYear}:`, error)
    throw new Error(`Failed to fetch monthly hours: ${error instanceof Error ? error.message : String(error)}`)
  }
}
