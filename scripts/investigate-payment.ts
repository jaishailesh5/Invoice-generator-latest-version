import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

async function investigate() {
    try {
        const DB_PATH = "/app/data/invoice-generator.db"
        const year = 2025
        const namePart = "Reagan"

        console.log(`Investigating payments for employee matching "${namePart}" in ${year} using DB at ${DB_PATH}...`)

        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        })

        // 1. Find Employee
        const employees = await db.all(`
        SELECT * FROM employees 
        WHERE last_name LIKE ? OR first_name LIKE ?
    `, [`%${namePart}%`, `%${namePart}%`])

        if (employees.length === 0) {
            console.log("No employee found.")
            return
        }

        const employee = employees[0]
        console.log(`Found Employee: ${employee.first_name} ${employee.last_name} (ID: ${employee.id})`)

        // 2. Get Invoices
        const invoices = await db.all(`
        SELECT 
            i.id, i.invoice_number, i.date, i.period_start, i.period_end, i.hours, i.total_bill_amount, i.status
        FROM invoices i
        WHERE i.employee_id = ?
    `, [employee.id])

        console.log(`\nFound ${invoices.length} invoices for this employee:`)

        // 3. Get Payments
        let totalPaidInYear = 0
        for (const inv of invoices) {
            const payments = await db.all(`
            SELECT * FROM payment_details WHERE invoice_id = ?
        `, [inv.id])

            console.log(`\nInvoice ${inv.invoice_number} (Status: ${inv.status})`)
            console.log(`  Period: ${inv.period_start} to ${inv.period_end}`)
            console.log(`  Hours: ${inv.hours}, Billed: ${inv.total_bill_amount}`)

            if (payments.length === 0) {
                console.log("  No payments recorded.")
            } else {
                payments.forEach(p => {
                    const isMatch = p.payment_date && p.payment_date.startsWith(year.toString())
                    if (isMatch) totalPaidInYear += (p.employee_payment_amount || 0)

                    console.log(`    - Date: ${p.payment_date} | Amount: $${p.employee_payment_amount} ${isMatch ? '[INCLUDED]' : '[EXCLUDED]'}`)
                })
            }
        }

        console.log(`\nTotal Calculated for Report ${year}: $${totalPaidInYear}`)

    } catch (error) {
        console.error("Investigation failed:", error)
    }
}

investigate()
