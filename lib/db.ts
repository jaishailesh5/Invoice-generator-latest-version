import { type Database, open } from "sqlite"
import sqlite3 from "sqlite3"
import path from "path"
import fs from "fs"
import { cache } from "react"

// Set the correct database directory path based on the user's configuration
// Use the environment variable if set, otherwise use the specified path
const DATA_DIR = process.env.DB_PATH || path.join("c:/project/invoice-generator/app/data")

// Ensure the data directory exists with proper permissions
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating data directory: ${DATA_DIR}`)
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    // Set proper permissions (0o755 = rwxr-xr-x)
    fs.chmodSync(DATA_DIR, 0o755)
    console.log(`Data directory created successfully: ${DATA_DIR}`)
  } catch (error) {
    console.error(`Failed to create data directory: ${DATA_DIR}`, error)
  }
}

// Database file path
const DB_PATH = path.join(DATA_DIR, "invoice-generator.db")
const BACKUP_DIR = path.join(DATA_DIR, "backups")

// Log the database path for debugging
console.log(`Using SQLite database at: ${DB_PATH}`)

// Create a cached database connection
let dbPromise: Promise<Database> | null = null
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 3

// Function to create a backup of the database
export async function backupDatabase() {
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  // Only backup if the original file exists
  if (fs.existsSync(DB_PATH)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupPath = path.join(BACKUP_DIR, `invoice-generator-${timestamp}.db`)

    try {
      // Copy the database file
      fs.copyFileSync(DB_PATH, backupPath)
      console.log(`Database backed up to: ${backupPath}`)
      return { success: true, backupPath }
    } catch (error) {
      console.error(`Failed to backup database:`, error)
      return { success: false, error }
    }
  } else {
    console.log(`No database file to backup at: ${DB_PATH}`)
    return { success: false, reason: "No database file exists" }
  }
}

// Function to check if database file is corrupted and attempt recovery
async function checkAndRecoverDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`Database file does not exist at: ${DB_PATH}`)
    return { exists: false, corrupted: false }
  }

  try {
    // Try to open the database in read-only mode to check if it's corrupted
    const testDb = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    })

    // Try a simple query
    await testDb.get("SELECT 1")
    await testDb.close()

    return { exists: true, corrupted: false }
  } catch (error) {
    console.error(`Database appears to be corrupted:`, error)

    // Backup the corrupted file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const corruptedPath = path.join(BACKUP_DIR, `corrupted-${timestamp}.db`)

    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
      }

      fs.copyFileSync(DB_PATH, corruptedPath)
      console.log(`Corrupted database backed up to: ${corruptedPath}`)

      // Delete the corrupted file
      fs.unlinkSync(DB_PATH)
      console.log(`Removed corrupted database file`)

      return { exists: true, corrupted: true, backupPath: corruptedPath }
    } catch (backupError) {
      console.error(`Failed to backup corrupted database:`, backupError)
      return { exists: true, corrupted: true, backupError }
    }
  }
}

// Enhanced getDb function with better error handling and debugging
export const getDb = cache(async () => {
  if (!dbPromise) {
    console.log(`Initializing database connection to: ${DB_PATH}`)

    // Check for database corruption and recover if needed
    const dbStatus = await checkAndRecoverDatabase()
    if (dbStatus.corrupted) {
      console.log(`Detected and handled corrupted database. Will create a new one.`)
    }

    // Check if the database directory exists and is writable
    try {
      // Check if the directory is writable
      const testFile = path.join(DATA_DIR, `test-write-${Date.now()}.tmp`)
      fs.writeFileSync(testFile, "test")
      fs.unlinkSync(testFile)
      console.log(`Directory ${DATA_DIR} is writable`)
    } catch (error) {
      console.error(`Directory ${DATA_DIR} is not writable:`, error)

      // Try to fix permissions
      try {
        fs.chmodSync(DATA_DIR, 0o755)
        console.log(`Updated permissions on ${DATA_DIR}`)
      } catch (permError) {
        console.error(`Failed to update permissions:`, permError)
      }

      throw new Error(
        `Directory ${DATA_DIR} is not writable: ${error instanceof Error ? error.message : String(error)}`,
      )
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
      throw new Error(`Disk space check failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Initialize the database connection with verbose mode for debugging
    sqlite3.verbose()

    connectionAttempts++
    console.log(`Connection attempt ${connectionAttempts} of ${MAX_CONNECTION_ATTEMPTS}`)

    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    }).catch((error) => {
      console.error(`Failed to open database connection:`, error)
      dbPromise = null
      throw error
    })
  }

  try {
    // Test the connection by running a simple query
    const db = await dbPromise
    await db.get("SELECT 1")
    return db
  } catch (error) {
    console.error("Database connection test failed:", error)
    dbPromise = null
    throw error
  }
})

