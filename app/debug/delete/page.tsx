"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deleteEmployeeAction, deletePartyAction, deleteInvoiceAction } from "@/app/actions/delete-actions"

export default function DebugDeletePage() {
  const [table, setTable] = useState("employees")
  const [id, setId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState("server-action")

  const handleDelete = async () => {
    if (!id) {
      setResult({ success: false, message: "Please enter an ID" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      if (method === "server-action") {
        // Use server actions
        let actionResult

        if (table === "employees") {
          actionResult = await deleteEmployeeAction(id)
        } else if (table === "parties") {
          actionResult = await deletePartyAction(id)
        } else if (table === "invoices") {
          actionResult = await deleteInvoiceAction(id)
        } else {
          actionResult = { success: false, message: "Invalid table selection" }
        }

        setResult(actionResult)
      } else {
        // Use debug API
        const response = await fetch("/api/debug/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ table, id }),
        })

        const data = await response.json()
        setResult(data)
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Debug Delete Operations</h1>

      <Tabs defaultValue="delete" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="delete">Delete Record</TabsTrigger>
          <TabsTrigger value="help">Help & Instructions</TabsTrigger>
        </TabsList>

        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle>Delete Database Record</CardTitle>
              <CardDescription>Test delete operations directly against the database</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="method">Delete Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server-action">Server Action</SelectItem>
                    <SelectItem value="debug-api">Debug API</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Server Action uses the same code as your application. Debug API bypasses application code.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="table">Table</Label>
                <Select value={table} onValueChange={setTable}>
                  <SelectTrigger id="table">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employees">Employees</SelectItem>
                    <SelectItem value="parties">Parties</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                    {method === "debug-api" && (
                      <>
                        <SelectItem value="monthly_hours">Monthly Hours</SelectItem>
                        <SelectItem value="employee_referrals">Employee Referrals</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id">Record ID</Label>
                <Input id="id" value={id} onChange={(e) => setId(e.target.value)} placeholder="Enter record ID" />
              </div>
            </CardContent>

            <CardFooter>
              <Button onClick={handleDelete} disabled={loading}>
                {loading ? "Deleting..." : "Delete Record"}
              </Button>
            </CardFooter>
          </Card>

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-md ${result.success ? "bg-green-50" : "bg-red-50"}`}>
                  <p className={`font-medium ${result.success ? "text-green-600" : "text-red-600"}`}>
                    {result.success ? "Success" : "Error"}
                  </p>
                  <p className="mt-1">{result.message}</p>
                </div>

                {result.result && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Details:</h3>
                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>Help & Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">How to Use This Tool</h3>
                <p className="mt-1">
                  This tool helps you debug delete operations in your application. You can test both the application's
                  delete functionality (Server Action) and direct database deletion (Debug API).
                </p>
              </div>

              <div>
                <h3 className="font-medium text-lg">Finding Record IDs</h3>
                <p className="mt-1">
                  You can find record IDs by visiting the{" "}
                  <a href="/db-viewer" className="text-blue-600 hover:underline">
                    Database Viewer
                  </a>{" "}
                  page.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-lg">Common Issues</h3>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <strong>Server Action fails, Debug API works:</strong> Issue is in your application code
                  </li>
                  <li>
                    <strong>Both methods fail:</strong> Likely a database permission issue or invalid ID
                  </li>
                  <li>
                    <strong>Record shows as deleted but still appears in app:</strong> Cache issue, try refreshing
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
