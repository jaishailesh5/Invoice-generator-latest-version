"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, getMonthNames } from "./utils"
import type { MonthlyData } from "./types"

export default function ReferralDashboard({ data }: { data: MonthlyData }) {
  // Ensure data is properly initialized
  const safeData = {
    ...data,
    referralData: data.referralData || {},
    referrals: data.referrals || [],
  }

  // Get available years from the data with safety checks
  const availableYears = Object.keys(safeData.referralData || {})
    .sort()
    .reverse()

  // Initialize state with a safe default value
  const [selectedYear, setSelectedYear] = useState<string>("")

  // Set the selected year safely using useEffect to avoid render issues
  useEffect(() => {
    if (selectedYear === "" && availableYears.length > 0) {
      setSelectedYear(availableYears[0])
    } else if (selectedYear === "" && availableYears.length === 0) {
      // If no years available, set to current year as fallback
      setSelectedYear(new Date().getFullYear().toString())
    }
  }, [availableYears, selectedYear])

  // Get month names in order
  const monthNames = getMonthNames()

  // Check if we have any referral data with proper null checks
  const hasReferralData =
    selectedYear &&
    safeData.referralData &&
    safeData.referralData[selectedYear] &&
    Object.keys(safeData.referralData[selectedYear] || {}).some((month) => {
      const monthData = safeData.referralData[selectedYear]?.[month]
      return monthData && Object.keys(monthData).length > 0
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Referral Payments</h2>

        <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
            {availableYears.length === 0 && (
              <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {!hasReferralData ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">No referral data available for {selectedYear}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Monthly Referral Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Referral Payments - {selectedYear}</CardTitle>
              <CardDescription>Payments made to referral partners by month</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Referral Partner</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthNames.map((month) => {
                    // Skip months with no data - with proper null checks
                    if (
                      !selectedYear ||
                      !safeData.referralData[selectedYear] ||
                      !safeData.referralData[selectedYear][month] ||
                      Object.keys(safeData.referralData[selectedYear][month] || {}).length === 0
                    ) {
                      return null
                    }

                    // Get referral data for this month - with null check
                    const monthData = safeData.referralData[selectedYear][month] || {}
                    const referralIds = Object.keys(monthData)

                    // Create rows for each referral partner
                    return referralIds.map((referralId, index) => {
                      const referralInfo = safeData.referrals.find((r) => r.id === referralId)
                      const referralName = referralInfo ? referralInfo.name : "Unknown Referral"
                      const amountPaid = monthData[referralId]?.amountPaid || 0

                      return (
                        <TableRow key={`${month}-${referralId}`}>
                          {/* Only show month name for the first referral in the month */}
                          <TableCell>{index === 0 ? month : ""}</TableCell>
                          <TableCell>{referralName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(amountPaid)}</TableCell>
                        </TableRow>
                      )
                    })
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Referral Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Partner Summary - {selectedYear}</CardTitle>
              <CardDescription>Total payments by referral partner</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral Partner</TableHead>
                    <TableHead className="text-right">Total Payments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeData.referrals.map((referral) => {
                    // Calculate total payments for this referral across all months
                    let totalPayments = 0

                    if (selectedYear && safeData.referralData[selectedYear]) {
                      Object.values(safeData.referralData[selectedYear] || {}).forEach((monthData) => {
                        if (monthData && monthData[referral.id]) {
                          totalPayments += monthData[referral.id].amountPaid || 0
                        }
                      })
                    }

                    // Skip referrals with no payments
                    if (totalPayments === 0) return null

                    return (
                      <TableRow key={referral.id}>
                        <TableCell>{referral.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalPayments)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
