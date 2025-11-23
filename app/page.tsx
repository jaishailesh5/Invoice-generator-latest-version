import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileSpreadsheet, History, BarChart3, Building, UserPlus, Database } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-8 text-3xl font-bold">Invoice Generator</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Manage Parties</CardTitle>
            <CardDescription>Manage vendors, clients and referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Add and manage vendors, clients, and referral companies for your invoices.
            </p>
            <Link href="/manage-parties">
              <Button className="w-full" variant="outline">
                Manage Parties
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Employee</CardTitle>
            <CardDescription>Add new employees to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Create new employees by entering their details including name, joining date, and rates.
            </p>
            <Link href="/create-employee">
              <Button className="w-full">Create Employee</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>View and manage employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              View all employees, track their hours, generate invoices, or remove them from the system.
            </p>
            <Link href="/employee-list">
              <Button className="w-full" variant="outline">
                View Employees
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>View all generated invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Access and manage all previously generated invoices in one place.
            </p>
            <Link href="/invoice-history">
              <Button className="w-full" variant="outline">
                View Invoices
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance Dashboard</CardTitle>
            <CardDescription>View financial metrics and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Access financial reports, analytics, and performance metrics for your business.
            </p>
            <Link href="/finance-dashboard">
              <Button className="w-full" variant="outline">
                View Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Home</CardTitle>
            <CardDescription>Return to the main dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Return to the main dashboard to access all features of the Invoice Generator app.
            </p>
            <Link href="/">
              <Button className="w-full" variant="outline">
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Database Initialization Tile */}
        <Link href="/db-init" className="group">
          <Card className="h-full transition-all group-hover:border-primary group-hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Initialization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Initialize or repair the SQLite database schema</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
