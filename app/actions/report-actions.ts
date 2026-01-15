"use server"

import { getDb } from "@/lib/db"

export interface PaymentReportItem {
    id: string
    first_name: string
    last_name: string
    employee_number: string | null
    total_paid: number
}

export async function getPaymentReport(year: number): Promise<PaymentReportItem[]> {
    try {
        const db = await getDb()

        // Using strftime to extract year from payment_date
        // payment_date format is expected to be YYYY-MM-DD or similar standard format stored in SQLite
        const query = `
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
      HAVING total_paid > 0
      ORDER BY e.last_name, e.first_name
    `

        const results = await db.all(query, [year.toString()])

        return results as PaymentReportItem[]
    } catch (error) {
        console.error("Error fetching payment report:", error)
        throw new Error("Failed to fetch payment report")
    }
}

export interface ClientRevenueItem {
    id: string
    name: string
    total_received: number
}

export async function getClientRevenueReport(year: number): Promise<ClientRevenueItem[]> {
    try {
        const db = await getDb()

        const query = `
      SELECT
        c.id,
        c.name,
        COALESCE(SUM(pd.amount_paid), 0) as total_received
      FROM parties c
      JOIN invoices i ON c.id = i.client_id
      JOIN payment_details pd ON i.id = pd.invoice_id
      WHERE strftime('%Y', pd.payment_date) = ? AND i.status != 'pending'
      GROUP BY c.id
      HAVING total_received > 0
      ORDER BY c.name
    `

        const results = await db.all(query, [year.toString()])

        return results as ClientRevenueItem[]
    } catch (error) {
        console.error("Error fetching client revenue report:", error)
        throw new Error("Failed to fetch client revenue report")
    }
}
