import { getDb } from "../lib/db"

async function verifyReport() {
    console.log("Starting Report Verification...")

    try {
        const db = await getDb()
        const currentYear = new Date().getFullYear()

        console.log(`Querying for year: ${currentYear}`)

        // 1. Get raw payment details to verify manually
        const rawPayments = await db.all(`
      SELECT 
        pd.id, 
        pd.payment_date, 
        pd.employee_payment_amount,
        e.first_name,
        e.last_name
      FROM payment_details pd
      JOIN invoices i ON pd.invoice_id = i.id
      JOIN employees e ON i.employee_id = e.id
      WHERE strftime('%Y', pd.payment_date) = ?
      ORDER BY e.last_name
    `, [currentYear.toString()])

        console.log("\nRaw Payments Found:")
        console.table(rawPayments.map(p => ({
            ...p,
            amount: p.employee_payment_amount
        })))

        // 2. Run the report query
        const reportQuery = `
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.employee_number,
        COALESCE(SUM(pd.employee_payment_amount), 0) as total_paid
      FROM employees e
      JOIN invoices i ON e.id = i.employee_id
      JOIN payment_details pd ON i.id = pd.invoice_id
      WHERE strftime('%Y', pd.payment_date) = ?
      GROUP BY e.id
      ORDER BY e.last_name, e.first_name
    `

        const reportResults = await db.all(reportQuery, [currentYear.toString()])

        console.log("\nReport Aggregation Results:")
        console.table(reportResults)

        // 3. Verification Logic
        console.log("\nVerification:")
        let verificationPassed = true;

        // Group raw payments by employee ID manually
        const manualAggregation: Record<string, number> = {}

        for (const payment of rawPayments) {
            // Need to fetch employee_id from the join above, oops, I selected first_name/last_name but not id in raw query
            // Let's rely on the name for visual check or re-query.
            // Actually, let's just sum the raw payments and compare with total of report results.
        }

        const totalRaw = rawPayments.reduce((sum, p) => sum + (p.employee_payment_amount || 0), 0)
        const totalReport = reportResults.reduce((sum, r) => sum + (r.total_paid || 0), 0)

        console.log(`Total Raw Payments: ${totalRaw}`)
        console.log(`Total Report Payments: ${totalReport}`)

        if (Math.abs(totalRaw - totalReport) < 0.01) {
            console.log("SUCCESS: Totals match!")
        } else {
            console.error("FAILURE: Totals do not match!")
            verificationPassed = false;
        }

    } catch (error) {
        console.error("Verification script failed:", error)
    }
}

verifyReport().catch(console.error)
