import { type NextRequest, NextResponse } from "next/server"
import { getInvoiceById, updateInvoice } from "@/lib/data/invoices"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await getInvoiceById(params.id)

    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json({ message: "Failed to fetch invoice" }, { status: 500 })
  }
}

// Enhance the PUT method to better handle status updates and log more information
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()

    console.log("API PUT: Received update for invoice", params.id, "with data:", data)

    // Extract invoice updates and payment details
    const { paymentDetails, ...invoiceUpdates } = data

    // Ensure employee payment is 0 if pay rate is 0
    if (paymentDetails) {
      const invoice = await getInvoiceById(params.id)

      // Use invoice pay_rate if available, otherwise use employee_default_pay_rate
      const payRate =
        invoice?.pay_rate !== null && invoice?.pay_rate !== undefined
          ? invoice.pay_rate
          : invoice?.employee_default_pay_rate || 0

      console.log(
        "API: Invoice pay rate:",
        invoice?.pay_rate,
        "Employee default pay rate:",
        invoice?.employee_default_pay_rate,
        "Using:",
        payRate,
        "No fallback to billRate * 0.7",
      )

      if (payRate === 0) {
        paymentDetails.employee_payment_amount = 0
      }
    }

    // Ensure the status field is included in the update
    console.log("API PUT: Final update data:", {
      invoiceUpdates,
      status: invoiceUpdates.status,
      hasPaymentDetails: !!paymentDetails,
    })

    // Double check that status is being passed correctly
    if (!invoiceUpdates.status) {
      console.warn("Warning: No status provided in update. Using default 'pending'")
      invoiceUpdates.status = "pending"
    } else {
      console.log(`API PUT: Status explicitly set to "${invoiceUpdates.status}"`)
    }

    const result = await updateInvoice(params.id, invoiceUpdates, paymentDetails)

    // Verify the update worked by fetching the invoice again
    const updatedInvoice = await getInvoiceById(params.id)
    console.log("API PUT: After update, invoice status is:", updatedInvoice?.status)

    return NextResponse.json({
      id: result.id,
      success: true,
      message: "Invoice updated successfully",
      updatedStatus: updatedInvoice?.status,
    })
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json({ message: "Failed to update invoice" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // This is just a placeholder - implement actual delete logic
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ message: "Failed to delete invoice" }, { status: 500 })
  }
}
