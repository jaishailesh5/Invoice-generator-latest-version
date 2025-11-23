"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import {
  getChicagoDateString,
  getChicagoDateISO,
  getFirstDayOfMonthISO,
  getLastDayOfMonthISO,
  formatDate,
  getMonthName,
  createServicePeriod,
  debugDateInfo,
  validateDateFunctions,
} from "@/lib/date-utils"

export default function DateTestPage() {
  const [currentDate, setCurrentDate] = useState("")
  const [currentDateISO, setCurrentDateISO] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [firstDay, setFirstDay] = useState("")
  const [lastDay, setLastDay] = useState("")
  const [formattedDate, setFormattedDate] = useState("")
  const [dateToFormat, setDateToFormat] = useState("")
  const [servicePeriod, setServicePeriod] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [validationResults, setValidationResults] = useState<any>(null)
  const [browserInfo, setBrowserInfo] = useState<string>("")

  // Generate years for dropdown (current year - 5 to current year + 5)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  // Get browser information
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      dateTimeString: new Date().toString(),
      dateTimeLocale: new Date().toLocaleString(),
    }
    setBrowserInfo(JSON.stringify(info, null, 2))
  }, [])

  // Update current date every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(
        getChicagoDateString({
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      )
      setCurrentDateISO(getChicagoDateISO())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Update first and last day when month or year changes
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      try {
        setFirstDay(getFirstDayOfMonthISO(selectedYear, selectedMonth))
        setLastDay(getLastDayOfMonthISO(selectedYear, selectedMonth))

        // Also update service period
        setServicePeriod(createServicePeriod(selectedMonth, selectedYear))
      } catch (error) {
        console.error("Error updating dates:", error)
      }
    }
  }, [selectedMonth, selectedYear])

  // Format date when dateToFormat changes
  useEffect(() => {
    if (dateToFormat) {
      setFormattedDate(formatDate(dateToFormat))
    } else {
      setFormattedDate("")
    }
  }, [dateToFormat])

  // Run debug info
  const handleDebug = () => {
    // Capture console.log output
    const originalConsoleLog = console.log
    const logs: string[] = []

    console.log = (...args) => {
      logs.push(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg))).join(" "))
      originalConsoleLog(...args)
    }

    // Run debug function
    debugDateInfo()

    // Restore console.log
    console.log = originalConsoleLog

    // Set debug info
    setDebugInfo(logs.join("\n"))
  }

  // Run validation
  const handleValidate = () => {
    const results = validateDateFunctions()
    setValidationResults(results)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Date Utilities Test Page</h1>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Date Functions Validation</CardTitle>
            <CardDescription>Test if all date functions are working correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleValidate}>Run Validation Tests</Button>

            {validationResults && (
              <div className="mt-4">
                <Alert variant={validationResults.success ? "default" : "destructive"}>
                  {validationResults.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {validationResults.success
                      ? "All date functions are working correctly!"
                      : "Some date functions are not working correctly. Check the results below."}
                  </AlertDescription>
                </Alert>

                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Function</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(validationResults.results).map(([key, value]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{key}</TableCell>
                          <TableCell>
                            {typeof value.value === "object" ? JSON.stringify(value.value) : String(value.value)}
                          </TableCell>
                          <TableCell>
                            {value.valid !== undefined ? (
                              <Badge variant={value.valid ? "default" : "destructive"}>
                                {value.valid ? "PASS" : "FAIL"}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">ERROR</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Date (Chicago Timezone)</CardTitle>
            <CardDescription>Shows the current date and time in Chicago timezone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Formatted Date:</Label>
                <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-lg">
                  {currentDate}
                </div>
              </div>
              <div>
                <Label>ISO Date (YYYY-MM-DD):</Label>
                <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-lg">
                  {currentDateISO}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month First/Last Day</CardTitle>
            <CardDescription>Get the first and last day of a selected month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month">Month</Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(Number.parseInt(value, 10))}
                >
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {getMonthName(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(Number.parseInt(value, 10))}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">First Day:</TableCell>
                  <TableCell>{firstDay}</TableCell>
                  <TableCell>{formatDate(firstDay)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Last Day:</TableCell>
                  <TableCell>{lastDay}</TableCell>
                  <TableCell>{formatDate(lastDay)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date Formatting</CardTitle>
            <CardDescription>Format a date string consistently</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dateToFormat">Enter a date</Label>
              <Input
                id="dateToFormat"
                type="date"
                value={dateToFormat}
                onChange={(e) => setDateToFormat(e.target.value)}
              />
            </div>

            {formattedDate && (
              <div>
                <Label>Formatted Date</Label>
                <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2">{formattedDate}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Period</CardTitle>
            <CardDescription>Generate a complete service period object</CardDescription>
          </CardHeader>
          <CardContent>
            {servicePeriod && (
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Month:</TableCell>
                    <TableCell>{servicePeriod.month}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Start Date:</TableCell>
                    <TableCell>
                      {servicePeriod.start} ({formatDate(servicePeriod.start)})
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">End Date:</TableCell>
                    <TableCell>
                      {servicePeriod.end} ({formatDate(servicePeriod.end)})
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Detailed date debugging information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDebug}>Run Debug</Button>

            {debugInfo && (
              <div className="mt-4">
                <pre className="whitespace-pre-wrap rounded-md bg-gray-100 p-4 font-mono text-sm">{debugInfo}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Browser Information</CardTitle>
            <CardDescription>Details about your browser and timezone settings</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-md bg-gray-100 p-4 font-mono text-sm">{browserInfo}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
