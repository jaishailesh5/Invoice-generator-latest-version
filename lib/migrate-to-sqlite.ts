import { getDb as getDatabase, generateId } from "./db"

export async function migrateFromLocalStorage() {
  const db = await getDatabase()

  try {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      console.log("Not in browser environment, skipping migration")
      return { success: false, message: "Not in browser environment" }
    }

    // Start transaction
    await db.exec("BEGIN TRANSACTION")

    // Migrate parties
    const partiesJson = localStorage.getItem("parties")
    if (partiesJson) {
      const parties = JSON.parse(partiesJson)
      for (const party of parties) {
        await db.run(`INSERT OR IGNORE INTO parties (id, name, address, type) VALUES (?, ?, ?, ?)`, [
          party.id,
          party.name,
          party.address,
          party.type,
        ])
      }
      console.log(`Migrated ${parties.length} parties`)
    }

    // Migrate employees
    const employeesJson = localStorage.getItem("employees")
    if (employeesJson) {
      const employees = JSON.parse(employeesJson)
      for (const employee of employees) {
        await db.run(
          `INSERT OR IGNORE INTO employees 
           (id, employee_number, first_name, last_name, date_of_joining, bill_rate, pay_rate, 
            vendor_name, bill_to_party_id, status, termination_date, employee_type) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employee.id,
            employee.employeeNumber || null,
            employee.firstName,
            employee.lastName,
            employee.dateOfJoining || null,
            employee.billRate,
            employee.payRate,
            employee.vendorName || null,
            employee.billToPartyId || null,
            employee.status || "active",
            employee.terminationDate || null,
            employee.employeeType || "W2-Employee",
          ],
        )

        // Migrate employee referrals
        if (employee.referrals && Array.isArray(employee.referrals)) {
          for (const referral of employee.referrals) {
            await db.run(
              `INSERT OR IGNORE INTO employee_referrals (id, employee_id, referral_id, fee) VALUES (?, ?, ?, ?)`,
              [generateId(), employee.id, referral.id, referral.fee],
            )
          }
        }
      }
      console.log(`Migrated ${employees.length} employees`)
    }

    // Migrate monthly hours
    const monthlyHoursJson = localStorage.getItem("monthlyHours")
    if (monthlyHoursJson) {
      const monthlyHours = JSON.parse(monthlyHoursJson)
      for (const monthYear in monthlyHours) {
        const employeeHours = monthlyHours[monthYear]
        for (const employeeId in employeeHours) {
          const hours = employeeHours[employeeId]
          await db.run(`INSERT OR IGNORE INTO monthly_hours (id, employee_id, month_year, hours) VALUES (?, ?, ?, ?)`, [
            generateId(),
            employeeId,
            monthYear,
            hours,
          ])
        }
      }
      console.log(`Migrated monthly hours`)
    }

    // Migrate invoices
    const invoicesJson = localStorage.getItem("invoices")
    if (invoicesJson) {
      const invoices = JSON.parse(invoicesJson)
      for (const invoice of invoices) {
        // Find vendor and client IDs
        let vendorId = null
        let clientId = null

        if (invoice.vendor && invoice.vendor.name) {
          const vendor = await db.get(`SELECT id FROM parties WHERE name = ? AND type = 'vendor' LIMIT 1`, [
            invoice.vendor.name,
          ])
          vendorId = vendor ? vendor.id : null
        }

        if (invoice.billTo && invoice.billTo.name) {
          const client = await db.get(`SELECT id FROM parties WHERE name = ? AND type = 'client' LIMIT 1`, [
            invoice.billTo.name,
          ])
          clientId = client ? client.id : null
        }

        const invoiceId = invoice.id || generateId()

        await db.run(
          `INSERT OR IGNORE INTO invoices 
           (id, invoice_number, date, payment_terms, vendor_id, client_id, employee_id, 
            service_for, period_month, period_start, period_end, hours, bill_rate, 
            total_bill_amount, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            invoice.invoiceNumber,
            invoice.date,
            invoice.paymentTerms || "Net 30",
            vendorId,
            clientId,
            invoice.employee?.id || null,
            invoice.serviceFor || "Consulting Services",
            invoice.period?.month || null,
            invoice.period?.start || null,
            invoice.period?.end || null,
            invoice.hours || 0,
            invoice.billRate || 0,
            invoice.totalBillAmount || 0,
            invoice.status || "pending",
          ],
        )

        // Migrate payment details
        if (invoice.paymentDetails) {
          const paymentId = generateId()

          await db.run(
            `INSERT OR IGNORE INTO payment_details 
             (id, invoice_id, amount_paid, employee_payment_amount, payment_date, notes) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              paymentId,
              invoiceId,
              invoice.paymentDetails.amountPaid || 0,
              invoice.paymentDetails.employeePaymentAmount || 0,
              invoice.paymentDetails.paymentDate || null,
              invoice.paymentDetails.notes || null,
            ],
          )

          // Migrate referral payments
          if (invoice.paymentDetails.referralPayments && Array.isArray(invoice.paymentDetails.referralPayments)) {
            for (const payment of invoice.paymentDetails.referralPayments) {
              await db.run(
                `INSERT OR IGNORE INTO referral_payments (id, payment_id, referral_id, amount) VALUES (?, ?, ?, ?)`,
                [generateId(), paymentId, payment.referralId, payment.amount],
              )
            }
          }
        }
      }
      console.log(`Migrated ${invoices.length} invoices`)
    }

    // Commit transaction
    await db.exec("COMMIT")

    return { success: true, message: "Migration completed successfully" }
  } catch (error) {
    // Rollback transaction on error
    await db.exec("ROLLBACK")
    console.error("Migration error:", error)
    return { success: false, message: `Migration failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

import { type Database, open } from "sqlite"
import sqlite3 from "sqlite3"
import path from "path"
import fs from "fs"
import { cache } from "react"

// Ensure the data directory exists
const DATA_DIR = process.env.DB_PATH || path.join(process.cwd(), "data")
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Database file path
const DB_PATH = path.join(DATA_DIR, "invoice-generator.db")

// Log the database path for debugging
console.log(`Using SQLite database at: ${DB_PATH}`)

// Create a cached database connection
let dbPromise: Promise<Database> | null = null

export const getDb = cache(async () => {
  if (!dbPromise) {
    console.log(`Initializing database connection to: ${DB_PATH}`)
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    })
  }
  return dbPromise
})

// Initialize database schema
export async function initDb() {
  console.log("Initializing database schema...")
  const db = await getDb()

  try {
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
    `)

    console.log("Database schema initialized successfully")
    return { success: true, message: "Database initialized successfully" }
  } catch (error) {
    console.error("Database initialization error:", error)
    return {
      success: false,
      message: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
