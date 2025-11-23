/**
 * Utility functions for the database
 */

import { getDb } from "@/lib/db"

// Function to check if a record exists in the database
export async function recordExists(table: string, id: string): Promise<boolean> {
  try {
    const db = await getDb()
    const result = await db.get(`SELECT id FROM ${table} WHERE id = ?`, [id])
    return !!result
  } catch (error) {
    console.error(`Error checking if record ${id} exists in table ${table}:`, error)
    return false
  }
}

// Function to log database operations for debugging
export function logDbOperation(operation: string, table: string, id?: string) {
  console.log(`[DB OPERATION] ${operation.toUpperCase()} ${table} ${id ? `ID: ${id}` : ""}`)
}
