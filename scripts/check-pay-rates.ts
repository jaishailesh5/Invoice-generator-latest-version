import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function checkPayRates() {
    try {
        const DB_PATH = "/app/data/invoice-generator.db"

        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        })

        console.log("Checking Employee Pay Rates...")

        const employees = await db.all(`
        SELECT id, first_name, last_name, pay_rate 
        FROM employees
        ORDER BY pay_rate ASC
    `)

        console.log(`Found ${employees.length} employees.`)
        console.table(employees)

        const zeroRate = employees.filter(e => e.pay_rate === 0)
        console.log(`\nEmployees with Pay Rate = 0: ${zeroRate.length}`)

    } catch (error) {
        console.error("Check failed:", error)
    }
}

checkPayRates()
