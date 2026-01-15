
import { getDb } from "./lib/db"

async function debugRevenue() {
    const db = await getDb()
    const clientName = "TekisHub Consulting Services LLC"

    console.log(`Searching for payments from: ${clientName}`)

    const query = `
    SELECT 
      c.name as Client,
      i.invoice_number as Invoice,
      pd.payment_date as Date,
      pd.amount_paid as Amount
    FROM parties c
    JOIN invoices i ON c.id = i.client_id
    JOIN payment_details pd ON i.id = pd.invoice_id
    WHERE c.name = ?
    ORDER BY pd.payment_date
  `

    const results = await db.all(query, [clientName])

    console.table(results)

    const total = results.reduce((sum: number, row: any) => sum + row.Amount, 0)
    console.log(`Total: ${total}`)
}

debugRevenue()
