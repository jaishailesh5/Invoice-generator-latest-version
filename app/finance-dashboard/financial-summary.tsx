"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { BarChart, LineChart, DollarSign, Calendar } from "lucide-react"
import { formatCurrency, getMonthNames, getMonthlyData } from "./utils"
import type { MonthlyData } from "./types"
import { RevenueChart } from "./components/revenue-chart"
import { FinancialInsights } from "./components/financial-insights"
import { ExportData } from "./components/export-data"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function FinancialSummary({ data: initialData }: { data: MonthlyData }) {
  // Add accounting method state with localStorage persistence
  const [accountingMethod, setAccountingMethod] = useState<"accrual" | "cash">(() => {
    // Try to get from localStorage, default to accrual if not found
    if (typeof window !== "undefined") {
      return (localStorage.getItem("accounting_method") as "accrual" | "cash") || "accrual"
    }
    return "accrual"
  })

  // State to hold processed data based on accounting method
  const [data, setData] = useState<MonthlyData>(initialData)

  // Update localStorage when accounting method changes
  useEffect(() => {
    localStorage.setItem("accounting_method", accountingMethod)

    // Reprocess data when accounting method changes
    try {
      const processedData = getMonthlyData(accountingMethod)
      setData(processedData)
    } catch (error) {
      console.error("Error processing data with new accounting method:", error)
    }
  }, [accountingMethod])

  // Ensure data is properly initialized
  const safeData = {
    ...data,
    employeeData: data.employeeData || {},
    clientData: data.clientData || {},
    referralData: data.referralData || {},
  }

  // Get available years from the data with safety checks
  const availableYears = Array.from(
    new Set([
      ...Object.keys(safeData.employeeData || {}),
      ...Object.keys(safeData.clientData || {}),
      ...Object.keys(safeData.referralData || {}),
    ]),
  )
    .sort()
    .reverse()

  // Initialize state with a safe default value
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")

  // Set the selected year safely using useEffect to avoid render issues
  useEffect(() => {
    if (selectedYear === "" && availableYears.length > 0) {
      setSelectedYear(availableYears[0])
    } else if (selectedYear === "" && availableYears.length === 0) {
      // If no years available, set to current year as fallback
      setSelectedYear(new Date().getFullYear().toString())
    }
  }, [availableYears, selectedYear])

  // Get month names in order
  const monthNames = getMonthNames()

  // Get available months for the selected year
  const availableMonths = selectedYear
    ? Array.from(
        new Set([
          ...Object.keys(safeData.employeeData[selectedYear] || {}),
          ...Object.keys(safeData.clientData[selectedYear] || {}),
          ...Object.keys(safeData.referralData[selectedYear] || {}),
        ]),
      ).sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    : []

  // Calculate monthly financial data
  const getMonthlyFinancialData = () => {
    if (!selectedYear) return []

    if (selectedMonth !== "all") {
      // Return data for a specific month
      return [calculateMonthData(selectedYear, selectedMonth)]
    }

    // Return data for all months in the selected year
    return availableMonths.map((month) => calculateMonthData(selectedYear, month))
  }

  // Calculate financial data for a specific month
  const calculateMonthData = (year: string, month: string) => {
    // Initialize with safe defaults
    let totalBilled = 0
    let totalPaid = 0
    let totalProfit = 0
    let totalReferralPaid = 0
    let totalHours = 0

    // Calculate employee-related totals
    if (safeData.employeeData[year] && safeData.employeeData[year][month]) {
      Object.values(safeData.employeeData[year][month]).forEach((empData) => {
        totalBilled += empData.amountBilled || 0
        totalPaid += empData.amountPaid || 0
        totalProfit += empData.profit || 0
        totalHours += empData.hoursWorked || 0
      })
    }

    // Calculate referral payments
    if (safeData.referralData[year] && safeData.referralData[year][month]) {
      Object.values(safeData.referralData[year][month]).forEach((refData) => {
        totalReferralPaid += refData.amountPaid || 0
      })
    }

    // Calculate profit margin with safety check for division by zero
    const profitMargin = totalBilled > 0 ? (totalProfit / totalBilled) * 100 : 0

    return {
      month,
      totalBilled,
      totalPaid,
      totalReferralPaid,
      totalProfit,
      profitMargin,
      totalHours,
    }
  }

  const monthlyData = getMonthlyFinancialData()

  // Calculate yearly totals
  const yearlyTotals = monthlyData.reduce(
    (acc, month) => {
      acc.totalBilled += month.totalBilled
      acc.totalPaid += month.totalPaid
      acc.totalReferralPaid += month.totalReferralPaid
      acc.totalProfit += month.totalProfit
      acc.totalHours += month.totalHours
      return acc
    },
    { totalBilled: 0, totalPaid: 0, totalReferralPaid: 0, totalProfit: 0, totalHours: 0 },
  )

  // Calculate yearly profit margin with safety check
  const yearlyProfitMargin =
    yearlyTotals.totalBilled > 0 ? (yearlyTotals.totalProfit / yearlyTotals.totalBilled) * 100 : 0

  // Prepare data for charts
  const chartMonths = monthlyData.map((data) => data.month)
  const chartRevenue = monthlyData.map((data) => data.totalBilled)
  const chartExpenses = monthlyData.map((data) => data.totalPaid + data.totalReferralPaid)
  const chartProfit = monthlyData.map((data) => data.totalProfit)

  // Calculate previous year data for insights (if available)
  const getPreviousPeriodData = () => {
    const currentYearNum = Number.parseInt(selectedYear)
    const previousYear = (currentYearNum - 1).toString()

    // Check if previous year data exists
    if (!safeData.employeeData[previousYear]) {
      return undefined
    }

    // For simplicity, we'll just sum up the totals for the previous year
    let prevYearBilled = 0
    let prevYearPaid = 0
    let prevYearReferralPaid = 0
    let prevYearProfit = 0

    // Get the same months that we have for the current year
    const prevYearMonths = Object.keys(safeData.employeeData[previousYear] || {}).filter((month) =>
      availableMonths.includes(month),
    )

    prevYearMonths.forEach((month) => {
      const monthData = calculateMonthData(previousYear, month)
      prevYearBilled += monthData.totalBilled
      prevYearPaid += monthData.totalPaid
      prevYearReferralPaid += monthData.totalReferralPaid
      prevYearProfit += monthData.totalProfit
    })

    const prevYearProfitMargin = prevYearBilled > 0 ? (prevYearProfit / prevYearBilled) * 100 : 0

    return {
      revenue: prevYearBilled,
      expenses: prevYearPaid + prevYearReferralPaid,
      profit: prevYearProfit,
      profitMargin: prevYearProfitMargin,
    }
  }

  const previousPeriodData = getPreviousPeriodData()
  const currentPeriodData = {
    revenue: yearlyTotals.totalBilled,
    expenses: yearlyTotals.totalPaid + yearlyTotals.totalReferralPaid,
    profit: yearlyTotals.totalProfit,
    profitMargin: yearlyProfitMargin,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
              {availableYears.length === 0 && (
                <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={availableMonths.length === 0}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
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
                    ? "Accrual-based: Revenue counted when earned (invoice date)"
                    : "Cash-based: Revenue counted when payment received"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-none"
            >
              <BarChart className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "chart" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("chart")}
              className="rounded-none"
            >
              <LineChart className="h-4 w-4 mr-2" />
              Chart
            </Button>
          </div>

          <ExportData
            data={safeData}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth !== "all" ? selectedMonth : undefined}
          />
        </div>
      </div>

      {/* Accounting Method Indicator */}
      <div className="bg-muted px-4 py-2 rounded-md text-sm flex items-center justify-between">
        <div>
          <span className="font-medium">Accounting Method: </span>
          <span className="text-primary">
            {accountingMethod === "accrual"
              ? "Accrual-based (revenue when earned)"
              : "Cash-based (revenue when received)"}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {accountingMethod === "accrual"
            ? "Shows work performed regardless of payment status"
            : "Only shows paid invoices and actual cash received"}
        </div>
      </div>

      {/* Financial Insights Section */}
      {previousPeriodData && (
        <FinancialInsights
          currentPeriodData={currentPeriodData}
          previousPeriodData={previousPeriodData}
          periodType="year"
        />
      )}

      {/* Chart View */}
      {viewMode === "chart" && monthlyData.length > 0 && (
        <RevenueChart
          months={chartMonths}
          revenue={chartRevenue}
          expenses={chartExpenses}
          profit={chartProfit}
          title={`${accountingMethod === "accrual" ? "Accrual-based" : "Cash-based"} Financial Overview - ${selectedMonth === "all" ? "Monthly" : selectedMonth}`}
        />
      )}

      {/* Original Table View - Preserved for existing functionality */}
      {viewMode === "table" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {`${accountingMethod === "accrual" ? "Accrual-based" : "Cash-based"} ${selectedMonth === "all" ? "Monthly" : ""} Financial Overview ${selectedMonth !== "all" ? `- ${selectedMonth}` : ""}`}
            </CardTitle>
            <CardDescription>
              {selectedMonth === "all"
                ? `Financial performance by month for ${selectedYear} (${accountingMethod === "accrual" ? "when earned" : "when paid"})`
                : `Financial performance for ${selectedMonth} ${selectedYear} (${accountingMethod === "accrual" ? "when earned" : "when paid"})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No financial data available for the selected period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">
                      {accountingMethod === "accrual" ? "Billed" : "Revenue Received"}
                    </TableHead>
                    <TableHead className="text-right">Employee Payments</TableHead>
                    <TableHead className="text-right">Referral Payments</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell className="text-right">{month.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.totalBilled)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.totalPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.totalReferralPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.totalProfit)}</TableCell>
                      <TableCell className="text-right">{month.profitMargin.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}

                  {/* Only show totals row when viewing all months */}
                  {selectedMonth === "all" && (
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{yearlyTotals.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.totalBilled)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.totalPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.totalReferralPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.totalProfit)}</TableCell>
                      <TableCell className="text-right">{yearlyProfitMargin.toFixed(1)}%</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Enhanced with visual indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {accountingMethod === "accrual" ? "Total Revenue" : "Total Cash Received"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalBilled)}</div>
            {selectedMonth === "all" && <p className="text-xs text-muted-foreground">For all of {selectedYear}</p>}
          </CardContent>
          {previousPeriodData && (
            <div
              className={`h-1 w-full ${
                yearlyTotals.totalBilled > previousPeriodData.revenue ? "bg-green-500" : "bg-red-500"
              }`}
            />
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Employee Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {((yearlyTotals.totalPaid / yearlyTotals.totalBilled) * 100).toFixed(1)}% of revenue
            </p>
          </CardContent>
          {previousPeriodData && (
            <div
              className={`h-1 w-full ${
                yearlyTotals.totalPaid < previousPeriodData.expenses ? "bg-green-500" : "bg-red-500"
              }`}
            />
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Referral Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalReferralPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {((yearlyTotals.totalReferralPaid / yearlyTotals.totalBilled) * 100).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">{yearlyProfitMargin.toFixed(1)}% margin</p>
          </CardContent>
          {previousPeriodData && (
            <div
              className={`h-1 w-full ${
                yearlyTotals.totalProfit > previousPeriodData.profit ? "bg-green-500" : "bg-red-500"
              }`}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
