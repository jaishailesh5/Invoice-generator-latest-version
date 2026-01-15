import { Suspense } from "react"
import { getPaymentReport, getClientRevenueReport } from "@/app/actions/report-actions"
import { YearSelector } from "./year-selector"
import { PrintButton } from "./print-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default async function PaymentReportPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const currentYear = new Date().getFullYear()
    const selectedYear = searchParams.year ? parseInt(searchParams.year as string) : currentYear

    // Fetch both reports in parallel
    const [employeeReportData, clientReportData] = await Promise.all([
        getPaymentReport(selectedYear),
        getClientRevenueReport(selectedYear)
    ])

    // Calculate totals
    const totalEmployeePaid = employeeReportData.reduce((sum, item) => sum + item.total_paid, 0)
    const totalClientReceived = clientReportData.reduce((sum, item) => sum + item.total_received, 0)

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Financial Reports</h1>
                <div className="print:hidden">
                    <YearSelector currentYear={selectedYear} />
                </div>
            </div>

            <Tabs defaultValue="employee" className="w-full">
                <div className="flex justify-between items-center mb-4">
                    <TabsList className="grid w-[400px] grid-cols-2">
                        <TabsTrigger value="employee">Employee Payments</TabsTrigger>
                        <TabsTrigger value="client">Client Revenue</TabsTrigger>
                    </TabsList>
                    <PrintButton />
                </div>

                <TabsContent value="employee">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Payments for {selectedYear}</CardTitle>
                            <CardDescription>Total payments made to employees</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {employeeReportData.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No payment records found for {selectedYear}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee Name</TableHead>
                                            <TableHead>Employee Number</TableHead>
                                            <TableHead className="text-right">Total Paid</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employeeReportData.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    {item.last_name}, {item.first_name}
                                                </TableCell>
                                                <TableCell>{item.employee_number || "N/A"}</TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat("en-US", {
                                                        style: "currency",
                                                        currency: "USD",
                                                    }).format(item.total_paid)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableBody className="border-t-2 border-primary/20 font-bold bg-muted/20">
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-right">Grand Total Paid:</TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat("en-US", {
                                                    style: "currency",
                                                    currency: "USD",
                                                }).format(totalEmployeePaid)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="client">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Revenue for {selectedYear}</CardTitle>
                            <CardDescription>Total payments received from clients</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {clientReportData.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No revenue records found for {selectedYear}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client Name</TableHead>
                                            <TableHead className="text-right">Total Received</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientReportData.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    {item.name}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat("en-US", {
                                                        style: "currency",
                                                        currency: "USD",
                                                    }).format(item.total_received)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableBody className="border-t-2 border-primary/20 font-bold bg-muted/20">
                                        <TableRow>
                                            <TableCell className="text-right">Grand Total Received:</TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat("en-US", {
                                                    style: "currency",
                                                    currency: "USD",
                                                }).format(totalClientReceived)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
