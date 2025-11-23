import { type NextRequest, NextResponse } from "next/server"
import { getDb, generateId } from "@/lib/db"

export async function POST(request: NextRequest) {
  const db = await getDb()

  try {
    // Get data from request body
    const data = await request.json()
    console.log("Received data for migration:", {
      parties: data.parties?.length || 0,
      employees: data.employees?.length || 0,
      monthlyHours: Object.keys(data.monthlyHours || {}).length,
      invoices: data.invoices?.length || 0,
    })

    // Start transaction
    await db.exec("BEGIN TRANSACTION")

    // Migrate parties
    if (data.parties && Array.isArray(data.parties)) {
      for (const party of data.parties) {
        await db.run(`INSERT OR IGNORE INTO parties (id, name, address, type) VALUES (?, ?, ?, ?)`, [
          party.id,
          party.name,
          party.address,
          party.type,
        ])
      }
      console.log(`Migrated ${data.parties.length} parties`)
    }

    // Migrate employees
    if (data.employees && Array.isArray(data.employees)) {
      for (const employee of data.employees) {
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
      console.log(`Migrated ${data.employees.length} employees`)
    }

    // Migrate monthly hours
    if (data.monthlyHours) {
      for (const monthYear in data.monthlyHours) {
        const employeeHours = data.monthlyHours[monthYear]
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
    if (data.invoices && Array.isArray(data.invoices)) {
      for (const invoice of data.invoices) {
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
                [generateId(), paymentId, payment.referralId || payment.id, payment.amount],
              )
            }
          }
        }
      }
      console.log(`Migrated ${data.invoices.length} invoices`)
    }

    // Commit transaction
    await db.exec("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      counts: {
        parties: data.parties?.length || 0,
        employees: data.employees?.length || 0,
        monthlyHours: Object.keys(data.monthlyHours || {}).length,
        invoices: data.invoices?.length || 0,
      },
    })
  } catch (error) {
    // Rollback transaction on error
    await db.exec("ROLLBACK")
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
