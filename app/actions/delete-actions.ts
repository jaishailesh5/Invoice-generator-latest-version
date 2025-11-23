"use server"

import { deleteEmployee } from "@/lib/data/employees"
import { deleteParty } from "@/lib/data/parties"
import { deleteInvoice } from "@/lib/data/invoices"
import { recordExists, logDbOperation } from "@/lib/db-utils"
import { revalidatePath } from "next/cache"
import { resetDbConnection } from "@/lib/db"

export async function deleteEmployeeAction(id: string) {
  try {
    console.log(`Deleting employee with ID: ${id}`)

    // Check if the record exists in the database
    const exists = await recordExists("employees", id)

    if (!exists) {
      console.log(`Employee with ID ${id} not found in database, only deleting from localStorage`)
      return { success: true, message: "Employee deleted from localStorage only (not found in database)" }
    }

    // Log the operation
    logDbOperation("delete", "employees", id)

    // Delete from database
    const result = await deleteEmployee(id)
    console.log(`Delete employee result:`, result)

    // Revalidate relevant paths
    revalidatePath("/employee-list")
    revalidatePath("/db-viewer")

    return { success: true, message: "Employee deleted successfully" }
  } catch (error) {
    console.error("Error deleting employee:", error)
    return {
      success: false,
      message: `Failed to delete employee: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function deletePartyAction(id: string) {
  try {
    console.log(`Server action: Deleting party with ID: ${id}`)

    // Reset the database connection to ensure we get a fresh one
    resetDbConnection()

    // Log the operation
    logDbOperation("delete", "parties", id)

    // Delete from database with simplified error handling
    try {
      const result = await deleteParty(id)
      console.log(`Delete party result:`, result)

      if (!result.success) {
        return result // Return the error from the deleteParty function
      }
    } catch (dbError) {
      console.error("Database error when deleting party:", dbError)
      return {
        success: false,
        message: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
      }
    }

    // Revalidate relevant paths
    revalidatePath("/manage-parties")
    revalidatePath("/db-viewer")

    return { success: true, message: "Party deleted successfully" }
  } catch (error) {
    console.error("Error in deletePartyAction:", error)
    return {
      success: false,
      message: `Failed to delete party: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function deleteInvoiceAction(id: string) {
  try {
    console.log(`Deleting invoice with ID: ${id}`)

    // Check if the record exists in the database
    const exists = await recordExists("invoices", id)

    if (!exists) {
      console.log(`Invoice with ID ${id} not found in database, only deleting from localStorage`)
      return { success: true, message: "Invoice deleted from localStorage only (not found in database)" }
    }

    // Log the operation
    logDbOperation("delete", "invoices", id)

    // Delete from database
    const result = await deleteInvoice(id)
    console.log(`Delete invoice result:`, result)

    // Revalidate relevant paths
    revalidatePath("/invoice-history")
    revalidatePath("/db-viewer")

    return { success: true, message: "Invoice deleted successfully" }
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return {
      success: false,
      message: `Failed to delete invoice: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
