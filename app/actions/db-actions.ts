"use server"

import { ensureDatabaseExists } from "@/lib/init-database"
import { migrateFromLocalStorage } from "@/lib/migrate-to-sqlite"
import { revalidatePath } from "next/cache"
import { initDb } from "@/lib/db"

export async function initializeDatabase() {
  try {
    console.log("Server Action: Initializing database...")

    // First, ensure the database directory exists
    const result = await ensureDatabaseExists()

    if (!result.success) {
      console.error("Failed to ensure database exists:", result.message)
      return result
    }

    // Then explicitly initialize the database schema
    const initResult = await initDb()

    if (initResult.success) {
      console.log("Database schema initialized successfully")
    } else {
      console.error("Failed to initialize database schema:", initResult.message)
    }

    return initResult
  } catch (error) {
    console.error("Database initialization error:", error)
    return {
      success: false,
      message: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}

export async function migrateData(formData: FormData) {
  try {
    // Ensure database exists before migration
    const dbResult = await ensureDatabaseExists()
    if (!dbResult.success) {
      return dbResult
    }

    const result = await migrateFromLocalStorage()

    if (result.success) {
      // Revalidate all paths that might use this data
      revalidatePath("/employee-list")
      revalidatePath("/invoice-history")
      revalidatePath("/finance-dashboard")
    }

    return result
  } catch (error) {
    console.error("Migration error:", error)
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}
