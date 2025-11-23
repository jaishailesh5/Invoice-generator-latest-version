"use server"

import { getDb } from "@/lib/db"

// Server action to load invoices from the database
export async function loadInvoicesFromDbAction() {
  try {
    console.log("Loading invoices from database (server action)")
    const db = await getDb()

    // Get all invoices with related entity names
    const dbInvoices = await db.all(`
      SELECT 
        i.*,
        v.name as vendor_name,
        v.address as vendor_address,
        c.name as client_name,
        c.address as client_address,
        (e.first_name || ' ' || e.last_name) as employee_name,
        e.pay_rate as employee_pay_rate,
        e.employee_type as employee_type
      FROM invoices i
      LEFT JOIN parties v ON i.vendor_id = v.id
      LEFT JOIN parties c ON i.client_id = c.id
      LEFT JOIN employees e ON i.employee_id = e.id
      ORDER BY i.date DESC
    `)

    console.log(`Retrieved ${dbInvoices.length} invoices from database`)

    // For each invoice, get payment details and referral payments
    const formattedInvoices = await Promise.all(
      dbInvoices.map(async (dbInvoice) => {
        try {
          // Get payment details
          const paymentDetails = await db.get(`SELECT * FROM payment_details WHERE invoice_id = ?`, [dbInvoice.id])

          // Get referral payments if payment details exist
          let referralPayments = []
          if (paymentDetails) {
            referralPayments = await db.all(
              `SELECT rp.*, p.name as referral_name 
               FROM referral_payments rp
               JOIN parties p ON rp.referral_id = p.id
               WHERE rp.payment_id = ?`,
              [paymentDetails.id],
            )
          }

          // Get employee referrals
          const employeeReferrals = await db.all(
            `SELECT er.*, p.name as referral_name 
             FROM employee_referrals er
             JOIN parties p ON er.referral_id = p.id
             WHERE er.employee_id = ?`,
            [dbInvoice.employee_id],
          )

          // Format the invoice to match localStorage format
          return {
            id: dbInvoice.id,
            invoiceNumber: dbInvoice.invoice_number,
            date: dbInvoice.date,
            paymentTerms: dbInvoice.payment_terms || "Net 30",
            vendor: {
              id: dbInvoice.vendor_id,
              name: dbInvoice.vendor_name || "Unknown Vendor",
              address: dbInvoice.vendor_address || "",
            },
            billTo: {
              id: dbInvoice.client_id,
              name: dbInvoice.client_name || "Unknown Client",
              address: dbInvoice.client_address || "",
            },
            serviceFor: dbInvoice.service_for || "Consulting Services",
            employee: {
              id: dbInvoice.employee_id,
              name: dbInvoice.employee_name || "Unknown Employee",
              employeeType: dbInvoice.employee_type,
              referrals: employeeReferrals.map((ref) => ({
                id: ref.referral_id,
                name: ref.referral_name,
                fee: ref.fee || 0,
              })),
            },
            period: {
              month: dbInvoice.period_month || "",
              start: dbInvoice.period_start || "",
              end: dbInvoice.period_end || "",
            },
            hours: dbInvoice.hours || 0,
            billRate: dbInvoice.bill_rate || 0,
            payRate: dbInvoice.employee_pay_rate || 0,
            totalBillAmount: dbInvoice.total_bill_amount || 0,
            status: dbInvoice.status || "pending",
            paymentDetails: paymentDetails
              ? {
                  amountPaid: paymentDetails.amount_paid || 0,
                  employeePaymentAmount: paymentDetails.employee_payment_amount || 0,
                  paymentDate: paymentDetails.payment_date || "",
                  notes: paymentDetails.notes || "",
                  referralPayments: referralPayments.map((rp) => ({
                    id: rp.referral_id,
                    name: rp.referral_name,
                    amount: rp.amount || 0,
                  })),
                  savedToDb: true,
                }
              : undefined,
            savedToDb: true,
          }
        } catch (error) {
          console.error(`Error processing invoice ${dbInvoice.id}:`, error)
          // Return a minimal valid invoice to prevent the entire operation from failing
          return {
            id: dbInvoice.id,
            invoiceNumber: dbInvoice.invoice_number || `unknown-${dbInvoice.id}`,
            date: dbInvoice.date || new Date().toISOString(),
            vendor: {
              id: dbInvoice.vendor_id || "unknown",
              name: dbInvoice.vendor_name || "Unknown Vendor",
              address: "",
            },
            billTo: {
              id: dbInvoice.client_id || "unknown",
              name: dbInvoice.client_name || "Unknown Client",
              address: "",
            },
            employee: {
              id: dbInvoice.employee_id || "unknown",
              name: dbInvoice.employee_name || "Unknown Employee",
              referrals: [],
            },
            period: {
              month: "",
              start: "",
              end: "",
            },
            hours: 0,
            billRate: 0,
            payRate: 0,
            totalBillAmount: 0,
            status: "pending",
            savedToDb: true,
          }
        }
      }),
    )

    console.log(`Formatted ${formattedInvoices.length} invoices from database`)
    return { success: true, invoices: formattedInvoices }
  } catch (error) {
    console.error("Error loading invoices from database:", error)
    return {
      success: false,
      message: `Failed to load invoices from database: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Server action to load employees from the database
export async function loadEmployeesFromDbAction() {
  try {
    console.log("Loading employees from database (server action)")
    const db = await getDb()

    // Get all employees
    const dbEmployees = await db.all(`
      SELECT e.*, 
             (e.first_name || ' ' || e.last_name) as full_name,
             p.name as client_name
      FROM employees e
      LEFT JOIN parties p ON e.bill_to_party_id = p.id
      ORDER BY e.last_name, e.first_name
    `)

    console.log(`Retrieved ${dbEmployees.length} employees from database`)

    // For each employee, get their referrals
    const formattedEmployees = await Promise.all(
      dbEmployees.map(async (dbEmployee) => {
        try {
          // Get employee referrals
          const referrals = await db.all(
            `SELECT er.*, p.name as referral_name 
             FROM employee_referrals er
             JOIN parties p ON er.referral_id = p.id
             WHERE er.employee_id = ?`,
            [dbEmployee.id],
          )

          // Format the employee to match localStorage format
          return {
            id: dbEmployee.id,
            firstName: dbEmployee.first_name,
            lastName: dbEmployee.last_name,
            employeeNumber: dbEmployee.employee_number || null,
            dateOfJoining: dbEmployee.date_of_joining || null,
            billRate: dbEmployee.bill_rate,
            payRate: dbEmployee.pay_rate,
            vendorName: dbEmployee.client_name || "",
            billToPartyId: dbEmployee.bill_to_party_id || null,
            status: dbEmployee.status || "active",
            terminationDate: dbEmployee.termination_date || null,
            employeeType: dbEmployee.employee_type || "W2-Employee",
            referrals: referrals.map((ref) => ({
              id: ref.referral_id,
              name: ref.referral_name,
              fee: ref.fee || 0,
            })),
          }
        } catch (error) {
          console.error(`Error processing employee ${dbEmployee.id}:`, error)
          // Return a minimal valid employee to prevent the entire operation from failing
          return {
            id: dbEmployee.id,
            firstName: dbEmployee.first_name || "Unknown",
            lastName: dbEmployee.last_name || "Employee",
            billRate: 0,
            payRate: 0,
            status: "active",
            employeeType: "W2-Employee",
            referrals: [],
          }
        }
      }),
    )

    console.log(`Formatted ${formattedEmployees.length} employees from database`)
    return { success: true, employees: formattedEmployees }
  } catch (error) {
    console.error("Error loading employees from database:", error)
    return {
      success: false,
      message: `Failed to load employees from database: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Server action to load parties from the database
export async function loadPartiesFromDbAction() {
  try {
    console.log("Loading parties from database (server action)")
    const db = await getDb()

    // Get all parties
    const dbParties = await db.all(`
      SELECT * FROM parties
      ORDER BY name
    `)

    console.log(`Retrieved ${dbParties.length} parties from database`)

    // Format the parties to match localStorage format
    const formattedParties = dbParties.map((party) => ({
      id: party.id,
      name: party.name,
      address: party.address || "",
      type: party.type || "client",
    }))

    console.log(`Formatted ${formattedParties.length} parties from database`)
    return { success: true, parties: formattedParties }
  } catch (error) {
    console.error("Error loading parties from database:", error)
    return {
      success: false,
      message: `Failed to load parties from database: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Server action to load monthly hours from the database
export async function loadMonthlyHoursFromDbAction(monthYear?: string) {
  try {
    console.log("Loading monthly hours from database (server action)")
    const db = await getDb()

    let query = `
      SELECT employee_id, month_year, hours
      FROM monthly_hours
    `

    const params = []

    if (monthYear) {
      query += ` WHERE month_year = ?`
      params.push(monthYear)
    }

    const dbMonthlyHours = await db.all(query, params)
    console.log(`Retrieved ${dbMonthlyHours.length} monthly hours records from database`)

    // Format the monthly hours to match localStorage format
    const formattedMonthlyHours = {}

    dbMonthlyHours.forEach((record) => {
      const { month_year, employee_id, hours } = record

      if (!formattedMonthlyHours[month_year]) {
        formattedMonthlyHours[month_year] = {}
      }

      formattedMonthlyHours[month_year][employee_id] = hours
    })

    return { success: true, monthlyHours: formattedMonthlyHours }
  } catch (error) {
    console.error("Error loading monthly hours from database:", error)
    return {
      success: false,
      message: `Failed to load monthly hours from database: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
