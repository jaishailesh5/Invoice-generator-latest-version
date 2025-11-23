"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { updateInvoicePayment } from "@/lib/data"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface BulkUpdatePaymentStatusProps {
  invoiceIds: string[]
  open: boolean
  onClose: () => void
}

const BulkUpdatePaymentStatus: React.FC<BulkUpdatePaymentStatusProps> = ({ invoiceIds, open, onClose }) => {
  const [paymentStatus, setPaymentStatus] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined)
  const [paymentAmount, setPaymentAmount] = useState<string | undefined>(undefined)
  const [employeePayment, setEmployeePayment] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    console.log(`Processing ${invoiceIds.length} invoices for bulk update`)
  }, [invoiceIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Only process the invoices that were passed to this component
      const results = await Promise.all(
        invoiceIds.map(async (id) => {
          try {
            await updateInvoicePayment(id, {
              status: paymentStatus,
              paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
              paymentAmount: paymentAmount !== undefined ? Number.parseFloat(paymentAmount) : undefined,
              employeePayment: employeePayment !== undefined ? Number.parseFloat(employeePayment) : undefined,
              notes: notes || undefined,
            })
            return { id, success: true }
          } catch (error) {
            console.error(`Error updating invoice ${id}:`, error)
            return { id, success: false, error }
          }
        }),
      )

      const successful = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length

      toast({
        title: `Updated ${successful} invoice(s)`,
        description: failed > 0 ? `Failed to update ${failed} invoice(s)` : "All invoices updated successfully",
        variant: failed > 0 ? "destructive" : "default",
      })

      onClose()
    } catch (error) {
      console.error("Error in bulk update:", error)
      toast({
        title: "Error",
        description: "Failed to update invoices",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Payment Status</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to update the payment status for the selected invoices?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentStatus" className="text-right">
              Payment Status
            </Label>
            <Input
              type="text"
              id="paymentStatus"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentDate" className="text-right">
              Payment Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-[240px] pl-3 text-left font-normal", !paymentDate && "text-muted-foreground")}
                >
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center" side="bottom">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentAmount" className="text-right">
              Payment Amount
            </Label>
            <Input
              type="number"
              id="paymentAmount"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employeePayment" className="text-right">
              Employee Payment
            </Label>
            <Input
              type="number"
              id="employeePayment"
              value={employeePayment || ""}
              onChange={(e) => setEmployeePayment(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              Notes
            </Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
          </div>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Update"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default BulkUpdatePaymentStatus
