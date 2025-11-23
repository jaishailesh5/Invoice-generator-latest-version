export const dynamic = "force-dynamic"

import { getDb } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

async function getTableCounts() {
  try {
    const db = await getDb()

    const tables = [
      "parties",
      "employees",
      "employee_referrals",
      "monthly_hours",
      "invoices",
      "payment_details",
      "referral_payments",
    ]

    const counts = {}

    for (const table of tables) {
      try {
        const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = result.count
      } catch (error) {
        console.error(`Error counting table ${table}:`, error)
        counts[table] = "Table not found"
      }
    }

    return counts
  } catch (error) {
    console.error("Error getting table counts:", error)
    return {}
  }
}

async function getSampleData() {
  try {
    const db = await getDb()

    const data = {
      parties: [],
      employees: [],
      invoices: [],
    }

    try {
      data.parties = await db.all("SELECT * FROM parties LIMIT 5")
    } catch (error) {
      console.error("Error fetching parties:", error)
    }

    try {
      data.employees = await db.all("SELECT * FROM employees LIMIT 5")
    } catch (error) {
      console.error("Error fetching employees:", error)
    }

    try {
      data.invoices = await db.all("SELECT * FROM invoices LIMIT 5")
    } catch (error) {
      console.error("Error fetching invoices:", error)
    }

    return data
  } catch (error) {
    console.error("Error getting sample data:", error)
    return { parties: [], employees: [], invoices: [] }
  }
}

export default async function DbViewerPage() {
  const counts = await getTableCounts()
  const sampleData = await getSampleData()

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Database Viewer</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Table Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Record Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(counts).map(([table, count]) => (
                <TableRow key={table}>
                  <TableCell className="font-medium">{table}</TableCell>
                  <TableCell>{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {Object.entries(sampleData).map(([table, records]) => (
        <Card key={table} className="mb-6">
          <CardHeader>
            <CardTitle>
              Sample {table} ({records.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(records[0]).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, index) => (
                    <TableRow key={index}>
                      {Object.values(record).map((value, i) => (
                        <TableCell key={i}>{value !== null ? String(value) : "null"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No records found</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
