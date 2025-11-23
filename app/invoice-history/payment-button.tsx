"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { DollarSign } from "lucide-react"
import UpdatePaymentStatus from "./update-payment-status"

interface PaymentButtonProps {
  invoice: any
  onUpdate: () => void
}

export default function PaymentButton({ invoice, onUpdate }: PaymentButtonProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  const handleUpdate = () => {
    onUpdate()
    setOpen(false)
  }

  // Generate a unique key that includes the invoice ID and current timestamp
  // This forces the component to re-mount when opened
  const dialogKey = `payment-dialog-${invoice.id}-${Date.now()}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Update Payment">
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]" key={dialogKey}>
        <UpdatePaymentStatus invoice={invoice} onClose={() => setOpen(false)} onUpdate={handleUpdate} />
      </DialogContent>
    </Dialog>
  )
}
