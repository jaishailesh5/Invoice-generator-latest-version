"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { checkReferralsTableAction, migrateReferralsFromLocalStorage } from "@/app/actions/referral-actions"

export default function ReferralsToolPage() {
  const [isChecking, setIsChecking] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [migrateResult, setMigrateResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckTable = async () => {
    try {
      setIsChecking(true)
      setError(null)

      const result = await checkReferralsTableAction()
      setCheckResult(result)

      if (!result.success) {
        setError(`Failed to check referrals table: ${result.error}`)
      }
    } catch (err) {
      setError(`Error checking referrals table: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsChecking(false)
    }
  }

  const handleMigrateReferrals = async () => {
    try {
      setIsMigrating(true)
      setError(null)

      const result = await migrateReferralsFromLocalStorage()
      setMigrateResult(result)

      if (!result.success) {
        setError(`Failed to migrate referrals: ${result.message}`)
      }
    } catch (err) {
      setError(`Error migrating referrals: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsMigrating(false)
    }
  }

  useEffect(() => {
    // Check table on page load
    handleCheckTable()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Employee Referrals Database Tools</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check Referrals Table</CardTitle>
            <CardDescription>Check if the employee_referrals table exists and count records</CardDescription>
          </CardHeader>
          <CardContent>
            {checkResult && checkResult.success ? (
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Table {checkResult.exists ? "exists" : "was created"}</span>
                </div>
                {checkResult.count !== undefined && <p>Current record count: {checkResult.count}</p>}
              </div>
            ) : (
              <p>Click the button to check the referrals table</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleCheckTable} disabled={isChecking}>
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Table"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Migrate Referrals from LocalStorage</CardTitle>
            <CardDescription>Migrate employee referrals from browser localStorage to the database</CardDescription>
          </CardHeader>
          <CardContent>
            {migrateResult && (
              <Alert variant={migrateResult.success ? "default" : "destructive"}>
                {migrateResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{migrateResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleMigrateReferrals} disabled={isMigrating}>
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                "Migrate Referrals"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
