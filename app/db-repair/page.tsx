"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Database, RefreshCw } from "lucide-react"

export default function DatabaseRepairPage() {
  const [isRepairing, setIsRepairing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRepair() {
    setIsRepairing(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/db/repair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult(data)

      if (!response.ok) {
        setError(`Error: ${data.message || "Unknown error"}`)
      }
    } catch (err) {
      setError(`Failed to repair database: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRepairing(false)
    }
  }

  async function handleTestConnection() {
    setIsRepairing(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/db/test")
      const data = await response.json()
      setResult(data)

      if (!response.ok) {
        setError(`Error: ${data.message || "Unknown error"}`)
      }
    } catch (err) {
      setError(`Failed to test database: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRepairing(false)
    }
  }

  async function handleInitialize() {
    setIsRepairing(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/db/init")
      const data = await response.json()
      setResult(data)

      if (!response.ok) {
        setError(`Error: ${data.message || "Unknown error"}`)
      }
    } catch (err) {
      setError(`Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRepairing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Database Repair Tools</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Repair</CardTitle>
          <CardDescription>Use this tool to repair a corrupted database or resolve disk I/O errors.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This will attempt to repair your database by:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Creating a backup of your current database (if possible)</li>
            <li>Removing the corrupted database file</li>
            <li>Reinitializing the database schema</li>
            <li>Ensuring proper file permissions</li>
          </ul>
          <p className="text-amber-600 font-medium">
            Note: This process will create a new empty database if the current one cannot be repaired. You may need to
            restore your data afterward.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
          <div className="flex gap-2">
            <Button onClick={handleRepair} disabled={isRepairing}>
              {isRepairing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Repairing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Repair Database
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={isRepairing}>
              Test Connection
            </Button>
            <Button variant="outline" onClick={handleInitialize} disabled={isRepairing}>
              Initialize Database
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Success" : "Failed"}</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p>{result.message}</p>
                  {result.details && (
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common Database Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Disk I/O Error</h3>
              <p className="text-sm text-gray-600">
                This usually indicates problems with file permissions, disk space, or a corrupted database file.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Permission Issues</h3>
              <p className="text-sm text-gray-600">
                Ensure the application has write permissions to the database directory.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Disk Space</h3>
              <p className="text-sm text-gray-600">
                Check if your disk has sufficient free space for database operations.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Docker Volume Issues</h3>
              <p className="text-sm text-gray-600">
                If using Docker, ensure volumes are correctly mounted and persistent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
