"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Database } from "lucide-react"

export default function DatabaseInitPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const initializeDatabase = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/db")
      const data = await response.json()

      setResult(data)

      if (!data.success) {
        setError(data.message || "Failed to initialize database")
      }
    } catch (err) {
      console.error("Error initializing database:", err)
      setError("An error occurred while initializing the database")
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
            Database Initialization
          </CardTitle>
          <CardDescription>Initialize the SQLite database schema for the Invoice Generator application</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This utility will create the necessary database tables if they don't already exist. Use this if you're
            experiencing database-related issues or if this is your first time setting up the application.
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
                Database initialized successfully at: {result.details?.dbPath}
                <div className="mt-2">
                  <strong>Tables created:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    {result.details?.tables.map((table: string) => (
                      <li key={table}>{table}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {result && !result.success && (
            <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
              <h3 className="text-red-800 font-medium">Initialization Failed</h3>
              <pre className="mt-2 text-sm bg-red-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={initializeDatabase} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Database...
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
