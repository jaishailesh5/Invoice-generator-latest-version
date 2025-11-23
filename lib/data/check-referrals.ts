import { getDb } from "@/lib/db"

export async function checkReferralsTable() {
  const db = await getDb()

  try {
    // Check if the employee_referrals table exists
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_referrals'")

    if (!tableExists) {
      console.log("Creating employee_referrals table...")
      await db.exec(`
        CREATE TABLE IF NOT EXISTS employee_referrals (
          id TEXT PRIMARY KEY,
          employee_id TEXT NOT NULL,
          referral_id TEXT NOT NULL,
          fee REAL NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees (id),
          FOREIGN KEY (referral_id) REFERENCES parties (id)
        );
      `)
      console.log("employee_referrals table created successfully")
    } else {
      console.log("employee_referrals table already exists")
    }

    // Count records in the table
    const count = await db.get("SELECT COUNT(*) as count FROM employee_referrals")
    console.log(`employee_referrals table has ${count.count} records`)

    return {
      success: true,
      exists: !!tableExists,
      count: count.count,
    }
  } catch (error) {
    console.error("Error checking employee_referrals table:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
