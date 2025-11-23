"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Bug } from "lucide-react"
import EmployeeDashboard from "./employee-dashboard"
import ClientDashboard from "./client-dashboard"
import FinancialSummary from "./financial-summary"
import { getMonthlyData } from "./utils"
import type { MonthlyData } from "./types"
import { generateSampleData } from "./sample-data"
import ReferralDashboard from "./referral-dashboard"

export default function FinanceDashboard() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingSampleData, setUsingSampleData] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setDebugInfo(null)

      console.log("Loading dashboard data...")

      // Try to get data from localStorage first
      const invoicesJson = localStorage.getItem("invoices")

      if (!invoicesJson) {
        console.log("No invoices found in localStorage, fetching from database")
        try {
          // Import the function to fetch from database
          const { getMonthlyDataFromDb } = await import("./utils")
          const data = await getMonthlyDataFromDb()
          console.log("Dashboard data loaded from database:", data)

          // If we got data, save it to state
          if (data) {
            setMonthlyData(data)
            setIsLoading(false)
            setUsingSampleData(false)
            return
          } else {
            throw new Error("No data returned from database")
          }
        } catch (dbError) {
          console.error("Error loading dashboard data from database:", dbError)
          throw dbError
        }
      }

      // If localStorage has data, use the regular function
      const data = getMonthlyData()
      console.log("Dashboard data loaded from localStorage:", data)

      if (!data || (!data.employees?.length && !data.clients?.length)) {
        console.log("No valid data found in localStorage")
        // Try database as a fallback
        try {
          const { getMonthlyDataFromDb } = await import("./utils")
          const dbData = await getMonthlyDataFromDb()
          if (dbData) {
            setMonthlyData(dbData)
            setIsLoading(false)
            setUsingSampleData(false)
            return
          }
        } catch (fallbackError) {
          console.error("Error in fallback data load:", fallbackError)
        }
      }

      setMonthlyData(data)
      setIsLoading(false)
      setUsingSampleData(false)
    } catch (err) {
      console.error("Error loading dashboard data:", err)
      setError(`Failed to load dashboard data: ${err instanceof Error ? err.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }

  // Add a new function to force refresh data from database
  // Add this function after the loadDashboardData function

  const forceRefreshFromDatabase = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setDebugInfo(null)

      console.log("Force refreshing dashboard data from database...")

      // Import the function to fetch from database
      const { getMonthlyDataFromDb } = await import("./utils")
      const data = await getMonthlyDataFromDb()
      console.log("Dashboard data refreshed from database:", data)

      // If we got data, save it to state
      if (data) {
        setMonthlyData(data)
        setIsLoading(false)
        setUsingSampleData(false)
      } else {
        throw new Error("No data returned from database")
      }
    } catch (err) {
      console.error("Error refreshing dashboard data:", err)
      setError(`Failed to refresh dashboard data: ${err instanceof Error ? err.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }

  // Modify the useEffect to check for a refresh flag in localStorage
  // Replace the existing useEffect with this one

  useEffect(() => {
    // Check if we need to force refresh from database
    const needsRefresh = localStorage.getItem("finance_dashboard_needs_refresh") === "true"

    if (needsRefresh) {
      // Clear the flag
      localStorage.removeItem("finance_dashboard_needs_refresh")
      // Force refresh from database
      forceRefreshFromDatabase()
    } else {
      // Normal load
      loadDashboardData()
    }
  }, [])

  const handleLoadSampleData = () => {
    try {
      const sampleData = generateSampleData()
      setMonthlyData(sampleData)
      setUsingSampleData(true)
      setError(null)
      setDebugInfo(null)
    } catch (err) {
      console.error("Error generating sample data:", err)
      setError(`Failed to generate sample data: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleShowDebugInfo = () => {
    try {
      const invoicesJson = localStorage.getItem("invoices")
      const invoices = invoicesJson ? JSON.parse(invoicesJson) : []
      setDebugInfo(
        `Found ${invoices.length} invoices in localStorage.\n\n` +
          `Invoice structure sample: ${JSON.stringify(invoices[0], null, 2)}\n\n` +
          `Monthly data: ${JSON.stringify(monthlyData, null, 2)}`,
      )
    } catch (err) {
      setDebugInfo(`Error getting debug info: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Finance Dashboard</h1>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Try Sample Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-muted-foreground mb-4">You can try the dashboard with sample data instead.</p>
              <div className="flex gap-4">
                <button
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Load Sample Data
                </button>
                <button
                  onClick={loadDashboardData}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (monthlyData && (!monthlyData.employees.length || !monthlyData.clients.length)) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Finance Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoice data found</h3>
              <p className="text-muted-foreground mb-6">
                The dashboard couldn't extract employee or client data from your invoices.
              </p>
              <div className="flex gap-4">
                <a
                  href="/generate-invoice"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Create Invoice
                </a>
                <button
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Load Sample Data
                </button>
                <button
                  onClick={handleShowDebugInfo}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Debug
                </button>
              </div>
            </div>

            {debugInfo && (
              <div className="mt-6 p-4 bg-muted rounded-md">
                <h4 className="font-semibold mb-2">Debug Information</h4>
                <pre className="text-xs overflow-auto max-h-96 p-2 bg-background rounded">{debugInfo}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Finance Dashboard</h1>

      {usingSampleData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sample Data</AlertTitle>
          <AlertDescription>
            You are viewing the dashboard with sample data. This data is for demonstration purposes only.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={handleShowDebugInfo}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug
        </button>
      </div>

      {debugInfo && (
        <div className="mb-6 p-4 bg-muted rounded-md">
          <h4 className="font-semibold mb-2">Debug Information</h4>
          <pre className="text-xs overflow-auto max-h-96 p-2 bg-background rounded">{debugInfo}</pre>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>View detailed financial metrics for your business</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">{monthlyData && <FinancialSummary data={monthlyData} />}</TabsContent>

            <TabsContent value="employees">{monthlyData && <EmployeeDashboard data={monthlyData} />}</TabsContent>

            <TabsContent value="clients">{monthlyData && <ClientDashboard data={monthlyData} />}</TabsContent>

            <TabsContent value="referrals">{monthlyData && <ReferralDashboard data={monthlyData} />}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
