"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getChicagoDateISO, formatDate, getFirstDayOfMonthISO, getLastDayOfMonthISO } from "@/lib/date-utils"
import { saveInvoiceToDbAction } from "@/app/actions/invoice-actions"

interface Employee {
  id: string
  firstName: string
  lastName: string
  dateOfJoining: string
  billRate: number
  payRate: number
  vendorName: string
  billToPartyId?: string
  referrals?: { name: string; fee: number }[]
}

interface EmployeeHours {
  [employeeId: string]: number
}

interface MonthlyHours {
  [monthYear: string]: EmployeeHours
}

interface Party {
  id: string
  name: string
  address: string
  type: "vendor" | "client"
}

interface InvoiceData {
  employeeId: string
  monthYear: string
  customHours?: number
  useStoredHours: boolean
  startDate: string
  endDate: string
  invoiceDate: string
  paymentTerms: string
  vendorId: string
  clientId: string
  serviceFor: string
}

// Helper function to handle decimal precision
function toFixedNumber(num: number, decimals = 2): number {
  return Number(Number(num).toFixed(decimals))
}

export default function GenerateInvoice() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vendors, setVendors] = useState<Party[]>([])
  const [clients, setClients] = useState<Party[]>([])
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    employeeId: "",
    monthYear: "",
    customHours: 0,
    useStoredHours: true,
    startDate: "",
    endDate: "",
    invoiceDate: getChicagoDateISO(),
    paymentTerms: "Net 60",
    vendorId: "",
    clientId: "",
    serviceFor: "IT Consulting Services",
  })
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyHours, setMonthlyHours] = useState<MonthlyHours>({})
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([])
  const [dateError, setDateError] = useState<string | null>(null)

  // Update Chicago date every minute
  useEffect(() => {
    // Initial update
    const updateDate = () => {
      try {
        const newChicagoDate = getChicagoDateISO()
        console.log("Updating Chicago date:", newChicagoDate)
        setInvoiceData((prev) => ({
          ...prev,
          invoiceDate: newChicagoDate,
        }))
        setDateError(null)
      } catch (error) {
        console.error("Error updating Chicago date:", error)
        setDateError(`Error getting current date: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Update immediately
    updateDate()

    // Then set interval
    const interval = setInterval(updateDate, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    try {
      // Load employees from localStorage
      const storedEmployees = JSON.parse(localStorage.getItem("employees") || "[]")

      // Ensure bill rates and pay rates are properly formatted numbers
      const formattedEmployees = storedEmployees.map((emp: Employee) => ({
        ...emp,
        billRate: toFixedNumber(emp.billRate),
        payRate: toFixedNumber(emp.payRate),
      }))

      setEmployees(formattedEmployees)

      // Load monthly hours data
      const storedMonthlyHours: MonthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")
      setMonthlyHours(storedMonthlyHours)

      // Load parties from localStorage
      const storedParties = JSON.parse(localStorage.getItem("parties") || "[]")
      setVendors(storedParties.filter((party: Party) => party.type === "vendor"))
      setClients(storedParties.filter((party: Party) => party.type === "client"))

      // Generate available months from stored data
      const months = Object.keys(storedMonthlyHours).map((monthYear) => {
        const [month, year] = monthYear.split("-")
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
        const monthName = date.toLocaleString("default", { month: "long" })
        return {
          value: monthYear,
          label: `${monthName} ${year}`,
        }
      })

      // Add current month if not already in the list
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()
      const currentMonthYear = `${currentMonth < 10 ? "0" + currentMonth : currentMonth}-${currentYear}`

      if (!months.some((m) => m.value === currentMonthYear)) {
        const currentMonthName = currentDate.toLocaleString("default", { month: "long" })
        months.push({
          value: currentMonthYear,
          label: `${currentMonthName} ${currentYear}`,
        })
      }

      // Sort months by date (newest first)
      months.sort((a, b) => {
        const [monthA, yearA] = a.value.split("-")
        const [monthB, yearB] = b.value.split("-")
        const dateA = new Date(Number.parseInt(yearA), Number.parseInt(monthA) - 1, 1)
        const dateB = new Date(Number.parseInt(yearB), Number.parseInt(monthB) - 1, 1)
        return dateB.getTime() - dateA.getTime()
      })

      setAvailableMonths(months)

      // Set default month to current month
      if (months.length > 0) {
        const selectedMonthYear = months[0].value
        setInvoiceData((prev) => {
          // Calculate first and last day of the selected month
          const [month, year] = selectedMonthYear.split("-")
          const monthNumber = Number.parseInt(month, 10)
          const yearNumber = Number.parseInt(year, 10)

          // Use our helper functions to get correct first and last days
          const firstDay = getFirstDayOfMonthISO(yearNumber, monthNumber)
          const lastDay = getLastDayOfMonthISO(yearNumber, monthNumber)

          return {
            ...prev,
            monthYear: selectedMonthYear,
            startDate: firstDay,
            endDate: lastDay,
          }
        })
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update start and end dates when month changes
  useEffect(() => {
    if (invoiceData.monthYear) {
      try {
        const [month, year] = invoiceData.monthYear.split("-")
        const monthNumber = Number.parseInt(month, 10)
        const yearNumber = Number.parseInt(year, 10)

        // Use our helper functions to get correct first and last days
        const firstDay = getFirstDayOfMonthISO(yearNumber, monthNumber)
        const lastDay = getLastDayOfMonthISO(yearNumber, monthNumber)

        console.log(`Setting period for ${monthNumber}/${yearNumber}: ${firstDay} to ${lastDay}`)

        setInvoiceData((prev) => ({
          ...prev,
          startDate: firstDay,
          endDate: lastDay,
        }))

        setDateError(null)
      } catch (error) {
        console.error("Error updating period dates:", error)
        setDateError(`Error setting period dates: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }, [invoiceData.monthYear])

  useEffect(() => {
    if (invoiceData.employeeId) {
      const employee = employees.find((emp) => emp.id === invoiceData.employeeId)
      if (employee && employee.billToPartyId) {
        // Set the client ID from the employee
        setInvoiceData((prev) => ({
          ...prev,
          clientId: employee.billToPartyId || "",
        }))
      }
    }
  }, [invoiceData.employeeId, employees])

  const handleChange = (name: string, value: string | number | boolean) => {
    setInvoiceData((prev) => ({ ...prev, [name]: value }))
  }

  const getInvoiceDateString = () => {
    const now = new Date()
    const chicagoDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return chicagoDateFormatter.format(now)
  }

  const generateInvoice = async () => {
    try {
      // Validate form
      if (
        !invoiceData.employeeId ||
        !invoiceData.monthYear ||
        !invoiceData.paymentTerms ||
        !invoiceData.vendorId ||
        !invoiceData.clientId ||
        !invoiceData.serviceFor
      ) {
        toast.destructive({
          title: "Error",
          description: "Please fill in all required fields",
        })
        return
      }

      const employee = employees.find((emp) => emp.id === invoiceData.employeeId)

      if (!employee) {
        toast.destructive({
          title: "Error",
          description: "Employee not found",
        })
        return
      }

      // Get the month and year from the selected month
      const [selectedMonth, selectedYear] = invoiceData.monthYear.split("-")
      const monthNumber = Number.parseInt(selectedMonth, 10)
      const yearNumber = Number.parseInt(selectedYear, 10)

      // Use our helper functions to get correct first and last days
      const startDate = getFirstDayOfMonthISO(yearNumber, monthNumber)
      const endDate = getLastDayOfMonthISO(yearNumber, monthNumber)

      // Determine hours worked
      let hours = 0
      if (invoiceData.useStoredHours) {
        // Use hours from monthly data
        const storedHours = monthlyHours[invoiceData.monthYear]?.[employee.id] || 0
        if (storedHours === 0) {
          toast.destructive({
            title: "No Hours Found",
            description: "No hours recorded for this employee in the selected month. Please enter custom hours.",
          })
          return
        }
        hours = storedHours
      } else {
        // Use custom hours
        if (!invoiceData.customHours || invoiceData.customHours <= 0) {
          toast.destructive({
            title: "Error",
            description: "Please enter valid hours worked",
          })
          return
        }
        hours = invoiceData.customHours
      }

      // Ensure precision for bill rate and calculations
      const billRate = toFixedNumber(employee.billRate)
      const payRate = toFixedNumber(employee.payRate)

      const totalBillAmount = toFixedNumber(billRate * hours)
      const totalPayAmount = toFixedNumber(payRate * hours)
      const profit = toFixedNumber(totalBillAmount - totalPayAmount)

      // Get month name for display
      const [month, year] = invoiceData.monthYear.split("-")
      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
      const monthName = date.toLocaleString("default", { month: "long" })

      const selectedVendor = vendors.find((v) => v.id === invoiceData.vendorId)
      const selectedClient = clients.find((c) => c.id === invoiceData.clientId)
      const selectedEmployee = employees.find((e) => e.id === invoiceData.employeeId)

      if (!selectedVendor || !selectedClient) {
        toast.destructive({
          title: "Error",
          description: "Vendor or client not found",
        })
        return
      }

      // Get the current Chicago date at the moment of invoice generation
      // Get the current date at the moment of invoice generation - simplified approach
      const currentDate = getInvoiceDateString()

      console.log("INVOICE GENERATION - CURRENT DATE CHECK")
      console.log("Browser timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone)
      console.log("Local date:", new Date().toString())
      console.log("Invoice date (direct):", currentDate)

      const newInvoice = {
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: currentDate, // Use the direct Chicago date
        paymentTerms: invoiceData.paymentTerms,
        vendor: {
          name: selectedVendor.name,
          address: selectedVendor.address,
          id: selectedVendor.id,
        },
        billTo: {
          name: selectedClient.name,
          address: selectedClient.address,
          id: selectedClient.id,
        },
        serviceFor: invoiceData.serviceFor,
        employee: {
          name: selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : "",
          id: selectedEmployee?.id || "",
          // Store referral IDs and fees but not names
          referrals: selectedEmployee?.referrals
            ? selectedEmployee.referrals.map((ref) => ({
                id: ref.id || "",
                name: ref.name || "",
                fee: toFixedNumber(ref.fee),
              }))
            : [],
        },
        period: {
          month: `${monthName} ${year}`,
          start: startDate,
          end: endDate,
        },
        hours: toFixedNumber(hours),
        billRate: billRate,
        payRate: payRate,
        totalBillAmount: totalBillAmount,
        totalPayAmount: totalPayAmount,
        profit: profit,
        // Add default status as pending
        status: "pending",
        paymentDetails: {
          amountPaid: 0,
          paymentDate: "",
          notes: "",
        },
      }

      setInvoice(newInvoice)

      // Save invoice to localStorage as backup
      const existingInvoices = JSON.parse(localStorage.getItem("invoices") || "[]")
      localStorage.setItem("invoices", JSON.stringify([...existingInvoices, newInvoice]))

      // Show loading toast
      toast.default({
        title: "Generating Invoice",
        description: "Saving invoice to database...",
      })

      // Save to database
      const dbResult = await saveInvoiceToDbAction(newInvoice)

      if (dbResult.success) {
        toast.default({
          title: "Success",
          description: "Invoice generated and saved to database successfully",
        })
      } else {
        toast.destructive({
          title: "Database Save Error",
          description: dbResult.message || "Failed to save invoice to database",
        })
        console.error("Database save error:", dbResult)
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to generate invoice: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const printInvoice = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Generate Invoice</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Enter the details to generate an invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date (Chicago, IL Time)</Label>
              <Input id="invoiceDate" value={invoiceData.invoiceDate} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Current date in Chicago, IL (Central Time)</p>

              {dateError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{dateError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select onValueChange={(value) => handleChange("paymentTerms", value)} value={invoiceData.paymentTerms}>
                <SelectTrigger id="paymentTerms">
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select onValueChange={(value) => handleChange("employeeId", value)} value={invoiceData.employeeId}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.vendorName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select onValueChange={(value) => handleChange("vendorId", value)} value={invoiceData.vendorId}>
                <SelectTrigger id="vendorId">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No vendors available
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {vendors.length === 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <Link href="/manage-parties" className="text-primary hover:underline">
                    Add vendors
                  </Link>{" "}
                  before generating invoices.
                </div>
              )}
            </div>

            {invoiceData.vendorId && (
              <div className="space-y-2">
                <Label htmlFor="vendorAddress">Vendor Address</Label>
                <Textarea
                  id="vendorAddress"
                  value={vendors.find((v) => v.id === invoiceData.vendorId)?.address || ""}
                  readOnly
                  className="bg-muted"
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientId">Bill To (Client)</Label>
              <Select onValueChange={(value) => handleChange("clientId", value)} value={invoiceData.clientId}>
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No clients available
                    </SelectItem>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <Link href="/manage-parties" className="text-primary hover:underline">
                    Add clients
                  </Link>{" "}
                  before generating invoices.
                </div>
              )}
            </div>

            {invoiceData.clientId && (
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Textarea
                  id="clientAddress"
                  value={clients.find((c) => c.id === invoiceData.clientId)?.address || ""}
                  readOnly
                  className="bg-muted"
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="serviceFor">Service For</Label>
              <Input
                id="serviceFor"
                value={invoiceData.serviceFor}
                onChange={(e) => handleChange("serviceFor", e.target.value)}
                placeholder="e.g., IT Consulting Services"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Select Month</Label>
              <Select onValueChange={(value) => handleChange("monthYear", value)} value={invoiceData.monthYear}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useStoredHours"
                  checked={invoiceData.useStoredHours}
                  onChange={(e) => handleChange("useStoredHours", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="useStoredHours">Use stored hours for this month</Label>
              </div>
              {!invoiceData.useStoredHours && (
                <div className="mt-2">
                  <Label htmlFor="customHours">Custom Hours Worked</Label>
                  <Input
                    id="customHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={invoiceData.customHours || ""}
                    onChange={(e) => handleChange("customHours", Number.parseFloat(e.target.value) || 0)}
                    placeholder="40"
                  />
                </div>
              )}
              {invoiceData.useStoredHours && invoiceData.employeeId && invoiceData.monthYear && (
                <div className="mt-2 text-sm">
                  <span className="font-medium">
                    Stored hours: {monthlyHours[invoiceData.monthYear]?.[invoiceData.employeeId] || 0} hours
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Service Period Start Date</Label>
              <Input id="startDate" type="date" value={invoiceData.startDate} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">First day of the selected month</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Service Period End Date</Label>
              <Input id="endDate" type="date" value={invoiceData.endDate} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Last day of the selected month</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={generateInvoice} disabled={employees.length === 0}>
              Generate Invoice
            </Button>
          </CardFooter>
        </Card>

        {invoice && (
          <Card className="print:w-full">
            <CardHeader className="border-b print:pb-2">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">INVOICE</div>
                <Button variant="outline" size="sm" onClick={printInvoice} className="print:hidden">
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 print:p-4">
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">From:</div>
                    <div className="font-semibold">{invoice.vendor.name}</div>
                    <div className="whitespace-pre-line text-sm">{invoice.vendor.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Bill To:</div>
                    <div className="font-semibold">{invoice.billTo.name}</div>
                    <div className="whitespace-pre-line text-sm">{invoice.billTo.address}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Invoice Details:</div>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <div className="font-medium">Invoice Number:</div>
                      <div>{invoice.invoiceNumber}</div>
                      <div className="font-medium">Invoice Date:</div>
                      <div>{formatDate(invoice.date)}</div>
                      <div className="font-medium">Payment Terms:</div>
                      <div>{invoice.paymentTerms}</div>
                      <div className="font-medium">Status:</div>
                      <div>
                        <span className="rounded-full bg-gray-500 px-2 py-0.5 text-xs text-white">Pending</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Service Information:</div>
                    <div className="font-medium">{invoice.serviceFor}</div>
                    <div className="text-sm">
                      Period: {formatDate(invoice.period.start)} - {formatDate(invoice.period.end)}
                    </div>
                  </div>
                </div>

                {/* Invoice Body */}
                <div className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Month of Service</TableHead>
                        <TableHead className="text-right">Hours Worked</TableHead>
                        <TableHead className="text-right">Bill Rate</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">{invoice.employee.name}</TableCell>
                        <TableCell>{invoice.period.month}</TableCell>
                        <TableCell className="text-right">{invoice.hours}</TableCell>
                        <TableCell className="text-right">${invoice.billRate.toFixed(2)}/hr</TableCell>
                        <TableCell className="text-right">${invoice.totalBillAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Invoice Summary */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64">
                      <div className="flex justify-between border-b py-2">
                        <div className="font-medium">Subtotal:</div>
                        <div>${invoice.totalBillAmount.toFixed(2)}</div>
                      </div>
                      <div className="flex justify-between border-b py-2">
                        <div className="font-medium">Tax (0%):</div>
                        <div>$0.00</div>
                      </div>
                      <div className="flex justify-between py-2">
                        <div className="text-lg font-bold">Total Due:</div>
                        <div className="text-lg font-bold">${invoice.totalBillAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thank You Note */}
                <div className="mt-6 text-center text-sm">
                  <p>Thank you for your business!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
