"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Search,
  FileText,
  Printer,
  Trash2,
  Calendar,
  ArrowUpDown,
  Filter,
  DollarSign,
  Download,
  CheckSquare,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDate } from "@/lib/date-utils"
import { deleteInvoiceAction } from "@/app/actions/invoice-actions"
import { initializeDatabase } from "../actions/db-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import * as XLSX from "xlsx"

// Interface for referral with fee
interface ReferralWithFee {
  id: string
  name: string
  fee: number
}

interface Invoice {
  id?: string
  invoiceNumber: string
  date: string
  paymentTerms: string
  vendor: {
    id?: string
    name: string
    address: string
  }
  billTo: {
    id?: string
    name: string
    address: string
  }
  serviceFor: string
  employee: {
    id: string
    name: string
    referrals?: ReferralWithFee[]
  }
  period: {
    month: string
    start: string
    end: string
  }
  hours: number
  billRate: number
  payRate?: number
  totalBillAmount: number
  status?: "pending" | "paid" | "partially_paid" | "overdue"
  paymentDetails?: {
    amountPaid: number
    employeePaymentAmount?: number
    referralPayments?: {
      id: string
      name: string
      amount: number
    }[]
    paymentDate?: string
    notes?: string
  }
  savedToDb?: boolean
}

type SortField = "date" | "invoiceNumber" | "employee.name" | "vendor.name" | "totalBillAmount" | "status"
type SortDirection = "asc" | "desc"

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [filterVendor, setFilterVendor] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [vendors, setVendors] = useState<string[]>([])
  const [filterPeriodStart, setFilterPeriodStart] = useState<string>("")
  const [filterPeriodEnd, setFilterPeriodEnd] = useState<string>("")
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([])
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isInitializingDb, setIsInitializingDb] = useState(false)
  const [dbInitResult, setDbInitResult] = useState<any>(null)
  const [showDbInitDialog, setShowDbInitDialog] = useState(false)
  const [saveResult, setSaveResult] = useState<any>(null)
  const [totalInvoices, setTotalInvoices] = useState(0)

  const [filterClient, setFilterClient] = useState<string>("all")
  const [clients, setClients] = useState<string[]>([])

  // Payment status dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "partially_paid">("pending")
  const [amountPaid, setAmountPaid] = useState<string>("0")
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [paymentNotes, setPaymentNotes] = useState<string>("")
  const [employeePaymentAmount, setEmployeePaymentAmount] = useState<string>("0")
  const [referralPayments, setReferralPayments] = useState<{ id: string; name: string; amount: string }[]>([])
  const [isSavingToDb, setIsSavingToDb] = useState(false)

  // Bulk payment update dialog
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false)
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<"pending" | "paid" | "partially_paid">("paid")
  const [bulkAmountPaidOption, setBulkAmountPaidOption] = useState<"full" | "custom" | "zero">("full")
  const [bulkAmountPaid, setBulkAmountPaid] = useState<string>("0")
  const [bulkPaymentDate, setBulkPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [bulkPaymentNotes, setBulkPaymentNotes] = useState<string>("")
  const [isSavingBulkPayments, setIsSavingBulkPayments] = useState(false)
  const [bulkUpdateResult, setBulkUpdateResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  // Refs for PDF generation
  const invoiceRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Update the useEffect that loads invoices to ensure IDs are properly set
  useEffect(() => {
    const loadInvoices = async () => {
      setIsLoading(true)
      try {
        // Try to load invoices from localStorage first
        const storedInvoicesString = localStorage.getItem("invoices")
        console.log("Checking for invoices in localStorage")

        let invoiceData = []

        if (storedInvoicesString) {
          // If localStorage has data, use it
          try {
            const storedInvoices = JSON.parse(storedInvoicesString)
            console.log(`Found ${storedInvoices.length} invoices in localStorage`)

            if (Array.isArray(storedInvoices)) {
              invoiceData = storedInvoices
            } else {
              console.error("Stored invoices is not an array:", storedInvoices)
              setError("Invalid invoice data format in localStorage")
              // Clear invalid data
              localStorage.removeItem("invoices")
            }
          } catch (parseError) {
            console.error("Error parsing invoices from localStorage:", parseError)
            localStorage.removeItem("invoices")
          }
        }

        // If localStorage is empty or invalid, fetch from database
        if (invoiceData.length === 0) {
          console.log("No invoices found in localStorage, fetching from database")
          try {
            // Import the server action directly
            const { loadInvoicesFromDbAction } = await import("@/app/actions/data-loader-actions")
            const result = await loadInvoicesFromDbAction()

            if (result.success && Array.isArray(result.invoices)) {
              invoiceData = result.invoices
              console.log(`Loaded ${invoiceData.length} invoices from database`)

              // Save to localStorage for future use
              if (invoiceData.length > 0) {
                localStorage.setItem("invoices", JSON.stringify(invoiceData))
              }
            } else {
              console.error("Failed to load invoices from database:", result.message || "Unknown error")
              setError(`Failed to load invoices from database: ${result.message || "Unknown error"}`)
            }
          } catch (dbError) {
            console.error("Error loading invoices from database:", dbError)
            setError(
              `Failed to load invoices from database: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
            )
          }
        }

        if (invoiceData.length === 0) {
          console.log("No invoices found in localStorage or database")
          setInvoices([])
          setFilteredInvoices([])
          setIsLoading(false)
          return
        }

        // Validate and fix any invoice data issues
        const validatedInvoices = invoiceData.map((invoice: any) => {
          // Ensure all required fields exist
          const validatedInvoice = {
            id: invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            invoiceNumber: invoice.invoiceNumber || `INV-${Date.now()}`,
            date: invoice.date || new Date().toISOString().split("T")[0],
            paymentTerms: invoice.paymentTerms || "Net 30",
            vendor: {
              id: invoice.vendor?.id || null,
              name: invoice.vendor?.name || "Unknown Vendor",
              address: invoice.vendor?.address || "",
            },
            billTo: {
              id: invoice.billTo?.id || null,
              name: invoice.billTo?.name || "Unknown Client",
              address: invoice.billTo?.address || "",
            },
            serviceFor: invoice.serviceFor || "Consulting Services",
            employee: {
              name: invoice.employee?.name || "Unknown Employee",
              id: invoice.employee?.id || "unknown",
              referrals: invoice.employee?.referrals || [],
            },
            period: {
              month: invoice.period?.month || "Unknown Period",
              start: invoice.period?.start || "",
              end: invoice.period?.end || "",
            },
            hours: Number(invoice.hours) || 0,
            billRate: Number(invoice.billRate) || 0,
            payRate: invoice.payRate !== undefined ? Number(invoice.payRate) : undefined,
            totalBillAmount: Number(invoice.totalBillAmount) || 0,
            status: invoice.status || "pending",
            paymentDetails: invoice.paymentDetails || {
              amountPaid: 0,
              paymentDate: "",
              notes: "",
              employeePaymentAmount: 0,
              referralPayments: [],
            },
            savedToDb: invoice.savedToDb || false,
          }

          return validatedInvoice
        })

        console.log("Validated invoices:", validatedInvoices.length)

        // Log the first invoice for debugging
        if (validatedInvoices.length > 0) {
          const sampleInvoice = validatedInvoices[0]
          console.log("Sample validated invoice:", {
            id: sampleInvoice.id,
            invoiceNumber: sampleInvoice.invoiceNumber,
            employeeId: sampleInvoice.employee.id,
            vendorId: sampleInvoice.vendor.id,
            clientId: sampleInvoice.billTo.id,
            vendor: sampleInvoice.vendor.name,
            client: sampleInvoice.billTo.name,
          })
        }

        setInvoices(validatedInvoices)
        setFilteredInvoices(validatedInvoices)
        setTotalInvoices(validatedInvoices.length)

        // Extract unique vendors for filtering
        const uniqueVendors = Array.from(new Set(validatedInvoices.map((inv: Invoice) => inv.vendor.name)))
        setVendors(uniqueVendors)

        // Extract unique clients for filtering
        const uniqueClients = Array.from(new Set(validatedInvoices.map((inv: Invoice) => inv.billTo.name)))
        setClients(uniqueClients)

        // Extract unique months for filtering
        const uniqueMonths = new Map<string, { value: string; label: string }>()
        validatedInvoices.forEach((inv: Invoice) => {
          if (inv.period && inv.period.month) {
            const monthYear = inv.period.month
            uniqueMonths.set(monthYear, {
              value: monthYear,
              label: monthYear,
            })
          }
        })
        setAvailableMonths([{ value: "all", label: "All Periods" }, ...Array.from(uniqueMonths.values())])
      } catch (error) {
        console.error("Error loading invoices:", error)
        setError(`Failed to load invoices: ${error instanceof Error ? error.message : String(error)}`)
        toast.destructive({
          title: "Error",
          description: "Failed to load invoices. Please refresh the page.",
        })
        setInvoices([])
        setFilteredInvoices([])
      } finally {
        setIsLoading(false)
      }
    }

    loadInvoices()
  }, [])

  useEffect(() => {
    // Always show all invoices in filteredInvoices, we'll filter by status in each tab
    setFilteredInvoices(invoices)
  }, [invoices])

  // Update selectAll state when individual selections change
  useEffect(() => {
    const visibleInvoices = getSortedInvoices()
    setSelectAll(
      selectedInvoices.size === visibleInvoices.length &&
        visibleInvoices.length > 0 &&
        visibleInvoices.every((inv) => selectedInvoices.has(inv.invoiceNumber)),
    )
  }, [selectedInvoices, filterMonth, filterVendor, filterStatus, filterPeriodStart, filterPeriodEnd, searchTerm])

  // Auto-update amount paid when status changes to "paid"
  useEffect(() => {
    if (paymentStatus === "paid" && paymentInvoice) {
      setAmountPaid(paymentInvoice.totalBillAmount.toFixed(2))

      // Auto-calculate employee payment based on pay rate * hours
      if (paymentInvoice.payRate !== undefined && paymentInvoice.payRate > 0) {
        const employeePayment = (paymentInvoice.payRate * paymentInvoice.hours).toFixed(2)
        setEmployeePaymentAmount(employeePayment)
      } else {
        // Fallback to 0 if pay rate is not available or is zero
        setEmployeePaymentAmount("0.00")
      }

      // Auto-calculate referral payments
      if (paymentInvoice.employee.referrals && paymentInvoice.employee.referrals.length > 0) {
        const newReferralPayments = paymentInvoice.employee.referrals.map((referral) => ({
          id: referral.id,
          name: referral.name,
          amount: (paymentInvoice.hours * referral.fee).toFixed(2),
        }))
        setReferralPayments(newReferralPayments)
      }
    }
  }, [paymentStatus, paymentInvoice])

  // Load jsPDF and html2canvas dynamically when needed
  const loadPdfLibraries = async () => {
    try {
      const jsPDFModule = await import("jspdf")
      const html2canvasModule = await import("html2canvas")
      const autoTableModule = await import("jspdf-autotable")
      return {
        jsPDF: jsPDFModule.default,
        html2canvas: html2canvasModule.default,
        autoTable: autoTableModule.default,
      }
    } catch (error) {
      console.error("Error loading PDF libraries:", error)
      throw new Error("Failed to load PDF generation libraries")
    }
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New field, default to descending
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const getSortedInvoices = () => {
    try {
      // First filter by search term, vendor, status, and period
      const filtered = invoices.filter((invoice) => {
        const matchesSearch =
          searchTerm === "" ||
          invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.billTo.name.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesVendor = filterVendor === "all" || invoice.vendor.name === filterVendor

        const matchesClient = filterClient === "all" || invoice.billTo.name === filterClient

        const matchesStatus = filterStatus === "all" || invoice.status === filterStatus

        // Filter by invoice period
        let matchesPeriod = true
        if (filterMonth !== "all") {
          matchesPeriod = invoice.period.month === filterMonth
        } else if (filterPeriodStart || filterPeriodEnd) {
          try {
            const invoiceStart = new Date(invoice.period.start || "")
            const invoiceEnd = new Date(invoice.period.end || "")

            if (filterPeriodStart && !isNaN(invoiceStart.getTime()) && !isNaN(invoiceEnd.getTime())) {
              const filterStart = new Date(filterPeriodStart)
              if (invoiceStart < filterStart && invoiceEnd < filterStart) {
                matchesPeriod = false
              }
            }

            if (filterPeriodEnd && !isNaN(invoiceStart.getTime())) {
              const filterEnd = new Date(filterPeriodEnd)
              if (invoiceStart > filterEnd) {
                matchesPeriod = false
              }
            }
          } catch (e) {
            console.error("Error filtering by period:", e)
            // If there's an error in date comparison, include the invoice
            matchesPeriod = true
          }
        }

        return matchesSearch && matchesVendor && matchesClient && matchesStatus && matchesPeriod
      })

      // Then sort
      return filtered.sort((a, b) => {
        let valueA: any
        let valueB: any

        try {
          // Get the values to compare based on the sort field
          if (sortField === "employee.name") {
            valueA = a.employee.name || ""
            valueB = b.employee.name || ""
          } else if (sortField === "vendor.name") {
            valueA = a.vendor.name || ""
            valueB = b.vendor.name || ""
          } else if (sortField === "totalBillAmount") {
            valueA = Number(a.totalBillAmount) || 0
            valueB = Number(b.totalBillAmount) || 0
          } else if (sortField === "status") {
            // Sort by status priority: pending, partially_paid, paid
            const statusPriority = { pending: 0, partially_paid: 1, paid: 2 }
            valueA = statusPriority[a.status || "pending"]
            valueB = statusPriority[b.status || "pending"]
          } else if (sortField === "date") {
            // Handle date sorting safely
            try {
              valueA = a.date ? new Date(a.date).getTime() : 0
            } catch (e) {
              valueA = 0
            }

            try {
              valueB = b.date ? new Date(b.date).getTime() : 0
            } catch (e) {
              valueB = 0
            }

            // If either date is invalid, use string comparison as fallback
            if (isNaN(valueA) || isNaN(valueB)) {
              valueA = String(a.date || "")
              valueB = String(b.date || "")
            }
          } else {
            valueA = a[sortField as keyof Invoice] || ""
            valueB = b[sortField as keyof Invoice] || ""
          }

          // Compare based on direction
          if (sortDirection === "asc") {
            return valueA > valueB ? 1 : -1
          } else {
            return valueA < valueB ? 1 : -1
          }
        } catch (e) {
          console.error("Error during sort comparison:", e)
          return 0
        }
      })
    } catch (error) {
      console.error("Error in getSortedInvoices:", error)
      return []
    }
  }

  // Determine if an invoice is overdue
  const isInvoiceOverdue = (invoice: Invoice) => {
    // Only pending invoices can be overdue
    if (invoice.status !== "pending") return false

    try {
      const invoiceDate = new Date(invoice.date)
      const today = new Date()

      // Calculate days since invoice date
      const diffTime = today.getTime() - invoiceDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Get payment terms - default to 30 days if not specified
      let termDays = 30
      if (invoice.paymentTerms) {
        const match = invoice.paymentTerms.match(/\d+/)
        if (match) {
          termDays = Number.parseInt(match[0], 10)
        }
      }

      // Invoice is overdue if more days have passed than the payment terms
      return diffDays > termDays
    } catch (error) {
      console.error("Error checking if invoice is overdue:", error)
      return false
    }
  }

  // Find the handleDeleteInvoice function and replace it with this improved version
  const handleDeleteInvoice = async (invoiceNumber: string) => {
    try {
      // Find the invoice by number to get its ID
      const invoice = invoices.find((inv) => inv.invoiceNumber === invoiceNumber)
      if (!invoice) {
        throw new Error("Invoice not found")
      }

      setIsDeleting(invoiceNumber)

      // First delete from SQLite database using server action if it was saved
      if (invoice.id) {
        console.log(`Attempting to delete invoice ${invoiceNumber} with ID ${invoice.id} from database`)
        const result = await deleteInvoiceAction(invoice.id, invoiceNumber)

        if (!result.success) {
          throw new Error(result.message || "Failed to delete from database")
        }

        console.log(`Successfully deleted invoice ${invoiceNumber} from database`)
      } else {
        console.log(`Invoice ${invoiceNumber} has no ID, only removing from UI`)
      }

      // Then update local state
      const updatedInvoices = invoices.filter((inv) => inv.invoiceNumber !== invoiceNumber)
      localStorage.setItem("invoices", JSON.stringify(updatedInvoices))
      setInvoices(updatedInvoices)
      setFilteredInvoices(updatedInvoices)

      // Remove from selected invoices if present
      if (selectedInvoices.has(invoiceNumber)) {
        const newSelected = new Set(selectedInvoices)
        newSelected.delete(invoiceNumber)
        setSelectedInvoices(newSelected)
      }

      toast.default({
        title: "Invoice Deleted",
        description: `Invoice ${invoiceNumber} has been deleted from the system${invoice.id ? " and database" : ""}`,
      })
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to delete invoice: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleUpdateStatus = (invoiceNumber: string, newStatus: string) => {
    const updatedInvoices = invoices.map((invoice) => {
      if (invoice.invoiceNumber === invoiceNumber) {
        return {
          ...invoice,
          status: newStatus,
          savedToDb: false, // Mark as unsaved when status changes
        }
      }
      return invoice
    })

    setInvoices(updatedInvoices)
    localStorage.setItem("invoices", JSON.stringify(updatedInvoices))

    // Update filtered invoices
    if (statusFilter === "all") {
      setFilteredInvoices(updatedInvoices)
    } else {
      setFilteredInvoices(updatedInvoices.filter((invoice) => invoice.status === statusFilter))
    }
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    // Use setTimeout to ensure the dialog is rendered before printing
    setTimeout(() => {
      window.print()
    }, 300)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    } catch (error) {
      console.error("Error formatting currency:", error)
      return `$${amount.toFixed(2)}`
    }
  }

  const clearFilters = () => {
    setFilterVendor("all")
    setFilterClient("all")
    setFilterStatus("all")
    setFilterMonth("all")
    setFilterPeriodStart("")
    setFilterPeriodEnd("")
    setShowFilterPopover(false)
  }

  const applyFilters = () => {
    setShowFilterPopover(false)
  }

  const handleUpdatePayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice)
    setPaymentStatus(invoice.status || "pending")
    setAmountPaid(invoice.paymentDetails?.amountPaid?.toFixed(2) || "0.00")
    setPaymentDate(invoice.paymentDetails?.paymentDate || new Date().toISOString().split("T")[0])
    setPaymentNotes(invoice.paymentDetails?.notes || "")
    setEmployeePaymentAmount(invoice.paymentDetails?.employeePaymentAmount?.toFixed(2) || "0.00")

    // Set referral payments
    if (invoice.paymentDetails?.referralPayments) {
      setReferralPayments(
        invoice.paymentDetails.referralPayments.map((payment) => ({
          id: payment.id,
          name: payment.name,
          amount: payment.amount.toFixed(2),
        })),
      )
    } else if (invoice.employee.referrals) {
      // Initialize with zero amounts
      setReferralPayments(
        invoice.employee.referrals.map((referral) => ({
          id: referral.id,
          name: referral.name,
          amount: "0.00",
        })),
      )
    } else {
      setReferralPayments([])
    }

    setShowPaymentDialog(true)
  }

  // Find the savePaymentDetails function and replace it with this corrected version
  // that properly handles the "pending" status for individual invoices

  // Save payment details and automatically save to database
  const savePaymentDetails = async () => {
    if (!paymentInvoice) return

    try {
      // If explicitly setting to pending, ensure amounts are zero
      if (paymentStatus === "pending") {
        setAmountPaid("0.00")
        setEmployeePaymentAmount("0.00")

        // Reset referral payments to zero
        if (referralPayments.length > 0) {
          setReferralPayments(
            referralPayments.map((payment) => ({
              ...payment,
              amount: "0.00",
            })),
          )
        }
      }

      const amountPaidNum = Number.parseFloat(amountPaid)
      const employeePaymentAmountNum = Number.parseFloat(employeePaymentAmount)

      if (isNaN(amountPaidNum) || amountPaidNum < 0) {
        toast.destructive({
          title: "Invalid Amount",
          description: "Please enter a valid payment amount",
        })
        return
      }

      if (isNaN(employeePaymentAmountNum) || employeePaymentAmountNum < 0) {
        toast.destructive({
          title: "Invalid Employee Payment",
          description: "Please enter a valid employee payment amount",
        })
        return
      }

      // Validate referral payments
      const referralPaymentsData = referralPayments.map((payment) => {
        const amount = Number.parseFloat(payment.amount)
        if (isNaN(amount) || amount < 0) {
          throw new Error(`Invalid referral payment amount for ${payment.name}`)
        }
        return {
          id: payment.id,
          name: payment.name,
          amount: amount,
        }
      })

      console.log("Saving referral payments:", referralPaymentsData)

      // Determine status based on amount paid and selected status
      let finalStatus = paymentStatus

      // If user explicitly selected "pending", respect that choice regardless of amount
      if (paymentStatus === "pending") {
        finalStatus = "pending"
      }
      // Otherwise auto-adjust based on amount
      else if (paymentStatus === "partially_paid") {
        if (amountPaidNum >= paymentInvoice.totalBillAmount) {
          finalStatus = "paid"
        } else if (amountPaidNum <= 0) {
          finalStatus = "pending"
        }
      } else if (paymentStatus === "paid" && amountPaidNum < paymentInvoice.totalBillAmount) {
        finalStatus = "partially_paid"
      } else if (paymentStatus === "pending" && amountPaidNum > 0) {
        finalStatus = amountPaidNum >= paymentInvoice.totalBillAmount ? "paid" : "partially_paid"
      }

      // Show saving indicator
      setIsSavingToDb(true)
      setSaveResult(null)

      // Update the invoice in local state
      const updatedInvoice = {
        ...paymentInvoice,
        status: finalStatus,
        paymentDetails: {
          amountPaid: amountPaidNum,
          employeePaymentAmount: employeePaymentAmountNum,
          referralPayments: referralPaymentsData,
          paymentDate: paymentDate,
          notes: paymentNotes,
        },
        savedToDb: true, // Will be saved to DB immediately
      }

      // Prepare the invoice for database save
      const invoiceForDb = {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        date: updatedInvoice.date,
        paymentTerms: updatedInvoice.paymentTerms,
        vendor: updatedInvoice.vendor,
        billTo: updatedInvoice.billTo,
        employee: updatedInvoice.employee,
        serviceFor: updatedInvoice.serviceFor,
        period: updatedInvoice.period,
        hours: updatedInvoice.hours,
        billRate: updatedInvoice.billRate,
        payRate: updatedInvoice.payRate,
        totalBillAmount: updatedInvoice.totalBillAmount,
        status: finalStatus,
        paymentDetails: {
          amountPaid: amountPaidNum,
          employeePaymentAmount: employeePaymentAmountNum,
          referralPayments: referralPaymentsData,
          paymentDate: paymentDate,
          notes: paymentNotes,
        },
        savedToDb: true,
      }

      // First try to update the invoice
      console.log("Saving payment details to database:", invoiceForDb)
      const { updateInvoiceInDbAction, saveInvoiceToDbAction } = await import("../actions/invoice-actions")

      let result = await updateInvoiceInDbAction(invoiceForDb)

      // If update fails because the invoice doesn't exist, try to find it by invoice number first
      if (!result.success && (result.message?.includes("not found") || result.notFound)) {
        console.log("Invoice not found by ID, checking if it exists with the same invoice number...")

        // Try to find an invoice with the same invoice number
        const { loadInvoiceByNumber } = await import("@/lib/data-loader")
        const existingInvoice = await loadInvoiceByNumber(invoiceForDb.invoiceNumber)

        if (existingInvoice) {
          // Invoice exists with this number but different ID
          console.log("Found invoice with same number but different ID, updating using that ID")
          invoiceForDb.id = existingInvoice.id
          result = await updateInvoiceInDbAction(invoiceForDb)
        } else {
          // Invoice doesn't exist at all, create it
          console.log("Invoice doesn't exist in database, creating it first...")
          const createResult = await saveInvoiceToDbAction(invoiceForDb)

          if (!createResult.success) {
            throw new Error(createResult.message || "Failed to create invoice in database")
          }

          // Now try updating again with the new ID
          invoiceForDb.id = createResult.invoiceId
          result = await updateInvoiceInDbAction(invoiceForDb)
        }
      }

      if (!result.success) {
        throw new Error(result.message || "Failed to save payment details to database")
      }

      // Update all invoices in state
      const updatedInvoices = invoices.map((inv) => {
        if (inv.invoiceNumber === paymentInvoice.invoiceNumber) {
          return {
            ...updatedInvoice,
            id: result.invoiceId || updatedInvoice.id, // Use the ID returned from the server if available
          }
        }
        return inv
      })

      // Save to localStorage
      localStorage.setItem("invoices", JSON.stringify(updatedInvoices))

      // Update state
      setInvoices(updatedInvoices)
      setFilteredInvoices(updatedInvoices)

      // Close dialog
      setShowPaymentDialog(false)

      toast.default({
        title: "Payment Updated",
        description: `Invoice ${paymentInvoice.invoiceNumber} payment status updated and saved to database.`,
      })
    } catch (error) {
      console.error("Error updating payment:", error)

      // Set save result for display
      setSaveResult({
        success: false,
        message: `Failed to update payment: ${error instanceof Error ? error.message : "Please try again"}`,
      })

      toast.destructive({
        title: "Error",
        description: `Failed to update payment: ${error instanceof Error ? error.message : "Please try again"}`,
      })

      // If we get a "no such table" error, show the database initialization dialog
      if (error instanceof Error && error.message.includes("no such table")) {
        setShowDbInitDialog(true)
      }
    } finally {
      setIsSavingToDb(false)
    }
  }

  // Save payment details for multiple invoices
  const saveBulkPaymentDetails = async () => {
    if (selectedInvoices.size === 0) return

    console.log("Starting bulk payment update with selected invoices:", selectedInvoices.size)

    try {
      setIsSavingBulkPayments(true)
      setBulkUpdateResult(null)

      // Get the currently visible invoices based on filters
      const visibleInvoices = getSortedInvoices()

      // Get only the selected invoices that are currently visible
      const selectedInvoicesList = visibleInvoices.filter((inv) => selectedInvoices.has(inv.invoiceNumber))

      console.log(
        `Processing ${selectedInvoicesList.length} visible selected invoices out of ${selectedInvoices.size} total selected`,
      )

      // Prepare updates
      const updates = []
      const failures = []

      for (const invoice of selectedInvoicesList) {
        try {
          // Calculate amount paid based on the selected option
          let amountPaidNum = 0
          if (bulkAmountPaidOption === "full") {
            amountPaidNum = invoice.totalBillAmount
          } else if (bulkAmountPaidOption === "custom") {
            amountPaidNum = Number.parseFloat(bulkAmountPaid)
            if (isNaN(amountPaidNum) || amountPaidNum < 0) {
              throw new Error(`Invalid amount for invoice ${invoice.invoiceNumber}`)
            }
          }

          // Determine status based on amount paid
          let finalStatus = bulkPaymentStatus

          // If explicitly setting to pending, ensure amounts are zero
          if (bulkPaymentStatus === "pending") {
            finalStatus = "pending"
            amountPaidNum = 0
            const employeePaymentAmountNum = 0

            // Reset referral payments to zero but keep the structure
            let referralPaymentsData: any = []
            if (invoice.employee.referrals && invoice.employee.referrals.length > 0) {
              referralPaymentsData = invoice.employee.referrals.map((referral) => ({
                id: referral.id,
                name: referral.name,
                amount: 0,
              }))
            }
          }
          // Otherwise auto-adjust based on amount
          else {
            if (bulkAmountPaidOption === "zero" || amountPaidNum <= 0) {
              finalStatus = "pending"
            } else if (amountPaidNum >= invoice.totalBillAmount) {
              finalStatus = "paid"
            } else {
              finalStatus = "partially_paid"
            }
          }

          // Calculate employee payment amount if pay rate is available
          let employeePaymentAmountNum = 0
          if (
            invoice.payRate !== undefined &&
            invoice.payRate > 0 &&
            (finalStatus === "paid" || finalStatus === "partially_paid")
          ) {
            employeePaymentAmountNum = invoice.payRate * invoice.hours
          }

          // Prepare referral payments if applicable
          const referralPaymentsData: any = []
          if (
            invoice.employee.referrals &&
            invoice.employee.referrals.length > 0 &&
            (finalStatus === "paid" || finalStatus === "partially_paid")
          ) {
            for (const referral of invoice.employee.referrals) {
              referralPaymentsData.push({
                id: referral.id,
                name: referral.name,
                amount: invoice.hours * referral.fee,
              })
            }
          }

          // Update the invoice in local state
          const updatedInvoice = {
            ...invoice,
            status: finalStatus,
            paymentDetails: {
              amountPaid: amountPaidNum,
              employeePaymentAmount: employeePaymentAmountNum,
              referralPayments: referralPaymentsData,
              paymentDate: bulkPaymentDate,
              notes: bulkPaymentNotes,
            },
            savedToDb: true, // Will be saved to DB
          }

          // Prepare the invoice for database save
          const invoiceForDb = {
            id: updatedInvoice.id,
            invoiceNumber: updatedInvoice.invoiceNumber,
            date: updatedInvoice.date,
            paymentTerms: updatedInvoice.paymentTerms,
            vendor: updatedInvoice.vendor,
            billTo: updatedInvoice.billTo,
            employee: updatedInvoice.employee,
            serviceFor: updatedInvoice.serviceFor,
            period: updatedInvoice.period,
            hours: updatedInvoice.hours,
            billRate: updatedInvoice.billRate,
            payRate: updatedInvoice.payRate,
            totalBillAmount: updatedInvoice.totalBillAmount,
            status: finalStatus,
            paymentDetails: {
              amountPaid: amountPaidNum,
              employeePaymentAmount: employeePaymentAmountNum,
              referralPayments: referralPaymentsData,
              paymentDate: bulkPaymentDate,
              notes: bulkPaymentNotes,
            },
            savedToDb: true,
          }

          // When preparing updates for each invoice
          console.log(`Preparing update for invoice ${invoice.invoiceNumber}:`, {
            currentStatus: invoice.status,
            newStatus: finalStatus,
            amountPaid: amountPaidNum,
            employeePaymentAmount: employeePaymentAmountNum,
          })

          updates.push(invoiceForDb)
        } catch (error) {
          console.error(`Error preparing update for invoice ${invoice.invoiceNumber}:`, error)
          failures.push({
            invoiceNumber: invoice.invoiceNumber,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      if (updates.length === 0) {
        throw new Error("No valid invoices to update")
      }

      // Import the server action
      const { updateMultipleInvoicesAction } = await import("../actions/invoice-actions")

      // Update all invoices in the database
      const result = await updateMultipleInvoicesAction(updates)

      console.log("Bulk update result from server action:", result)

      if (!result.success) {
        throw new Error(result.message || "Failed to update invoices")
      }

      // Update all invoices in state
      const updatedInvoices = invoices.map((inv) => {
        const update = updates.find((u) => u.invoiceNumber === inv.invoiceNumber)
        if (update) {
          return {
            ...inv,
            status: update.status,
            paymentDetails: update.paymentDetails,
            savedToDb: true,
            id: update.id || inv.id,
          }
        }
        return inv
      })

      // Save to localStorage
      localStorage.setItem("invoices", JSON.stringify(updatedInvoices))

      // Update state
      setInvoices(updatedInvoices)
      setFilteredInvoices(updatedInvoices)

      // Clear selection
      setSelectedInvoices(new Set())

      // Set result
      setBulkUpdateResult({
        success: true,
        message: `Successfully updated ${updates.length} invoices`,
        details: failures.length > 0 ? `Failed to update ${failures.length} invoices` : undefined,
      })

      // Close dialog after a delay to show the success message
      setTimeout(() => {
        setShowBulkPaymentDialog(false)

        toast.default({
          title: "Payment Status Updated",
          description: `Successfully updated ${updates.length} invoices`,
        })
      }, 2000)
    } catch (error) {
      console.error("Error updating bulk payments:", error)

      // Set error result
      setBulkUpdateResult({
        success: false,
        message: `Failed to update invoices: ${error instanceof Error ? error.message : "Unknown error"}`,
      })

      toast.destructive({
        title: "Error",
        description: `Failed to update payment status: ${error instanceof Error ? error.message : "Please try again"}`,
      })
    } finally {
      setIsSavingBulkPayments(false)
    }
  }

  // Handle opening the bulk payment dialog
  const handleBulkPaymentUpdate = () => {
    if (selectedInvoices.size === 0) {
      toast.destructive({
        title: "No Invoices Selected",
        description: "Please select at least one invoice to update payment status",
      })
      return
    }

    // Reset the form
    setBulkPaymentStatus("paid")
    setBulkAmountPaidOption("full")
    setBulkAmountPaid("0")
    setBulkPaymentDate(new Date().toISOString().split("T")[0])
    setBulkPaymentNotes("")
    setBulkUpdateResult(null)

    // Open the dialog
    setShowBulkPaymentDialog(true)
  }

  // Handle invoice selection
  const handleSelectInvoice = (invoiceNumber: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)

    if (checked) {
      newSelected.add(invoiceNumber)
    } else {
      newSelected.delete(invoiceNumber)
    }

    setSelectedInvoices(newSelected)
  }

  // Handle select all - FIXED to only select visible invoices
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only visible invoices based on current filters
      const visibleInvoices = getSortedInvoices()
      const visibleInvoiceNumbers = new Set(visibleInvoices.map((inv) => inv.invoiceNumber))
      setSelectedInvoices(visibleInvoiceNumbers)
      console.log(`Selected ${visibleInvoiceNumbers.size} visible invoices`)
    } else {
      // Deselect all
      setSelectedInvoices(new Set())
      console.log("Deselected all invoices")
    }
  }

  // Generate PDF for a single invoice
  const generateSingleInvoicePdf = async (invoice: Invoice) => {
    try {
      setGeneratingPdf(true)

      // Load PDF libraries
      const { jsPDF, autoTable } = await loadPdfLibraries()

      // Create new PDF document
      const pdf = new jsPDF()

      // Set font sizes
      const titleFontSize = 16
      const headerFontSize = 12
      const normalFontSize = 10
      const smallFontSize = 8

      // Add title
      pdf.setFontSize(titleFontSize)
      pdf.setFont("helvetica", "bold")
      pdf.text("INVOICE", pdf.internal.pageSize.width / 2, 15, { align: "center" })

      // Add invoice number
      pdf.setFontSize(headerFontSize)
      pdf.text(`Invoice #: ${invoice.invoiceNumber}`, pdf.internal.pageSize.width / 2, 22, { align: "center" })

      // Reset font
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(normalFontSize)

      // Add vendor and client information
      pdf.text("From:", 15, 35)
      pdf.setFont("helvetica", "bold")
      pdf.text(invoice.vendor.name, 15, 40)
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(smallFontSize)

      // Handle multiline address
      const vendorAddressLines = invoice.vendor.address.split("\n")
      let yPos = 45
      vendorAddressLines.forEach((line) => {
        pdf.text(line, 15, yPos)
        yPos += 5
      })

      // Bill To section
      pdf.setFontSize(normalFontSize)
      pdf.text("Bill To:", 120, 35)
      pdf.setFont("helvetica", "bold")
      pdf.text(invoice.billTo.name, 120, 40)
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(smallFontSize)

      // Handle multiline address
      const clientAddressLines = invoice.billTo.address.split("\n")
      yPos = 45
      clientAddressLines.forEach((line) => {
        pdf.text(line, 120, yPos)
        yPos += 5
      })

      // Invoice details
      pdf.setFontSize(normalFontSize)
      pdf.text("Invoice Details:", 15, 70)
      pdf.text(`Date: ${formatDate(invoice.date)}`, 15, 75)
      pdf.text(`Payment Terms: ${invoice.paymentTerms}`, 15, 80)
      pdf.text(`Status: ${invoice.status}`, 15, 85)

      // Service information
      pdf.text("Service Information:", 120, 70)
      pdf.text(invoice.serviceFor, 120, 75)
      pdf.text(`Period: ${formatDate(invoice.period.start)} - ${formatDate(invoice.period.end)}`, 120, 80)
      pdf.text(`Month: ${invoice.period.month}`, 120, 85)

      // Create invoice table
      autoTable(pdf, {
        startY: 95,
        head: [["Employee Name", "Hours Worked", "Bill Rate", "Total Amount"]],
        body: [
          [
            invoice.employee.name,
            invoice.hours.toString(),
            `$${invoice.billRate.toFixed(2)}/hr`,
            `$${invoice.totalBillAmount.toFixed(2)}`,
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
      })

      // Get the last Y position after the table
      const finalY = (pdf as any).lastAutoTable.finalY + 10

      // Add summary
      pdf.text("Summary", 15, finalY)

      autoTable(pdf, {
        startY: finalY + 5,
        head: [["Description", "Amount"]],
        body: [
          ["Subtotal", `$${invoice.totalBillAmount.toFixed(2)}`],
          ["Tax (0%)", "$0.00"],
          ["Total Due", `$${invoice.totalBillAmount.toFixed(2)}`],
        ],
        theme: "grid",
        styles: { fontSize: 10 },
        margin: { left: 100 },
        tableWidth: 90,
      })

      // Add payment information if available
      if (invoice.status !== "pending" && invoice.paymentDetails) {
        const paymentY = (pdf as any).lastAutoTable.finalY + 10

        pdf.text("Payment Information", 15, paymentY)

        const paymentRows = [["Amount Paid", `$${invoice.paymentDetails.amountPaid.toFixed(2)}`]]

        if (invoice.status === "partially_paid") {
          paymentRows.push([
            "Balance Due",
            `$${(invoice.totalBillAmount - invoice.paymentDetails.amountPaid).toFixed(2)}`,
          ])
        }

        if (invoice.paymentDetails.paymentDate) {
          paymentRows.push(["Payment Date", formatDate(invoice.paymentDetails.paymentDate)])
        }

        autoTable(pdf, {
          startY: paymentY + 5,
          body: paymentRows,
          theme: "grid",
          styles: { fontSize: 10 },
          margin: { left: 100 },
          tableWidth: 90,
        })
      }

      // Add payment notes if available
      if (invoice.paymentDetails?.notes) {
        const notesY = (pdf as any).lastAutoTable.finalY + 10
        pdf.text("Payment Notes:", 15, notesY)
        pdf.setFontSize(smallFontSize)
        pdf.text(invoice.paymentDetails.notes, 15, notesY + 5)
      }

      // Add thank you note at the bottom
      const pageHeight = pdf.internal.pageSize.height
      pdf.setFontSize(smallFontSize)
      pdf.text("Thank you for your business!", pdf.internal.pageSize.width / 2, pageHeight - 10, { align: "center" })

      // Format the filename using employee name and period
      const employeeName = invoice.employee.name.replace(/\s+/g, "-")
      const periodParts = invoice.period.month.split(" ")
      const month = periodParts[0]
      const year = periodParts[1] || new Date().getFullYear().toString()
      const filename = `${employeeName}-${month}-${year}.pdf`

      // Save the PDF
      pdf.save(filename)
      setGeneratingPdf(false)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.destructive({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF. Please try again.",
      })
      setGeneratingPdf(false)
    }
  }

  // Generate PDFs for multiple invoices
  const generateMultipleInvoicePdfs = async () => {
    if (selectedInvoices.size === 0) {
      toast.destructive({
        title: "No Invoices Selected",
        description: "Please select at least one invoice to download",
      })
      return
    }

    try {
      setGeneratingPdf(true)

      // Get selected invoices
      const selectedInvoicesList = invoices.filter((inv) => selectedInvoices.has(inv.invoiceNumber))

      // Generate individual PDFs for each selected invoice
      for (let i = 0; i < selectedInvoicesList.length; i++) {
        const invoice = selectedInvoicesList[i]

        // Use the single invoice generator for each invoice
        await generateSingleInvoicePdf(invoice)

        // Small delay between downloads to prevent browser issues
        if (i < selectedInvoicesList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      toast.default({
        title: "PDFs Generated",
        description: `Successfully generated ${selectedInvoicesList.length} individual invoice PDFs`,
      })
    } catch (error) {
      console.error("Error generating PDFs:", error)
      toast.destructive({
        title: "PDF Generation Failed",
        description: "Failed to generate PDFs. Please try again.",
      })
      setGeneratingPdf(false)
    }
  }

  const exportToExcel = () => {
    try {
      // Determine which invoices to export: selected ones or filtered ones if none selected
      const invoicesToExport =
        selectedInvoices.size > 0
          ? invoices.filter((inv) => selectedInvoices.has(inv.invoiceNumber))
          : getSortedInvoices()

      if (invoicesToExport.length === 0) {
        toast.destructive({
          title: "No Invoices to Export",
          description: "There are no invoices to export to Excel.",
        })
        return
      }

      // Create worksheet data
      const worksheetData = [
        // Header row
        [
          "Invoice Number",
          "Candidate Name",
          "Client Name",
          "Hours Worked",
          "Bill Rate",
          "Invoiced Amount",
          "Status",
          "Date",
        ],
      ]

      // Add invoice data rows
      invoicesToExport.forEach((invoice) => {
        worksheetData.push([
          invoice.invoiceNumber,
          invoice.employee.name,
          invoice.billTo.name,
          invoice.hours,
          invoice.billRate,
          invoice.totalBillAmount,
          invoice.status,
          formatDate(invoice.date),
        ])
      })

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(worksheetData)

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Invoice Number
        { wch: 20 }, // Candidate Name
        { wch: 20 }, // Client Name
        { wch: 12 }, // Hours Worked
        { wch: 10 }, // Bill Rate
        { wch: 15 }, // Invoiced Amount
        { wch: 12 }, // Status
        { wch: 12 }, // Date
      ]
      ws["!cols"] = columnWidths

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Invoices")

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0]
      const filename = `invoice-report-${dateStr}.xlsx`

      // Write and download
      XLSX.writeFile(wb, filename)

      // Show success message
      toast.default({
        title: "Excel Export Successful",
        description: `Exported ${invoicesToExport.length} invoices to Excel.`,
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.destructive({
        title: "Export Failed",
        description: "Failed to export invoices to Excel. Please try again.",
      })
    }
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-500">Overdue</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const handleInitializeDatabase = async () => {
    setIsInitializingDb(true)
    setDbInitResult(null)

    try {
      const result = await initializeDatabase()

      setDbInitResult(result)

      if (result.success) {
        toast.default({
          title: "Database Initialized",
          description: "Database tables have been created successfully.",
        })
      } else {
        toast.destructive({
          title: "Database Initialization Failed",
          description: result.message || "Failed to initialize database. Please try again.",
        })
      }
    } catch (error) {
      console.error("Error initializing database:", error)
      setDbInitResult({
        success: false,
        message: `Failed to initialize database: ${error instanceof Error ? error.message : "Please try again."}`,
      })
      toast.destructive({
        title: "Database Initialization Failed",
        description: `Failed to initialize database: ${error instanceof Error ? error.message : "Please try again."}`,
      })
    } finally {
      setIsInitializingDb(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center">
          <p>Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Invoice History</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Invoices</CardTitle>
            <CardDescription className="text-red-600">There was a problem loading your invoice data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sortedInvoices = getSortedInvoices()

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoice History</h1>
        <div className="space-x-2">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Link href="/generate-invoice">
            <Button>New Invoice</Button>
          </Link>
        </div>
      </div>

      {saveResult && (
        <Alert
          className={`mb-6 ${saveResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          variant={saveResult.success ? "default" : "destructive"}
        >
          {saveResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle>{saveResult.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{saveResult.message}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
          <CardDescription>Find invoices by invoice number, employee, vendor, client or period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Filters</h4>
                    <div className="space-y-2">
                      <Label htmlFor="period-start">Period Start Date</Label>
                      <Input
                        id="period-start"
                        type="date"
                        value={filterPeriodStart}
                        onChange={(e) => setFilterPeriodStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period-end">Period End Date</Label>
                      <Input
                        id="period-end"
                        type="date"
                        value={filterPeriodEnd}
                        onChange={(e) => setFilterPeriodEnd(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={applyFilters}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center bg-transparent">
                <FileText className="mr-1 h-4 w-4" />
                Excel
              </Button>

              <span className="text-sm text-muted-foreground">
                {sortedInvoices.length} invoice{sortedInvoices.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedInvoices.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center">
            <CheckSquare className="mr-2 h-5 w-5 text-primary" />
            <span>
              {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleBulkPaymentUpdate} variant="outline" className="flex items-center bg-transparent">
              <DollarSign className="mr-2 h-4 w-4" />
              Update Payment Status
            </Button>
            <Button onClick={generateMultipleInvoicePdfs} disabled={generatingPdf} className="flex items-center">
              {generatingPdf ? "Generating..." : "Download Selected"}
              <Download className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={exportToExcel} variant="outline" className="flex items-center bg-transparent">
              <FileText className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>View and manage all your generated invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all" onClick={() => handleStatusChange("all")}>
                All
              </TabsTrigger>
              <TabsTrigger value="pending" onClick={() => handleStatusChange("pending")}>
                Pending
              </TabsTrigger>
              <TabsTrigger value="paid" onClick={() => handleStatusChange("paid")}>
                Paid
              </TabsTrigger>
              <TabsTrigger value="overdue" onClick={() => handleStatusChange("overdue")}>
                Overdue
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {filteredInvoices.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No invoices found. Generate your first invoice to get started.</p>
                  <Link href="/generate-invoice">
                    <Button className="mt-4">Generate Invoice</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all invoices"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("invoiceNumber")}>
                          <div className="flex items-center">
                            Invoice #{sortField === "invoiceNumber" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                          <div className="flex items-center">
                            Date
                            {sortField === "date" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("employee.name")}>
                          <div className="flex items-center">
                            Employee
                            {sortField === "employee.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("vendor.name")}>
                          <div className="flex items-center">
                            Vendor
                            {sortField === "vendor.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => handleSort("totalBillAmount")}>
                          <div className="flex items-center justify-end">
                            Amount
                            {sortField === "totalBillAmount" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                          <div className="flex items-center">
                            Status
                            {sortField === "status" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInvoices.map((invoice) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>
                            <Checkbox
                              checked={selectedInvoices.has(invoice.invoiceNumber)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.invoiceNumber, !!checked)}
                              aria-label={`Select invoice ${invoice.invoiceNumber}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>
                            {invoice.employee.name}
                            {invoice.employee.referrals && invoice.employee.referrals.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {invoice.employee.referrals.length} referral(s)
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{invoice.vendor.name}</TableCell>
                          <TableCell>{invoice.billTo.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                              <span>{invoice.period.month}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.totalBillAmount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
                            {invoice.status === "partially_paid" && invoice.paymentDetails?.amountPaid && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatCurrency(invoice.paymentDetails.amountPaid)} received
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdatePayment(invoice)}
                                title="Update Payment"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewInvoice(invoice)}
                                title="View Invoice"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePrintInvoice(invoice)}
                                title="Print Invoice"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generateSingleInvoicePdf(invoice)}
                                title="Download PDF"
                                disabled={generatingPdf}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteInvoice(invoice.invoiceNumber)}
                                title="Delete Invoice"
                                className="text-destructive hover:text-destructive"
                                disabled={isDeleting === invoice.invoiceNumber}
                              >
                                {isDeleting === invoice.invoiceNumber ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              {invoices.filter((inv) => inv.status === "pending").length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No pending invoices found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectAll && statusFilter === "pending"}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all invoices"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("invoiceNumber")}>
                          <div className="flex items-center">
                            Invoice #{sortField === "invoiceNumber" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                          <div className="flex items-center">
                            Date
                            {sortField === "date" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("employee.name")}>
                          <div className="flex items-center">
                            Employee
                            {sortField === "employee.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("vendor.name")}>
                          <div className="flex items-center">
                            Vendor
                            {sortField === "vendor.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => handleSort("totalBillAmount")}>
                          <div className="flex items-center justify-end">
                            Amount
                            {sortField === "totalBillAmount" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                          <div className="flex items-center">
                            Status
                            {sortField === "status" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInvoices
                        .filter((inv) => inv.status === "pending")
                        .map((invoice) => (
                          <TableRow key={invoice.invoiceNumber}>
                            <TableCell>
                              <Checkbox
                                checked={selectedInvoices.has(invoice.invoiceNumber)}
                                onCheckedChange={(checked) => handleSelectInvoice(invoice.invoiceNumber, !!checked)}
                                aria-label={`Select invoice ${invoice.invoiceNumber}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(invoice.date)}</TableCell>
                            <TableCell>
                              {invoice.employee.name}
                              {invoice.employee.referrals && invoice.employee.referrals.length > 0 && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {invoice.employee.referrals.length} referral(s)
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{invoice.vendor.name}</TableCell>
                            <TableCell>{invoice.billTo.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                <span>{invoice.period.month}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(invoice.totalBillAmount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUpdatePayment(invoice)}
                                  title="Update Payment"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewInvoice(invoice)}
                                  title="View Invoice"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintInvoice(invoice)}
                                  title="Print Invoice"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generateSingleInvoicePdf(invoice)}
                                  title="Download PDF"
                                  disabled={generatingPdf}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInvoice(invoice.invoiceNumber)}
                                  title="Delete Invoice"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isDeleting === invoice.invoiceNumber}
                                >
                                  {isDeleting === invoice.invoiceNumber ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="paid" className="mt-0">
              {invoices.filter((inv) => inv.status === "paid").length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No paid invoices found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectAll && statusFilter === "paid"}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all invoices"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("invoiceNumber")}>
                          <div className="flex items-center">
                            Invoice #{sortField === "invoiceNumber" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                          <div className="flex items-center">
                            Date
                            {sortField === "date" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("employee.name")}>
                          <div className="flex items-center">
                            Employee
                            {sortField === "employee.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("vendor.name")}>
                          <div className="flex items-center">
                            Vendor
                            {sortField === "vendor.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => handleSort("totalBillAmount")}>
                          <div className="flex items-center justify-end">
                            Amount
                            {sortField === "totalBillAmount" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                          <div className="flex items-center">
                            Status
                            {sortField === "status" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInvoices
                        .filter((inv) => inv.status === "paid")
                        .map((invoice) => (
                          <TableRow key={invoice.invoiceNumber}>
                            <TableCell>
                              <Checkbox
                                checked={selectedInvoices.has(invoice.invoiceNumber)}
                                onCheckedChange={(checked) => handleSelectInvoice(invoice.invoiceNumber, !!checked)}
                                aria-label={`Select invoice ${invoice.invoiceNumber}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(invoice.date)}</TableCell>
                            <TableCell>
                              {invoice.employee.name}
                              {invoice.employee.referrals && invoice.employee.referrals.length > 0 && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {invoice.employee.referrals.length} referral(s)
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{invoice.vendor.name}</TableCell>
                            <TableCell>{invoice.billTo.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                <span>{invoice.period.month}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(invoice.totalBillAmount)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status)}
                              {invoice.paymentDetails?.paymentDate && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Paid on {formatDate(invoice.paymentDetails.paymentDate)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUpdatePayment(invoice)}
                                  title="Update Payment"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewInvoice(invoice)}
                                  title="View Invoice"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintInvoice(invoice)}
                                  title="Print Invoice"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generateSingleInvoicePdf(invoice)}
                                  title="Download PDF"
                                  disabled={generatingPdf}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInvoice(invoice.invoiceNumber)}
                                  title="Delete Invoice"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isDeleting === invoice.invoiceNumber}
                                >
                                  {isDeleting === invoice.invoiceNumber ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue" className="mt-0">
              {invoices.filter((inv) => inv.status === "pending" && isInvoiceOverdue(inv)).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No overdue invoices found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectAll && statusFilter === "overdue"}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all invoices"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("invoiceNumber")}>
                          <div className="flex items-center">
                            Invoice #{sortField === "invoiceNumber" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                          <div className="flex items-center">
                            Date
                            {sortField === "date" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("employee.name")}>
                          <div className="flex items-center">
                            Employee
                            {sortField === "employee.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("vendor.name")}>
                          <div className="flex items-center">
                            Vendor
                            {sortField === "vendor.name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => handleSort("totalBillAmount")}>
                          <div className="flex items-center justify-end">
                            Amount
                            {sortField === "totalBillAmount" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                          <div className="flex items-center">
                            Status
                            {sortField === "status" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInvoices
                        .filter((inv) => inv.status === "pending" && isInvoiceOverdue(inv))
                        .map((invoice) => (
                          <TableRow key={invoice.invoiceNumber}>
                            <TableCell>
                              <Checkbox
                                checked={selectedInvoices.has(invoice.invoiceNumber)}
                                onCheckedChange={(checked) => handleSelectInvoice(invoice.invoiceNumber, !!checked)}
                                aria-label={`Select invoice ${invoice.invoiceNumber}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(invoice.date)}</TableCell>
                            <TableCell className="font-medium">{invoice.employee.name}</TableCell>
                            <TableCell>{invoice.vendor.name}</TableCell>
                            <TableCell>{invoice.billTo.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                <span>{invoice.period.month}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(invoice.totalBillAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-500">Overdue</Badge>
                              <div className="mt-1 text-xs text-muted-foreground">Due {formatDate(invoice.date)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUpdatePayment(invoice)}
                                  title="Update Payment"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewInvoice(invoice)}
                                  title="View Invoice"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintInvoice(invoice)}
                                  title="Print Invoice"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generateSingleInvoicePdf(invoice)}
                                  title="Download PDF"
                                  disabled={generatingPdf}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInvoice(invoice.invoiceNumber)}
                                  title="Delete Invoice"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isDeleting === invoice.invoiceNumber}
                                >
                                  {isDeleting === invoice.invoiceNumber ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Database Initialization Dialog */}
      <Dialog open={showDbInitDialog} onOpenChange={setShowDbInitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Database Tables Missing</DialogTitle>
            <DialogDescription>
              The database tables required for storing invoices don't exist yet. Would you like to initialize the
              database now?
            </DialogDescription>
          </DialogHeader>

          {dbInitResult && (
            <Alert
              className={`mt-2 ${dbInitResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              variant={dbInitResult.success ? "default" : "destructive"}
            >
              {dbInitResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{dbInitResult.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{dbInitResult.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDbInitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitializeDatabase} disabled={isInitializingDb}>
              {isInitializingDb ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Database"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-2xl print:text-center">INVOICE</DialogTitle>
            <DialogDescription className="sr-only">Invoice details</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="invoice-content space-y-6 p-2 print:p-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">From:</div>
                  <div className="font-semibold">{selectedInvoice.vendor.name}</div>
                  <div className="whitespace-pre-line text-sm">{selectedInvoice.vendor.address}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bill To:</div>
                  <div className="font-semibold">{selectedInvoice.billTo.name}</div>
                  <div className="whitespace-pre-line text-sm">{selectedInvoice.billTo.address}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Details:</div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div className="font-medium">Invoice Number:</div>
                    <div>{selectedInvoice.invoiceNumber}</div>
                    <div className="font-medium">Invoice Date:</div>
                    <div>{formatDate(selectedInvoice.date)}</div>
                    <div className="font-medium">Payment Terms:</div>
                    <div>{selectedInvoice.paymentTerms}</div>
                    <div className="font-medium">Status:</div>
                    <div>{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Service Information:</div>
                  <div className="font-medium">{selectedInvoice.serviceFor}</div>
                  <div className="text-sm">
                    Period: {formatDate(selectedInvoice.period.start)} - {formatDate(selectedInvoice.period.end)}
                  </div>
                </div>
              </div>

              {/* Invoice Body */}
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Month of Service</TableHead>
                      <TableHead className="text-right">Hours Worked</TableHead>
                      <TableHead className="text-right">Bill Rate</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{selectedInvoice.employee.name}</TableCell>
                      <TableCell>{selectedInvoice.period.month}</TableCell>
                      <TableCell className="text-right">{selectedInvoice.hours}</TableCell>
                      <TableCell className="text-right">${selectedInvoice.billRate.toFixed(2)}/hr</TableCell>
                      <TableCell className="text-right">${selectedInvoice.totalBillAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Invoice Summary */}
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between border-b py-2">
                      <div className="font-medium">Subtotal:</div>
                      <div>${selectedInvoice.totalBillAmount.toFixed(2)}</div>
                    </div>
                    <div className="flex justify-between border-b py-2">
                      <div className="font-medium">Tax (0%):</div>
                      <div>$0.00</div>
                    </div>
                    <div className="flex justify-between py-2">
                      <div className="text-lg font-bold">Total Due:</div>
                      <div className="text-lg font-bold">${selectedInvoice.totalBillAmount.toFixed(2)}</div>
                    </div>

                    {/* Payment Information */}
                    {selectedInvoice.status !== "pending" && selectedInvoice.paymentDetails && (
                      <>
                        <div className="mt-4 border-t pt-2">
                          <div className="flex justify-between py-1">
                            <div className="font-medium">Amount Paid:</div>
                            <div>${selectedInvoice.paymentDetails.amountPaid.toFixed(2)}</div>
                          </div>
                          {selectedInvoice.status === "partially_paid" && (
                            <div className="flex justify-between py-1">
                              <div className="font-medium">Balance Due:</div>
                              <div>
                                $
                                {(selectedInvoice.totalBillAmount - selectedInvoice.paymentDetails.amountPaid).toFixed(
                                  2,
                                )}
                              </div>
                            </div>
                          )}
                          {selectedInvoice.paymentDetails.paymentDate && (
                            <div className="flex justify-between py-1">
                              <div className="font-medium">Payment Date:</div>
                              <div>{formatDate(selectedInvoice.paymentDetails.paymentDate)}</div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Notes */}
              {selectedInvoice.paymentDetails?.notes && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div className="font-medium">Payment Notes:</div>
                  <div className="mt-1 text-sm">{selectedInvoice.paymentDetails.notes}</div>
                </div>
              )}

              {/* Thank You Note */}
              <div className="mt-6 text-center text-sm">
                <p>Thank you for your business!</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Update Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Update the payment status and details for invoice {paymentInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-12 items-center gap-4">
                <Label htmlFor="payment-status" className="col-span-4 text-right">
                  Status
                </Label>
                <div className="col-span-8 w-full">
                  <Select value={paymentStatus} onValueChange={setPaymentStatus as any}>
                    <SelectTrigger id="payment-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentStatus !== "pending" && (
                <>
                  <div className="grid grid-cols-12 items-center gap-4">
                    <Label htmlFor="amount-paid" className="col-span-4 text-right">
                      Amount Paid
                    </Label>
                    <div className="col-span-8">
                      <Input
                        id="amount-paid"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                      {paymentInvoice && Number.parseFloat(amountPaid) < paymentInvoice.totalBillAmount && (
                        <div className="mt-1 text-xs">
                          Balance:{" "}
                          {formatCurrency(paymentInvoice.totalBillAmount - Number.parseFloat(amountPaid || "0"))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-4">
                    <Label htmlFor="employee-payment" className="col-span-4 text-right">
                      Employee Payment
                    </Label>
                    <div className="col-span-8">
                      <Input
                        id="employee-payment"
                        type="number"
                        step="0.01"
                        min="0"
                        value={employeePaymentAmount}
                        onChange={(e) => setEmployeePaymentAmount(e.target.value)}
                      />
                      <div className="mt-1 text-xs text-muted-foreground">
                        Amount paid to the employee for this invoice
                      </div>
                    </div>
                  </div>

                  {referralPayments.length > 0 && (
                    <div className="mt-2">
                      <Label className="mb-2 block">Referral Payments</Label>
                      <div className="space-y-3">
                        {referralPayments.map((payment, index) => (
                          <div key={payment.id} className="grid grid-cols-12 items-center gap-4">
                            <Label className="col-span-4 text-right text-sm">{payment.name}</Label>
                            <div className="col-span-8">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payment.amount}
                                onChange={(e) => {
                                  const newPayments = [...referralPayments]
                                  newPayments[index].amount = e.target.value
                                  setReferralPayments(newPayments)
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-12 items-center gap-4">
                    <Label htmlFor="payment-date" className="col-span-4 text-right">
                      Payment Date
                    </Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="col-span-8"
                    />
                  </div>

                  <div className="grid grid-cols-12 items-start gap-4">
                    <Label htmlFor="payment-notes" className="col-span-4 pt-2 text-right">
                      Notes
                    </Label>
                    <textarea
                      id="payment-notes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="col-span-8 h-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      placeholder="Add payment details or notes"
                    />
                  </div>
                </>
              )}

              {paymentInvoice &&
                paymentStatus === "paid" &&
                Number.parseFloat(amountPaid) < paymentInvoice.totalBillAmount && (
                  <div className="rounded-md bg-amber-50 p-3 text-amber-800">
                    <p className="text-sm">
                      The amount paid is less than the total invoice amount. Consider marking this as "Partially Paid"
                      instead.
                    </p>
                  </div>
                )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={isSavingToDb}>
                Cancel
              </Button>
              <Button onClick={savePaymentDetails} disabled={isSavingToDb}>
                {isSavingToDb ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Payment Details"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Update Dialog */}
      <Dialog open={showBulkPaymentDialog} onOpenChange={setShowBulkPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Bulk Update Payment Status</DialogTitle>
            <DialogDescription>
              Update payment status for {selectedInvoices.size} selected invoice{selectedInvoices.size !== 1 ? "s" : ""}
              {selectedInvoices.size > 0 && filteredInvoices.length !== totalInvoices && (
                <Alert className="mt-2">
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    This will only update the selected invoices from your current filtered view.
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-12 items-center gap-4">
                <Label htmlFor="bulk-payment-status" className="col-span-4 text-right">
                  Status
                </Label>
                <div className="col-span-8 w-full">
                  <Select value={bulkPaymentStatus} onValueChange={setBulkPaymentStatus as any}>
                    <SelectTrigger id="bulk-payment-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {bulkPaymentStatus !== "pending" && (
                <>
                  <div className="grid grid-cols-12 items-center gap-4">
                    <Label htmlFor="amount-paid-option" className="col-span-4 text-right">
                      Amount Paid
                    </Label>
                    <div className="col-span-8">
                      <Select value={bulkAmountPaidOption} onValueChange={setBulkAmountPaidOption as any}>
                        <SelectTrigger id="amount-paid-option" className="w-full">
                          <SelectValue placeholder="Select amount option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Invoice Amount</SelectItem>
                          <SelectItem value="custom">Custom Amount (same for all)</SelectItem>
                          <SelectItem value="zero">Zero (for record keeping)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {bulkAmountPaidOption === "custom" && (
                    <div className="grid grid-cols-12 items-center gap-4">
                      <Label htmlFor="bulk-amount-paid" className="col-span-4 text-right">
                        Custom Amount
                      </Label>
                      <div className="col-span-8">
                        <Input
                          id="bulk-amount-paid"
                          type="number"
                          step="0.01"
                          min="0"
                          value={bulkAmountPaid}
                          onChange={(e) => setBulkAmountPaid(e.target.value)}
                        />
                        <div className="mt-1 text-xs text-muted-foreground">
                          This amount will be applied to all selected invoices
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-12 items-center gap-4">
                    <Label htmlFor="bulk-payment-date" className="col-span-4 text-right">
                      Payment Date
                    </Label>
                    <Input
                      id="bulk-payment-date"
                      type="date"
                      value={bulkPaymentDate}
                      onChange={(e) => setBulkPaymentDate(e.target.value)}
                      className="col-span-8"
                    />
                  </div>

                  <div className="grid grid-cols-12 items-start gap-4">
                    <Label htmlFor="bulk-payment-notes" className="col-span-4 pt-2 text-right">
                      Notes
                    </Label>
                    <textarea
                      id="bulk-payment-notes"
                      value={bulkPaymentNotes}
                      onChange={(e) => setBulkPaymentNotes(e.target.value)}
                      className="col-span-8 h-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      placeholder="Add payment details or notes (applied to all invoices)"
                    />
                  </div>
                </>
              )}

              {bulkUpdateResult && (
                <Alert
                  className={`mt-2 ${bulkUpdateResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                  variant={bulkUpdateResult.success ? "default" : "destructive"}
                >
                  {bulkUpdateResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertTitle>{bulkUpdateResult.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {bulkUpdateResult.message}
                    {bulkUpdateResult.details && <div className="mt-1 text-sm">{bulkUpdateResult.details}</div>}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setShowBulkPaymentDialog(false)} disabled={isSavingBulkPayments}>
                Cancel
              </Button>
              <Button onClick={saveBulkPaymentDetails} disabled={isSavingBulkPayments}>
                {isSavingBulkPayments ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update All Selected Invoices"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
