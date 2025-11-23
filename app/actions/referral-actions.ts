"use server"

import { getDb, generateId } from "@/lib/db"
import { checkReferralsTable } from "@/lib/data/check-referrals"

export async function checkReferralsTableAction() {
  return await checkReferralsTable()
}

export async function migrateReferralsFromLocalStorage() {
  try {
    const db = await getDb()

    // First check if the table exists
    const tableCheck = await checkReferralsTable()
    if (!tableCheck.success) {
      throw new Error(`Failed to check referrals table: ${tableCheck.error}`)
    }

    // Get employees from localStorage (client-side only)
    if (typeof window === "undefined") {
      return { success: false, message: "This action can only be run in the browser" }
    }

    const employeesJson = localStorage.getItem("employees")
    if (!employeesJson) {
      return { success: false, message: "No employees found in localStorage" }
    }

    const employees = JSON.parse(employeesJson)
    let migratedCount = 0

    await db.exec("BEGIN TRANSACTION")

    for (const employee of employees) {
      if (employee.referrals && Array.isArray(employee.referrals) && employee.referrals.length > 0) {
        for (const referral of employee.referrals) {
          // Check if this referral already exists
          const existing = await db.get("SELECT id FROM employee_referrals WHERE employee_id = ? AND referral_id = ?", [
            employee.id,
            referral.id,
          ])

          if (!existing) {
            const referralId = generateId()
            await db.run("INSERT INTO employee_referrals (id, employee_id, referral_id, fee) VALUES (?, ?, ?, ?)", [
              referralId,
              employee.id,
              referral.id,
              referral.fee,
            ])
            migratedCount++
          }
        }
      }
    }

    await db.exec("COMMIT")

    return {
      success: true,
      message: `Successfully migrated ${migratedCount} referrals from localStorage`,
    }
  } catch (error) {
    console.error("Error migrating referrals:", error)
    return {
      success: false,
      message: `Failed to migrate referrals: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
