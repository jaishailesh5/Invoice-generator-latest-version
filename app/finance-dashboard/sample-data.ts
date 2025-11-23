import type { MonthlyData } from "./types"

export function generateSampleData(): MonthlyData {
  // Create sample employees
  const employees = [
    { id: "emp-1", name: "John Doe", hourlyRate: 50 },
    { id: "emp-2", name: "Jane Smith", hourlyRate: 65 },
    { id: "emp-3", name: "Robert Johnson", hourlyRate: 75 },
  ]

  // Create sample clients
  const clients = [
    { id: "client-acme-corp", name: "Acme Corporation" },
    { id: "client-globex", name: "Globex Industries" },
    { id: "client-initech", name: "Initech" },
  ]

  // Initialize data structures
  const employeeData: MonthlyData["employeeData"] = {}
  const clientData: MonthlyData["clientData"] = {}

  // Get current year
  const currentYear = new Date().getFullYear().toString()

  // Initialize year
  employeeData[currentYear] = {}
  clientData[currentYear] = {}

  // Generate data for each month
  const months = [
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

  months.forEach((month) => {
    // Initialize month
    employeeData[currentYear][month] = {}
    clientData[currentYear][month] = {}

    // Generate employee data
    employees.forEach((employee) => {
      // Random hours between 80 and 160
      const hoursWorked = Math.floor(Math.random() * 80) + 80

      // Calculate amount paid (hours * rate)
      const amountPaid = hoursWorked * employee.hourlyRate

      // Calculate amount billed (with markup)
      const markup = 1.3 + Math.random() * 0.4 // 30-70% markup
      const amountBilled = amountPaid * markup

      // Calculate profit
      const profit = amountBilled - amountPaid

      // Store employee data
      employeeData[currentYear][month][employee.id] = {
        hoursWorked,
        amountPaid,
        amountBilled,
        profit,
      }
    })

    // Generate client data
    clients.forEach((client) => {
      // Random amount due between $5000 and $20000
      const amountDue = Math.floor(Math.random() * 15000) + 5000

      // Random payment percentage between 70% and 100%
      const paymentPercentage = Math.random() * 0.3 + 0.7
      const amountPaid = Math.floor(amountDue * paymentPercentage)

      // Store client data
      clientData[currentYear][month][client.id] = {
        amountDue,
        amountPaid,
      }
    })
  })

  // Generate sample invoices and store in localStorage
  const sampleInvoices = generateSampleInvoices(employees, clients)
  localStorage.setItem("sample_invoices_backup", localStorage.getItem("invoices") || "[]")
  localStorage.setItem("invoices", JSON.stringify(sampleInvoices))

  return {
    employees,
    clients,
    employeeData,
    clientData,
  }
}

function generateSampleInvoices(employees, clients) {
  const invoices = []
  const currentYear = new Date().getFullYear()

  // Generate 24 sample invoices (2 per month)
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(currentYear, month, 15)
    const monthName = monthDate.toLocaleString("default", { month: "long" })

    // Start and end dates for the month
    const startDate = new Date(currentYear, month, 1)
    const endDate = new Date(currentYear, month + 1, 0)

    // Generate 2 invoices per month
    for (let i = 0; i < 2; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)]
      const client = clients[Math.floor(Math.random() * clients.length)]

      // Random hours between 80 and 160
      const hours = Math.floor(Math.random() * 80) + 80

      // Bill rate (hourly rate with markup)
      const billRate = employee.hourlyRate * (1.3 + Math.random() * 0.4)

      // Total bill amount
      const totalBillAmount = hours * billRate

      // Random status
      const statusOptions = ["pending", "paid", "partially_paid"]
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)]

      // Payment details
      let paymentDetails = null
      if (status === "paid") {
        paymentDetails = {
          amountPaid: totalBillAmount,
          paymentDate: new Date(currentYear, month, 28).toISOString().split("T")[0],
          notes: "Paid in full",
        }
      } else if (status === "partially_paid") {
        const amountPaid = totalBillAmount * (Math.random() * 0.7 + 0.1) // 10-80% paid
        paymentDetails = {
          amountPaid,
          paymentDate: new Date(currentYear, month, 28).toISOString().split("T")[0],
          notes: "Partial payment received",
        }
      }

      // Create invoice
      const invoice = {
        invoiceNumber: `INV-${currentYear}${(month + 1).toString().padStart(2, "0")}${i + 1}`,
        date: new Date(currentYear, month, 15).toISOString().split("T")[0],
        paymentTerms: "Net 30",
        vendor: {
          name: "Your Company",
          address: "123 Business St\nSuite 100\nNew York, NY 10001",
        },
        billTo: {
          name: client.name,
          address: "456 Client Ave\nChicago, IL 60601",
        },
        serviceFor: "Consulting Services",
        employee: {
          name: employee.name,
          id: employee.id,
        },
        period: {
          month: monthName,
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        },
        hours,
        billRate,
        totalBillAmount,
        status,
        paymentDetails,
      }

      invoices.push(invoice)
    }
  }

  return invoices
}
