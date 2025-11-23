"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"
import MigrationClient from "./migration-client"

export default function DbMigrationPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Database Migration</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Initialize SQLite Database</CardTitle>
            <CardDescription>Create the SQLite database schema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              This will create the SQLite database file and initialize the schema with all necessary tables.
            </p>

            <Alert variant="default" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Database schema has been initialized</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Migrate Data from localStorage</CardTitle>
            <CardDescription>Transfer your data to the SQLite database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              This will migrate all your data from localStorage to the SQLite database. Your localStorage data will
              remain untouched.
            </p>

            <MigrationClient />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
