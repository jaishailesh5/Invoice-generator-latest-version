"use server"

import { getDb, generateId } from "@/lib/db"
import { createInvoice, deleteInvoice as deleteInvoiceDb, updateInvoice } from "@/lib/data/invoices"
import { initDb } from "@/lib/db"

// Transform client-side invoice to database format
function transformInvoiceForDb(invoice: any) {
  console.log("Transforming invoice for DB:", invoice)

  // Ensure we have all required fields
  if (!invoice.invoiceNumber) {
    throw new Error("Invoice number is required")
  }

  if (!invoice.employee?.id) {
    throw new Error("Employee ID is required")
  }

  return {
    id: invoice.id || generateId(),
    invoice_number: invoice.invoiceNumber,
    date: invoice.date,
    payment_terms: invoice.paymentTerms || null,
    vendor_id: invoice.vendor?.id || null,
    client_id: invoice.billTo?.id || null,
    employee_id: invoice.employee.id,
    service_for: invoice.serviceFor || null,
    period_month: invoice.period?.month || null,
    period_start: invoice.period?.start || null,
    period_end: invoice.period?.end || null,
    hours: invoice.hours || 0,
    bill_rate: invoice.billRate || 0,
    total_bill_amount: invoice.totalBillAmount || 0,
    status: invoice.status || "pending",
  }
}

