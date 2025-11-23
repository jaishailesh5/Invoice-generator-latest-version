"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MonthlyData } from "./types"

interface EmployeeDashboardProps {
  data: MonthlyData
}

export default function EmployeeDashboard({ data }: EmployeeDashboardProps) {
  const defaultYear = Object.keys(data.employeeData)[0] || new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear)

  useEffect(() => {
    // Add debug logging for received data
    if (data && data.employeeData) {
      console.log("Employee Dashboard - Received Data Sample:", {
        years: Object.keys(data.employeeData),
        firstYearSample: data.employeeData[Object.keys(data.employeeData)[0]],
      })

      // Log a specific employee's payment data if available
      const firstYear = Object.keys(data.employeeData)[0]
      if (firstYear) {
        const firstMonth = Object.keys(data.employeeData[firstYear])[0]
        if (firstMonth) {
          const employees = Object.keys(data.employeeData[firstYear][firstMonth])
          if (employees.length > 0) {
            console.log("Employee Payment Sample:", data.employeeData[firstYear][firstMonth][employees[0]])
          }
        }
      }
    }
  }, [data])

  // Add this check for empty data
  if (!data.employees.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No employee data available. Please create invoices with employee information.
        </p>
      </div>
    )
  }

  const years = Object.keys(data.employeeData)
  const months = data.employeeData[selectedYear] ? Object.keys(data.employeeData[selectedYear]) : []
  const employees = data.employees

  // Calculate total profit for the selected year
  const totalYearlyProfit = months.reduce((total, month) => {
    const monthProfit = employees.reduce((sum, employee) => {
      const employeeData = data.employeeData[selectedYear][month][employee.id]
      return sum + (employeeData?.profit || 0)
    }, 0)
    return total + monthProfit
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employee Financial Data</h2>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hours Worked by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {months.map((month) => (
                  <TableHead key={month}>{month}</TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.name}
                    {employee.hourlyRate === 0 && (
                      <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Zero Pay Rate
                      </span>
                    )}
                  </TableCell>
                  {months.map((month) => {
                    const employeeData = data.employeeData[selectedYear][month][employee.id]
                    return <TableCell key={month}>{employeeData?.hoursWorked.toFixed(2) || "0.00"}</TableCell>
                  })}
                  <TableCell className="font-bold">
                    {months
                      .reduce((total, month) => {
                        const employeeData = data.employeeData[selectedYear][month][employee.id]
                        return total + (employeeData?.hoursWorked || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total</TableCell>
                {months.map((month) => (
                  <TableCell key={month} className="font-bold">
                    {employees
                      .reduce((total, employee) => {
                        const employeeData = data.employeeData[selectedYear][month][employee.id]
                        return total + (employeeData?.hoursWorked || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="font-bold">
                  {months
                    .reduce((monthTotal, month) => {
                      return (
                        monthTotal +
                        employees.reduce((empTotal, employee) => {
                          const employeeData = data.employeeData[selectedYear][month][employee.id]
                          return empTotal + (employeeData?.hoursWorked || 0)
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
          <CardTitle>Amount Paid to Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {months.map((month) => (
                  <TableHead key={month}>{month}</TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.name}
                    {employee.hourlyRate === 0 && (
                      <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Zero Pay Rate
                      </span>
                    )}
                  </TableCell>
                  {months.map((month) => {
                    const employeeData = data.employeeData[selectedYear][month][employee.id]
                    return <TableCell key={month}>${(employeeData?.amountPaid || 0).toFixed(2)}</TableCell>
                  })}
                  <TableCell className="font-bold">
                    $
                    {months
                      .reduce((total, month) => {
                        const employeeData = data.employeeData[selectedYear][month][employee.id]
                        return total + (employeeData?.amountPaid || 0)
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
                    {employees
                      .reduce((total, employee) => {
                        const employeeData = data.employeeData[selectedYear][month][employee.id]
                        return total + (employeeData?.amountPaid || 0)
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
                        employees.reduce((empTotal, employee) => {
                          const employeeData = data.employeeData[selectedYear][month][employee.id]
                          return empTotal + (employeeData?.amountPaid || 0)
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
          <CardTitle>Monthly Profit by Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {months.map((month) => (
                  <TableHead key={month}>{month}</TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.name}
                    {employee.hourlyRate === 0 && (
                      <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Zero Pay Rate
                      </span>
                    )}
                  </TableCell>
                  {months.map((month) => {
                    const employeeData = data.employeeData[selectedYear][month][employee.id]
                    const profit = employeeData?.profit || 0
                    return (
                      <TableCell key={month} className={profit < 0 ? "text-red-500" : "text-green-600"}>
                        ${profit.toFixed(2)}
                      </TableCell>
                    )
                  })}
                  <TableCell
                    className={`font-bold ${
                      months.reduce((total, month) => {
                        const employeeData = data.employeeData[selectedYear][month][employee.id]
                        return total + (employeeData?.profit || 0)
                      }, 0) < 0
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    $
                    {months
                      .reduce((total, month) => {
                        const employeeData = data.employeeData[selectedYear][month][employee.id]
                        return total + (employeeData?.profit || 0)
                      }, 0)
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total</TableCell>
                {months.map((month) => {
                  const monthProfit = employees.reduce((total, employee) => {
                    const employeeData = data.employeeData[selectedYear][month][employee.id]
                    return total + (employeeData?.profit || 0)
                  }, 0)
                  return (
                    <TableCell
                      key={month}
                      className={`font-bold ${monthProfit < 0 ? "text-red-500" : "text-green-600"}`}
                    >
                      ${monthProfit.toFixed(2)}
                    </TableCell>
                  )
                })}
                <TableCell className={`font-bold ${totalYearlyProfit < 0 ? "text-red-500" : "text-green-600"}`}>
                  ${totalYearlyProfit.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
