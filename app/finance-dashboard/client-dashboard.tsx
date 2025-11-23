"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DollarSign, Calendar } from "lucide-react"
import { getMonthlyData } from "./utils"
import type { MonthlyData } from "./types"

interface ClientDashboardProps {
  data: MonthlyData
}

export default function ClientDashboard({ data: initialData }: ClientDashboardProps) {
  // Add accounting method state with localStorage persistence
  const [accountingMethod, setAccountingMethod] = useState<"accrual" | "cash">(() => {
    // Try to get from localStorage, default to accrual if not found
    if (typeof window !== "undefined") {
      return (localStorage.getItem("client_accounting_method") as "accrual" | "cash") || "accrual"
    }
    return "accrual"
  })

  // State to hold processed data based on accounting method
  const [data, setData] = useState<MonthlyData>(initialData)

  // Update localStorage when accounting method changes
  useEffect(() => {
    localStorage.setItem("client_accounting_method", accountingMethod)

    // Reprocess data when accounting method changes
    try {
      const processedData = getMonthlyData(accountingMethod)
      setData(processedData)
    } catch (error) {
      console.error("Error processing client data with new accounting method:", error)
    }
  }, [accountingMethod])

  const defaultYear = Object.keys(data.clientData)[0] || new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear)

  // Add this check for empty data
  if (!data.clients.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No client data available. Please create invoices with client information.
        </p>
      </div>
    )
  }

  const years = Object.keys(data.clientData)
  const months = data.clientData[selectedYear] ? Object.keys(data.clientData[selectedYear]) : []
  const clients = data.clients

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Client Financial Data</h2>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Accounting Method Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Tabs
                    value={accountingMethod}
                    onValueChange={(value) => setAccountingMethod(value as "accrual" | "cash")}
                  >
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="accrual" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">Accrual</span>
                      </TabsTrigger>
                      <TabsTrigger value="cash" className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="hidden sm:inline">Cash</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {accountingMethod === "accrual"
                    ? "Accrual-based: Shows amounts when invoiced"
                    : "Cash-based: Shows amounts when payment received"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Accounting Method Indicator */}
      <div className="bg-muted px-4 py-2 rounded-md text-sm flex items-center justify-between">
        <div>
          <span className="font-medium">Client View: </span>
          <span className="text-primary">
            {accountingMethod === "accrual"
              ? "Accrual-based (amounts when invoiced)"
              : "Cash-based (amounts when paid)"}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {accountingMethod === "accrual"
            ? "Shows all invoiced amounts regardless of payment status"
            : "Only shows actual payments received from clients"}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {accountingMethod === "accrual" ? "Amount to be Paid by Clients" : "Amount Invoiced to Clients"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                {months.map((month) => (
                  <TableHead key={month}>{month}</TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  {months.map((month) => {
                    const clientData = data.clientData[selectedYear][month][client.id]
                    return <TableCell key={month}>${clientData?.amountDue.toFixed(2) || "0.00"}</TableCell>
                  })}
                  <TableCell className="font-bold">
                    $
                    {months
                      .reduce((total, month) => {
                        const clientData = data.clientData[selectedYear][month][client.id]
                        return total + (clientData?.amountDue || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total</TableCell>
                {months.map((month) => (
                  <TableCell key={month} className="font-bold">
                    $
                    {clients
                      .reduce((total, client) => {
                        const clientData = data.clientData[selectedYear][month][client.id]
                        return total + (clientData?.amountDue || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="font-bold">
                  $
                  {months
                    .reduce((monthTotal, month) => {
                      return (
                        monthTotal +
                        clients.reduce((clientTotal, client) => {
                          const clientData = data.clientData[selectedYear][month][client.id]
                          return clientTotal + (clientData?.amountDue || 0)
                        }, 0)
                      )
                    }, 0)
                    .toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amount Received from Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                {months.map((month) => (
                  <TableHead key={month}>{month}</TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  {months.map((month) => {
                    const clientData = data.clientData[selectedYear][month][client.id]
                    return <TableCell key={month}>${clientData?.amountPaid.toFixed(2) || "0.00"}</TableCell>
                  })}
                  <TableCell className="font-bold">
                    $
                    {months
                      .reduce((total, month) => {
                        const clientData = data.clientData[selectedYear][month][client.id]
                        return total + (clientData?.amountPaid || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total</TableCell>
                {months.map((month) => (
                  <TableCell key={month} className="font-bold">
                    $
                    {clients
                      .reduce((total, client) => {
                        const clientData = data.clientData[selectedYear][month][client.id]
                        return total + (clientData?.amountPaid || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="font-bold">
                  $
                  {months
                    .reduce((monthTotal, month) => {
                      return (
                        monthTotal +
                        clients.reduce((clientTotal, client) => {
                          const clientData = data.clientData[selectedYear][month][client.id]
                          return clientTotal + (clientData?.amountPaid || 0)
                        }, 0)
                      )
                    }, 0)
                    .toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Only show Outstanding Balances for accrual method */}
      {accountingMethod === "accrual" && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  {months.map((month) => (
                    <TableHead key={month}>{month}</TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    {months.map((month) => {
                      const clientData = data.clientData[selectedYear][month][client.id]
                      const outstanding = (clientData?.amountDue || 0) - (clientData?.amountPaid || 0)
                      return (
                        <TableCell key={month} className={outstanding > 0 ? "text-red-500" : "text-green-600"}>
                          ${outstanding.toFixed(2)}
                        </TableCell>
                      )
                    })}
                    <TableCell
                      className={`font-bold ${
                        months.reduce((total, month) => {
                          const clientData = data.clientData[selectedYear][month][client.id]
                          return total + ((clientData?.amountDue || 0) - (clientData?.amountPaid || 0))
                        }, 0) > 0
                          ? "text-red-500"
                          : "text-green-600"
                      }`}
                    >
                      $
                      {months
                        .reduce((total, month) => {
                          const clientData = data.clientData[selectedYear][month][client.id]
                          return total + ((clientData?.amountDue || 0) - (clientData?.amountPaid || 0))
                        }, 0)
                        .toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Total</TableCell>
                  {months.map((month) => {
                    const monthOutstanding = clients.reduce((total, client) => {
                      const clientData = data.clientData[selectedYear][month][client.id]
                      return total + ((clientData?.amountDue || 0) - (clientData?.amountPaid || 0))
                    }, 0)
                    return (
                      <TableCell
                        key={month}
                        className={`font-bold ${monthOutstanding > 0 ? "text-red-500" : "text-green-600"}`}
                      >
                        ${monthOutstanding.toFixed(2)}
                      </TableCell>
                    )
                  })}
                  <TableCell
                    className={`font-bold ${
                      months.reduce((monthTotal, month) => {
                        return (
                          monthTotal +
                          clients.reduce((clientTotal, client) => {
                            const clientData = data.clientData[selectedYear][month][client.id]
                            return clientTotal + ((clientData?.amountDue || 0) - (clientData?.amountPaid || 0))
                          }, 0)
                        )
                      }, 0) > 0
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    $
                    {months
                      .reduce((monthTotal, month) => {
                        return (
                          monthTotal +
                          clients.reduce((clientTotal, client) => {
                            const clientData = data.clientData[selectedYear][month][client.id]
                            return clientTotal + ((clientData?.amountDue || 0) - (clientData?.amountPaid || 0))
                          }, 0)
                        )
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cash-based explanation */}
      {accountingMethod === "cash" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Cash-Based Accounting View</h4>
                <p className="text-sm text-blue-700">
                  In cash-based view, amounts are only recorded when payments are actually received. The "Amount to be
                  Paid" and "Amount Received" will be the same since only paid invoices are included. Outstanding
                  balances are not shown as they don't apply to cash-based accounting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