// Check if the invoices table exists
async function ensureInvoicesTableExists() {
  try {
    const db = await getDb()
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'")

    if (!tableCheck) {
      console.log("Invoices table does not exist, initializing database...")
      const initResult = await initDb()
      if (!initResult.success) {
        throw new Error(`Failed to initialize database: ${initResult.message}`)
      }
      console.log("Database initialized successfully")
    } else {
      console.log("Invoices table exists")
    }
    return true
  } catch (error) {
    console.error("Error checking/creating invoices table:", error)
    throw new Error(`Failed to ensure invoices table exists: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Save a single invoice to the database
export async function saveInvoiceToDbAction(invoice: any) {
  console.log("Saving invoice to DB:", invoice)

  try {
    // Ensure the invoices table exists
    await ensureInvoicesTableExists()

    const dbInvoice = transformInvoiceForDb(invoice)
    console.log("Transformed invoice:", dbInvoice)

    // Extract payment details if present
    const paymentDetails = invoice.paymentDetails
      ? {
          amount_paid: invoice.paymentDetails.amountPaid || 0,
          employee_payment_amount: invoice.paymentDetails.employeePaymentAmount || 0,
          payment_date: invoice.paymentDetails.paymentDate || null,
          notes: invoice.paymentDetails.notes || null,
          referral_payments:
            invoice.paymentDetails.referralPayments?.map((payment: any) => ({
              referral_id: payment.id,
              amount: payment.amount,
            })) || [],
        }
      : undefined

    const result = await createInvoice(dbInvoice, paymentDetails)
    console.log("Invoice save result:", result)

    return { success: true, message: "Invoice saved successfully", invoiceId: result.id }
  } catch (error) {
    console.error("Error saving invoice:", error)

    // Check for specific error types
    let errorMessage = "Failed to save invoice"

    if (error instanceof Error) {
      errorMessage = error.message

      // Handle foreign key constraint errors
      if (errorMessage.includes("FOREIGN KEY constraint failed")) {
        if (errorMessage.includes("employee_id")) {
          errorMessage =
            "The employee referenced in this invoice doesn't exist in the database. Please add the employee first."
        } else if (errorMessage.includes("vendor_id")) {
          errorMessage =
            "The vendor referenced in this invoice doesn't exist in the database. Please add the vendor first."
        } else if (errorMessage.includes("client_id")) {
          errorMessage =
            "The client referenced in this invoice doesn't exist in the database. Please add the client first."
        }
      }
      // Handle unique constraint errors
      else if (errorMessage.includes("UNIQUE constraint failed: invoices.invoice_number")) {
        errorMessage =
          "An invoice with this invoice number already exists in the database. Please use a different invoice number."
      }
    }

    return {
      success: false,
      message: errorMessage,
    }
  }
}

// Save multiple invoices to the database
export async function saveInvoicesToDbAction(invoices: any[]) {
  console.log(`Attempting to save ${invoices.length} invoices to DB`)

  try {
    // Ensure the invoices table exists
    await ensureInvoicesTableExists()

    const results = []
    let successCount = 0

    for (const invoice of invoices) {
      try {
        let result

        // Check if this invoice already exists in the database
        if (invoice.id && invoice.savedToDb) {
          // This is an update to an existing invoice
          console.log(`Updating existing invoice: ${invoice.invoiceNumber}`)

          // Extract payment details if present
          const paymentDetails = invoice.paymentDetails
            ? {
                amount_paid: invoice.paymentDetails.amountPaid || 0,
                employee_payment_amount: invoice.paymentDetails.employeePaymentAmount || 0,
                payment_date: invoice.paymentDetails.paymentDate || null,
                notes: invoice.paymentDetails.notes || null,
                referral_payments:
                  invoice.paymentDetails.referralPayments?.map((payment: any) => ({
                    referral_id: payment.id,
                    amount: payment.amount,
                  })) || [],
              }
            : undefined

          // Transform the invoice data
          const dbInvoice = transformInvoiceForDb(invoice)

          result = await updateInvoice(
            invoice.id,
            {
              invoice_number: dbInvoice.invoice_number,
              date: dbInvoice.date,
              payment_terms: dbInvoice.payment_terms,
              vendor_id: dbInvoice.vendor_id,
              client_id: dbInvoice.client_id,
              employee_id: dbInvoice.employee_id,
              service_for: dbInvoice.service_for,
              period_month: dbInvoice.period_month,
              period_start: dbInvoice.period_start,
              period_end: dbInvoice.period_end,
              hours: dbInvoice.hours,
              bill_rate: dbInvoice.bill_rate,
              total_bill_amount: dbInvoice.total_bill_amount,
              status: dbInvoice.status, // Make sure status is included here
            },
            paymentDetails,
          )
        } else {
          // This is a new invoice
          console.log(`Creating new invoice: ${invoice.invoiceNumber}`)
          const dbInvoice = transformInvoiceForDb(invoice)

          // Extract payment details if present
          const paymentDetails = invoice.paymentDetails
            ? {
                amount_paid: invoice.paymentDetails.amountPaid || 0,
                employee_payment_amount: invoice.paymentDetails.employeePaymentAmount || 0,
                payment_date: invoice.paymentDetails.paymentDate || null,
                notes: invoice.paymentDetails.notes || null,
                referral_payments:
                  invoice.paymentDetails.referralPayments?.map((payment: any) => ({
                    referral_id: payment.id,
                    amount: payment.amount,
                  })) || [],
              }
            : undefined

          result = await createInvoice(dbInvoice, paymentDetails)
        }

        results.push({
          success: true,
          invoiceNumber: invoice.invoiceNumber,
          id: result.id,
        })
        successCount++
      } catch (error) {
        console.error(`Error saving invoice ${invoice.invoiceNumber}:`, error)
        results.push({
          success: false,
          invoiceNumber: invoice.invoiceNumber,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      success: successCount > 0,
      message: `${successCount} of ${invoices.length} invoices saved successfully`,
      results,
    }
  } catch (error) {
    console.error("Error in batch save operation:", error)
    return {
      success: false,
      message: `Failed to save invoices: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Update an existing invoice in the database
export async function updateInvoiceInDbAction(invoice: any) {
  console.log("Updating invoice in DB:", invoice)

  try {
    // Ensure the invoices table exists
    await ensureInvoicesTableExists()

    if (!invoice.id) {
      throw new Error("Invoice ID is required for updates")
    }

    // Transform the invoice data
    const dbInvoice = transformInvoiceForDb(invoice)

    // Check if the invoice exists
    const db = await getDb()
    const existingInvoice = await db.get("SELECT id FROM invoices WHERE id = ?", [invoice.id])

    if (!existingInvoice) {
      // Check if an invoice with the same invoice number exists
      const invoiceByNumber = await db.get("SELECT id FROM invoices WHERE invoice_number = ?", [
        dbInvoice.invoice_number,
      ])

      if (invoiceByNumber) {
        console.log(`Invoice not found by ID ${invoice.id}, but found by invoice number ${dbInvoice.invoice_number}`)
        // Use the ID of the invoice found by number
        invoice.id = invoiceByNumber.id
      } else {
        return {
          success: false,
          message: `Invoice with ID ${invoice.id} not found`,
          notFound: true,
        }
      }
    }

    // Extract payment details if present
    const paymentDetails = invoice.paymentDetails
      ? {
          amount_paid: invoice.paymentDetails.amountPaid || 0,
          employee_payment_amount: invoice.paymentDetails.employeePaymentAmount || 0,
          payment_date: invoice.paymentDetails.paymentDate || null,
          notes: invoice.paymentDetails.notes || null,
          referral_payments:
            invoice.paymentDetails.referralPayments?.map((payment: any) => ({
              referral_id: payment.id,
              amount: payment.amount,
            })) || [],
        }
      : undefined

    // Update the invoice in the database
    const result = await updateInvoice(
      invoice.id,
      {
        invoice_number: dbInvoice.invoice_number,
        date: dbInvoice.date,
        payment_terms: dbInvoice.payment_terms,
        vendor_id: dbInvoice.vendor_id,
        client_id: dbInvoice.client_id,
        employee_id: dbInvoice.employee_id,
        service_for: dbInvoice.service_for,
        period_month: dbInvoice.period_month,
        period_start: dbInvoice.period_start,
        period_end: dbInvoice.period_end,
        hours: dbInvoice.hours,
        bill_rate: dbInvoice.bill_rate,
        total_bill_amount: dbInvoice.total_bill_amount,
        status: dbInvoice.status,
      },
      paymentDetails,
    )

    console.log("Invoice update result:", result)

    return { success: true, message: "Invoice updated successfully", invoiceId: result.id }
  } catch (error) {
    console.error("Error updating invoice:", error)
    return {
      success: false,
      message: `Failed to update invoice: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Update multiple invoices in the database
export async function updateMultipleInvoicesAction(invoices: any[]) {
  console.log(`Attempting to update ${invoices.length} invoices in DB`)

  try {
    // Ensure the invoices table exists
    await ensureInvoicesTableExists()

    const results = []
    let successCount = 0

    for (const invoice of invoices) {
      try {
        // Check if this invoice already exists in the database
        if (!invoice.id) {
          console.log(`Invoice ${invoice.invoiceNumber} has no ID, skipping`)
          results.push({
            success: false,
            invoiceNumber: invoice.invoiceNumber,
            error: "Invoice has no ID",
          })
          continue
        }

        // Check if the invoice exists in the database
        const db = await getDb()
        const existingInvoice = await db.get("SELECT id FROM invoices WHERE id = ?", [invoice.id])

        if (!existingInvoice) {
          // Try to find by invoice number instead
          const invoiceByNumber = await db.get("SELECT id FROM invoices WHERE invoice_number = ?", [
            invoice.invoiceNumber,
          ])

          if (invoiceByNumber) {
            console.log(`Invoice not found by ID ${invoice.id}, but found by invoice number ${invoice.invoiceNumber}`)
            // Use the found ID
            invoice.id = invoiceByNumber.id
          } else {
            // If not found by either ID or number, try to create it
            console.log(`Invoice ${invoice.invoiceNumber} not found in database, creating it first`)
            const dbInvoice = transformInvoiceForDb(invoice)

            // Extract payment details if present
            const paymentDetails = invoice.paymentDetails
              ? {
                  amount_paid: invoice.paymentDetails.amountPaid || 0,
                  employee_payment_amount: invoice.paymentDetails.employeePaymentAmount || 0,
                  payment_date: invoice.paymentDetails.paymentDate || null,
                  notes: invoice.paymentDetails.notes || null,
                  referral_payments:
                    invoice.paymentDetails.referralPayments?.map((payment: any) => ({
                      referral_id: payment.id,
                      amount: payment.amount,
                    })) || [],
                }
              : undefined

            try {
              const createResult = await createInvoice(dbInvoice, paymentDetails)
              invoice.id = createResult.id
              results.push({
                success: true,
                invoiceNumber: invoice.invoiceNumber,
                id: createResult.id,
                message: "Created new invoice",
              })
              successCount++
              continue
            } catch (createError) {
              console.error(`Error creating invoice ${invoice.invoiceNumber}:`, createError)
              results.push({
                success: false,
                invoiceNumber: invoice.invoiceNumber,
                error: createError instanceof Error ? createError.message : String(createError),
              })
              continue
            }
          }
        }

        console.log(`Updating invoice: ${invoice.invoiceNumber} with status: ${invoice.status}`)

        // Extract payment details if present
        const paymentDetails = invoice.paymentDetails
          ? {
              amount_paid: invoice.paymentDetails.amountPaid || 0,
              employee_payment_amount: invoice.paymentDetails.employeePaymentAmount || 0,
              payment_date: invoice.paymentDetails.paymentDate || null,
              notes: invoice.paymentDetails.notes || null,
              referral_payments:
                invoice.paymentDetails.referralPayments?.map((payment: any) => ({
                  referral_id: payment.id,
                  amount: payment.amount,
                })) || [],
            }
          : undefined

        // Transform the invoice data
        const dbInvoice = transformInvoiceForDb(invoice)

        console.log(`Updating invoice ${invoice.id} status to: ${dbInvoice.status}`)

        // Update the invoice in the database
        const result = await updateInvoice(
          invoice.id,
          {
            invoice_number: dbInvoice.invoice_number,
            date: dbInvoice.date,
            payment_terms: dbInvoice.payment_terms,
            vendor_id: dbInvoice.vendor_id,
            client_id: dbInvoice.client_id,
            employee_id: dbInvoice.employee_id,
            service_for: dbInvoice.service_for,
            period_month: dbInvoice.period_month,
            period_start: dbInvoice.period_start,
            period_end: dbInvoice.period_end,
            hours: dbInvoice.hours,
            bill_rate: dbInvoice.bill_rate,
            total_bill_amount: dbInvoice.total_bill_amount,
            status: dbInvoice.status, // Make sure status is explicitly included
          },
          paymentDetails,
        )

        results.push({
          success: true,
          invoiceNumber: invoice.invoiceNumber,
          id: result.id,
        })
        successCount++
      } catch (error) {
        console.error(`Error updating invoice ${invoice.invoiceNumber}:`, error)
        results.push({
          success: false,
          invoiceNumber: invoice.invoiceNumber,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      success: successCount > 0,
      message: `${successCount} of ${invoices.length} invoices updated successfully`,
      results,
    }
  } catch (error) {
    console.error("Error in batch update operation:", error)
    return {
      success: false,
      message: `Failed to update invoices: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function deleteInvoiceAction(id: string, invoiceNumber?: string) {
  try {
    console.log(`Deleting invoice with ID: ${id}${invoiceNumber ? ` (Invoice #${invoiceNumber})` : ""}`)

    // First check if the invoice exists with this ID
    const db = await getDb()
    const existingInvoice = await db.get("SELECT id FROM invoices WHERE id = ?", [id])

    if (!existingInvoice && invoiceNumber) {
      // If not found by ID but we have an invoice number, try to find by invoice number
      console.log(`Invoice not found with ID ${id}, trying to find by invoice number ${invoiceNumber}`)
      const invoiceByNumber = await db.get("SELECT id FROM invoices WHERE invoice_number = ?", [invoiceNumber])

      if (invoiceByNumber) {
        console.log(`Found invoice with number ${invoiceNumber}, using ID: ${invoiceByNumber.id}`)
        id = invoiceByNumber.id
      } else {
        console.log(`No invoice found with number ${invoiceNumber} either`)
        return {
          success: false,
          message: "Invoice not found in database",
        }
      }
    }

    // Now delete the invoice with the correct ID
    const result = await deleteInvoiceDb(id)

    console.log(`Delete operation completed with result:`, result)
    return { success: true, message: "Invoice deleted successfully" }
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return {
      success: false,
      message: `Failed to delete invoice: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
