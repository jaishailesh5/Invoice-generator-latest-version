"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { calculateEmployeePayment } from "@/lib/calculate-payments"

interface UpdatePaymentStatusProps {
  invoice: any
  onClose: () => void
  onUpdate: () => void
}

export default function UpdatePaymentStatus({ invoice, onClose, onUpdate }: UpdatePaymentStatusProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [amountPaid, setAmountPaid] = useState<string>("0")
  const [employeePaymentAmount, setEmployeePaymentAmount] = useState<string>("0")
  const [notes, setNotes] = useState<string>("")
  const [referralPayments, setReferralPayments] = useState<
    Array<{ referral_id: string; amount: number; name?: string }>
  >([])
  const [status, setStatus] = useState<string>("pending")
  const [isRevertingToPending, setIsRevertingToPending] = useState(false)
  const paymentStatus = status // Declare paymentStatus variable

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      console.log("DEBUG - Initializing form with invoice data:", invoice)

      // Initialize status from invoice
      setStatus(invoice.status || "pending")
      setIsRevertingToPending(false)

      // Initialize amount paid from invoice total or existing payment details
      if (invoice.payment_details && invoice.payment_details.amount_paid !== undefined) {
        setAmountPaid(Number(invoice.payment_details.amount_paid).toFixed(2))
      } else {
        setAmountPaid(Number(invoice.total_bill_amount || 0).toFixed(2))
      }

      // Initialize payment date from existing payment details or today
      if (invoice.payment_details && invoice.payment_details.payment_date) {
        setPaymentDate(invoice.payment_details.payment_date)
      } else {
        setPaymentDate(new Date().toISOString().split("T")[0])
      }

      // Initialize notes from existing payment details
      setNotes(invoice.payment_details?.notes || "")

      // Initialize referral payments from existing payment details
      if (invoice.payment_details && invoice.payment_details.referral_payments) {
        setReferralPayments(
          invoice.payment_details.referral_payments.map((rp) => ({
            referral_id: rp.id,
            amount: rp.amount,
            name: rp.name,
          })),
        )
      } else if (invoice.employee?.referrals && invoice.employee.referrals.length > 0) {
        // Initialize from employee referrals if no payment details
        setReferralPayments(
          invoice.employee.referrals.map((referral) => {
            const hours = invoice.hours || 0
            const fee = referral.fee || 0
            return {
              referral_id: referral.id,
              name: referral.name,
              amount: hours * fee,
            }
          }),
        )
      } else {
        setReferralPayments([])
      }

      // Initialize employee payment amount from existing payment details or calculate
      if (invoice.payment_details && invoice.payment_details.employee_payment_amount !== undefined) {
        setEmployeePaymentAmount(Number(invoice.payment_details.employee_payment_amount).toFixed(2))
      } else {
        // Calculate employee payment amount
        const hours = invoice.hours || 0
        const payRate =
          invoice.pay_rate !== null && invoice.pay_rate !== undefined
            ? invoice.pay_rate
            : invoice.employee_default_pay_rate || 0

        console.log("DEBUG - Pay rate determination:", {
          invoice_pay_rate: invoice.pay_rate,
          employee_default_pay_rate: invoice.employee_default_pay_rate,
          final_pay_rate: payRate,
        })

        const payment = calculateEmployeePayment(hours, payRate)
        console.log("DEBUG - Calculated payment:", {
          hours: hours,
          payRate: payRate,
          calculatedPayment: payment,
        })

        setEmployeePaymentAmount(Number(payment).toFixed(2))
      }

      // Reset error state
      setError(null)
    }
  }, [invoice])

  // Track when user changes status from paid/partially_paid to pending
  useEffect(() => {
    if (invoice && (invoice.status === "paid" || invoice.status === "partially_paid") && status === "pending") {
      setIsRevertingToPending(true)
    } else {
      setIsRevertingToPending(false)
    }
  }, [status, invoice])

  // Auto-update amount paid when status changes to "paid"
  useEffect(() => {
    if (paymentStatus === "paid" && !isRevertingToPending) {
      setAmountPaid((invoice.total_bill_amount || 0).toFixed(2))

      // Auto-calculate employee payment based on pay rate * hours
      if (invoice.pay_rate !== undefined && invoice.pay_rate > 0) {
        const employeePayment = (invoice.pay_rate * invoice.hours).toFixed(2)
        setEmployeePaymentAmount(employeePayment)
      }

      // Auto-calculate referral payments
      if (invoice.employee?.referrals && invoice.employee.referrals.length > 0) {
        const newReferralPayments = invoice.employee.referrals.map((referral) => ({
          referral_id: referral.id,
          name: referral.name,
          amount: invoice.hours * referral.fee,
        }))
        setReferralPayments(newReferralPayments)
      }
    } else if (status === "pending" && isRevertingToPending) {
      // When reverting to pending, set amount paid to 0
      setAmountPaid("0.00")
      setEmployeePaymentAmount("0.00")

      // Reset referral payments to 0
      if (referralPayments.length > 0) {
        const resetReferralPayments = referralPayments.map((payment) => ({
          ...payment,
          amount: 0,
        }))
        setReferralPayments(resetReferralPayments)
      }
    }
  }, [status, isRevertingToPending, invoice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate inputs
      let parsedAmountPaid = Number.parseFloat(amountPaid)
      let parsedEmployeePaymentAmount = Number.parseFloat(employeePaymentAmount)

      if (isNaN(parsedAmountPaid) || parsedAmountPaid < 0) {
        throw new Error("Amount paid must be a positive number")
      }

      if (isNaN(parsedEmployeePaymentAmount) || parsedEmployeePaymentAmount < 0) {
        throw new Error("Employee payment amount must be a positive number")
      }

      // Use invoice pay_rate if available, otherwise use employee_default_pay_rate
      const payRate =
        invoice.pay_rate !== null && invoice.pay_rate !== undefined
          ? invoice.pay_rate
          : invoice.employee_default_pay_rate || 0

      console.log("DEBUG - Submitting with pay rate:", {
        payRate: payRate,
        employeePaymentBeforeFinalCheck: parsedEmployeePaymentAmount,
      })

      const finalEmployeePayment = payRate === 0 ? 0 : parsedEmployeePaymentAmount

      // Determine status based on amount paid and selected status
      let finalStatus = status

      // If user explicitly selected "pending", respect that choice
      if (status === "pending") {
        finalStatus = "pending"
        // Ensure amounts are zero when setting to pending
        if (parsedAmountPaid > 0) {
          console.log("Setting amount paid to 0 because status is pending")
          parsedAmountPaid = 0
        }
        if (parsedEmployeePaymentAmount > 0) {
          console.log("Setting employee payment to 0 because status is pending")
          parsedEmployeePaymentAmount = 0
        }
      }
      // Otherwise auto-adjust based on amount
      else {
        if (parsedAmountPaid <= 0) {
          finalStatus = "pending"
        } else if (parsedAmountPaid >= invoice.total_bill_amount) {
          finalStatus = "paid"
        } else {
          finalStatus = "partially_paid"
        }
      }

      // Reset referral payments if status is pending
      if (finalStatus === "pending") {
        setReferralPayments(
          referralPayments.map((payment) => ({
            ...payment,
            amount: 0,
          })),
        )
      }

      console.log("DEBUG - Final status determination:", {
        originalStatus: status,
        amountPaid: parsedAmountPaid,
        totalBillAmount: invoice.total_bill_amount,
        finalStatus: finalStatus,
      })

      // Prepare payment details
      const paymentDetails = {
        amount_paid: parsedAmountPaid,
        employee_payment_amount: finalEmployeePayment,
        payment_date: paymentDate,
        notes: notes,
        referral_payments: referralPayments,
      }

      console.log("DEBUG - Submitting referral payments:", referralPayments)

      // Update invoice status
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: finalStatus,
          paymentDetails: paymentDetails,
        }),
      })

      // Add logging to debug the response
      if (!response.ok) {
        const errorData = await response.json()
        console.error("API Error Response:", errorData)
        throw new Error(errorData.message || "Failed to update payment status")
      }

      const responseData = await response.json()
      console.log("API Update Response:", responseData)

      toast.default({
        title: "Payment Status Updated",
        description: `The invoice has been marked as ${finalStatus}`,
      })

      // Update the invoice in localStorage to ensure it has the latest data
      try {
        const storedInvoicesString = localStorage.getItem("invoices")
        if (storedInvoicesString) {
          const storedInvoices = JSON.parse(storedInvoicesString)

          // Find and update the invoice in the array
          const updatedInvoices = storedInvoices.map((inv: any) => {
            if (inv.id === invoice.id || inv.invoiceNumber === invoice.invoice_number) {
              // Update the invoice with new status and payment details
              return {
                ...inv,
                status: finalStatus,
                paymentDetails: {
                  amountPaid: parsedAmountPaid,
                  employeePaymentAmount: finalEmployeePayment,
                  paymentDate: paymentDate,
                  notes: notes,
                  referralPayments: referralPayments.map((rp) => ({
                    id: rp.referral_id,
                    name: rp.name || "Unknown",
                    amount: rp.amount,
                  })),
                },
                // Mark as saved to DB
                savedToDb: true,
              }
            }
            return inv
          })

          // Save updated invoices back to localStorage
          localStorage.setItem("invoices", JSON.stringify(updatedInvoices))
          console.log("Updated invoice in localStorage")
        }
      } catch (localStorageError) {
        console.error("Error updating localStorage:", localStorageError)
        // Continue even if localStorage update fails
      }

      // Set a flag to refresh the finance dashboard
      localStorage.setItem("finance_dashboard_needs_refresh", "true")
      console.log("Set flag to refresh finance dashboard on next visit")

      // Refresh the invoice list
      onUpdate()
      onClose()
    } catch (error) {
      console.error("Error updating payment status:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine if the employee payment field should be disabled
  const isEmployeePaymentDisabled = () => {
    // Use invoice pay_rate if available, otherwise use employee_default_pay_rate
    const payRate =
      invoice.pay_rate !== null && invoice.pay_rate !== undefined
        ? invoice.pay_rate
        : invoice.employee_default_pay_rate || 0

    return payRate === 0
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Update Payment Status</CardTitle>
        <CardDescription>Record payment details for invoice #{invoice.invoice_number}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Payment Status</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {status !== "pending"
                ? "Status will be automatically adjusted based on amount paid"
                : "Setting to pending will reset payment amounts to zero"}
            </p>
          </div>

          {isRevertingToPending && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-800" />
              <AlertDescription>
                Changing to pending status will reset payment amounts to zero. Previous payment history will be
                preserved in the notes.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount-paid">Amount Paid</Label>
            <Input
              id="amount-paid"
              type="number"
              step="0.01"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Invoice amount: ${invoice.total_bill_amount?.toFixed(2) || "0.00"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-payment">Employee Payment</Label>
            <Input
              id="employee-payment"
              type="number"
              step="0.01"
              min="0"
              value={employeePaymentAmount}
              onChange={(e) => setEmployeePaymentAmount(e.target.value)}
              required
              disabled={isEmployeePaymentDisabled()}
            />
            {isEmployeePaymentDisabled() && (
              <p className="text-xs text-amber-600">Employee pay rate is 0, so employee payment is set to 0.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Calculated amount: $
              {calculateEmployeePayment(
                invoice.hours || 0,
                invoice.pay_rate !== null && invoice.pay_rate !== undefined
                  ? invoice.pay_rate
                  : invoice.employee_default_pay_rate || 0,
              ).toFixed(2)}
            </p>
          </div>

          {/* Add referral payments section */}
          {invoice.employee?.referrals && invoice.employee.referrals.length > 0 && (
            <div className="space-y-2">
              <Label>Referral Payments</Label>
              {invoice.employee.referrals.map((referral, index) => {
                // Find the corresponding payment in our state
                const existingPayment = referralPayments.find((rp) => rp.referral_id === referral.id)
                const paymentAmount = existingPayment
                  ? existingPayment.amount
                  : (referral.fee || 0) * (invoice.hours || 0)

                return (
                  <div key={referral.id} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{referral.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Fee: ${referral.fee} × {invoice.hours || 0} hrs = $
                        {((referral.fee || 0) * (invoice.hours || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => {
                          const newAmount = Number.parseFloat(e.target.value)
                          setReferralPayments((prev) => {
                            // Find if we already have this referral in our payments
                            const existingIndex = prev.findIndex((p) => p.referral_id === referral.id)

                            if (existingIndex >= 0) {
                              // Update existing payment
                              const newPayments = [...prev]
                              newPayments[existingIndex] = {
                                ...newPayments[existingIndex],
                                amount: newAmount,
                              }
                              return newPayments
                            } else {
                              // Add new payment
                              return [
                                ...prev,
                                {
                                  referral_id: referral.id,
                                  name: referral.name,
                                  amount: newAmount,
                                },
                              ]
                            }
                          })
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any payment notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {isRevertingToPending && (
              <p className="text-xs text-amber-600">
                Consider adding a note about why the invoice is being changed back to pending.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Saving..." : "Save Payment"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
