"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function MigrationClient() {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [localStorageData, setLocalStorageData] = useState<{ [key: string]: any }>({})

  // Function to collect localStorage data
  const collectLocalStorageData = () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        console.error("Not in browser environment")
        return null
      }

      const data: { [key: string]: any } = {}

      // Collect parties
      try {
        const parties = JSON.parse(localStorage.getItem("parties") || "[]")
        data.parties = parties
        console.log(`Found ${parties.length} parties in localStorage`)
      } catch (error) {
        console.error("Error parsing parties:", error)
        data.parties = []
      }

      // Collect employees
      try {
        const employees = JSON.parse(localStorage.getItem("employees") || "[]")
        data.employees = employees
        console.log(`Found ${employees.length} employees in localStorage`)
      } catch (error) {
        console.error("Error parsing employees:", error)
        data.employees = []
      }

      // Collect monthly hours
      try {
        const monthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")
        data.monthlyHours = monthlyHours
        console.log(`Found monthly hours data in localStorage`)
      } catch (error) {
        console.error("Error parsing monthlyHours:", error)
        data.monthlyHours = {}
      }

      // Collect invoices
      try {
        const invoices = JSON.parse(localStorage.getItem("invoices") || "[]")
        data.invoices = invoices
        console.log(`Found ${invoices.length} invoices in localStorage`)
      } catch (error) {
        console.error("Error parsing invoices:", error)
        data.invoices = []
      }

      return data
    } catch (error) {
      console.error("Error collecting localStorage data:", error)
      return null
    }
  }

  // Function to migrate data
  const migrateData = async () => {
    setIsMigrating(true)
    setMigrationStatus(null)

    try {
      // Collect data from localStorage
      const data = collectLocalStorageData()

      if (!data) {
        setMigrationStatus({
          success: false,
          message: "Failed to collect data from localStorage",
        })
        setIsMigrating(false)
        return
      }

      setLocalStorageData(data)
      console.log("Collected localStorage data:", data)

      // Send data to server for migration
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log("Migration result:", result)

      setMigrationStatus(result)
    } catch (error) {
      console.error("Migration error:", error)
      setMigrationStatus({
        success: false,
        message: `Error migrating data: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-2 font-medium">Data to migrate from localStorage:</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <span>Parties: {localStorageData.parties ? localStorageData.parties.length : "Not collected yet"}</span>
          </li>
          <li>
            <span>
              Employees: {localStorageData.employees ? localStorageData.employees.length : "Not collected yet"}
            </span>
          </li>
          <li>
            <span>
              Monthly Hours:{" "}
              {localStorageData.monthlyHours ? Object.keys(localStorageData.monthlyHours).length : "Not collected yet"}{" "}
              months
            </span>
          </li>
          <li>
            <span>Invoices: {localStorageData.invoices ? localStorageData.invoices.length : "Not collected yet"}</span>
          </li>
        </ul>
      </div>

      {migrationStatus && (
        <Alert variant={migrationStatus.success ? "default" : "destructive"} className="mb-4">
          {migrationStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{migrationStatus.message}</AlertDescription>
        </Alert>
      )}

      <Button onClick={migrateData} disabled={isMigrating}>
        {isMigrating ? "Migrating..." : "Migrate Data from localStorage"}
      </Button>
    </div>
  )
}
