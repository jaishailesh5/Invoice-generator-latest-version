"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { calculateEmployeePayment, calculateReferralPayment, calculateProfit } from "@/lib/calculate-payments"

export default function PaymentCalculator() {
  const [hours, setHours] = useState<number>(0)
  const [billRate, setBillRate] = useState<number>(0)
  const [payRate, setPayRate] = useState<number>(0)
  const [referralFee, setReferralFee] = useState<number>(0)

  const [employeePayment, setEmployeePayment] = useState<number>(0)
  const [referralPayment, setReferralPayment] = useState<number>(0)
  const [totalBilled, setTotalBilled] = useState<number>(0)
  const [profit, setProfit] = useState<number>(0)

  const handleCalculate = () => {
    // Calculate employee payment
    const empPayment = calculateEmployeePayment(hours, payRate)
    setEmployeePayment(empPayment)

    // Calculate referral payment
    const refPayment = calculateReferralPayment(hours, referralFee)
    setReferralPayment(refPayment)

    // Calculate total billed
    const billed = hours * billRate
    setTotalBilled(billed)

    // Calculate profit
    const calculatedProfit = calculateProfit(billed, empPayment, refPayment)
    setProfit(calculatedProfit)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Payment Calculator</h1>
      <p className="text-muted-foreground mb-6">
        Use this tool to verify payment calculations for employees and referrals.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input Values</CardTitle>
            <CardDescription>Enter the values to calculate payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours Worked</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                step="0.5"
                value={hours || ""}
                onChange={(e) => setHours(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billRate">Bill Rate ($/hr)</Label>
              <Input
                id="billRate"
                type="number"
                min="0"
                step="0.01"
                value={billRate || ""}
                onChange={(e) => setBillRate(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payRate">Pay Rate ($/hr)</Label>
              <Input
                id="payRate"
                type="number"
                min="0"
                step="0.01"
                value={payRate || ""}
                onChange={(e) => setPayRate(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralFee">Referral Fee ($/hr)</Label>
              <Input
                id="referralFee"
                type="number"
                min="0"
                step="0.01"
                value={referralFee || ""}
                onChange={(e) => setReferralFee(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCalculate} className="w-full">
              Calculate
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Payment calculation results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
                <p className="text-2xl font-bold">${totalBilled.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {hours} hours × ${billRate}/hr
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Employee Payment</p>
                <p className="text-2xl font-bold">${employeePayment.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {hours} hours × ${payRate}/hr
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Referral Payment</p>
                <p className="text-2xl font-bold">${referralPayment.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {hours} hours × ${referralFee}/hr
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit</p>
                <p className={`text-2xl font-bold ${profit < 0 ? "text-red-500" : "text-green-600"}`}>
                  ${profit.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${totalBilled.toFixed(2)} - ${employeePayment.toFixed(2)} - ${referralPayment.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