// Initialize database schema
export async function initDb() {
  console.log("Initializing database schema...")

  try {
    // Backup any existing database before initialization
    if (fs.existsSync(DB_PATH)) {
      await backupDatabase()
    }

    const db = await getDb()
    console.log("Database connection established successfully")

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        employee_number TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_joining TEXT,
        bill_rate REAL NOT NULL,
        pay_rate REAL NOT NULL,
        vendor_name TEXT,
        bill_to_party_id TEXT,
        status TEXT DEFAULT 'active',
        termination_date TEXT,
        employee_type TEXT DEFAULT 'W2-Employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_to_party_id) REFERENCES parties (id)
      );

      CREATE TABLE IF NOT EXISTS employee_referrals (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        referral_id TEXT NOT NULL,
        fee REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (referral_id) REFERENCES parties (id)
      );

      CREATE TABLE IF NOT EXISTS monthly_hours (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        month_year TEXT NOT NULL,
        hours REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        UNIQUE(employee_id, month_year)
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        payment_terms TEXT,
        vendor_id TEXT,
        client_id TEXT,
        employee_id TEXT NOT NULL,
        service_for TEXT,
        period_month TEXT,
        period_start TEXT,
        period_end TEXT,
        hours REAL NOT NULL,
        bill_rate REAL NOT NULL,
        total_bill_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES parties (id),
        FOREIGN KEY (client_id) REFERENCES parties (id),
        FOREIGN KEY (employee_id) REFERENCES employees (id)
      );

      CREATE TABLE IF NOT EXISTS payment_details (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        amount_paid REAL DEFAULT 0,
        employee_payment_amount REAL DEFAULT 0,
        payment_date TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      );

      CREATE TABLE IF NOT EXISTS referral_payments (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        referral_id TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payment_details (id),
        FOREIGN KEY (referral_id) REFERENCES parties (id)
      );

      CREATE TABLE IF NOT EXISTS employee_documents (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_content BLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        UNIQUE(employee_id)
      );
    `)

    // Verify tables were created
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
    console.log("Tables in database:", tables.map((t) => t.name).join(", "))

    console.log("Database schema initialized successfully")
    return { success: true, message: "Database initialized successfully" }
  } catch (error) {
    console.error("Database initialization error:", error)
    return {
      success: false,
      message: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}

// Helper function to generate a unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// Function to reset the database connection
export function resetDbConnection() {
  dbPromise = null
  connectionAttempts = 0
  console.log("Database connection reset")
}

// Function to test database connection
export async function testDbConnection() {
  try {
    console.log("Testing database connection...")

    // Check if the database directory exists and is writable
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Creating data directory: ${DATA_DIR}`)
      fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.chmodSync(DATA_DIR, 0o755)
    }

    // Try to get a database connection
    const db = await getDb()

    // Try a simple query
    const result = await db.get("SELECT sqlite_version() as version")
    console.log("Database connection test successful:", result)

    return {
      success: true,
      message: "Database connection successful",
      version: result?.version,
      path: DB_PATH,
    }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return {
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
      path: DB_PATH,
    }
  }
}

// Function to repair database
export async function repairDatabase() {
  try {
    console.log("Attempting database repair...")

    // First, backup the current database if it exists
    if (fs.existsSync(DB_PATH)) {
      await backupDatabase()
    }

    // Reset the connection
    resetDbConnection()

    // If the file exists but is corrupted, remove it
    if (fs.existsSync(DB_PATH)) {
      try {
        fs.unlinkSync(DB_PATH)
        console.log("Removed potentially corrupted database file")
      } catch (error) {
        console.error("Failed to remove database file:", error)
      }
    }

    // Reinitialize the database
    const result = await initDb()

    return {
      success: result.success,
      message: result.success
        ? "Database successfully repaired and reinitialized"
        : `Database repair failed: ${result.message}`,
      details: result,
    }
  } catch (error) {
    console.error("Database repair failed:", error)
    return {
      success: false,
      message: `Database repair failed: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}
