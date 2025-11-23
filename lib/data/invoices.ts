import { getDb, generateId } from "@/lib/db"

export type Invoice = {
  id: string
  invoice_number: string
  date: string
  payment_terms?: string
  vendor_id?: string
  client_id?: string
  employee_id: string
  service_for?: string
  period_month?: string
  period_start?: string
  period_end?: string
  hours: number
  bill_rate: number
  total_bill_amount: number
  status: "pending" | "paid" | "cancelled"
  created_at?: string
  updated_at?: string
}

export type InvoiceWithDetails = Invoice & {
  vendor_name?: string
  client_name?: string
  employee_name?: string
  employee_default_pay_rate?: number
  payment_details?: {
    id: string
    amount_paid: number
    employee_payment_amount: number
    payment_date?: string
    notes?: string
    referral_payments?: Array<{
      id: string
      referral_id: string
      referral_name: string
      amount: number
    }>
  }
}

// Helper function to handle decimal precision
function toFixedNumber(num: number, decimals = 2): number {
  return Number(Number(num).toFixed(decimals))
}

export async function getInvoices(): Promise<InvoiceWithDetails[]> {
  const db = await getDb()

  try {
    // Debug log - Check SQL query for invoices
    console.log("DEBUG - Running getInvoices SQL query")

    // Get all invoices with related entity names
    const invoices = await db.all<InvoiceWithDetails[]>(`
      SELECT 
        i.*,
        v.name as vendor_name,
        c.name as client_name,
        (e.first_name || ' ' || e.last_name) as employee_name,
        e.pay_rate as employee_default_pay_rate
      FROM invoices i
      LEFT JOIN parties v ON i.vendor_id = v.id
      LEFT JOIN parties c ON i.client_id = c.id
      LEFT JOIN employees e ON i.employee_id = e.id
      ORDER BY i.date DESC
    `)

    console.log(
      "DEBUG - Invoices SQL result sample:",
      invoices.length > 0
        ? {
            id: invoices[0].id,
            invoice_number: invoices[0].invoice_number,
            employee_default_pay_rate: invoices[0].employee_default_pay_rate,
            bill_rate: invoices[0].bill_rate,
          }
        : "No invoices found",
    )

    // Get payment details for each invoice
    for (const invoice of invoices) {
      // Ensure numeric values have proper precision
      invoice.bill_rate = toFixedNumber(invoice.bill_rate)
      invoice.total_bill_amount = toFixedNumber(invoice.total_bill_amount)
      if (invoice.employee_default_pay_rate) {
        invoice.employee_default_pay_rate = toFixedNumber(invoice.employee_default_pay_rate)
      }

      const paymentDetails = await db.get(
        `
        SELECT * FROM payment_details WHERE invoice_id = ?
      `,
        [invoice.id],
      )

      if (paymentDetails) {
        // Get referral payments
        const referralPayments = await db.all(
          `
          SELECT rp.*, p.name as referral_name
          FROM referral_payments rp
          JOIN parties p ON rp.referral_id = p.id
          WHERE rp.payment_id = ?
        `,
          [paymentDetails.id],
        )

        invoice.payment_details = {
          id: paymentDetails.id,
          amount_paid: toFixedNumber(paymentDetails.amount_paid),
          employee_payment_amount: toFixedNumber(paymentDetails.employee_payment_amount),
          payment_date: paymentDetails.payment_date,
          notes: paymentDetails.notes,
          referral_payments: referralPayments.map((rp) => ({
            id: rp.id,
            referral_id: rp.referral_id,
            referral_name: rp.referral_name,
            amount: toFixedNumber(rp.amount),
          })),
        }
      }
    }

    return invoices
  } catch (error) {
    console.error("Error fetching invoices:", error)
    throw new Error(`Failed to fetch invoices: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getInvoiceById(id: string): Promise<InvoiceWithDetails | null> {
  const db = await getDb()

  try {
    console.log(`DEBUG - Running getInvoiceById SQL query for ID: ${id}`)

    // Get invoice with related entity names
    const invoice = await db.get<InvoiceWithDetails>(
      `
      SELECT 
        i.*,
        v.name as vendor_name,
        c.name as client_name,
        (e.first_name || ' ' || e.last_name) as employee_name,
        e.pay_rate as employee_default_pay_rate
      FROM invoices i
      LEFT JOIN parties v ON i.vendor_id = v.id
      LEFT JOIN parties c ON i.client_id = c.id
      LEFT JOIN employees e ON i.employee_id = e.id
      WHERE i.id = ?
    `,
      [id],
    )

    if (!invoice) {
      console.log(`DEBUG - No invoice found with ID: ${id}`)
      return null
    }

    console.log("DEBUG - Invoice SQL result:", {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      employee_default_pay_rate: invoice.employee_default_pay_rate,
      bill_rate: invoice.bill_rate,
    })

    // Ensure numeric values have proper precision
    invoice.bill_rate = toFixedNumber(invoice.bill_rate)
    invoice.total_bill_amount = toFixedNumber(invoice.total_bill_amount)
    if (invoice.employee_default_pay_rate) {
      invoice.employee_default_pay_rate = toFixedNumber(invoice.employee_default_pay_rate)
    }

    // Get payment details
    const paymentDetails = await db.get(
      `
      SELECT * FROM payment_details WHERE invoice_id = ?
    `,
      [id],
    )

    if (paymentDetails) {
      // Get referral payments
      const referralPayments = await db.all(
        `
        SELECT rp.*, p.name as referral_name
        FROM referral_payments rp
        JOIN parties p ON rp.referral_id = p.id
        WHERE rp.payment_id = ?
      `,
        [paymentDetails.id],
      )

      invoice.payment_details = {
        id: paymentDetails.id,
        amount_paid: toFixedNumber(paymentDetails.amount_paid),
        employee_payment_amount: toFixedNumber(paymentDetails.employee_payment_amount),
        payment_date: paymentDetails.payment_date,
        notes: paymentDetails.notes,
        referral_payments: referralPayments.map((rp) => ({
          id: rp.id,
          referral_id: rp.referral_id,
          referral_name: rp.referral_name,
          amount: toFixedNumber(rp.amount),
        })),
      }
    }

    return invoice
  } catch (error) {
    console.error(`Error fetching invoice ${id}:`, error)
    throw new Error(`Failed to fetch invoice: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function createInvoice(
  invoice: Omit<Invoice, "created_at" | "updated_at">,
  paymentDetails?: {
    amount_paid: number
    employee_payment_amount: number
    payment_date?: string
    notes?: string
    referral_payments?: Array<{
      referral_id: string
      amount: number
    }>
  },
): Promise<{ id: string }> {
  const db = await getDb()

  try {
    await db.exec("BEGIN TRANSACTION")

    const invoiceId = invoice.id || generateId()

    // Ensure numeric values have proper precision
    const bill_rate = toFixedNumber(invoice.bill_rate)
    const total_bill_amount = toFixedNumber(invoice.total_bill_amount)

    // Log the SQL parameters for debugging
    console.log("Creating invoice with parameters:", {
      id: invoiceId,
      invoice_number: invoice.invoice_number,
      date: invoice.date,
      payment_terms: invoice.payment_terms || "Net 30",
      vendor_id: invoice.vendor_id || null,
      client_id: invoice.client_id || null,
      employee_id: invoice.employee_id,
      service_for: invoice.service_for || "Consulting Services",
      period_month: invoice.period_month || null,
      period_start: invoice.period_start || null,
      period_end: invoice.period_end || null,
      hours: invoice.hours,
      bill_rate: bill_rate,
      total_bill_amount: total_bill_amount,
      status: invoice.status || "pending",
    })

    // Insert invoice - REMOVED pay_rate field from the SQL query
    await db.run(
      `
      INSERT INTO invoices (
        id, invoice_number, date, payment_terms,
        vendor_id, client_id, employee_id, service_for,
        period_month, period_start, period_end, hours,
        bill_rate, total_bill_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        invoiceId,
        invoice.invoice_number,
        invoice.date,
        invoice.payment_terms || "Net 30",
        invoice.vendor_id || null,
        invoice.client_id || null,
        invoice.employee_id,
        invoice.service_for || "Consulting Services",
        invoice.period_month || null,
        invoice.period_start || null,
        invoice.period_end || null,
        invoice.hours,
        bill_rate,
        total_bill_amount,
        invoice.status || "pending",
      ],
    )

    // Insert payment details if provided
    if (paymentDetails) {
      const paymentId = generateId()

      // Ensure numeric values have proper precision
      const amount_paid = toFixedNumber(paymentDetails.amount_paid)
      const employee_payment_amount = toFixedNumber(paymentDetails.employee_payment_amount)

      await db.run(
        `
        INSERT INTO payment_details (
          id, invoice_id, amount_paid, employee_payment_amount,
          payment_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          paymentId,
          invoiceId,
          amount_paid,
          employee_payment_amount,
          paymentDetails.payment_date || null,
          paymentDetails.notes || null,
        ],
      )

      // Insert referral payments if provided
      if (paymentDetails.referral_payments && paymentDetails.referral_payments.length > 0) {
        for (const payment of paymentDetails.referral_payments) {
          await db.run(
            `
            INSERT INTO referral_payments (id, payment_id, referral_id, amount)
            VALUES (?, ?, ?, ?)
          `,
            [generateId(), paymentId, payment.referral_id, toFixedNumber(payment.amount)],
          )
        }
      }
    }

    await db.exec("COMMIT")

    return { id: invoiceId }
  } catch (error) {
    await db.exec("ROLLBACK")
    console.error("Error creating invoice:", error)
    throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// In the updateInvoice function, ensure we properly handle status updates

// Find the section where we update the invoice and make sure we're handling status appropriately
export async function updateInvoice(
  id: string,
  updates: Partial<Omit<Invoice, "id" | "created_at" | "updated_at">>,
  paymentDetails?: {
    amount_paid: number
    employee_payment_amount: number
    payment_date?: string
    notes?: string
    referral_payments?: Array<{
      referral_id: string
      amount: number
    }>
  },
): Promise<{ id: string }> {
  const db = await getDb()

  try {
    await db.exec("BEGIN TRANSACTION")

    // Get the current invoice
    const currentInvoice = await getInvoiceById(id)

    console.log(`updateInvoice: Current invoice status: ${currentInvoice?.status}, updating to: ${updates.status}`)

    // Ensure numeric values have proper precision
    if (updates.bill_rate !== undefined) {
      updates.bill_rate = toFixedNumber(updates.bill_rate)
    }
    if (updates.total_bill_amount !== undefined) {
      updates.total_bill_amount = toFixedNumber(updates.total_bill_amount)
    }

    // Build update query for invoice
    const fields = Object.keys(updates).filter((key) => updates[key] !== undefined)

    console.log(`updateInvoice: Fields to update: ${fields.join(", ")}`)

    if (fields.length > 0) {
      const setClause = fields.map((field) => `${field} = ?`).join(", ")
      const values = fields.map((field) => updates[field])

      console.log(`updateInvoice: Update SQL clause: ${setClause}`)
      console.log(`updateInvoice: Update values:`, values)

      await db.run(
        `
        UPDATE invoices 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
        [...values, id],
      )
    }

    // Update payment details if provided
    if (paymentDetails) {
      // Ensure numeric values have proper precision
      const amount_paid = toFixedNumber(paymentDetails.amount_paid)
      const employee_payment_amount = toFixedNumber(paymentDetails.employee_payment_amount)

      console.log(`updateInvoice: Payment details - paid: ${amount_paid}, employee: ${employee_payment_amount}`)

      // Check if payment details already exist
      const existingPayment = await db.get(
        `
        SELECT id FROM payment_details WHERE invoice_id = ?
      `,
        [id],
      )

      if (existingPayment) {
        // Update existing payment details
        await db.run(
          `
          UPDATE payment_details
          SET amount_paid = ?, employee_payment_amount = ?, payment_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
          [
            amount_paid,
            employee_payment_amount,
            paymentDetails.payment_date || null,
            paymentDetails.notes || null,
            existingPayment.id,
          ],
        )

        console.log(`updateInvoice: Updated existing payment details id: ${existingPayment.id}`)

        // Delete existing referral payments
        await db.run(
          `
          DELETE FROM referral_payments WHERE payment_id = ?
        `,
          [existingPayment.id],
        )

        // Insert new referral payments
        if (paymentDetails.referral_payments && paymentDetails.referral_payments.length > 0) {
          for (const payment of paymentDetails.referral_payments) {
            await db.run(
              `
              INSERT INTO referral_payments (id, payment_id, referral_id, amount)
              VALUES (?, ?, ?, ?)
            `,
              [generateId(), existingPayment.id, payment.referral_id, toFixedNumber(payment.amount)],
            )
          }
          console.log(`updateInvoice: Added ${paymentDetails.referral_payments.length} referral payments`)
        }
      } else {
        // Insert new payment details
        const paymentId = generateId()

        await db.run(
          `
          INSERT INTO payment_details (
            id, invoice_id, amount_paid, employee_payment_amount,
            payment_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            paymentId,
            id,
            amount_paid,
            employee_payment_amount,
            paymentDetails.payment_date || null,
            paymentDetails.notes || null,
          ],
        )

        console.log(`updateInvoice: Created new payment details with id: ${paymentId}`)

        // Insert referral payments
        if (paymentDetails.referral_payments && paymentDetails.referral_payments.length > 0) {
          for (const payment of paymentDetails.referral_payments) {
            await db.run(
              `
              INSERT INTO referral_payments (id, payment_id, referral_id, amount)
              VALUES (?, ?, ?, ?)
            `,
              [generateId(), paymentId, payment.referral_id, toFixedNumber(payment.amount)],
            )
          }
          console.log(`updateInvoice: Added ${paymentDetails.referral_payments.length} referral payments`)
        }
      }

      // If we have payment details but no status update, set status to "paid"
      if (!updates.status && amount_paid > 0) {
        console.log(`updateInvoice: Automatically setting status to "paid" based on payment details`)
        await db.run(`UPDATE invoices SET status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id])
      }
    }

    await db.exec("COMMIT")

    // Verify the update worked by fetching the invoice again
    const updatedInvoice = await getInvoiceById(id)
    console.log(`updateInvoice: After update, invoice status is: ${updatedInvoice?.status}`)

    return { id }
  } catch (error) {
    await db.exec("ROLLBACK")
    console.error(`Error updating invoice ${id}:`, error)
    throw new Error(`Failed to update invoice: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Find the deleteInvoice function and replace it with this improved version
export async function deleteInvoice(id: string) {
  const db = await getDb()

  try {
    await db.exec("BEGIN TRANSACTION")

    console.log(`Starting deletion process for invoice ID: ${id}`)

    // Get payment details
    const paymentDetails = await db.get(
      `
      SELECT id FROM payment_details WHERE invoice_id = ?
    `,
      [id],
    )

    if (paymentDetails) {
      console.log(`Found payment details with ID: ${paymentDetails.id}, deleting related records`)

      // Delete referral payments
      const deleteReferralResult = await db.run(
        `
        DELETE FROM referral_payments WHERE payment_id = ?
      `,
        [paymentDetails.id],
      )
      console.log(`Deleted ${deleteReferralResult.changes} referral payment records`)

      // Delete payment details
      const deletePaymentResult = await db.run(
        `
        DELETE FROM payment_details WHERE id = ?
      `,
        [paymentDetails.id],
      )
      console.log(`Deleted ${deletePaymentResult.changes} payment detail records`)
    } else {
      console.log(`No payment details found for invoice ID: ${id}`)
    }

    // Delete invoice
    const deleteInvoiceResult = await db.run(
      `
      DELETE FROM invoices WHERE id = ?
    `,
      [id],
    )

    console.log(`Deleted ${deleteInvoiceResult.changes} invoice records with ID: ${id}`)

    if (deleteInvoiceResult.changes === 0) {
      console.log(`Warning: No invoice found with ID: ${id}`)
    }

    await db.exec("COMMIT")
    console.log(`Transaction committed successfully for invoice ID: ${id}`)

    return { success: true, deletedCount: deleteInvoiceResult.changes }
  } catch (error) {
    await db.exec("ROLLBACK")
    console.error(`Error deleting invoice ${id}:`, error)
    throw new Error(`Failed to delete invoice: ${error instanceof Error ? error.message : String(error)}`)
  }
}
