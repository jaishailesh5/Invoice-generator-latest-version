import { getDb, initDb, backupDatabase } from "./db"
import fs from "fs"
import path from "path"

// Database file path
const DATA_DIR = process.env.DB_PATH || path.join(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "invoice-generator.db")

export async function ensureDatabaseExists() {
  try {
    // Ensure the data directory exists with proper permissions
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Creating data directory: ${DATA_DIR}`)
      fs.mkdirSync(DATA_DIR, { recursive: true })
      // Set proper permissions (0o755 = rwxr-xr-x)
      fs.chmodSync(DATA_DIR, 0o755)
      console.log(`Data directory created successfully: ${DATA_DIR}`)
    }

    // Check if database file exists
    const dbExists = fs.existsSync(DB_PATH)
    console.log(`Database file ${dbExists ? "exists" : "does not exist"} at: ${DB_PATH}`)

    // If database exists, create a backup before initialization
    if (dbExists) {
      await backupDatabase()
    }

    // Check disk space
    try {
      // This is a simple check - write a small file to verify disk space
      const testFile = path.join(DATA_DIR, `disk-space-test-${Date.now()}.tmp`)
      // Write a 1MB file to test
      const testBuffer = Buffer.alloc(1024 * 1024)
      fs.writeFileSync(testFile, testBuffer)
      fs.unlinkSync(testFile)
      console.log(`Disk space check passed`)
    } catch (error) {
      console.error(`Disk space check failed:`, error)
      return {
        success: false,
        message: `Disk space check failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      }
    }

    // Initialize the database schema
    const result = await initDb()
    console.log("Database initialization result:", result)

    // Verify tables were created
    const db = await getDb()
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
    console.log("Tables in database:", tables.map((t) => t.name).join(", "))

    return {
      success: true,
      message: "Database initialized successfully",
      details: {
        dbPath: DB_PATH,
        tables: tables.map((t) => t.name),
      },
    }
  } catch (error) {
    console.error("Database initialization error:", error)
    return {
      success: false,
      message: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}
