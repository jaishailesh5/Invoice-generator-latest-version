"use server"

import { getDb, generateId, initDb } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { Buffer } from "buffer"

export async function uploadEmployeeSowAction(employeeId: string, formData: FormData) {
    try {
        const file = formData.get("file") as File
        if (!file) {
            return { success: false, message: "No file provided" }
        }

        if (file.type !== "application/pdf") {
            return { success: false, message: "Only PDF files are allowed" }
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const db = await getDb()

        // Check if table exists, if not init db
        try {
            await db.get("SELECT 1 FROM employee_documents LIMIT 1")
        } catch (error) {
            if (String(error).includes("no such table")) {
                console.log("Table employee_documents missing, initializing DB...")
                await initDb()
            }
        }

        // Check if document already exists
        const existingDoc = await db.get(
            "SELECT id FROM employee_documents WHERE employee_id = ?",
            employeeId
        )

        if (existingDoc) {
            // Update existing document
            await db.run(
                `UPDATE employee_documents 
                 SET file_name = ?, file_type = ?, file_content = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE employee_id = ?`,
                file.name,
                file.type,
                buffer,
                employeeId
            )
        } else {
            // Insert new document
            const id = generateId()
            await db.run(
                `INSERT INTO employee_documents (id, employee_id, file_name, file_type, file_content) 
                 VALUES (?, ?, ?, ?, ?)`,
                id,
                employeeId,
                file.name,
                file.type,
                buffer
            )
        }

        revalidatePath("/employee-list")
        return { success: true, message: "SOW uploaded successfully" }
    } catch (error) {
        console.error("Error uploading SOW:", error)
        return { success: false, message: "Failed to upload SOW" }
    }
}

export async function getEmployeeSowAction(employeeId: string) {
    try {
        console.log(`[DEBUG] getEmployeeSowAction called for ${employeeId}`)
        const db = await getDb()

        // Check if table exists, if not init db
        try {
            await db.get("SELECT 1 FROM employee_documents LIMIT 1")
        } catch (error) {
            if (String(error).includes("no such table")) {
                console.log("Table employee_documents missing, initializing DB...")
                await initDb()
            }
        }

        const doc = await db.get(
            "SELECT file_content, file_type, file_name FROM employee_documents WHERE employee_id = ?",
            employeeId
        )

        if (!doc) {
            console.log(`[DEBUG] No SOW found for employee: ${employeeId}`)
            return { success: false, message: "Document not found" }
        }

        console.log(`[DEBUG] SOW found. Name: ${doc.file_name}, Type: ${doc.file_type}`)

        // Convert Buffer to Base64 string for transfer
        const base64Content = doc.file_content.toString('base64')

        const response = {
            success: true,
            data: {
                content: base64Content,
                fileType: doc.file_type,
                fileName: doc.file_name
            }
        }
        // Log the response structure (truncating content for readability)
        console.log("[DEBUG] Returning response:", JSON.stringify({
            ...response,
            data: {
                ...response.data,
                content: base64Content.substring(0, 50) + "..." // Truncate for log
            }
        }, null, 2))

        return response
    } catch (error) {
        console.error("Error retrieving SOW:", error)
        return { success: false, message: `Failed to retrieve SOW: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export async function checkEmployeeSowStatusAction(employeeId: string) {
    try {
        const db = await getDb()
        const result = await db.get(
            "SELECT id FROM employee_documents WHERE employee_id = ?",
            employeeId
        )
        return { success: true, exists: !!result }
    } catch (error) {
        // If the table doesn't exist yet, try to initialize it
        if (String(error).includes("no such table")) {
            console.log("Table employee_documents missing, initializing DB...")
            try {
                await initDb()
                // Retry the query
                const db = await getDb()
                const result = await db.get(
                    "SELECT id FROM employee_documents WHERE employee_id = ?",
                    employeeId
                )
                return { success: true, exists: !!result }
            } catch (retryError) {
                console.error("Error checking SOW status after init:", retryError)
                return { success: true, exists: false }
            }
        }
        console.error("Error checking SOW status:", error)
        return { success: false, message: "Failed to check SOW status" }
    }
}

export async function deleteEmployeeSowAction(employeeId: string) {
    try {
        const db = await getDb()
        await db.run("DELETE FROM employee_documents WHERE employee_id = ?", [employeeId])

        revalidatePath("/employee-list")
        return { success: true, message: "SOW deleted successfully" }
    } catch (error) {
        console.error("Error deleting SOW:", error)
        return {
            success: false,
            message: `Failed to delete SOW: ${error instanceof Error ? error.message : String(error)}`,
        }
    }
}
