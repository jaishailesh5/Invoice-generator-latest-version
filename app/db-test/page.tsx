"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Database } from "lucide-react"

export default function DatabaseTestPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testEmployeeOperations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/employees/test")
      const data = await response.json()

      setResult(data)

      if (!data.success) {
        setError(data.message || "Failed to test employee database operations")
      }
    } catch (err) {
      console.error("Error testing database:", err)
      setError("An error occurred while testing the database")
    } finally {
      setIsLoading(false)
    }
  }

  const createTestEmployee = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Create a test employee directly in the database
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: "Test",
          last_name: "Employee",
          date_of_joining: new Date().toISOString().split("T")[0],
          bill_rate: 100,
          pay_rate: 50,
          employee_type: "W2-Employee",
          status: "active",
        }),
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        setError(data.message || "Failed to create test employee")
      }
    } catch (err) {
      console.error("Error creating test employee:", err)
      setError("An error occurred while creating a test employee")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Testing
          </CardTitle>
          <CardDescription>Test database operations for employees and monthly hours</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This utility will test database operations for employees and monthly hours tables. Use this to diagnose
            issues with data storage.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && result.success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Database operations completed successfully
                <div className="mt-2">
                  <strong>Details:</strong>
                  <pre className="mt-1 text-sm bg-green-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {result && !result.success && (
            <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
              <h3 className="text-red-800 font-medium">Operation Failed</h3>
              <pre className="mt-2 text-sm bg-red-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={testEmployeeOperations} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Database...
              </>
            ) : (
              "Test Employee Operations"
            )}
          </Button>
          <Button onClick={createTestEmployee} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Test Employee...
              </>
            ) : (
              "Create Test Employee"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
