import { NextResponse } from "next/server"
import { getInvoices } from "@/lib/data/invoices"

export async function GET() {
  try {
    console.log("API: Fetching all invoices from database")
    const invoices = await getInvoices()

    // Add detailed logging to help debug
    if (invoices.length > 0) {
      console.log("Sample invoice from database:", {
        id: invoices[0].id,
        invoice_number: invoices[0].invoice_number,
        vendor_name: invoices[0].vendor_name,
        client_name: invoices[0].client_name,
        employee_name: invoices[0].employee_name,
        payment_details: invoices[0].payment_details ? "Present" : "Not present",
      })
    }

    return NextResponse.json({ success: true, invoices })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch invoices: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
