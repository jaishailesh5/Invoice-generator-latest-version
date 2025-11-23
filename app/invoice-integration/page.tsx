"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getChicagoDateISO, formatDate, getMonthName, createServicePeriod } from "@/lib/date-utils"

// Mock data for demonstration
const mockEmployees = [
  { id: "1", name: "John Doe", billRate: 75, payRate: 50 },
  { id: "2", name: "Jane Smith", billRate: 85, payRate: 60 },
]

const mockVendors = [{ id: "1", name: "ABC Consulting", address: "123 Main St\nChicago, IL 60601" }]

const mockClients = [{ id: "1", name: "XYZ Corporation", address: "456 Business Ave\nNew York, NY 10001" }]

export default function InvoiceIntegrationPage() {
  const [invoiceDate, setInvoiceDate] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedVendor, setSelectedVendor] = useState("")
  const [selectedClient, setSelectedClient] = useState("")
  const [hoursWorked, setHoursWorked] = useState(40)
  const [servicePeriod, setServicePeriod] = useState<any>(null)
  const [invoice, setInvoice] = useState<any>(null)
  const [dateError, setDateError] = useState<string | null>(null)

  // Generate years for dropdown (current year - 2 to current year + 1)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i)

  // Update current date every minute
  useEffect(() => {
    const updateDate = () => {
      try {
        const newDate = getChicagoDateISO()
        setInvoiceDate(newDate)
        setDateError(null)
      } catch (error) {
        console.error("Error getting Chicago date:", error)
        setDateError(`Error getting current date: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Initial update
    updateDate()

    // Set interval for updates
    const timer = setInterval(updateDate, 60000)

    return () => clearInterval(timer)
  }, [])

  // Update service period when month or year changes
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      try {
        setServicePeriod(createServicePeriod(selectedMonth, selectedYear))
        setDateError(null)
      } catch (error) {
        console.error("Error creating service period:", error)
        setDateError(`Error creating service period: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }, [selectedMonth, selectedYear])

  const generateInvoice = () => {
    if (!selectedEmployee || !selectedVendor || !selectedClient || !servicePeriod) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const employee = mockEmployees.find((emp) => emp.id === selectedEmployee)
      const vendor = mockVendors.find((v) => v.id === selectedVendor)
      const client = mockClients.find((c) => c.id === selectedClient)

      if (!employee || !vendor || !client) {
        alert("Invalid selection")
        return
      }

      const totalBillAmount = employee.billRate * hoursWorked
      const totalPayAmount = employee.payRate * hoursWorked
      const profit = totalBillAmount - totalPayAmount

      // Get current Chicago date for invoice date
      const currentDate = getChicagoDateISO()

      // Generate invoice with correct dates
      const newInvoice = {
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: currentDate,
        paymentTerms: "Net 30",
        vendor: {
          name: vendor.name,
          address: vendor.address,
        },
        billTo: {
          name: client.name,
          address: client.address,
        },
        serviceFor: "IT Consulting Services",
        employee: {
          name: employee.name,
          id: employee.id,
        },
        period: servicePeriod,
        hours: hoursWorked,
        billRate: employee.billRate,
        payRate: employee.payRate,
        totalBillAmount,
        totalPayAmount,
        profit,
      }

      setInvoice(newInvoice)
    } catch (error) {
      console.error("Error generating invoice:", error)
      alert(`Error generating invoice: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Invoice Integration Example</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Enter the details to generate an invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date (Chicago, IL Time)</Label>
              <Input id="invoiceDate" value={invoiceDate} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Current date in Chicago, IL (Central Time)</p>

              {dateError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{dateError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month">Month</Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(Number.parseInt(value, 10))}
                >
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {getMonthName(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(Number.parseInt(value, 10))}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {mockEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {mockVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Bill To (Client)</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Hours Worked</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
              />
            </div>

            {servicePeriod && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-medium">Service Period</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Period:</div>
                  <div>{servicePeriod.month}</div>
                  <div>Start Date:</div>
                  <div>{formatDate(servicePeriod.start)}</div>
                  <div>End Date:</div>
                  <div>{formatDate(servicePeriod.end)}</div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={generateInvoice}>
              Generate Invoice
            </Button>
          </CardFooter>
        </Card>

        {invoice && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">INVOICE</div>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
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
