import type { MonthlyData, Employee, Client, Referral } from "./types"

// Updated to match the actual invoice structure from the app
interface Invoice {
  invoiceNumber: string
  date: string
  paymentTerms: string
  vendor: {
    name: string
    address: string
  }
  billTo: {
    name: string
    address: string
    id?: string
  }
  serviceFor: string
  employee: {
    name: string
    id: string
    referralPartyId?: string
    referralName?: string
    referrals?: Array<{
      id: string
      name: string
      fee: number
    }>
  }
  period: {
    month: string
    start: string
    end: string
  }
  hours: number
  billRate: number
  payRate: number // Make sure this field exists
  totalBillAmount: number
  status?: "pending" | "paid" | "partially_paid"
  paymentDetails?: {
    amountPaid: number
    employeePaymentAmount?: number
    referralPaymentAmount?: number
    referralPayments?: Array<{
      id: string
      name: string
      amount: number
    }>
    paymentDate?: string
    notes?: string
  }
}

export function getMonthlyData(accountingMethod = "accrual") {
  try {
    // Try to get data from localStorage first
    const invoicesJson = localStorage.getItem("invoices")

    if (!invoicesJson) {
      console.log("No invoices found in localStorage, will try to fetch from database")
      // Return empty data structure that will be populated by the component
      return {
        employees: [],
        clients: [],
        referrals: [],
        employeeData: {},
        clientData: {},
        referralData: {},
      }
    }

    // Get invoices from localStorage
    const invoicesJson2 = localStorage.getItem("invoices")
    console.log("Raw invoices from localStorage:", invoicesJson2)

    // Handle case where invoices is null or not valid JSON
    if (!invoicesJson2) {
      console.log("No invoices found in localStorage")
      return {
        employees: [],
        clients: [],
        referrals: [],
        employeeData: {},
        clientData: {},
        referralData: {},
      }
    }

    let invoices: Invoice[] = []
    try {
      invoices = JSON.parse(invoicesJson2)
      console.log("Parsed invoices:", invoices)

      // Validate that invoices is an array
      if (!Array.isArray(invoices)) {
        console.log("Invoices is not an array:", invoices)
        return {
          employees: [],
          clients: [],
          referrals: [],
          employeeData: {},
          clientData: {},
          referralData: {},
        }
      }
    } catch (e) {
      console.error("Error parsing invoices JSON:", e)
      return {
        employees: [],
        clients: [],
        referrals: [],
        employeeData: {},
        clientData: {},
        referralData: {},
      }
    }

    // Instead of throwing an error, we'll return empty data structures
    if (!invoices.length) {
      console.log("No invoices in the array")
      return {
        employees: [],
        clients: [],
        referrals: [],
        employeeData: {},
        clientData: {},
        referralData: {},
      }
    }

    // Extract unique employees, clients, and referrals
    const employeeMap = new Map<string, Employee>()
    const clientMap = new Map<string, Client>()
    const referralMap = new Map<string, Referral>()

    invoices.forEach((invoice, index) => {
      // Add this debugging code at the beginning of the forEach loop
      console.log(`Invoice ${index} employee:`, invoice.employee)
      console.log(`Invoice ${index} referrals:`, invoice.employee?.referrals)
      console.log(`Invoice ${index} paymentDetails:`, invoice.paymentDetails)

      // Skip invalid invoices
      if (!invoice) {
        console.log(`Invoice at index ${index} is undefined`)
        return
      }

      console.log(`Processing invoice ${index}:`, invoice)

      // Extract employee data
      if (invoice.employee && invoice.employee.id) {
        const employeeId = invoice.employee.id
        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            id: employeeId,
            name: invoice.employee.name || "Unknown Employee",
            hourlyRate: invoice.payRate ?? 0, // Use payRate if available, otherwise default to 0
          })
          console.log(`Added employee: ${invoice.employee.name} with rate ${invoice.payRate ?? 0}`)
        }
      } else {
        console.log(`Invoice ${index} has no valid employee data`)
      }

      // Extract client data (using billTo as client)
      if (invoice.billTo && invoice.billTo.name) {
        const clientId = invoice.billTo.id || `client-${invoice.billTo.name.replace(/\s+/g, "-").toLowerCase()}`
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            id: clientId,
            name: invoice.billTo.name,
          })
          console.log(`Added client: ${invoice.billTo.name}`)
        }
      } else {
        console.log(`Invoice ${index} has no valid client data`)
      }

      // Extract referral data from employee's referrals array
      if (invoice.employee?.referrals && invoice.employee.referrals.length > 0) {
        invoice.employee.referrals.forEach((referral) => {
          if (!referralMap.has(referral.id)) {
            referralMap.set(referral.id, {
              id: referral.id,
              name: referral.name,
            })
            console.log(`Added referral: ${referral.name}`)
          }
        })
      }
      // Also check the legacy referral format
      else if (invoice.employee?.referralPartyId && invoice.employee.referralName) {
        const referralId = invoice.employee.referralPartyId
        if (!referralMap.has(referralId)) {
          referralMap.set(referralId, {
            id: referralId,
            name: invoice.employee.referralName,
          })
          console.log(`Added referral (legacy format): ${invoice.employee.referralName}`)
        }
      }

      // Also check payment details for referral payments
      if (invoice.paymentDetails?.referralPayments && invoice.paymentDetails.referralPayments.length > 0) {
        invoice.paymentDetails.referralPayments.forEach((payment) => {
          if (!referralMap.has(payment.id)) {
            referralMap.set(payment.id, {
              id: payment.id,
              name: payment.name,
            })
            console.log(`Added referral from payment details: ${payment.name}`)
          }
        })
      }
    })

    const employees = Array.from(employeeMap.values())
    const clients = Array.from(clientMap.values())
    const referrals = Array.from(referralMap.values())

    console.log("Extracted employees:", employees)
    console.log("Extracted clients:", clients)
    console.log("Extracted referrals:", referrals)

    // Initialize data structure
    const employeeData: MonthlyData["employeeData"] = {}
    const clientData: MonthlyData["clientData"] = {}
    const referralData: MonthlyData["referralData"] = {}

    // Process invoices
    invoices.forEach((invoice, index) => {
      // Skip invalid invoices
      if (!invoice) {
        console.log(`Invoice ${index} is undefined`)
        return
      }

      try {
        // IMPORTANT: Determine year and month based on accounting method
        let year: string
        let month: string

        if (accountingMethod === "cash") {
          // For cash-based accounting, use payment date
          // Skip unpaid invoices
          if (invoice.status !== "paid" && invoice.status !== "partially_paid") {
            console.log(`Invoice ${index} is not paid, skipping for cash-based accounting`)
            return
          }

          // Use payment date for categorization
          const paymentDate = invoice.paymentDetails?.paymentDate ? new Date(invoice.paymentDetails.paymentDate) : null

          if (!paymentDate || isNaN(paymentDate.getTime())) {
            console.log(`Invoice ${index} has no valid payment date, skipping for cash-based accounting`)
            return
          }

          year = paymentDate.getFullYear().toString()
          month = paymentDate.toLocaleString("default", { month: "long" })
          console.log(`Cash-based: Using payment date ${paymentDate.toISOString()} for invoice ${index}`)
        } else {
          // For accrual-based accounting, use the period month (original logic)
          if (invoice.period && invoice.period.month) {
            // Extract year and month from period.month (e.g., "April 2023")
            const periodParts = invoice.period.month.split(" ")
            if (periodParts.length === 2) {
              month = periodParts[0]
              year = periodParts[1]
            } else {
              // Fallback to using period.start date
              const periodStartDate = new Date(invoice.period.start || invoice.date)
              if (isNaN(periodStartDate.getTime())) {
                console.log(`Invoice ${index} has invalid period dates, using invoice date`)
                const invoiceDate = new Date(invoice.date)
                if (isNaN(invoiceDate.getTime())) {
                  console.log(`Invoice ${index} has invalid date: ${invoice.date}`)
                  return // Skip invoices with invalid dates
                }
                year = invoiceDate.getFullYear().toString()
                month = invoiceDate.toLocaleString("default", { month: "long" })
              } else {
                year = periodStartDate.getFullYear().toString()
                month = periodStartDate.toLocaleString("default", { month: "long" })
              }
            }
          } else {
            // Fallback to invoice date if no period information
            const invoiceDate = new Date(invoice.date)
            if (isNaN(invoiceDate.getTime())) {
              console.log(`Invoice ${index} has invalid date: ${invoice.date}`)
              return // Skip invoices with invalid dates
            }
            year = invoiceDate.getFullYear().toString()
            month = invoiceDate.toLocaleString("default", { month: "long" })
          }
          console.log(`Accrual-based: Using period month ${month} ${year} for invoice ${index}`)
        }

        console.log(`Processing invoice ${index} for ${month} ${year}`)

        // Initialize year and month if they don't exist
        if (!employeeData[year]) employeeData[year] = {}
        if (!employeeData[year][month]) employeeData[year][month] = {}

        if (!clientData[year]) clientData[year] = {}
        if (!clientData[year][month]) clientData[year][month] = {}

        if (!referralData[year]) referralData[year] = {}
        if (!referralData[year][month]) referralData[year][month] = {}

        // Process employee data
        if (invoice.employee && invoice.employee.id) {
          const employeeId = invoice.employee.id

          if (!employeeData[year][month][employeeId]) {
            employeeData[year][month][employeeId] = {
              hoursWorked: 0,
              amountPaid: 0,
              amountBilled: 0,
              profit: 0,
            }
          }

          // Get hours worked directly from invoice
          const hoursWorked = invoice.hours || 0
          console.log(`Employee ${invoice.employee.name} worked ${hoursWorked} hours in ${month} ${year}`)

          // Update employee data
          const data = employeeData[year][month][employeeId]
          data.hoursWorked += hoursWorked

          // Calculate amount paid to employee
          let amountPaid = 0
          if (invoice.paymentDetails && typeof invoice.paymentDetails.employeePaymentAmount === "number") {
            amountPaid = invoice.paymentDetails.employeePaymentAmount
            console.log(`Using recorded employee payment: ${amountPaid}`)
          } else {
            // Get the employee's pay rate - either from the invoice or from our employee map
            const payRate = invoice.payRate || employeeMap.get(employeeId)?.hourlyRate || 0

            // If pay rate is 0 or undefined, amount paid should be 0
            if (payRate <= 0) {
              amountPaid = 0
              console.log(`Pay rate is zero or invalid (${payRate}), setting amount paid to 0`)
            } else {
              amountPaid = hoursWorked * payRate
              console.log(`Calculated employee payment: ${amountPaid} (${hoursWorked} hrs * ${payRate})`)
            }
          }

          data.amountPaid += amountPaid
          console.log(`Paid ${amountPaid} to employee ${invoice.employee.name}`)

          // Amount billed to client
          let amountBilled = 0
          if (accountingMethod === "cash" && invoice.paymentDetails?.amountPaid) {
            // For cash-based, use the actual amount paid
            amountBilled = invoice.paymentDetails.amountPaid
            console.log(`Cash-based: Using actual payment amount ${amountBilled}`)
          } else {
            // For accrual-based, use the invoice total
            amountBilled = invoice.totalBillAmount || 0
            console.log(`Accrual-based: Using invoice total ${amountBilled}`)
          }

          data.amountBilled += amountBilled
          console.log(`Billed ${amountBilled} to client ${invoice.billTo?.name}`)

          // Calculate total referral payments for this invoice
          let totalReferralPayments = 0

          // Process referral data - using the referrals array from the employee record
          if (
            invoice.employee?.referrals &&
            Array.isArray(invoice.employee.referrals) &&
            invoice.employee.referrals.length > 0
          ) {
            console.log(`Processing ${invoice.employee.referrals.length} referrals for invoice ${index}`)

            invoice.employee.referrals.forEach((referral) => {
              if (!referral || !referral.id) {
                console.log(`Invalid referral data:`, referral)
                return
              }

              const referralId = referral.id

              // Debug the referral fee
              console.log(`Referral ${referral.name} fee:`, referral.fee, typeof referral.fee)

              // Ensure fee is a number
              const referralFee = typeof referral.fee === "number" ? referral.fee : Number(referral.fee)

              if (isNaN(referralFee)) {
                console.log(`Invalid referral fee for ${referral.name}:`, referral.fee)
                return
              }

              console.log(`Processing referral ${referral.name} with fee ${referralFee} for invoice ${index}`)

              if (!referralData[year]) referralData[year] = {}
              if (!referralData[year][month]) referralData[year][month] = {}
              if (!referralData[year][month][referralId]) {
                referralData[year][month][referralId] = {
                  amountPaid: 0,
                }
              }

              // Check if we have a payment record for this referral
              let referralPayment = 0

              // First check if there's a specific payment amount in paymentDetails.referralPayments
              if (invoice.paymentDetails?.referralPayments && Array.isArray(invoice.paymentDetails.referralPayments)) {
                const paymentRecord = invoice.paymentDetails.referralPayments.find((p) => p.id === referralId)
                if (paymentRecord && typeof paymentRecord.amount === "number") {
                  referralPayment = paymentRecord.amount
                  console.log(`Found specific payment record for referral ${referral.name}: ${referralPayment}`)
                }
              }

              // If no specific payment found, calculate based on fee
              if (referralPayment === 0) {
                referralPayment = referralFee * hoursWorked
                console.log(
                  `Calculated referral payment: ${referralPayment} = ${referralFee} (fee) * ${hoursWorked} (hours)`,
                )
              }

              // Update referral data
              referralData[year][month][referralId].amountPaid += referralPayment
              totalReferralPayments += referralPayment

              console.log(
                `Updated referral ${referral.name} total to ${referralData[year][month][referralId].amountPaid}`,
              )
            })
          }
          // Check for referral payments in payment details
          else if (invoice.paymentDetails?.referralPayments && invoice.paymentDetails.referralPayments.length > 0) {
            console.log(
              `Processing ${invoice.paymentDetails.referralPayments.length} referral payments from payment details`,
            )

            invoice.paymentDetails.referralPayments.forEach((payment) => {
              if (!payment.id) {
                console.log(`Invalid referral payment data:`, payment)
                return
              }

              const referralId = payment.id
              const amount = payment.amount || 0

              if (!referralData[year][month][referralId]) {
                referralData[year][month][referralId] = {
                  amountPaid: 0,
                }
              }

              referralData[year][month][referralId].amountPaid += amount
              totalReferralPayments += amount

              console.log(`Added ${amount} to referral ${payment.name} from payment details`)
            })
          }
          // Handle legacy referral format
          else if (invoice.employee.referralPartyId && invoice.paymentDetails?.referralPaymentAmount) {
            const referralId = invoice.employee.referralPartyId

            if (!referralData[year][month][referralId]) {
              referralData[year][month][referralId] = {
                amountPaid: 0,
              }
            }

            const referralPayment = invoice.paymentDetails.referralPaymentAmount
            referralData[year][month][referralId].amountPaid += referralPayment
            totalReferralPayments += referralPayment

            console.log(
              `Added ${referralPayment} to referral ${invoice.employee.referralName || "Unknown"} total (legacy format)`,
            )
          }

          // Calculate profit (amount billed - amount paid to employee - amount paid to referrals)
          const profit = amountBilled - amountPaid - totalReferralPayments
          data.profit += profit
          console.log(`Profit for employee ${invoice.employee.name}: ${profit}`)
        } else {
          console.log(`Invoice ${index} has no valid employee data for financial calculations`)
        }

        // Process client data (using billTo as client)
        if (invoice.billTo && invoice.billTo.name) {
          const clientId = invoice.billTo.id || `client-${invoice.billTo.name.replace(/\s+/g, "-").toLowerCase()}`

          if (!clientData[year][month][clientId]) {
            clientData[year][month][clientId] = {
              amountDue: 0,
              amountPaid: 0,
            }
          }

          // Update client data
          const data = clientData[year][month][clientId]

          if (accountingMethod === "cash") {
            // For cash-based, only track actual payments
            if (invoice.paymentDetails?.amountPaid) {
              data.amountPaid += invoice.paymentDetails.amountPaid
              // For cash-based, amount due equals amount paid
              data.amountDue += invoice.paymentDetails.amountPaid
              console.log(`Cash-based: Client ${invoice.billTo.name} paid ${invoice.paymentDetails.amountPaid}`)
            }
          } else {
            // For accrual-based, track invoice amounts and payments separately
            const amountDue = invoice.totalBillAmount || 0
            data.amountDue += amountDue
            console.log(`Accrual-based: Client ${invoice.billTo.name} owes ${amountDue} for ${month} ${year}`)

            // If invoice is paid or partially paid, update amount paid
            if (invoice.status === "paid" && invoice.paymentDetails?.amountPaid) {
              data.amountPaid += invoice.paymentDetails.amountPaid
              console.log(`Client ${invoice.billTo.name} paid ${invoice.paymentDetails.amountPaid}`)
            } else if (invoice.status === "paid") {
              data.amountPaid += amountDue
              console.log(`Client ${invoice.billTo.name} paid full amount ${amountDue}`)
            } else if (invoice.status === "partially_paid" && invoice.paymentDetails?.amountPaid) {
              data.amountPaid += invoice.paymentDetails.amountPaid
              console.log(`Client ${invoice.billTo.name} partially paid ${invoice.paymentDetails.amountPaid}`)
            } else {
              console.log(`Invoice ${index} status: ${invoice.status}, no payment recorded`)
            }
          }
        } else {
          console.log(`Invoice ${index} has no valid client data for financial calculations`)
        }
      } catch (e) {
        console.error(`Error processing invoice ${index}:`, e, invoice)
        // Continue processing other invoices
      }
    })

    console.log("Final employee data:", employeeData)
    console.log("Final client data:", clientData)
    console.log("Final referral data:", referralData)

    return {
      employees,
      clients,
      referrals,
      employeeData,
      clientData,
      referralData,
    }
  } catch (error) {
    console.error("Error processing monthly data:", error)
    throw error
  }
}

// Updated function to properly load data from the database using server actions
export async function getMonthlyDataFromDb(accountingMethod = "accrual") {
  try {
    console.log("Loading monthly data from database")

    // Import the necessary server action
    const { loadInvoicesFromDbAction } = await import("@/app/actions/data-loader-actions")

    // Call the server action to get invoices
    const result = await loadInvoicesFromDbAction()

    if (!result.success) {
      throw new Error(result.message || "Failed to load invoices from database")
    }

    // Process the invoices from database
    const invoices = result.invoices || []
    console.log(`Processing ${invoices.length} invoices from database for monthly data`)

    // Store the invoices in localStorage for future use
    localStorage.setItem("invoices", JSON.stringify(invoices))

    // Use the existing function to process the invoices
    return getMonthlyData(accountingMethod)
  } catch (error) {
    console.error("Error in getMonthlyDataFromDb:", error)
    throw error
  }
}

// Helper function to get month names in order
export function getMonthNames(): string[] {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}
