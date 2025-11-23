"use server"

import { updateEmployee } from "@/lib/data/employees"
import { revalidatePath } from "next/cache"

export async function updateEmployeeStatusAction(
  id: string,
  status: "active" | "terminated",
  terminationDate?: string,
) {
  try {
    console.log(
      `Updating employee ${id} status to ${status}${terminationDate ? ` with termination date ${terminationDate}` : ""}`,
    )

    // Update employee in database
    const updates: any = { status }
    if (terminationDate) {
      updates.termination_date = terminationDate
    }

    await updateEmployee(id, updates)

    // Revalidate relevant paths
    revalidatePath("/employee-list")
    revalidatePath("/db-viewer")

    return {
      success: true,
      message: `Employee status updated to ${status} successfully`,
    }
  } catch (error) {
    console.error("Error updating employee status:", error)
    return {
      success: false,
      message: `Failed to update employee status: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function updateEmployeeDetailsAction(
  id: string,
  updates: {
    firstName: string
    lastName: string
    billRate: number
    payRate: number
    employeeType?: string
    billToPartyId?: string
    dateOfJoining?: string
    vendorName?: string
    referrals?: Array<{ id: string; fee: number }> // Add referrals parameter
  },
) {
  try {
    console.log(`Updating employee ${id} details:`, updates)

    // Convert to database format (snake_case)
    const dbUpdates = {
      first_name: updates.firstName,
      last_name: updates.lastName,
      bill_rate: updates.billRate,
      pay_rate: updates.payRate,
      employee_type: updates.employeeType,
      bill_to_party_id: updates.billToPartyId,
      date_of_joining: updates.dateOfJoining,
      vendor_name: updates.vendorName,
    }

    // Update employee in database
    await updateEmployee(id, dbUpdates, updates.referrals)

    // Revalidate relevant paths
    revalidatePath("/employee-list")
    revalidatePath("/db-viewer")

    return {
      success: true,
      message: "Employee details updated successfully",
    }
  } catch (error) {
    console.error("Error updating employee details:", error)
    return {
      success: false,
      message: `Failed to update employee details: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
