"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { MonthlyData } from "../types"

interface ExportDataProps {
  data: MonthlyData
  selectedYear: string
  selectedMonth?: string
}

export function ExportData({ data, selectedYear, selectedMonth }: ExportDataProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    includeEmployeeData: true,
    includeClientData: true,
    includeReferralData: true,
    format: "csv",
  })

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Prepare the data based on selected options
      const exportData: any = {
        year: selectedYear,
        month: selectedMonth || "All Months",
      }

      if (exportOptions.includeEmployeeData) {
        exportData.employees = data.employees
        exportData.employeeData = selectedMonth
          ? { [selectedMonth]: data.employeeData[selectedYear]?.[selectedMonth] }
          : data.employeeData[selectedYear]
      }

      if (exportOptions.includeClientData) {
        exportData.clients = data.clients
        exportData.clientData = selectedMonth
          ? { [selectedMonth]: data.clientData[selectedYear]?.[selectedMonth] }
          : data.clientData[selectedYear]
      }

      if (exportOptions.includeReferralData) {
        exportData.referrals = data.referrals
        exportData.referralData = selectedMonth
          ? { [selectedMonth]: data.referralData[selectedYear]?.[selectedMonth] }
          : data.referralData[selectedYear]
      }

      // Convert to CSV or JSON
      let content: string
      let fileExtension: string
      let mimeType: string

      if (exportOptions.format === "csv") {
        content = convertToCSV(exportData)
        fileExtension = "csv"
        mimeType = "text/csv"
      } else {
        content = JSON.stringify(exportData, null, 2)
        fileExtension = "json"
        mimeType = "application/json"
      }

      // Create and download the file
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `financial-data-${selectedYear}${selectedMonth ? "-" + selectedMonth : ""}.${fileExtension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Failed to export data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Helper function to convert data to CSV format
  const convertToCSV = (data: any) => {
    // This is a simplified implementation
    // In a real app, you'd want a more robust CSV conversion
    const replacer = (key: string, value: any) => (value === null ? "" : value)

    let csv = ""

    // Handle employee data
    if (data.employees && data.employeeData) {
      csv += "EMPLOYEE DATA\n"
      csv += "Employee,Month,Hours,Amount Paid,Amount Billed,Profit\n"

      data.employees.forEach((employee: any) => {
        Object.entries(data.employeeData).forEach(([month, monthData]: [string, any]) => {
          const empData = monthData[employee.id]
          if (empData) {
            csv += `${employee.name},${month},${empData.hoursWorked},${empData.amountPaid},${empData.amountBilled},${empData.profit}\n`
          }
        })
      })

      csv += "\n"
    }

    // Similar implementations for client and referral data would go here

    return csv
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Financial Data</DialogTitle>
          <DialogDescription>Select what data you want to include in your export.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="employeeData"
              checked={exportOptions.includeEmployeeData}
              onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeEmployeeData: !!checked })}
            />
            <Label htmlFor="employeeData">Include Employee Data</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="clientData"
              checked={exportOptions.includeClientData}
              onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeClientData: !!checked })}
            />
            <Label htmlFor="clientData">Include Client Data</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="referralData"
              checked={exportOptions.includeReferralData}
              onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeReferralData: !!checked })}
            />
            <Label htmlFor="referralData">Include Referral Data</Label>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <div className="text-sm font-medium">Export Format:</div>
            <Button
              variant={exportOptions.format === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportOptions({ ...exportOptions, format: "csv" })}
            >
              CSV
            </Button>
            <Button
              variant={exportOptions.format === "json" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportOptions({ ...exportOptions, format: "json" })}
            >
              JSON
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isExporting ? "Exporting..." : "Export Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
