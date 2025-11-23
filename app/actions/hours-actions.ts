"use server"

import { getMonthlyHours as getMonthlyHoursDb, updateMonthlyHours as updateMonthlyHoursDb } from "@/lib/data/employees"

export async function getMonthlyHoursAction(monthYear: string) {
  try {
    console.log(`[Server Action] Fetching monthly hours for ${monthYear}`)
    const hours = await getMonthlyHoursDb(monthYear)
    console.log(`[Server Action] Retrieved ${Object.keys(hours).length} monthly hours records`)
    return { success: true, data: hours }
  } catch (error) {
    console.error(`[Server Action] Error fetching monthly hours:`, error)
    return {
      success: false,
      message: `Failed to fetch monthly hours: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function updateMonthlyHoursAction(employeeId: string, monthYear: string, hours: number) {
  try {
    console.log(`[Server Action] Updating monthly hours for employee ${employeeId}, month ${monthYear}: ${hours} hours`)
    await updateMonthlyHoursDb(employeeId, monthYear, hours)
    console.log(`[Server Action] Successfully updated hours for employee ${employeeId}`)
    return { success: true }
  } catch (error) {
    console.error(`[Server Action] Error updating monthly hours:`, error)
    return {
      success: false,
      message: `Failed to update monthly hours: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function updateBulkMonthlyHoursAction(employeeIds: string[], monthYear: string, hours: number) {
  try {
    console.log(
      `[Server Action] Updating hours for ${employeeIds.length} employees, month ${monthYear}: ${hours} hours`,
    )

    const results = await Promise.all(
      employeeIds.map(async (id) => {
        try {
          await updateMonthlyHoursDb(id, monthYear, hours)
          return { id, success: true }
        } catch (error) {
          console.error(`[Server Action] Error updating hours for employee ${id}:`, error)
          return {
            id,
            success: false,
            message: `Failed to update hours: ${error instanceof Error ? error.message : String(error)}`,
          }
        }
      }),
    )

    const failures = results.filter((r) => !r.success)
    if (failures.length > 0) {
      return {
        success: false,
        message: `Failed to update hours for ${failures.length} employees`,
        failures,
      }
    }

    return { success: true }
  } catch (error) {
    console.error(`[Server Action] Error updating bulk monthly hours:`, error)
    return {
      success: false,
      message: `Failed to update bulk monthly hours: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
